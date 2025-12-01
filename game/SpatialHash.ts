
import { IUnit } from '../types';

export class SpatialHash {
    private cellSize: number;
    private grid: Map<number, IUnit[]>;

    // We use a large multiplier to simulate a 2D key in a 1D Map.
    // Ensure Y component doesn't overlap X. 
    // Max Map Width assumed < 1,000,000 cells (100,000,000 pixels).
    private readonly Y_MULTIPLIER = 1_000_000;

    constructor(cellSize: number = 100) {
        this.cellSize = cellSize;
        this.grid = new Map();
    }

    private getKey(x: number, y: number): number {
        const cx = Math.floor(x / this.cellSize);
        const cy = Math.floor(y / this.cellSize);
        return cx + cy * this.Y_MULTIPLIER;
    }

    /**
     * Optimized clear: Reuses arrays by setting length to 0.
     * Reduces GC pressure significantly by avoiding array reallocation.
     */
    public clear() {
        for (const cell of this.grid.values()) {
            cell.length = 0;
        }
    }

    public insert(unit: IUnit) {
        const key = this.getKey(unit.x, unit.y);
        let cell = this.grid.get(key);
        if (!cell) {
            cell = [];
            this.grid.set(key, cell);
        }
        cell.push(unit);
    }

    /**
     * Optimized query that populates an output array to avoid Garbage Collection pressure.
     * @param x Center X
     * @param y Center Y
     * @param radius Search Radius
     * @param out Output array (will be cleared/reused)
     * @returns number of items found
     */
    public query(x: number, y: number, radius: number, out: IUnit[]): number {
        out.length = 0; // Clear without deallocating
        const radiusSq = radius * radius;
        
        const startX = Math.floor((x - radius) / this.cellSize);
        const endX = Math.floor((x + radius) / this.cellSize);
        const startY = Math.floor((y - radius) / this.cellSize);
        const endY = Math.floor((y + radius) / this.cellSize);

        for (let cx = startX; cx <= endX; cx++) {
            for (let cy = startY; cy <= endY; cy++) {
                const key = cx + cy * this.Y_MULTIPLIER;
                const cell = this.grid.get(key);
                if (cell) {
                    const len = cell.length;
                    for (let i = 0; i < len; i++) {
                        const unit = cell[i];
                        if (!unit.active || unit.isDead) continue;
                        
                        const dx = unit.x - x;
                        const dy = unit.y - y;
                        if ((dx * dx + dy * dy) <= radiusSq) {
                            out.push(unit);
                        }
                    }
                }
            }
        }
        return out.length;
    }
}
