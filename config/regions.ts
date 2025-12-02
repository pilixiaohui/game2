import { RegionData, UnitType } from '../types';

export const INITIAL_REGIONS_CONFIG: RegionData[] = [
    { 
        id: 1, 
        name: "第7区贫民窟 (Sector 7 Slums)", 
        x: 10, y: 50, 
        difficultyMultiplier: 1.0, 
        spawnTable: [{ type: UnitType.HUMAN_MARINE, weight: 1.0 }],
        isUnlocked: true, devourProgress: 0, isFighting: false
    },
    { 
        id: 2, 
        name: "工业废墟 (Industrial Ruins)", 
        x: 35, y: 70, 
        difficultyMultiplier: 1.5, 
        spawnTable: [{ type: UnitType.HUMAN_MARINE, weight: 0.7 }, { type: UnitType.HUMAN_RIOT, weight: 0.3 }],
        isUnlocked: false, devourProgress: 0, isFighting: false
    },
    { 
        id: 3, 
        name: "商业中心 (Commerce Hub)", 
        x: 60, y: 40, 
        difficultyMultiplier: 2.5, 
        spawnTable: [{ type: UnitType.HUMAN_MARINE, weight: 0.5 }, { type: UnitType.HUMAN_RIOT, weight: 0.3 }, { type: UnitType.HUMAN_SNIPER, weight: 0.2 }],
        isUnlocked: false, devourProgress: 0, isFighting: false
    },
    { 
        id: 4, 
        name: "轨道电梯基座 (Orbital Base)", 
        x: 85, y: 20, 
        difficultyMultiplier: 4.0, 
        spawnTable: [{ type: UnitType.HUMAN_RIOT, weight: 0.4 }, { type: UnitType.HUMAN_PYRO, weight: 0.3 }, { type: UnitType.HUMAN_TANK, weight: 0.3 }],
        isUnlocked: false, devourProgress: 0, isFighting: false
    }
];
