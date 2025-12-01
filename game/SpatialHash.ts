
import { IUnit } from '../types';

export class SpatialHash {
    private cellSize: number;
    // Map<IntegerKey, Array> - Using number keys avoids string allocation per frame
    private grid: Map<number, IUnit[]>;

    constructor(cellSize: number = 100) {
        this.cellSize = cellSize;
        this.grid = new Map();
    }

    /**
     * Generates a composite integer key.
     * Limits:
     * - Y must be < 1,000,000 (Lane height is ~200, so safe)
     * - X must be within JS Safe Integer limits when combined.
     *   Max Safe Integer is 9e15. 
     *   If key = x + y * 1,000,000
     *   Max x can be around 9e9 cells. 
     *   9e9 cells * 100px = 9e11 pixels. Enough for "Endless".
     */
    private getKey(x: number, y: number): number {
        const cx = Math.floor(x / this.cellSize);
        const cy = Math.floor(y / this.cellSize);
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
        
        const startX = Math.floor((x - radius) / this.cellSize);
        const endX = Math.floor((x + radius) / this.cellSize);
        const startY = Math.floor((y - radius) / this.cellSize);
        const endY = Math.floor((y + radius) / this.cellSize);

        for (let cx = startX; cx <= endX; cx++) {
            for (let cy = startY; cy <= endY; cy++) {
                const key = cx + cy * 1_000_000;
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
