import { GameSaveData, UnitType } from '../types';
import { INITIAL_LARVA_CAP } from './core';

export const INITIAL_GAME_STATE: GameSaveData = {
    resources: {
        biomass: 15,
        enzymes: 0,
        larva: INITIAL_LARVA_CAP,
        dna: 0,
        mutagen: 0
    },
    hive: {
        unlockedUnits: {
            [UnitType.MELEE]: { id: UnitType.MELEE, level: 1, loadout: [null, null, null, null, null], cap: 200, capLevel: 1, efficiencyLevel: 1, isProducing: false, productionProgress: 0 },
            [UnitType.RANGED]: { id: UnitType.RANGED, level: 1, loadout: [null, null, null, null, null], cap: 50, capLevel: 1, efficiencyLevel: 1, isProducing: false, productionProgress: 0 },
            [UnitType.PYROVORE]: { id: UnitType.PYROVORE, level: 1, loadout: [null, null, null], cap: 30, capLevel: 1, efficiencyLevel: 1, isProducing: false, productionProgress: 0 },
            [UnitType.CRYOLISK]: { id: UnitType.CRYOLISK, level: 1, loadout: [null, null, null], cap: 30, capLevel: 1, efficiencyLevel: 1, isProducing: false, productionProgress: 0 },
            [UnitType.OMEGALIS]: { id: UnitType.OMEGALIS, level: 1, loadout: [null, null, null, null], cap: 10, capLevel: 1, efficiencyLevel: 1, isProducing: false, productionProgress: 0 },
            [UnitType.QUEEN]: { id: UnitType.QUEEN, level: 1, loadout: [null, null, null], cap: 5, capLevel: 1, efficiencyLevel: 1, isProducing: false, productionProgress: 0 },
            
            // Tier 1
            [UnitType.ZERGLING_RAPTOR]: { id: UnitType.ZERGLING_RAPTOR, level: 1, loadout: [null, null], cap: 60, capLevel: 1, efficiencyLevel: 1, isProducing: false, productionProgress: 0 },
            [UnitType.EMBER_MITE]: { id: UnitType.EMBER_MITE, level: 1, loadout: [null], cap: 60, capLevel: 1, efficiencyLevel: 1, isProducing: false, productionProgress: 0 },
            [UnitType.SPARK_FLY]: { id: UnitType.SPARK_FLY, level: 1, loadout: [null, null], cap: 40, capLevel: 1, efficiencyLevel: 1, isProducing: false, productionProgress: 0 },
            [UnitType.FROST_WEEVIL]: { id: UnitType.FROST_WEEVIL, level: 1, loadout: [null, null], cap: 40, capLevel: 1, efficiencyLevel: 1, isProducing: false, productionProgress: 0 },
            [UnitType.ACID_MAGGOT]: { id: UnitType.ACID_MAGGOT, level: 1, loadout: [null], cap: 50, capLevel: 1, efficiencyLevel: 1, isProducing: false, productionProgress: 0 },

            // Tier 2
            [UnitType.LIGHTNING_SKINK]: { id: UnitType.LIGHTNING_SKINK, level: 1, loadout: [null, null, null], cap: 20, capLevel: 1, efficiencyLevel: 1, isProducing: false, productionProgress: 0 },
            [UnitType.SPINE_HURLER]: { id: UnitType.SPINE_HURLER, level: 1, loadout: [null, null], cap: 25, capLevel: 1, efficiencyLevel: 1, isProducing: false, productionProgress: 0 },
            [UnitType.MAGMA_GOLEM]: { id: UnitType.MAGMA_GOLEM, level: 1, loadout: [null, null, null], cap: 10, capLevel: 1, efficiencyLevel: 1, isProducing: false, productionProgress: 0 },
            [UnitType.PLAGUE_BEARER]: { id: UnitType.PLAGUE_BEARER, level: 1, loadout: [null, null], cap: 15, capLevel: 1, efficiencyLevel: 1, isProducing: false, productionProgress: 0 },

            // Tier 3
            [UnitType.WINTER_WITCH]: { id: UnitType.WINTER_WITCH, level: 1, loadout: [null, null, null], cap: 8, capLevel: 1, efficiencyLevel: 1, isProducing: false, productionProgress: 0 },

            // Tier 4
            [UnitType.TYRANT_REX]: { id: UnitType.TYRANT_REX, level: 1, loadout: [null, null, null, null], cap: 3, capLevel: 1, efficiencyLevel: 1, isProducing: false, productionProgress: 0 },
            [UnitType.TEMPEST_LEVIATHAN]: { id: UnitType.TEMPEST_LEVIATHAN, level: 1, loadout: [null, null, null], cap: 2, capLevel: 1, efficiencyLevel: 1, isProducing: false, productionProgress: 0 },

            [UnitType.HUMAN_MARINE]: { id: UnitType.HUMAN_MARINE, level: 1, loadout: [], cap: 0, capLevel: 1, efficiencyLevel: 1, isProducing: false, productionProgress: 0 },
            [UnitType.HUMAN_RIOT]: { id: UnitType.HUMAN_RIOT, level: 1, loadout: [], cap: 0, capLevel: 1, efficiencyLevel: 1, isProducing: false, productionProgress: 0 },
            [UnitType.HUMAN_PYRO]: { id: UnitType.HUMAN_PYRO, level: 1, loadout: [], cap: 0, capLevel: 1, efficiencyLevel: 1, isProducing: false, productionProgress: 0 },
            [UnitType.HUMAN_SNIPER]: { id: UnitType.HUMAN_SNIPER, level: 1, loadout: [], cap: 0, capLevel: 1, efficiencyLevel: 1, isProducing: false, productionProgress: 0 },
            [UnitType.HUMAN_TANK]: { id: UnitType.HUMAN_TANK, level: 1, loadout: [], cap: 0, capLevel: 1, efficiencyLevel: 1, isProducing: false, productionProgress: 0 },
        },
        unitStockpile: {
            [UnitType.MELEE]: 0,
            [UnitType.RANGED]: 0,
            [UnitType.QUEEN]: 0,
            [UnitType.PYROVORE]: 0,
            [UnitType.CRYOLISK]: 0,
            [UnitType.OMEGALIS]: 0,
            [UnitType.ZERGLING_RAPTOR]: 0,
            [UnitType.EMBER_MITE]: 0,
            [UnitType.SPARK_FLY]: 0,
            [UnitType.FROST_WEEVIL]: 0,
            [UnitType.ACID_MAGGOT]: 0,
            [UnitType.LIGHTNING_SKINK]: 0,
            [UnitType.SPINE_HURLER]: 0,
            [UnitType.MAGMA_GOLEM]: 0,
            [UnitType.PLAGUE_BEARER]: 0,
            [UnitType.WINTER_WITCH]: 0,
            [UnitType.TYRANT_REX]: 0,
            [UnitType.TEMPEST_LEVIATHAN]: 0,
            [UnitType.HUMAN_MARINE]: 0,
            [UnitType.HUMAN_RIOT]: 0,
            [UnitType.HUMAN_PYRO]: 0,
            [UnitType.HUMAN_SNIPER]: 0,
            [UnitType.HUMAN_TANK]: 0
        },
        production: {
            larvaCapBase: INITIAL_LARVA_CAP,
            queenIntervalLevel: 1,
            queenAmountLevel: 1,
            queenTimer: 0
        },
        metabolism: {
            villiCount: 0,
            taprootCount: 0,
            geyserCount: 0,
            breakerCount: 0,
            fermentingSacCount: 0,
            refluxPumpCount: 0,
            thermalCrackerCount: 0,
            fleshBoilerCount: 0,
            crackerHeat: 0,
            crackerOverheated: false,
            thoughtSpireCount: 0,
            hiveMindCount: 0,
            akashicRecorderCount: 0,
            spireAccumulator: 0,
            storageCount: 0,
            supplyCount: 0,
            necroSiphonCount: 0,
            redTideCount: 0,
            gaiaDigesterCount: 0,
            bloodFusionCount: 0,
            synapticResonatorCount: 0,
            entropyVentCount: 0,
            combatCortexCount: 0,
            geneArchiveCount: 0,
            omegaPointCount: 0
        },
        inventory: {
            consumables: {},
            plugins: []
        },
        globalBuffs: []
    },
    world: {
        currentRegionId: 0,
        regions: {
            1: { id: 1, isUnlocked: true, devourProgress: 0 }
        }
    },
    player: {
        lastSaveTime: Date.now(),
        prestigeLevel: 0,
        lifetimeDna: 0,
        mutationUpgrades: {
            metabolicSurge: 0,
            larvaFission: 0,
            geneticMemory: false
        },
        settings: {
            bgmVolume: 0.5,
            sfxVolume: 0.5
        }
    }
};
