
import { UnitType, UnitConfig, RegionData, GameSaveData, Faction, BioPluginConfig, Polarity, ElementType } from './types';

export const SCREEN_PADDING = 100;
export const LANE_Y = 0; 
export const FLOOR_Y = 100;
export const LANE_HEIGHT = 180; 
export const DECAY_TIME = 2.0; 
export const COLLISION_BUFFER = 10;
export const MILESTONE_DISTANCE = 1500;

// --- NEW: STAGE CONFIGURATION ---
export const STAGE_WIDTH = 1200; // Width of one "Sub-Level"
export const STAGE_TRANSITION_COOLDOWN = 2.0; // Seconds before checking win/loss again after a shift

// Caps and Rates
export const MAX_RESOURCES_BASE = 2000000; 
export const INITIAL_LARVA_CAP = 1000;
export const RESOURCE_TICK_RATE_BASE = 15; 
export const UNIT_UPGRADE_COST_BASE = 100;
export const RECYCLE_REFUND_RATE = 0.8; 

// --- CLICK CONFIG ---
export const CLICK_CONFIG = {
    BASE: 10.0,
    SCALING: 0.05
};

// --- NEW: PER-UNIT SCREEN CAPS (Local Battle Limits) ---
export const UNIT_SCREEN_CAPS: Record<UnitType, number> = {
    [UnitType.MELEE]: 200,      // Swarm
    [UnitType.RANGED]: 30,     // Support
    [UnitType.PYROVORE]: 15,   // Artillery
    [UnitType.CRYOLISK]: 15,   // Elite
    [UnitType.OMEGALIS]: 5,    // Heavy Tank (Massive)
    [UnitType.QUEEN]: 5,       // Support
    
    // Enemy Caps per type
    [UnitType.HUMAN_MARINE]: 30,
    [UnitType.HUMAN_RIOT]: 15,
    [UnitType.HUMAN_PYRO]: 10,
    [UnitType.HUMAN_SNIPER]: 10,
    [UnitType.HUMAN_TANK]: 5,
};

// UPGRADE COSTS
export const CAP_UPGRADE_BASE = 50;
export const EFFICIENCY_UPGRADE_BASE = 100;
export const QUEEN_UPGRADE_BASE = 200;

// --- STATUS CONSTANTS ---
export const STATUS_CONFIG = {
    MAX_STACKS: 100,
    DECAY_RATE: 15, // Stacks lost per second
    THRESHOLD_BURNING: 100,
    THRESHOLD_FROZEN: 100,
    THRESHOLD_SHOCK: 50,
    DOT_INTERVAL: 0.5, // Seconds between DoT ticks
    ARMOR_BREAK_DURATION: 999, // Effectively permanent until death

    // Interaction Thresholds (Refined)
    REACTION_THRESHOLD_MINOR: 50, // e.g. Thermal Shock requirement
    REACTION_THRESHOLD_MAJOR: 80, // e.g. Shatter requirement
};

// --- BATTLEFIELD CONFIGURATION ---

export const STRONGHOLDS = [400, 900, 1400];

export const OBSTACLES = [
    { x: 250, y: 0, radius: 35 },     
    { x: 600, y: -40, radius: 30 },   
    { x: 600, y: 40, radius: 30 },    
    { x: 1100, y: 0, radius: 50 },    
];

export const METABOLISM_FACILITIES = {
    // ==========================================
    // TIER 1: Matter
    // ==========================================
    VILLI: {
        NAME: "菌毯绒毛 (Villi)",
        DESC: "基础吸收。每100个提供 x1.25 全局乘区。",
        BASE_COST: 15,
        GROWTH: 1.15,
        BASE_RATE: 1.0,
        CLUSTER_THRESHOLD: 100,
        COST_RESOURCE: 'biomass'
    },
    TAPROOT: {
        NAME: "深钻根须 (Taproot)",
        DESC: "深层供养。使绒毛基础产出 +0.1。",
        BASE_COST: 500,
        GROWTH: 1.25,
        BASE_RATE: 0,
        BONUS_TO_VILLI: 0.1,
        COST_RESOURCE: 'biomass'
    },
    GEYSER: {
        NAME: "酸蚀喷泉 (Acid Geyser)",
        DESC: "工业基石。提供稳定的生物质流。",
        BASE_COST: 12000,
        GROWTH: 1.15,
        BASE_RATE: 85.0,
        COST_RESOURCE: 'biomass'
    },
    BREAKER: {
        NAME: "地壳破碎机 (Crust Breaker)",
        DESC: "过载开采。产出极高，每秒流失 0.05% 库存。",
        BASE_COST: 150000,
        GROWTH: 1.30,
        BASE_RATE: 3500.0,
        LOSS_RATE: 0.0005, // 0.05%
        COST_RESOURCE: 'biomass'
    },
    
    // ==========================================
    // TIER 2: Energy
    // ==========================================
    SAC: {
        NAME: "发酵囊 (Fermentation Sac)",
        DESC: "基础转化：100 Bio -> 1 Enz。",
        BASE_COST: 10000,
        GROWTH: 1.15,
        INPUT: 100, 
        OUTPUT: 1,
        COST_RESOURCE: 'biomass'
    },
    PUMP: {
        NAME: "回流泵 (Reflux Pump)",
        DESC: "效率优化：减少发酵囊 2 消耗 (Min 50)。",
        BASE_COST: 2500,
        GROWTH: 1.25,
        COST_REDUCTION: 2,
        MIN_COST: 50,
        COST_RESOURCE: 'enzymes'
    },
    CRACKER: {
        NAME: "热能裂解堆 (Thermal Cracker)",
        DESC: "高压裂变：500 Bio -> 15 Enz (产生热量)。",
        BASE_COST: 25000,
        GROWTH: 1.20,
        INPUT: 500,
        OUTPUT: 15, 
        HEAT_GEN: 5,
        COOL_RATE: 8,
        COST_RESOURCE: 'enzymes'
    },
    BOILER: {
        NAME: "血肉锅炉 (Flesh Boiler)",
        DESC: "回收利用：1 幼虫 -> 500 Enz。",
        BASE_COST: 100000,
        GROWTH: 1.30,
        INPUT_LARVA: 1,
        OUTPUT_ENZ: 500,
        COST_RESOURCE: 'enzymes'
    },
    
    // TIER 3+
    NECRO_SIPHON: {
        NAME: "尸骸转化冢 (Necro Siphon)",
        DESC: "战争红利。产出 = 基础值 + 累计击杀数 * 10。",
        BASE_COST: 1500000, 
        GROWTH: 1.40,
        BASE_RATE: 500.0,
        KILL_SCALAR: 10.0,
        COST_RESOURCE: 'biomass'
    },
    RED_TIDE: {
        NAME: "红潮藻井 (Red Tide Silo)",
        DESC: "生态协同。产出 = 基础值 * (1 + 绒毛数量/50)。",
        BASE_COST: 50000000, 
        GROWTH: 1.60,
        BASE_RATE: 15000.0,
        COST_RESOURCE: 'biomass'
    },
    GAIA_DIGESTER: {
        NAME: "盖亚消化池 (Gaia Digester)",
        DESC: "星球吞噬。产出 = 50 * (当前库存)^0.8。",
        BASE_COST: 5000000000, 
        GROWTH: 2.00, 
        POW_FACTOR: 0.8,
        COEFF: 50.0,
        COST_RESOURCE: 'biomass'
    },
    
    BLOOD_FUSION: {
        NAME: "鲜血聚变堆 (Blood Fusion)",
        DESC: "内循环。每秒吞噬 1 只近战兵种 -> 转化 2000 Enz。",
        BASE_COST: 500000, 
        GROWTH: 1.50,
        INPUT_UNIT: 'MELEE',
        OUTPUT_ENZ: 2000,
        COST_RESOURCE: 'enzymes'
    },
    RESONATOR: {
        NAME: "突触谐振塔 (Synaptic Resonator)",
        DESC: "大数定律。产出 = √总人口 * 500。",
        BASE_COST: 10000000, 
        GROWTH: 1.45,
        POP_SCALAR: 500,
        COST_RESOURCE: 'enzymes'
    },
    ENTROPY_VENT: {
        NAME: "熵增排放口 (Entropy Vent)",
        DESC: "双曲贴现。每秒燃烧 1% Bio库存 -> 5x 等价 Enz。",
        BASE_COST: 1000000000, 
        GROWTH: 2.50,
        BURN_RATE: 0.01,
        CONVERT_RATIO: 5.0,
        COST_RESOURCE: 'enzymes'
    },

    // ==========================================
    // DATA (DNA)
    // ==========================================
    SPIRE: {
        NAME: "神经尖塔 (Neural Spire)",
        DESC: "基础解析：产生微量 DNA (0.005/s)。",
        BASE_COST: 5000,
        GROWTH: 1.25,
        BASE_RATE: 0.005,
        COST_RESOURCE: 'enzymes'
    },
    HIVE_MIND: {
        NAME: "虫群意识网 (Hive Mind)",
        DESC: "思维共鸣：产出 = 0.001 * √总兵力。",
        BASE_COST: 50000,
        GROWTH: 1.40,
        SCALAR: 0.001,
        COST_RESOURCE: 'enzymes'
    },
    RECORDER: {
        NAME: "阿卡西记录 (Akashic Recorder)",
        DESC: "概率跃迁：15% 概率复制 1% DNA。",
        BASE_COST: 250000,
        GROWTH: 1.50,
        CHANCE: 0.15,
        PERCENT: 0.01,
        COST_RESOURCE: 'enzymes'
    },
    COMBAT_CORTEX: {
        NAME: "前线皮质 (Combat Cortex)",
        DESC: "战意解析。基于当前交战单位数产出 DNA。",
        BASE_COST: 1000000,
        GROWTH: 1.50,
        BASE_RATE: 0.5,
        COST_RESOURCE: 'enzymes'
    },
    GENE_ARCHIVE: {
        NAME: "基因档案馆 (Gene Archive)",
        DESC: "代际传承。解锁元进度折扣 (暂未实装)。",
        BASE_COST: 10000000,
        GROWTH: 2.00,
        COST_RESOURCE: 'enzymes'
    },
    OMEGA_POINT: {
        NAME: "欧米茄演算机 (Omega Point)",
        DESC: "终局计算。重置获取系数 10 -> 15。",
        BASE_COST: 500000000,
        GROWTH: 5.00,
        COST_RESOURCE: 'enzymes'
    },

    // 基础设施
    STORAGE: { NAME: "能量泵 (Storage)", DESC: "扩充资源上限。", BASE_COST: 100, GROWTH: 1.5, CAP_PER_LEVEL: 10000, COST_RESOURCE: 'biomass' },
    SUPPLY: { NAME: "突触网络 (Supply)", DESC: "扩充兵力上限。", BASE_COST: 250, GROWTH: 1.5, CAP_PER_LEVEL: 50, COST_RESOURCE: 'biomass' }
};

// --- CONFIG TABLES ---

export const PLAYABLE_UNITS = [
    UnitType.MELEE, 
    UnitType.RANGED, 
    UnitType.CRYOLISK,
    UnitType.PYROVORE,
    UnitType.OMEGALIS,
    UnitType.QUEEN
];

export const UNIT_CONFIGS: Record<UnitType, UnitConfig> = {
  [UnitType.MELEE]: {
    id: UnitType.MELEE,
    name: '跳虫 (Zergling)',
    baseStats: {
        hp: 60, damage: 15, range: 30, speed: 180, attackSpeed: 0.4,
        width: 24, height: 24, color: 0x3b82f6, armor: 0
    },
    baseCost: { biomass: 15, larva: 1, dna: 0, time: 2.0 },
    growthFactors: { hp: 0.2, damage: 0.2 },
    baseLoadCapacity: 30,
    slots: [{ polarity: 'ATTACK' }, { polarity: 'DEFENSE' }, { polarity: 'ATTACK' }, { polarity: 'FUNCTION' }, { polarity: 'UNIVERSAL' }],
    elementConfig: { type: 'PHYSICAL' },
    geneIds: ['GENE_MELEE_ATTACK', 'GENE_SWARM_MOVEMENT']
  },
  [UnitType.RANGED]: {
    id: UnitType.RANGED,
    name: '刺蛇 (Hydralisk)',
    baseStats: {
        hp: 45, damage: 30, range: 220, speed: 130, attackSpeed: 1.0,
        width: 20, height: 30, color: 0x8b5cf6, armor: 5
    },
    baseCost: { biomass: 25, larva: 1, dna: 0, time: 4.0 },
    growthFactors: { hp: 0.15, damage: 0.25 },
    baseLoadCapacity: 30,
    slots: [{ polarity: 'ATTACK' }, { polarity: 'DEFENSE' }, { polarity: 'FUNCTION' }, { polarity: 'FUNCTION' }, { polarity: 'UNIVERSAL' }],
    elementConfig: { type: 'TOXIN', statusPerHit: 10 },
    geneIds: ['GENE_RANGED_ATTACK', 'GENE_ELEMENTAL_HIT']
  },
  [UnitType.PYROVORE]: {
    id: UnitType.PYROVORE,
    name: '爆裂虫 (Pyrovore)',
    baseStats: {
        hp: 120, damage: 45, range: 280, speed: 90, attackSpeed: 0.8,
        width: 28, height: 28, color: 0xf87171, armor: 5
    },
    baseCost: { biomass: 60, larva: 1, dna: 0, time: 5.0 },
    growthFactors: { hp: 0.15, damage: 0.3 },
    baseLoadCapacity: 40,
    slots: [{ polarity: 'ATTACK' }, { polarity: 'ATTACK' }, { polarity: 'FUNCTION' }],
    elementConfig: { type: 'THERMAL', statusPerHit: 20 },
    geneIds: ['GENE_ARTILLERY_ATTACK', 'GENE_ELEMENTAL_HIT']
  },
  [UnitType.CRYOLISK]: {
    id: UnitType.CRYOLISK,
    name: '冰牙兽 (Cryolisk)',
    baseStats: {
        hp: 180, damage: 12, range: 40, speed: 220, attackSpeed: 2.5, // High APM
        width: 22, height: 22, color: 0x60a5fa, armor: 10
    },
    baseCost: { biomass: 40, larva: 1, dna: 0, time: 3.0 },
    growthFactors: { hp: 0.2, damage: 0.1 },
    baseLoadCapacity: 35,
    slots: [{ polarity: 'FUNCTION' }, { polarity: 'FUNCTION' }, { polarity: 'DEFENSE' }],
    elementConfig: { type: 'CRYO', statusPerHit: 8 },
    geneIds: ['GENE_MELEE_ATTACK', 'GENE_ELEMENTAL_HIT', 'GENE_FAST_MOVEMENT']
  },
  [UnitType.OMEGALIS]: {
    id: UnitType.OMEGALIS,
    name: '雷兽 (Omegalis)',
    baseStats: {
        hp: 800, damage: 30, range: 50, speed: 70, attackSpeed: 0.6,
        width: 45, height: 45, color: 0xfacc15, armor: 60
    },
    baseCost: { biomass: 300, larva: 2, dna: 10, time: 15.0 }, 
    growthFactors: { hp: 0.4, damage: 0.1 },
    baseLoadCapacity: 80,
    slots: [{ polarity: 'DEFENSE' }, { polarity: 'DEFENSE' }, { polarity: 'UNIVERSAL' }, { polarity: 'UNIVERSAL' }],
    elementConfig: { type: 'VOLTAIC', statusPerHit: 25 },
    geneIds: ['GENE_CLEAVE_ATTACK', 'GENE_ELEMENTAL_HIT', 'GENE_REGEN']
  },
  [UnitType.QUEEN]: {
    id: UnitType.QUEEN,
    name: '虫后 (Queen)',
    baseStats: {
        hp: 300, damage: 10, range: 100, speed: 50, attackSpeed: 1.0,
        width: 32, height: 48, color: 0xd946ef, armor: 20
    },
    baseCost: { biomass: 150, larva: 1, dna: 0, time: 10.0 }, 
    growthFactors: { hp: 0.1, damage: 0.1 },
    baseLoadCapacity: 50,
    slots: [{ polarity: 'UNIVERSAL' }, { polarity: 'FUNCTION' }, { polarity: 'DEFENSE' }],
    geneIds: ['GENE_RANGED_ATTACK', 'GENE_REGEN']
  },
  // Humans
  [UnitType.HUMAN_MARINE]: {
      id: UnitType.HUMAN_MARINE,
      name: '步枪兵 (Marine)',
      baseStats: { hp: 80, damage: 15, range: 200, speed: 0, attackSpeed: 1.0, width: 20, height: 32, color: 0x9ca3af, armor: 10 },
      baseCost: {} as any, growthFactors: {} as any, slots: [], baseLoadCapacity: 0,
      elementConfig: { type: 'PHYSICAL' },
      geneIds: ['GENE_RANGED_ATTACK']
  },
  [UnitType.HUMAN_RIOT]: {
      id: UnitType.HUMAN_RIOT,
      name: '防暴盾卫 (Riot)',
      baseStats: { hp: 300, damage: 10, range: 50, speed: 0, attackSpeed: 1.5, width: 30, height: 34, color: 0x1e3a8a, armor: 50 },
      baseCost: {} as any, growthFactors: {} as any, slots: [], baseLoadCapacity: 0,
      elementConfig: { type: 'PHYSICAL' },
      geneIds: ['GENE_MELEE_ATTACK']
  },
  [UnitType.HUMAN_PYRO]: {
      id: UnitType.HUMAN_PYRO,
      name: '火焰兵 (Pyro)',
      baseStats: { hp: 150, damage: 5, range: 120, speed: 0, attackSpeed: 0.1, width: 24, height: 32, color: 0xea580c, armor: 20 },
      baseCost: {} as any, growthFactors: {} as any, slots: [], baseLoadCapacity: 0,
      elementConfig: { type: 'THERMAL', statusPerHit: 5 },
      geneIds: ['GENE_RANGED_ATTACK', 'GENE_ELEMENTAL_HIT']
  },
  [UnitType.HUMAN_SNIPER]: {
      id: UnitType.HUMAN_SNIPER,
      name: '狙击手 (Sniper)',
      baseStats: { hp: 60, damage: 100, range: 500, speed: 0, attackSpeed: 3.5, width: 18, height: 30, color: 0x166534, armor: 5 },
      baseCost: {} as any, growthFactors: {} as any, slots: [], baseLoadCapacity: 0,
      elementConfig: { type: 'PHYSICAL' },
      geneIds: ['GENE_RANGED_ATTACK']
  },
  [UnitType.HUMAN_TANK]: {
      id: UnitType.HUMAN_TANK,
      name: '步行机甲 (Mech)',
      baseStats: { hp: 1500, damage: 60, range: 250, speed: 0, attackSpeed: 2.0, width: 50, height: 60, color: 0x475569, armor: 80 },
      baseCost: {} as any, growthFactors: {} as any, slots: [], baseLoadCapacity: 0,
      elementConfig: { type: 'VOLTAIC', statusPerHit: 25 },
      geneIds: ['GENE_RANGED_ATTACK', 'GENE_ELEMENTAL_HIT']
  }
};

export const BIO_PLUGINS: Record<string, BioPluginConfig> = {
    'chitin_growth': {
        id: 'chitin_growth', name: '几丁质增生', description: '硬化甲壳', polarity: 'DEFENSE',
        baseCost: 6, costPerRank: 1, maxRank: 5, rarity: 'COMMON',
        stats: [{ stat: 'hp', value: 0.2 }], statGrowth: 1 
    },
    'toxin_sac': {
        id: 'toxin_sac', name: '腐蚀腺体', description: '攻击附带剧毒', polarity: 'ATTACK',
        baseCost: 8, costPerRank: 2, maxRank: 5, rarity: 'COMMON',
        stats: [{ stat: 'elementalDmg', value: 5, element: 'TOXIN', isFlat: true }], statGrowth: 0.5 
    },
    'pyro_gland': {
        id: 'pyro_gland', name: '放热腺体', description: '攻击附带热能灼烧', polarity: 'ATTACK',
        baseCost: 12, costPerRank: 2, maxRank: 5, rarity: 'RARE',
        stats: [{ stat: 'elementalDmg', value: 3, element: 'THERMAL', isFlat: true }], statGrowth: 0.5
    },
    'metabolic_boost': {
        id: 'metabolic_boost', name: '代谢加速', description: '移动速度提升', polarity: 'FUNCTION',
        baseCost: 5, costPerRank: 1, maxRank: 3, rarity: 'COMMON',
        stats: [{ stat: 'speed', value: 0.15 }], statGrowth: 0.5
    },
    'adrenal_surge': {
        id: 'adrenal_surge', name: '肾上腺激增', description: '攻速大幅提升，但降低防御', polarity: 'ATTACK',
        baseCost: 15, costPerRank: 3, maxRank: 5, rarity: 'RARE',
        stats: [{ stat: 'attackSpeed', value: 0.25 }, { stat: 'hp', value: -0.1 }], statGrowth: 0.2
    }
};
export { BIO_PLUGINS as EXISTING_PLUGINS } from './constants'; 

export const ELEMENT_COLORS: Record<ElementType, number> = {
    PHYSICAL: 0xffffff,
    TOXIN: 0x4ade80,   // Green
    THERMAL: 0xf87171, // Red/Orange
    CRYO: 0x60a5fa,    // Blue
    VOLTAIC: 0xfacc15  // Yellow
};

export const INITIAL_REGIONS_CONFIG: RegionData[] = [
  { 
      id: 1, name: "第七区贫民窟", x: 10, y: 50, difficultyMultiplier: 1.0, devourProgress: 0, isUnlocked: true, isFighting: false,
      spawnTable: [
          { type: UnitType.HUMAN_MARINE, weight: 1.0 }
      ]
  },
  { 
      id: 2, name: "工业污染区", x: 25, y: 30, difficultyMultiplier: 1.2, devourProgress: 0, isUnlocked: false, isFighting: false,
      spawnTable: [
          { type: UnitType.HUMAN_MARINE, weight: 0.7 },
          { type: UnitType.HUMAN_PYRO, weight: 0.3 }
      ]
  },
  { 
      id: 3, name: "地下铁枢纽", x: 30, y: 70, difficultyMultiplier: 1.3, devourProgress: 0, isUnlocked: false, isFighting: false,
      spawnTable: [
          { type: UnitType.HUMAN_MARINE, weight: 0.5 },
          { type: UnitType.HUMAN_RIOT, weight: 0.5 }
      ]
  },
  { 
      id: 4, name: "中央公园", x: 45, y: 50, difficultyMultiplier: 1.5, devourProgress: 0, isUnlocked: false, isFighting: false,
      spawnTable: [
          { type: UnitType.HUMAN_MARINE, weight: 0.4 },
          { type: UnitType.HUMAN_RIOT, weight: 0.3 },
          { type: UnitType.HUMAN_SNIPER, weight: 0.3 }
      ]
  },
  { 
      id: 5, name: "99号高速公路", x: 55, y: 20, difficultyMultiplier: 1.8, devourProgress: 0, isUnlocked: false, isFighting: false,
      spawnTable: [
          { type: UnitType.HUMAN_RIOT, weight: 0.4 },
          { type: UnitType.HUMAN_PYRO, weight: 0.4 },
          { type: UnitType.HUMAN_MARINE, weight: 0.2 }
      ]
  },
  { 
      id: 6, name: "生物实验室", x: 60, y: 80, difficultyMultiplier: 2.0, devourProgress: 0, isUnlocked: false, isFighting: false,
      spawnTable: [
          { type: UnitType.HUMAN_MARINE, weight: 0.5 },
          { type: UnitType.HUMAN_SNIPER, weight: 0.4 },
          { type: UnitType.HUMAN_TANK, weight: 0.1 }
      ]
  },
  { 
      id: 7, name: "军事前哨站", x: 75, y: 40, difficultyMultiplier: 2.5, devourProgress: 0, isUnlocked: false, isFighting: false,
      spawnTable: [
          { type: UnitType.HUMAN_RIOT, weight: 0.3 },
          { type: UnitType.HUMAN_TANK, weight: 0.2 },
          { type: UnitType.HUMAN_MARINE, weight: 0.5 }
      ]
  },
  { 
      id: 8, name: "内城区", x: 80, y: 65, difficultyMultiplier: 3.0, devourProgress: 0, isUnlocked: false, isFighting: false,
      spawnTable: [
          { type: UnitType.HUMAN_PYRO, weight: 0.4 },
          { type: UnitType.HUMAN_TANK, weight: 0.3 },
          { type: UnitType.HUMAN_SNIPER, weight: 0.3 }
      ]
  },
  { 
      id: 9, name: "联合指挥中心", x: 90, y: 50, difficultyMultiplier: 4.0, devourProgress: 0, isUnlocked: false, isFighting: false,
      spawnTable: [
          { type: UnitType.HUMAN_TANK, weight: 0.6 },
          { type: UnitType.HUMAN_RIOT, weight: 0.4 }
      ]
  },
  { 
      id: 10, name: "最后的方舟", x: 95, y: 20, difficultyMultiplier: 5.0, devourProgress: 0, isUnlocked: false, isFighting: false,
      spawnTable: [
          { type: UnitType.HUMAN_MARINE, weight: 0.1 },
          { type: UnitType.HUMAN_RIOT, weight: 0.1 },
          { type: UnitType.HUMAN_PYRO, weight: 0.1 },
          { type: UnitType.HUMAN_SNIPER, weight: 0.1 },
          { type: UnitType.HUMAN_TANK, weight: 0.6 }
      ]
  },
];

export const INITIAL_GAME_STATE: GameSaveData = {
    resources: { biomass: 50, enzymes: 0, larva: 1000, dna: 0, mutagen: 0 },
    hive: {
        unlockedUnits: {
            [UnitType.MELEE]: { 
                id: UnitType.MELEE, level: 1, loadout: [null, null, null, null, null],
                cap: 300, capLevel: 1, efficiencyLevel: 1, isProducing: true, productionProgress: 0
            },
            [UnitType.RANGED]: { 
                id: UnitType.RANGED, level: 1, loadout: [null, null, null, null, null],
                cap: 150, capLevel: 1, efficiencyLevel: 1, isProducing: true, productionProgress: 0
            },
            [UnitType.PYROVORE]: { 
                id: UnitType.PYROVORE, level: 1, loadout: [null, null, null],
                cap: 50, capLevel: 1, efficiencyLevel: 1, isProducing: true, productionProgress: 0
            },
            [UnitType.CRYOLISK]: { 
                id: UnitType.CRYOLISK, level: 1, loadout: [null, null, null],
                cap: 50, capLevel: 1, efficiencyLevel: 1, isProducing: true, productionProgress: 0
            },
            [UnitType.OMEGALIS]: { 
                id: UnitType.OMEGALIS, level: 1, loadout: [null, null, null, null],
                cap: 10, capLevel: 1, efficiencyLevel: 1, isProducing: true, productionProgress: 0
            },
            [UnitType.QUEEN]: { 
                id: UnitType.QUEEN, level: 1, loadout: [null, null, null],
                cap: 10, capLevel: 1, efficiencyLevel: 1, isProducing: true, productionProgress: 0
            },
            
            [UnitType.HUMAN_MARINE]: { id: UnitType.HUMAN_MARINE, level: 0, loadout: [], cap:0, capLevel:0, efficiencyLevel:0, isProducing:false, productionProgress:0 },
            [UnitType.HUMAN_RIOT]: { id: UnitType.HUMAN_RIOT, level: 0, loadout: [], cap:0, capLevel:0, efficiencyLevel:0, isProducing:false, productionProgress:0 },
            [UnitType.HUMAN_PYRO]: { id: UnitType.HUMAN_PYRO, level: 0, loadout: [], cap:0, capLevel:0, efficiencyLevel:0, isProducing:false, productionProgress:0 },
            [UnitType.HUMAN_SNIPER]: { id: UnitType.HUMAN_SNIPER, level: 0, loadout: [], cap:0, capLevel:0, efficiencyLevel:0, isProducing:false, productionProgress:0 },
            [UnitType.HUMAN_TANK]: { id: UnitType.HUMAN_TANK, level: 0, loadout: [], cap:0, capLevel:0, efficiencyLevel:0, isProducing:false, productionProgress:0 },
        },
        unitStockpile: {
            [UnitType.MELEE]: 50, 
            [UnitType.RANGED]: 20,
            [UnitType.PYROVORE]: 0,
            [UnitType.CRYOLISK]: 0,
            [UnitType.OMEGALIS]: 0,
            [UnitType.QUEEN]: 1, 
            [UnitType.HUMAN_MARINE]: 0,
            [UnitType.HUMAN_RIOT]: 0,
            [UnitType.HUMAN_PYRO]: 0,
            [UnitType.HUMAN_SNIPER]: 0,
            [UnitType.HUMAN_TANK]: 0,
        },
        production: {
            larvaCapBase: 1000,
            queenIntervalLevel: 1,
            queenAmountLevel: 1,
            queenTimer: 0
        },
        metabolism: {
            villiCount: 1, 
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
            
            // New facilities init
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
            plugins: [
                { instanceId: 'starter_1', templateId: 'chitin_growth', rank: 0 },
            ] 
        },
        globalBuffs: []
    },
    world: {
        currentRegionId: 1,
        regions: { 1: { id: 1, isUnlocked: true, devourProgress: 0 } }
    },
    player: {
        lastSaveTime: Date.now(),
        prestigeLevel: 0,
        totalKills: 0,
        settings: { bgmVolume: 1, sfxVolume: 1 }
    }
};
