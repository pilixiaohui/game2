
import { RegionData, UnitType } from '../types';

export const INITIAL_REGIONS_CONFIG: RegionData[] = [
    { 
        id: 1, 
        name: "第7区贫民窟 (Sector 7 Slums)", 
        x: 10, y: 60, 
        difficultyMultiplier: 1.0, 
        totalStages: 5,
        spawnTable: [
            { type: UnitType.HUMAN_MARINE, weight: 10 },
            { type: UnitType.HUMAN_MILITIA, weight: 8 }
        ],
        isUnlocked: true, devourProgress: 0, isFighting: false
    },
    { 
        id: 2, 
        name: "工业废墟 (Industrial Ruins)", 
        x: 30, y: 40, 
        difficultyMultiplier: 1.8, 
        totalStages: 10,
        spawnTable: [
            { type: UnitType.HUMAN_MARINE, weight: 6 },
            { type: UnitType.HUMAN_RIOT, weight: 3 },
            { type: UnitType.HUMAN_PYRO, weight: 2 }
        ],
        isUnlocked: false, devourProgress: 0, isFighting: false
    },
    { 
        id: 3, 
        name: "商业枢纽 (Commerce Hub)", 
        x: 55, y: 55, 
        difficultyMultiplier: 3.0, 
        totalStages: 10,
        spawnTable: [
            { type: UnitType.HUMAN_RIOT, weight: 4 },
            { type: UnitType.HUMAN_SNIPER, weight: 3 },
            { type: UnitType.HUMAN_GOLIATH, weight: 3 }
        ],
        isUnlocked: false, devourProgress: 0, isFighting: false
    },
    { 
        id: 4, 
        name: "轨道电梯基座 (Orbital Base)", 
        x: 75, y: 30, 
        difficultyMultiplier: 5.0, 
        totalStages: 12,
        spawnTable: [
            { type: UnitType.HUMAN_TANK, weight: 3 },
            { type: UnitType.HUMAN_SIEGE_TANK, weight: 2 },
            { type: UnitType.HUMAN_BATTLECRUISER, weight: 1 },
            { type: UnitType.HUMAN_PYRO, weight: 4 }
        ],
        isUnlocked: false, devourProgress: 0, isFighting: false
    },
    { 
        id: 5, 
        name: "核心防线 (Core Line)", 
        x: 90, y: 50, 
        difficultyMultiplier: 10.0, 
        totalStages: 13,
        spawnTable: [
            { type: UnitType.HUMAN_TITAN_WALKER, weight: 1 },
            { type: UnitType.HUMAN_BATTLECRUISER, weight: 3 },
            { type: UnitType.HUMAN_BUNKER, weight: 5 },
            { type: UnitType.HUMAN_SIEGE_TANK, weight: 5 }
        ],
        isUnlocked: false, devourProgress: 0, isFighting: false
    }
];