
import { IUnit } from '../types';
import { STAGE_WIDTH, LANE_HEIGHT, LANE_Y } from '../constants';

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
        if (!this.grid.has(key)) {
            this.grid.set(key, []);
        }
        this.grid.get(key)!.push(unit);
    }

    public query(x: number, y: number, radius: number): IUnit[] {
        const results: IUnit[] = [];
        const startX = Math.floor((x - radius) / this.cellSize);
        const endX = Math.floor((x + radius) / this.cellSize);
        const startY = Math.floor((y - radius) / this.cellSize);
        const endY = Math.floor((y + radius) / this.cellSize);

        for (let cx = startX; cx <= endX; cx++) {
            for (let cy = startY; cy <= endY; cy++) {
                const key = `${cx},${cy}`;
                const cell = this.grid.get(key);
                if (cell) {
                    for (const unit of cell) {
                        if (!unit.active || unit.isDead) continue;
                        const distSq = (unit.x - x) ** 2 + (unit.y - y) ** 2;
                        if (distSq <= radius * radius) {
                            results.push(unit);
                        }
                    }
                }
            }
        }
        return results;
    }
    
    // Optimized for neighbors: query 3x3 grid around unit
    public getNeighbors(unit: IUnit, radius: number): IUnit[] {
         return this.query(unit.x, unit.y, radius);
    }
}
