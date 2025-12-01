
import { GeneTrait, IUnit, ElementType, IGameEngine, StatusType, Faction } from '../types';
import { ELEMENT_COLORS, STATUS_CONFIG, UNIT_CONFIGS } from '../constants';

// --- STATUS REGISTRY ---
type StatusHandler = (target: IUnit, dt: number, engine: IGameEngine, stacks: number) => void;

export class StatusRegistry {
    private static tickHandlers: Partial<Record<StatusType, StatusHandler>> = {};

    static registerTick(type: StatusType, handler: StatusHandler) {
        this.tickHandlers[type] = handler;
    }

    static onTick(target: IUnit, type: StatusType, dt: number, engine: IGameEngine) {
        const effect = target.statuses[type];
        if (!effect) return;
        if (this.tickHandlers[type]) {
            this.tickHandlers[type]!(target, dt, engine, effect.stacks);
        }
    }
}

StatusRegistry.registerTick('BURNING', (target, dt, engine, stacks) => {
    engine.dealTrueDamage(target, stacks * 0.5 * dt);
});
StatusRegistry.registerTick('POISONED', (target, dt, engine, stacks) => {
    engine.dealTrueDamage(target, stacks * 0.3 * dt);
});

// --- ELEMENTAL REACTION REGISTRY ---
type ReactionHandler = (target: IUnit, engine: IGameEngine, damage: number) => void;

export class ReactionRegistry {
    private static reactions: Record<string, ReactionHandler> = {};

    static register(statusType: string, elementType: string, handler: ReactionHandler) {
        this.reactions[`${statusType}_${elementType}`] = handler;
    }

    static handle(target: IUnit, element: ElementType, engine: IGameEngine, damage: number) {
        for (const status in target.statuses) {
            const key = `${status}_${element}`;
            if (this.reactions[key]) {
                this.reactions[key](target, engine, damage);
            }
        }
    }
}

ReactionRegistry.register('FROZEN', 'THERMAL', (target, engine) => {
    if (target.statuses['FROZEN'] && target.statuses['FROZEN']!.stacks >= STATUS_CONFIG.REACTION_THRESHOLD_MINOR) {
        delete target.statuses['FROZEN'];
        engine.createFloatingText(target.x, target.y - 50, "THERMAL SHOCK!", 0xffaa00, 16);
        engine.createExplosion(target.x, target.y, 40, 0xffaa00);
        engine.dealTrueDamage(target, target.stats.maxHp * 0.2); 
    }
});

ReactionRegistry.register('FROZEN', 'PHYSICAL', (target, engine) => {
    if (target.statuses['FROZEN'] && target.statuses['FROZEN']!.stacks >= STATUS_CONFIG.REACTION_THRESHOLD_MAJOR) {
        delete target.statuses['FROZEN'];
        engine.createFloatingText(target.x, target.y - 50, "SHATTER!", 0xa5f3fc, 16);
        engine.createDamagePop(target.x, target.y - 40, Math.floor(target.stats.maxHp * 0.15), 'CRYO');
        engine.dealTrueDamage(target, target.stats.maxHp * 0.15);
    }
});

ReactionRegistry.register('POISONED', 'VOLTAIC', (target, engine) => {
    engine.applyStatus(target, 'ARMOR_BROKEN', 1, 10);
    engine.createFloatingText(target.x, target.y - 50, "CORRODED!", 0x4ade80, 16);
});

ReactionRegistry.register('SHOCKED', 'CRYO', (target, engine) => {
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
        engine.createFlash(target.x + (Math.random() * 10 - 5), target.y - 10, ELEMENT_COLORS[self.stats.element] || 0xffffff);
        engine.processDamagePipeline(self, target);
        return false; 
    }
});

GeneLibrary.register({
    id: 'GENE_RANGED_ATTACK',
    name: 'Ranged Projectile',
    onPreAttack: (self, target, engine) => {
        const color = ELEMENT_COLORS[self.stats.element] || 0xffffff;
        engine.createProjectile(self.x, self.y - 15, target.x, target.y - 15, color);
        return false; 
    }
});

GeneLibrary.register({
    id: 'GENE_ARTILLERY_ATTACK',
    name: 'Lobbed Shot',
    onPreAttack: (self, target, engine) => {
        const color = ELEMENT_COLORS[self.stats.element] || 0xff7777;
        engine.createProjectile(self.x, self.y - 20, target.x, target.y, color); 
        return false;
    }
});

GeneLibrary.register({
    id: 'GENE_CLEAVE_ATTACK',
    name: 'Cleave',
    onPreAttack: (self, target, engine) => {
        const color = ELEMENT_COLORS[self.stats.element] || 0xffff00;
        engine.createFlash(target.x, target.y, color);
        engine.processDamagePipeline(self, target);
        
        const neighbors = engine._sharedQueryBuffer;
        const count = engine.spatialHash.query(target.x, target.y, 40, neighbors);
        
        for (let i = 0; i < count; i++) {
            const n = neighbors[i];
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
            self.stats.hp += self.stats.maxHp * 0.05 * dt; 
            if (self.stats.hp > self.stats.maxHp) self.stats.hp = self.stats.maxHp;
        }
    }
});

GeneLibrary.register({
    id: 'GENE_EXPLODE_ON_DEATH',
    name: 'Volatile',
    onDeath: (self, engine) => {
        engine.createExplosion(self.x, self.y, 60, ELEMENT_COLORS[self.stats.element]);
        const neighbors = engine._sharedQueryBuffer;
        const count = engine.spatialHash.query(self.x, self.y, 60, neighbors);
        for (let i=0; i<count; i++) {
            const n = neighbors[i];
            if (n.faction !== self.faction && !n.isDead) {
                engine.dealTrueDamage(n, 40);
            }
        }
    }
});

// --- HEALER LOGIC (New v2.0 Hook Demo) ---
GeneLibrary.register({
    id: 'GENE_HEALER_TARGETING',
    name: 'Triage Targeting',
    onAcquireTarget: (self, potentialTargets, engine) => {
        let lowestHpPct = 1.0;
        let candidate: IUnit | null = null;
        
        // Potential targets comes from spatial query in engine.
        // We iterate and find wounded friends.
        for (let i = 0; i < potentialTargets.length; i++) {
            const u = potentialTargets[i];
            if (u.faction === self.faction && !u.isDead && u !== self) {
                const pct = u.stats.hp / u.stats.maxHp;
                if (pct < lowestHpPct) {
                    lowestHpPct = pct;
                    candidate = u;
                }
            }
        }
        return candidate;
    },
    onPreAttack: (self, target, engine) => {
        // Heal instead of damage
        engine.createFlash(target.x, target.y - 10, 0x00ff00);
        target.stats.hp = Math.min(target.stats.maxHp, target.stats.hp + self.stats.damage);
        engine.createFloatingText(target.x, target.y - 20, `+${Math.floor(self.stats.damage)}`, 0x00ff00, 10);
        return false; // Prevent default damage
    }
});

// --- CORE MOVEMENT ---

GeneLibrary.register({
    id: 'GENE_SWARM_MOVEMENT',
    name: 'Swarm Movement',
    onMove: (self, velocity, dt, engine) => {
        // 1. Base Impulse (Chase or March) - REPLACES Engine Logic
        let baseDx = 0;
        let baseDy = 0;

        if (self.target && !self.target.isDead) {
            // Chase Target
            const distSq = (self.target.x - self.x)**2 + (self.target.y - self.y)**2;
            const dist = Math.sqrt(distSq);
            // Don't move if within range
            if (dist > self.stats.range * 0.8) {
                const dirX = (self.target.x - self.x) / dist;
                const dirY = (self.target.y - self.y) / dist;
                baseDx = dirX * self.stats.speed * self.speedVar * dt;
                baseDy = dirY * self.stats.speed * self.speedVar * dt;
            }
        } else {
            // March Forward (no target)
            // Zerg move Right (1), Humans move Left (-1)
            const moveDir = self.faction === Faction.ZERG ? 1 : -1;
            // Only move if not idle (e.g. stationary towers might have speed 0)
            if (self.stats.speed > 0) {
                baseDx = moveDir * self.stats.speed * self.speedVar * dt;
                // Bobbing motion for "floating" units
                baseDy = Math.sin(Date.now()/1000 + self.waveOffset) * 20 * dt; 
            }
        }

        // 2. Separation (Boids)
        // Use shared buffer from engine to avoid allocation
        const neighbors = engine._sharedQueryBuffer;
        const count = engine.spatialHash.query(self.x, self.y, 40, neighbors);
        
        let forceX = 0;
        let forceY = 0;
        
        for (let i = 0; i < count; i++) {
            const friend = neighbors[i];
            // Only separate from same faction
            if (friend === self || friend.faction !== self.faction) continue;
            
            const distSq = (self.x - friend.x)**2 + (self.y - friend.y)**2;
            const minDist = self.radius + friend.radius;
            
            // If overlapping
            if (distSq < minDist * minDist) {
                // Linear repulsion
                const factor = 1.5 * dt; // Strength
                forceX += (self.x - friend.x) * factor;
                forceY += (self.y - friend.y) * factor;
            }
        }
        
        // Sum up logic
        velocity.x += baseDx + forceX;
        velocity.y += baseDy + forceY;
    }
});

GeneLibrary.register({
    id: 'GENE_FAST_MOVEMENT',
    name: 'Fast',
    onMove: (self, velocity, dt, engine) => {
        velocity.x *= 1.2;
    }
});
