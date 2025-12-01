
import { IUnit } from '../types';

export class SpatialHash {
    private cellSize: number;
    // Map<IntegerKey, Array>
    // Using number keys avoids string allocation.
    // We maintain persistent arrays in the map to reuse them.
    private grid: Map<number, IUnit[]>;

    constructor(cellSize: number = 100) {
        this.cellSize = cellSize;
        this.grid = new Map();
    }

    private getKey(x: number, y: number): number {
        // Bitwise floor is slightly faster: x | 0
        const cx = (x / this.cellSize) | 0;
        const cy = (y / this.cellSize) | 0;
        // Basic integer hashing.
        // Assuming map is roughly 200px high (cy = 0 to 2) and X can go up to 120,000 (cx = 0 to 1200)
        // 1,000,000 multiplier is safe for X up to ~9,000,000 before overlap with safe integer limits.
        return cx + cy * 1_000_000;
    }

    /**
     * Optimized clear: Reuses arrays by setting length to 0
     * Reduces GC pressure significantly
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
     * @param out Output array (will be cleared)
     * @returns number of items found
     */
    public query(x: number, y: number, radius: number, out: IUnit[]): number {
        out.length = 0; // Clear without deallocating
        const radiusSq = radius * radius;
        
        const startX = ((x - radius) / this.cellSize) | 0;
        const endX = ((x + radius) / this.cellSize) | 0;
        const startY = ((y - radius) / this.cellSize) | 0;
        const endY = ((y + radius) / this.cellSize) | 0;

        for (let cx = startX; cx <= endX; cx++) {
            for (let cy = startY; cy <= endY; cy++) {
                const key = cx + cy * 1_000_000;
                const cell = this.grid.get(key);
                if (cell) {
                    const len = cell.length;
                    for (let i = 0; i < len; i++) {
                        const unit = cell[i];
                        // Optimization: Check if dead/inactive before math
                        if (!unit.active || unit.isDead) continue;
                        
                        const dx = unit.x - x;
                        const dy = unit.y - y;
                        // Avoid Math.pow for small performance boost in hot loop
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
