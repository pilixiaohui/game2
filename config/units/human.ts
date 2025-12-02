import { UnitType, UnitConfig } from '../../types';

export const HUMAN_UNIT_CONFIGS: Partial<Record<UnitType, UnitConfig>> = {
  [UnitType.HUMAN_MARINE]: {
      id: UnitType.HUMAN_MARINE,
      name: '步枪兵 (Marine)',
      baseStats: { hp: 80, damage: 15, range: 200, speed: 0, attackSpeed: 1.0, width: 20, height: 32, color: 0x9ca3af, armor: 10 },
      baseCost: {} as any, growthFactors: {} as any, slots: [], baseLoadCapacity: 0,
      elementConfig: { type: 'PHYSICAL' },
      visual: { shapes: [{ type: 'RECT', widthPct: 1, heightPct: 1 }] },
      genes: [
          { id: 'GENE_ACQUIRE_TARGET', params: { range: 500 } },
          { id: 'GENE_AUTO_ATTACK', params: {} },
          { id: 'GENE_RANGED_ATTACK', params: {} },
          { id: 'GENE_BOIDS', params: { separationRadius: 30, separationForce: 200.0, cohesionWeight: 0.0 } }
      ]
  },
  [UnitType.HUMAN_RIOT]: {
      id: UnitType.HUMAN_RIOT,
      name: '防暴盾卫 (Riot)',
      baseStats: { hp: 300, damage: 10, range: 50, speed: 0, attackSpeed: 1.5, width: 30, height: 34, color: 0x1e3a8a, armor: 50 },
      baseCost: {} as any, growthFactors: {} as any, slots: [], baseLoadCapacity: 0,
      elementConfig: { type: 'PHYSICAL' },
      visual: { shapes: [{ type: 'RECT', widthPct: 1, heightPct: 1 }, { type: 'RECT', widthPct: 0.4, heightPct: 1.2, xOffPct: -0.6, colorDarken: 0.2 }] },
      genes: [
          { id: 'GENE_ACQUIRE_TARGET', params: { range: 500 } },
          { id: 'GENE_AUTO_ATTACK', params: {} },
          { id: 'GENE_MELEE_ATTACK', params: {} },
          { id: 'GENE_HARDENED_SKIN', params: { amount: 5 } },
          { id: 'GENE_BOIDS', params: { separationRadius: 35, separationForce: 250.0, cohesionWeight: 0.0 } }
      ]
  },
  [UnitType.HUMAN_PYRO]: {
      id: UnitType.HUMAN_PYRO,
      name: '火焰兵 (Pyro)',
      baseStats: { hp: 150, damage: 5, range: 120, speed: 0, attackSpeed: 0.1, width: 24, height: 32, color: 0xea580c, armor: 20 },
      baseCost: {} as any, growthFactors: {} as any, slots: [], baseLoadCapacity: 0,
      elementConfig: { type: 'THERMAL', statusPerHit: 5 },
      visual: { shapes: [{ type: 'RECT', widthPct: 1, heightPct: 1 }] },
      genes: [
          { id: 'GENE_ACQUIRE_TARGET', params: { range: 500 } },
          { id: 'GENE_AUTO_ATTACK', params: {} },
          { id: 'GENE_ARTILLERY_ATTACK', params: { arcHeight: 10 } }, 
          { id: 'GENE_ELEMENTAL_HIT', params: {} },
          { id: 'GENE_BOIDS', params: { separationRadius: 30, separationForce: 200.0, cohesionWeight: 0.0 } }
      ]
  },
  [UnitType.HUMAN_SNIPER]: {
      id: UnitType.HUMAN_SNIPER,
      name: '狙击手 (Sniper)',
      baseStats: { hp: 60, damage: 100, range: 500, speed: 0, attackSpeed: 3.5, width: 18, height: 30, color: 0x166534, armor: 5 },
      baseCost: {} as any, growthFactors: {} as any, slots: [], baseLoadCapacity: 0,
      elementConfig: { type: 'PHYSICAL' },
      visual: { shapes: [{ type: 'RECT', widthPct: 1, heightPct: 1 }] },
      genes: [
          { id: 'GENE_ACQUIRE_TARGET', params: { range: 600 } },
          { id: 'GENE_AUTO_ATTACK', params: {} },
          { id: 'GENE_RANGED_ATTACK', params: { projectileSpeed: 20 } },
          { id: 'GENE_EXECUTE', params: { threshold: 0.5, multiplier: 2.0 } },
          { id: 'GENE_BOIDS', params: { separationRadius: 25, separationForce: 200.0, cohesionWeight: 0.0 } }
      ]
  },
  [UnitType.HUMAN_TANK]: {
      id: UnitType.HUMAN_TANK,
      name: '步行机甲 (Mech)',
      baseStats: { hp: 1500, damage: 60, range: 250, speed: 0, attackSpeed: 2.0, width: 50, height: 60, color: 0x475569, armor: 80 },
      baseCost: {} as any, growthFactors: {} as any, slots: [], baseLoadCapacity: 0,
      elementConfig: { type: 'VOLTAIC', statusPerHit: 25 },
      visual: { shapes: [{ type: 'RECT', widthPct: 1, heightPct: 0.6, yOffPct: -0.4 }, { type: 'RECT', widthPct: 1.2, heightPct: 0.6, yOffPct: -0.7 }] },
      genes: [
          { id: 'GENE_ACQUIRE_TARGET', params: { range: 500 } },
          { id: 'GENE_AUTO_ATTACK', params: {} },
          { id: 'GENE_RANGED_ATTACK', params: {} },
          { id: 'GENE_SPLASH_ZONE', params: { range: 60, ratio: 0.5 } },
          { id: 'GENE_ELEMENTAL_HIT', params: {} },
          { id: 'GENE_BOIDS', params: { separationRadius: 60, separationForce: 400.0, cohesionWeight: 0.0 } }
      ]
  }
};
