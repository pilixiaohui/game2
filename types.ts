
export enum Faction {
  ZERG = 'ZERG',
  HUMAN = 'HUMAN',
}

export enum UnitType {
  // Zerg Units
  MELEE = 'MELEE',
  RANGED = 'RANGED',
  QUEEN = 'QUEEN',
  
  // Elemental Units
  PYROVORE = 'PYROVORE', // Thermal Artillery
  CRYOLISK = 'CRYOLISK', // Cryo Assassin
  OMEGALIS = 'OMEGALIS', // Voltaic Tank

  // Human Units
  HUMAN_MARINE = 'HUMAN_MARINE',      // Kinetic / Ballistic
  HUMAN_RIOT = 'HUMAN_RIOT',          // Kinetic / High Armor
  HUMAN_PYRO = 'HUMAN_PYRO',          // Thermal
  HUMAN_SNIPER = 'HUMAN_SNIPER',      // Kinetic / High Crit
  HUMAN_TANK = 'HUMAN_TANK',          // Voltaic / Heavy
}

export enum HiveSection {
  INVASION = 'INVASION',
  EVOLUTION = 'EVOLUTION',
  GRAFTING = 'GRAFTING',
  SEQUENCE = 'SEQUENCE',
  METABOLISM = 'METABOLISM',
  BIRTHING = 'BIRTHING',
  GLANDULAR = 'GLANDULAR',
  PLAGUE = 'PLAGUE',
}

// --- CORE ELEMENTAL SYSTEM ---

export type ElementType = 'PHYSICAL' | 'THERMAL' | 'CRYO' | 'VOLTAIC' | 'TOXIN';

export type StatusType = 
    | 'BURNING'      // Thermal DoT
    | 'FROZEN'       // Cryo Slow/Stop
    | 'SHOCKED'      // Voltaic Stun
    | 'POISONED'     // Toxin DoT
    | 'ARMOR_BROKEN' // Defense reduced
    | 'STUNNED';     // General inability to act

export interface StatusEffect {
    type: StatusType;
    stacks: number;      // 0 to 100
    duration: number;    // Time remaining in seconds
    decayAccumulator?: number; 
    sourceId?: number;
}

export type Polarity = 'ATTACK' | 'DEFENSE' | 'FUNCTION' | 'UNIVERSAL';

export interface UnitConfig {
    id: UnitType;
    name: string;
    baseStats: {
        hp: number;
        damage: number;
        range: number;
        speed: number;
        attackSpeed: number;
        width: number;
        height: number;
        color: number;
        armor: number;
    };
    baseCost: {
        biomass: number;
        larva: number;
        dna: number;
        time: number;
    };
    growthFactors: {
        hp: number;
        damage: number;
    };
    slots: {
        polarity: Polarity;
    }[];
    baseLoadCapacity: number;
    
    elementConfig?: {
        type: ElementType;
        statusPerHit?: number;
    };
    
    // v2.0 Composition System
    geneIds?: string[];
    tags?: string[];
}

export interface PluginStatModifier {
    stat: 'hp' | 'damage' | 'speed' | 'attackSpeed' | 'critChance' | 'critDamage' | 'elementalDmg';
    value: number; 
    isFlat?: boolean; 
    element?: ElementType;
}

export interface BioPluginConfig {
    id: string;
    name: string;
    description: string;
    polarity: Polarity;
    baseCost: number; 
    costPerRank: number;
    maxRank: number;
    rarity: 'COMMON' | 'RARE' | 'LEGENDARY';
    stats: PluginStatModifier[];
    statGrowth: number; 
}

// --- SAVE DATA ---

export interface Resources {
    biomass: number;
    enzymes: number; 
    larva: number;    
    dna: number;     
    mutagen: number;
}

export interface PluginInstance {
    instanceId: string;
    templateId: string;
    rank: number;
}

export interface UnitState {
    id: UnitType;
    level: number;
    loadout: (string | null)[];
    cap: number;
    capLevel: number;
    efficiencyLevel: number;
    isProducing: boolean;
    productionProgress: number;
}

export interface HiveState {
    unlockedUnits: Record<UnitType, UnitState>; 
    unitStockpile: Record<UnitType, number>;
    production: {
        larvaCapBase: number;      
        queenIntervalLevel: number;
        queenAmountLevel: number; 
        queenTimer: number;
    };
    metabolism: {
        villiCount: number;
        taprootCount: number;
        geyserCount: number;
        breakerCount: number;
        fermentingSacCount: number;
        refluxPumpCount: number;
        thermalCrackerCount: number;
        fleshBoilerCount: number;
        crackerHeat: number; 
        crackerOverheated: boolean;
        necroSiphonCount?: number;
        bloodFusionCount?: number;
        combatCortexCount?: number;
        redTideCount?: number;
        synapticResonatorCount?: number;
        geneArchiveCount?: number;
        gaiaDigesterCount?: number;
        entropyVentCount?: number;
        omegaPointCount?: number;
        thoughtSpireCount: number;
        hiveMindCount: number;
        akashicRecorderCount: number;
        spireAccumulator: number;
        storageCount: number;
        supplyCount: number;
    };
    inventory: {
        consumables: Record<string, number>;
        plugins: PluginInstance[];
    };
    globalBuffs: string[];
}

export interface RegionState {
    id: number;
    isUnlocked: boolean;
    devourProgress: number; 
}

export interface WorldState {
    currentRegionId: number;
    regions: Record<number, RegionState>;
}

export interface PlayerProfile {
    lastSaveTime: number;
    prestigeLevel: number;
    totalKills?: number;
    settings: {
        bgmVolume: number;
        sfxVolume: number;
    };
}

export interface GameSaveData {
    resources: Resources;
    hive: HiveState;
    world: WorldState;
    player: PlayerProfile;
}

// --- DTOs ---

export interface UnitRuntimeStats {
    hp: number;
    maxHp: number;
    damage: number;
    range: number;
    speed: number;
    attackSpeed: number;
    width: number;
    height: number;
    color: number;
    armor: number; 
    
    critChance: number;
    critDamage: number;
    element: ElementType;
}

export interface RoguelikeCard {
    id: string;
    name: string;
    description: string;
    rarity: 'COMMON' | 'RARE' | 'LEGENDARY';
    apply: (mods: GameModifiers) => void;
}

export interface GameModifiers {
    damageMultiplier: number;
    maxHpMultiplier: number;
    resourceRateMultiplier: number;
    explodeOnDeath: boolean;
    doubleSpawnChance: number;
}

export interface GameStateSnapshot {
    resources: number; 
    distance: number;
    unitCountZerg: number;
    unitCountHuman: number;
    
    stockpileMelee: number;
    stockpileRanged: number;
    stockpileTotal: number;
    populationCap: number; 
    
    activeZergCounts: Record<string, number>;
    isPaused: boolean;
}

export interface EnemySpawnConfig {
    type: UnitType;
    weight: number; 
}

export interface RegionData {
  id: number;
  name: string;
  x: number; 
  y: number; 
  difficultyMultiplier: number;
  spawnTable?: EnemySpawnConfig[]; 
  
  devourProgress: number;
  isUnlocked: boolean;
  isFighting: boolean;
}

// --- v2.0 GENE & ENGINE SYSTEM INTERFACES ---

export interface IGameEngine {
    // Systems
    spatialHash: {
        query: (x: number, y: number, radius: number, out: IUnit[]) => number;
    };
    // Utils
    _sharedQueryBuffer: IUnit[]; // Scratch pad for zero-alloc queries
    
    // Actions
    createExplosion: (x: number, y: number, radius: number, color?: number) => void;
    createFlash: (x: number, y: number, color: number) => void;
    createProjectile: (x1: number, y1: number, x2: number, y2: number, color: number) => void;
    createFloatingText: (x: number, y: number, text: string, color: number, fontSize?: number) => void;
    createDamagePop: (x: number, y: number, value: number, element: string) => void;
    
    dealTrueDamage: (target: IUnit, amount: number) => void;
    killUnit: (u: IUnit) => void;
    applyStatus: (target: IUnit, type: StatusType, stacks: number, duration: number) => void;
    processDamagePipeline: (source: IUnit, target: IUnit) => void;
}

export interface GeneTrait {
    id: string;
    name: string;
    
    // Lifecycle Hooks
    onTick?: (self: IUnit, dt: number, engine: IGameEngine) => void;
    onMove?: (self: IUnit, velocity: {x:number, y:number}, engine: IGameEngine) => void; // Modifies velocity in place
    onPreAttack?: (self: IUnit, target: IUnit, engine: IGameEngine) => boolean; // Return false to cancel default melee
    onHit?: (self: IUnit, target: IUnit, damage: number, engine: IGameEngine) => void;
    onDeath?: (self: IUnit, engine: IGameEngine) => void;
}

export interface IUnit {
    id: number;
    active: boolean;
    isDead: boolean;
    type: UnitType;
    faction: Faction;
    x: number;
    y: number;
    radius: number;
    
    // Compositional Stats
    stats: UnitRuntimeStats;
    // Runtime Context
    statuses: Partial<Record<StatusType, StatusEffect>>;
    attackCooldown: number;
    target: IUnit | null;
    flashTimer: number;
    
    // System
    view: any; // PIXI.Graphics
    genes: GeneTrait[];
    
    // State
    state: string;
    engagedCount: number;
    speedVar: number;
    waveOffset: number;
}
