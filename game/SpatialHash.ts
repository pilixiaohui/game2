
import { IUnit } from '../types';

export class SpatialHash {
    private cellSize: number;
    private grid: Map<string, IUnit[]>;

    constructor(cellSize: number = 100) {
        this.cellSize = cellSize;
        this.grid = new Map();
    }

    private getKey(x: number, y: number): string {
        const cx = Math.floor(x / this.cellSize);
        const cy = Math.floor(y / this.cellSize);
        return `${cx},${cy}`;
    }

    public clear() {
        this.grid.clear();
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
        
        const startX = Math.floor((x - radius) / this.cellSize);
        const endX = Math.floor((x + radius) / this.cellSize);
        const startY = Math.floor((y - radius) / this.cellSize);
        const endY = Math.floor((y + radius) / this.cellSize);

        for (let cx = startX; cx <= endX; cx++) {
            for (let cy = startY; cy <= endY; cy++) {
                const key = `${cx},${cy}`;
                const cell = this.grid.get(key);
                if (cell) {
                    const len = cell.length;
                    for (let i = 0; i < len; i++) {
                        const unit = cell[i];
                        if (!unit.active || unit.isDead) continue;
                        const distSq = (unit.x - x) ** 2 + (unit.y - y) ** 2;
                        if (distSq <= radiusSq) {
                            out.push(unit);
                        }
                    }
                }
            }
        }
        return out.length;
    }
}
