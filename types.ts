

export enum Faction {
  ZERG = 'ZERG',
  HUMAN = 'HUMAN',
}

export enum UnitType {
  // --- ORIGINAL ---
  MELEE = 'MELEE',
  RANGED = 'RANGED',
  QUEEN = 'QUEEN',
  PYROVORE = 'PYROVORE', 
  CRYOLISK = 'CRYOLISK', 
  OMEGALIS = 'OMEGALIS', 
  
  // --- TIER 1: SWARM ---
  ZERGLING_RAPTOR = 'ZERGLING_RAPTOR',
  EMBER_MITE = 'EMBER_MITE',
  SPARK_FLY = 'SPARK_FLY',
  FROST_WEEVIL = 'FROST_WEEVIL',
  ACID_MAGGOT = 'ACID_MAGGOT',

  // --- TIER 2: SPECIALIST ---
  LIGHTNING_SKINK = 'LIGHTNING_SKINK',
  SPINE_HURLER = 'SPINE_HURLER',
  MAGMA_GOLEM = 'MAGMA_GOLEM',
  PLAGUE_BEARER = 'PLAGUE_BEARER',

  // --- TIER 3: ELITE ---
  WINTER_WITCH = 'WINTER_WITCH',

  // --- TIER 4: TITAN ---
  TYRANT_REX = 'TYRANT_REX',
  TEMPEST_LEVIATHAN = 'TEMPEST_LEVIATHAN',

  // --- HUMANS ---
  HUMAN_MARINE = 'HUMAN_MARINE',     
  HUMAN_RIOT = 'HUMAN_RIOT',         
  HUMAN_PYRO = 'HUMAN_PYRO',         
  HUMAN_SNIPER = 'HUMAN_SNIPER',     
  HUMAN_TANK = 'HUMAN_TANK',         
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

export type ElementType = 'PHYSICAL' | 'THERMAL' | 'CRYO' | 'VOLTAIC' | 'TOXIN';

export type StatusType = 
    | 'BURNING'      
    | 'FROZEN'       
    | 'SHOCKED'      
    | 'POISONED'     
    | 'ARMOR_BROKEN' 
    | 'STUNNED'
    | 'FRENZY'       
    | 'SLOWED';

export interface StatusEffect {
    type: StatusType;
    stacks: number;      
    duration: number;    
    decayAccumulator?: number; 
    sourceId?: number;
}

export type Polarity = 'ATTACK' | 'DEFENSE' | 'FUNCTION' | 'UNIVERSAL';

// v2.0: Parameterized Gene Config
export interface GeneConfig {
    id: string;
    params?: Record<string, any>;
}

export type VisualShapeType = 'CIRCLE' | 'RECT' | 'ROUNDED_RECT' | 'MODEL_QUEEN';

export interface VisualShapeDef {
    type: VisualShapeType;
    color?: number;     // Override unit color
    colorDarken?: number; // Multiplier to darken (0-1)
    widthPct?: number;  // % of unit.width (1.0 = 100%)
    heightPct?: number; // % of unit.height
    radiusPct?: number; // % of unit.width
    xOffPct?: number;   // % of unit.width offset from center
    yOffPct?: number;   // % of unit.height offset from bottom
    cornerRadius?: number;
    rotation?: number; // Degrees
}

export interface UnitVisualConfig {
    shadowScale?: number;
    shapes: VisualShapeDef[];
}

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
    genes?: GeneConfig[];
    visual?: UnitVisualConfig; // v2.1: Data-driven visuals
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
    lifetimeDna?: number; // For Prestige calculation
    mutationUpgrades?: {
        metabolicSurge: number;
        larvaFission: number;
        geneticMemory: boolean;
    };
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
    _sharedQueryBuffer: IUnit[]; 
    isStockpileMode: boolean; // Exposed for Genes
    
    // Actions
    createExplosion: (x: number, y: number, radius: number, color?: number) => void;
    createFlash: (x: number, y: number, color: number) => void;
    createProjectile: (x1: number, y1: number, x2: number, y2: number, color: number) => void;
    createFloatingText: (x: number, y: number, text: string, color: number, fontSize?: number) => void;
    createDamagePop: (x: number, y: number, value: number, element: string) => void;
    
    // New VFX Methods
    createSlash: (x: number, y: number, targetX: number, targetY: number, color: number) => void;
    createShockwave: (x: number, y: number, radius: number, color: number) => void;
    createParticles: (x: number, y: number, color: number, count: number) => void;
    createHealEffect: (x: number, y: number) => void;
    
    dealTrueDamage: (target: IUnit, amount: number) => void;
    killUnit: (u: IUnit) => void;
    applyStatus: (target: IUnit, type: StatusType, stacks: number, duration: number) => void;
    processDamagePipeline: (source: IUnit, target: IUnit) => void;
    performAttack: (source: IUnit, target: IUnit) => void;
    
    // New: Unit Spawning Hook
    spawnUnit: (faction: Faction, type: UnitType, x: number) => IUnit | null;
}

export interface GeneTrait {
    id: string;
    name: string;
    
    // Lifecycle Hooks
    onTick?: (self: IUnit, dt: number, engine: IGameEngine, params: any) => void;
    
    // Movement Logic
    onMove?: (self: IUnit, velocity: {x:number, y:number}, dt: number, engine: IGameEngine, params: any) => void; 
    
    // Targeting Logic
    onUpdateTarget?: (self: IUnit, dt: number, engine: IGameEngine, params: any) => void;
    
    // Combat Hooks
    onPreAttack?: (self: IUnit, target: IUnit, engine: IGameEngine, params: any) => boolean; 
    onHit?: (self: IUnit, target: IUnit, damage: number, engine: IGameEngine, params: any) => void;
    onDeath?: (self: IUnit, engine: IGameEngine, params: any) => void;

    // [New] Defensive Hook: Allows modification of incoming damage
    onWasHit?: (self: IUnit, attacker: IUnit, damage: number, engine: IGameEngine, params: any) => number;
    // [New] Kill Hook: Triggered when self kills a victim
    onKill?: (self: IUnit, victim: IUnit, engine: IGameEngine, params: any) => void;
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
    context: Record<string, any>; // v2.1: Data Blackboard for Genes
    attackCooldown: number;
    target: IUnit | null;
    flashTimer: number;
    
    // Runtime Fields
    decayTimer: number;
    wanderTimer: number;
    wanderDir: number;
    engagedCount: number;
    speedVar: number;
    waveOffset: number;
    
    // Optimization & Physics Fields (v2.0)
    frameOffset: number; 
    steeringForce: { x: number, y: number }; // Sample-and-Hold force for Boids
    
    // System
    view: any; 
    geneConfig: GeneConfig[];
    
    // State
    state: string;
}