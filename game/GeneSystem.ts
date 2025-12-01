
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
    onPreAttack: (self, target, engine, params) => {
        engine.createFlash(target.x + (Math.random() * 10 - 5), target.y - 10, ELEMENT_COLORS[self.stats.element] || 0xffffff);
        engine.processDamagePipeline(self, target);
        return false; 
    }
});

GeneLibrary.register({
    id: 'GENE_RANGED_ATTACK',
    name: 'Ranged Projectile',
    onPreAttack: (self, target, engine, params) => {
        const color = params.projectileColor || ELEMENT_COLORS[self.stats.element] || 0xffffff;
        engine.createProjectile(self.x, self.y - 15, target.x, target.y - 15, color);
        return false; 
    }
});

GeneLibrary.register({
    id: 'GENE_ARTILLERY_ATTACK',
    name: 'Lobbed Shot',
    onPreAttack: (self, target, engine, params) => {
        const color = params.color || ELEMENT_COLORS[self.stats.element] || 0xff7777;
        engine.createProjectile(self.x, self.y - (params.arcHeight || 20), target.x, target.y, color); 
        return false;
    }
});

GeneLibrary.register({
    id: 'GENE_CLEAVE_ATTACK',
    name: 'Cleave',
    onPreAttack: (self, target, engine, params) => {
        const color = ELEMENT_COLORS[self.stats.element] || 0xffff00;
        engine.createFlash(target.x, target.y, color);
        engine.processDamagePipeline(self, target);
        
        const radius = params.radius || 40;
        const neighbors = engine._sharedQueryBuffer;
        const count = engine.spatialHash.query(target.x, target.y, radius, neighbors);
        
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
    onHit: (self, target, damage, engine, params) => {
        const el = self.stats.element;
        const amount = params.amount || UNIT_CONFIGS[self.type].elementConfig?.statusPerHit || 10;
        if (el === 'THERMAL') engine.applyStatus(target, 'BURNING', amount, 5);
        if (el === 'CRYO') engine.applyStatus(target, 'FROZEN', amount, 5);
        if (el === 'VOLTAIC') engine.applyStatus(target, 'SHOCKED', amount, 5);
        if (el === 'TOXIN') engine.applyStatus(target, 'POISONED', amount, 5);
    }
});

GeneLibrary.register({
    id: 'GENE_REGEN',
    name: 'Regeneration',
    onTick: (self, dt, engine, params) => {
        const rate = params.rate || 0.05;
        if (self.stats.hp < self.stats.maxHp && !self.isDead) {
            self.stats.hp += self.stats.maxHp * rate * dt; 
            if (self.stats.hp > self.stats.maxHp) self.stats.hp = self.stats.maxHp;
        }
    }
});

GeneLibrary.register({
    id: 'GENE_EXPLODE_ON_DEATH',
    name: 'Volatile',
    onDeath: (self, engine, params) => {
        const radius = params.radius || 60;
        const dmg = params.damage || 40;
        engine.createExplosion(self.x, self.y, radius, ELEMENT_COLORS[self.stats.element]);
        const neighbors = engine._sharedQueryBuffer;
        const count = engine.spatialHash.query(self.x, self.y, radius, neighbors);
        for (let i=0; i<count; i++) {
            const n = neighbors[i];
            if (n.faction !== self.faction && !n.isDead) {
                engine.dealTrueDamage(n, dmg);
            }
        }
    }
});

// --- SWARM MOVEMENT (Optimized v2.0) ---

GeneLibrary.register({
    id: 'GENE_SWARM_MOVEMENT',
    name: 'Swarm Movement',
    onMove: (self, velocity, dt, engine, params) => {
        // 1. Base Impulse (Targeting)
        let baseDx = 0;
        let baseDy = 0;

        if (self.target && !self.target.isDead) {
            // Chase logic
            const distSq = (self.target.x - self.x)**2 + (self.target.y - self.y)**2;
            const dist = Math.sqrt(distSq);
            if (dist > self.stats.range * 0.8) {
                const dirX = (self.target.x - self.x) / dist;
                const dirY = (self.target.y - self.y) / dist;
                baseDx = dirX * self.stats.speed * self.speedVar * dt;
                baseDy = dirY * self.stats.speed * self.speedVar * dt;
            }
        } else {
            // March logic
            const moveDir = self.faction === Faction.ZERG ? 1 : -1;
            if (self.stats.speed > 0) {
                baseDx = moveDir * self.stats.speed * self.speedVar * dt;
                baseDy = Math.sin(Date.now()/1000 + self.waveOffset) * 20 * dt; 
            }
        }

        // 2. Boids Logic (Time Sliced with Sample & Hold)
        // We calculate forces every N frames but apply the *cached* force every frame.
        // This avoids the "Stutter" of zeroing out forces on skipped frames.
        
        const frame = Math.floor(Date.now() / 32); 
        const shouldUpdate = (frame + self.frameOffset) % 3 === 0;

        if (shouldUpdate) {
            const sepRadius = params.separationRadius || 40;
            const sepForce = params.separationForce || 1.5;
            const cohWeight = params.cohesionWeight || 0.1;
            const aliWeight = params.alignmentWeight || 0.1;
            
            const neighbors = engine._sharedQueryBuffer;
            const count = engine.spatialHash.query(self.x, self.y, sepRadius, neighbors);
            
            let forceX = 0;
            let forceY = 0;
            
            let centerX = 0;
            let centerY = 0;
            let avgVelX = 0; // Approximation of alignment via position diffs isn't perfect but sufficient
            let neighborCount = 0;

            for (let i = 0; i < count; i++) {
                const friend = neighbors[i];
                if (friend === self || friend.faction !== self.faction) continue;
                
                const dx = self.x - friend.x;
                const dy = self.y - friend.y;
                const distSq = dx*dx + dy*dy;
                
                // Separation: Repel from close neighbors
                if (distSq < sepRadius * sepRadius && distSq > 0.001) {
                    const dist = Math.sqrt(distSq);
                    // Stronger repel when closer
                    const factor = (sepRadius - dist) / sepRadius; 
                    forceX += (dx / dist) * factor * sepForce;
                    forceY += (dy / dist) * factor * sepForce;
                }

                // Gather data for Cohesion/Alignment
                centerX += friend.x;
                centerY += friend.y;
                neighborCount++;
            }

            if (neighborCount > 0) {
                // Cohesion: Steer towards center of local flock
                centerX /= neighborCount;
                centerY /= neighborCount;
                forceX += (centerX - self.x) * cohWeight;
                forceY += (centerY - self.y) * cohWeight;
                
                // Alignment: (Simulated) Steer towards general direction of flock flow
                // Since we don't strictly sync velocity in SpatialHash, we assume right-flow for Zerg
                if (self.faction === Faction.ZERG) {
                     forceX += aliWeight * 2.0; 
                }
            }
            
            // Cache the result
            self.steeringForce.x = forceX;
            self.steeringForce.y = forceY;
        }

        // Apply cached steering forces
        velocity.x += baseDx + (self.steeringForce.x * dt);
        velocity.y += baseDy + (self.steeringForce.y * dt);
    }
});

GeneLibrary.register({
    id: 'GENE_FAST_MOVEMENT',
    name: 'Fast',
    onMove: (self, velocity, dt, engine, params) => {
        const mult = params.multiplier || 1.2;
        velocity.x *= mult;
    }
});
