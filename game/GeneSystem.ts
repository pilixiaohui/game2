
import { GeneTrait, IUnit, ElementType, Faction } from '../types';
import { ELEMENT_COLORS, STATUS_CONFIG, UNIT_CONFIGS } from '../constants';

// --- ELEMENTAL REACTION REGISTRY (v2.0) ---
// Replaces hardcoded if-else chains in GameEngine
type ReactionHandler = (target: IUnit, engine: any, damage: number) => void;

export class ReactionRegistry {
    private static reactions: Record<string, ReactionHandler> = {};

    static register(statusType: string, elementType: string, handler: ReactionHandler) {
        this.reactions[`${statusType}_${elementType}`] = handler;
    }

    static handle(target: IUnit, element: ElementType, engine: any, damage: number) {
        // Iterate over target's active statuses to find reaction matches
        for (const status in target.statuses) {
            const key = `${status}_${element}`;
            if (this.reactions[key]) {
                this.reactions[key](target, engine, damage);
            }
        }
    }
}

// Register v2.0 Standard Reactions
ReactionRegistry.register('FROZEN', 'THERMAL', (target, engine) => {
    // Thermal Shock: Remove Freeze, Deal Massive Dmg + Explosion
    if (target.statuses['FROZEN'] && target.statuses['FROZEN']!.stacks >= STATUS_CONFIG.REACTION_THRESHOLD_MINOR) {
        delete target.statuses['FROZEN'];
        engine.createFloatingText(target.x, target.y - 50, "THERMAL SHOCK!", 0xffaa00, 16);
        engine.createExplosion(target.x, target.y, 40, 0xffaa00);
        engine.dealTrueDamage(target, target.stats.maxHp * 0.2); // 20% Max HP
    }
});

ReactionRegistry.register('FROZEN', 'PHYSICAL', (target, engine, damage) => {
    // Shatter: Remove Freeze, Deal Bonus Dmg
    if (target.statuses['FROZEN'] && target.statuses['FROZEN']!.stacks >= STATUS_CONFIG.REACTION_THRESHOLD_MAJOR) {
        delete target.statuses['FROZEN'];
        engine.createFloatingText(target.x, target.y - 50, "SHATTER!", 0xa5f3fc, 16);
        engine.createDamagePop(target.x, target.y - 40, Math.floor(target.stats.maxHp * 0.15), 'CRYO');
        engine.dealTrueDamage(target, target.stats.maxHp * 0.15);
    }
});

ReactionRegistry.register('POISONED', 'VOLTAIC', (target, engine) => {
    // Corrosion: Armor Break
    engine.applyStatus(target, 'ARMOR_BROKEN', 1, 10);
    engine.createFloatingText(target.x, target.y - 50, "CORRODED!", 0x4ade80, 16);
});

ReactionRegistry.register('SHOCKED', 'CRYO', (target, engine) => {
    // Superconduct: Freeze
    engine.applyStatus(target, 'FROZEN', 20, 10);
    engine.createFloatingText(target.x, target.y - 50, "SUPERCONDUCT!", 0x60a5fa, 16);
});


export class GeneLibrary {
    private static genes: Record<string, GeneTrait> = {};

    static register(gene: GeneTrait) {
        this.genes[gene.id] = gene;
    }

    static get(id: string): GeneTrait | undefined {
        return this.genes[id];
    }
}

// --- STANDARD GENES ---

GeneLibrary.register({
    id: 'GENE_MELEE_ATTACK',
    name: 'Melee Strike',
    onPreAttack: (self, target, engine) => {
        // Simple instant hit
        engine.createFlash(target.x + (Math.random() * 10 - 5), target.y - 10, ELEMENT_COLORS[self.stats.element] || 0xffffff);
        engine.processDamagePipeline(self, target);
        return false; // Handled
    }
});

GeneLibrary.register({
    id: 'GENE_RANGED_ATTACK',
    name: 'Ranged Projectile',
    onPreAttack: (self, target, engine) => {
        const color = ELEMENT_COLORS[self.stats.element] || 0xffffff;
        engine.createProjectile(self.x, self.y - 15, target.x, target.y - 15, color);
        return false; // Handled
    }
});

GeneLibrary.register({
    id: 'GENE_ARTILLERY_ATTACK',
    name: 'Lobbed Shot',
    onPreAttack: (self, target, engine) => {
        // Simulate lobbed shot (just visual difference for now, reuses projectile logic but maybe slower/arc in future)
        const color = ELEMENT_COLORS[self.stats.element] || 0xff7777;
        engine.createProjectile(self.x, self.y - 20, target.x, target.y, color); 
        return false;
    }
});

GeneLibrary.register({
    id: 'GENE_CLEAVE_ATTACK',
    name: 'Cleave',
    onPreAttack: (self, target, engine) => {
        // Hit target + enemies nearby
        const color = ELEMENT_COLORS[self.stats.element] || 0xffff00;
        engine.createFlash(target.x, target.y, color);
        
        // Main target
        engine.processDamagePipeline(self, target);
        
        // Cleave (Spatial Query)
        const neighbors = engine.spatialHash.query(target.x, target.y, 40);
        for (const n of neighbors) {
            if (n !== target && n.faction !== self.faction && !n.isDead) {
                engine.processDamagePipeline(self, n);
            }
        }
        return false;
    }
});

GeneLibrary.register({
    id: 'GENE_ELEMENTAL_HIT',
    name: 'Elemental Application',
    onHit: (self, target, damage, engine) => {
        const el = self.stats.element;
        const amount = UNIT_CONFIGS[self.type].elementConfig?.statusPerHit || 10;
        
        if (el === 'THERMAL') engine.applyStatus(target, 'BURNING', amount, 5);
        if (el === 'CRYO') engine.applyStatus(target, 'FROZEN', amount, 5);
        if (el === 'VOLTAIC') engine.applyStatus(target, 'SHOCKED', amount, 5);
        if (el === 'TOXIN') engine.applyStatus(target, 'POISONED', amount, 5);
    }
});

GeneLibrary.register({
    id: 'GENE_REGEN',
    name: 'Regeneration',
    onTick: (self, dt, engine) => {
        if (self.stats.hp < self.stats.maxHp && !self.isDead) {
            self.stats.hp += self.stats.maxHp * 0.05 * dt; // 5% per sec
            if (self.stats.hp > self.stats.maxHp) self.stats.hp = self.stats.maxHp;
        }
    }
});

GeneLibrary.register({
    id: 'GENE_EXPLODE_ON_DEATH',
    name: 'Volatile',
    onDeath: (self, engine) => {
        engine.createExplosion(self.x, self.y, 60, ELEMENT_COLORS[self.stats.element]);
        const neighbors = engine.spatialHash.query(self.x, self.y, 60);
        for (const n of neighbors) {
            if (n.faction !== self.faction && !n.isDead) {
                n.stats.hp -= 40;
                if (n.stats.hp <= 0) engine.killUnit(n);
            }
        }
    }
});

GeneLibrary.register({
    id: 'GENE_SWARM_MOVEMENT',
    name: 'Swarm Movement',
    onMove: (self, velocity) => {
        // Slight randomization
        velocity.x *= 1.0;
    }
});

GeneLibrary.register({
    id: 'GENE_FAST_MOVEMENT',
    name: 'Fast',
    onMove: (self, velocity) => {
        velocity.x *= 1.2;
    }
});
