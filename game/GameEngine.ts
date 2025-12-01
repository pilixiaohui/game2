
import { Application, Container, Graphics, TilingSprite, Text, TextStyle } from 'pixi.js';
import { Faction, GameModifiers, UnitType, GameStateSnapshot, RoguelikeCard, ElementType, StatusType, StatusEffect, IUnit, UnitRuntimeStats, GeneTrait } from '../types';
import { UNIT_CONFIGS, LANE_Y, LANE_HEIGHT, DECAY_TIME, MILESTONE_DISTANCE, COLLISION_BUFFER, UNIT_SCREEN_CAPS, ELEMENT_COLORS, INITIAL_REGIONS_CONFIG, STATUS_CONFIG, STAGE_WIDTH, STAGE_TRANSITION_COOLDOWN, OBSTACLES } from '../constants';
import { DataManager } from './DataManager';
import { GeneLibrary, ReactionRegistry } from './GeneSystem';
import { SpatialHash } from './SpatialHash';

// --- ECS-lite UNIT CLASS ---
export class Unit implements IUnit {
  active: boolean = false;
  id: number = 0;
  faction: Faction = Faction.ZERG;
  type: UnitType = UnitType.MELEE;
  
  // Physics & Transform
  x: number = 0;
  y: number = 0;
  radius: number = 15;
  
  // Compositional Stats (v2.0)
  stats: UnitRuntimeStats;
  
  // Runtime Context
  attackCooldown: number = 0;
  flashTimer: number = 0;
  
  // AI State
  state: 'MOVE' | 'ATTACK' | 'IDLE' | 'DEAD' | 'WANDER' = 'IDLE';
  isDead: boolean = false;
  decayTimer: number = 0;
  target: Unit | null = null;
  wanderTimer: number = 0;
  wanderDir: number = 0;
  
  // --- Swarm AI Properties ---
  engagedCount: number = 0; // How many attackers are currently locking this unit
  speedVar: number = 1.0;   // Speed variance factor (0.9 - 1.1)
  waveOffset: number = 0;   // Offset for sine wave movement
  
  // Visuals
  view: Graphics | null = null;
  hpBar: Graphics | null = null;
  
  // --- NEW: STATUS MANAGER COMPONENT ---
  statuses: Partial<Record<StatusType, StatusEffect>> = {};

  // --- NEW: GENE SYSTEM ---
  genes: GeneTrait[] = [];

  constructor(id: number) { 
      this.id = id; 
      this.speedVar = 0.9 + Math.random() * 0.2; // +/- 10% speed
      this.waveOffset = Math.random() * 100;
      this.stats = {
          hp: 0, maxHp: 0, damage: 0, range: 0, speed: 0, attackSpeed: 0,
          width: 0, height: 0, color: 0, armor: 0,
          critChance: 0, critDamage: 0, element: 'PHYSICAL'
      };
  }
}

class UnitPool {
  private pool: Unit[] = [];
  public container: Container;
  
  constructor(size: number, container: Container) {
    this.container = container;
    for (let i = 0; i < size; i++) {
      const u = new Unit(i);
      u.view = new Graphics();
      u.hpBar = new Graphics();
      u.view.addChild(u.hpBar);
      this.container.addChild(u.view);
      u.view.visible = false;
      this.pool.push(u);
    }
  }

  spawn(faction: Faction, type: UnitType, x: number, modifiers: GameModifiers): Unit | null {
    const unit = this.pool.find(u => !u.active);
    if (!unit) return null;

    unit.active = true;
    unit.isDead = false;
    unit.faction = faction;
    unit.type = type;
    unit.x = x;
    const r1 = Math.random();
    const r2 = Math.random();
    const yOffset = (r1 - r2) * (LANE_HEIGHT / 2); 
    unit.y = LANE_Y + yOffset;
    unit.state = faction === Faction.ZERG ? 'MOVE' : 'IDLE';
    unit.target = null;
    unit.attackCooldown = 0;
    unit.statuses = {}; // Reset statuses
    unit.flashTimer = 0;
    
    // Reset AI props
    unit.engagedCount = 0;
    unit.speedVar = 0.85 + Math.random() * 0.3; // More variance
    unit.waveOffset = Math.random() * 100;

    let stats: UnitRuntimeStats;
    const config = UNIT_CONFIGS[type];

    if (faction === Faction.ZERG) {
        stats = DataManager.instance.getUnitStats(type, modifiers);
    } else {
        stats = {
            hp: config.baseStats.hp * (1 + (x/5000)),
            maxHp: config.baseStats.hp * (1 + (x/5000)), // Scaling for humans
            damage: config.baseStats.damage,
            range: config.baseStats.range,
            speed: config.baseStats.speed,
            attackSpeed: config.baseStats.attackSpeed,
            width: config.baseStats.width,
            height: config.baseStats.height,
            color: config.baseStats.color,
            armor: config.baseStats.armor,
            critChance: 0.05,
            critDamage: 1.5,
            element: config.elementConfig?.type || 'PHYSICAL'
        };
    }

    // Apply stats to Unit Composition
    unit.stats = stats;
    unit.radius = stats.width / 2;
    
    // Initialize Genes
    unit.genes = [];
    if (config.geneIds) {
        config.geneIds.forEach(id => {
            const gene = GeneLibrary.get(id);
            if (gene) unit.genes.push(gene);
        });
    }

    if (unit.view) {
      unit.view.visible = true;
      unit.view.alpha = 1.0;
      unit.view.scale.set(1.0);
      unit.view.rotation = 0;
      unit.view.tint = 0xffffff;
      this.drawUnitView(unit, stats.width, stats.height, stats.color);
      unit.view.position.set(unit.x, unit.y);
      unit.view.zIndex = unit.y; 
    }
    return unit;
  }
  
  drawUnitView(unit: Unit, width: number, height: number, color: number) {
      if (!unit.view) return;
      unit.view.clear();
      // Shadow
      unit.view.beginFill(0x000000, 0.4);
      unit.view.drawEllipse(0, 0, width / 1.8, width / 4);
      unit.view.endFill();
      
      // Body
      unit.view.beginFill(color);
      if (unit.faction === Faction.ZERG) {
         if (unit.type === UnitType.PYROVORE) {
             // Bulbous back for artillery
             unit.view.drawCircle(0, -height/2, width/2);
             unit.view.endFill();
             // Eye
             unit.view.beginFill(0xffffff, 0.9);
             unit.view.drawCircle(4, -height/2 - 4, 3);
             unit.view.endFill();
         } else if (unit.type === UnitType.CRYOLISK) {
             // Fast, spiky
             unit.view.moveTo(0, -height);
             unit.view.lineTo(width/2, 0);
             unit.view.lineTo(-width/2, 0);
             unit.view.lineTo(0, -height);
             unit.view.endFill();
             // Eye
             unit.view.beginFill(0xffffff, 0.9);
             unit.view.drawCircle(0, -height + 10, 2);
             unit.view.endFill();
         } else if (unit.type === UnitType.OMEGALIS) {
             // Big tank
             unit.view.drawRoundedRect(-width/2, -height, width, height, 8);
             unit.view.drawRect(-width/2 - 4, -height + 10, width + 8, 10); // Armor plates
             unit.view.endFill();
             // Eye
             unit.view.beginFill(0xffffff, 0.9);
             unit.view.drawCircle(8, -height + 12, 4);
             unit.view.endFill();
         } else if (unit.type === UnitType.QUEEN) {
             // Queen visual - taller, majestic
             unit.view.drawRoundedRect(-width/2, -height, width, height, 10);
             unit.view.drawCircle(0, -height, width/1.5);
             unit.view.endFill();
             unit.view.beginFill(0xffffff, 0.9);
             unit.view.drawCircle(0, -height + 15, 4);
             unit.view.endFill();
         } else {
             // Default (Melee/Ranged)
             unit.view.drawRoundedRect(-width / 2, -height, width, height, 4);
             unit.view.endFill();
             // Eye
             unit.view.beginFill(0xffffff, 0.9);
             unit.view.drawCircle(5, -height + 8, 3);
             unit.view.endFill();
         }
      } else {
         // Humans
         if (unit.type === UnitType.HUMAN_RIOT) {
             unit.view.drawRect(-width/2, -height, width, height);
             unit.view.endFill();
             unit.view.beginFill(0x3b82f6);
             unit.view.drawRect(-width/2 - 5, -height + 5, 10, height - 10);
             unit.view.endFill();
         } 
         else if (unit.type === UnitType.HUMAN_SNIPER) {
             unit.view.drawRect(-width/2, -height, width, height);
             unit.view.endFill();
             unit.view.beginFill(0x000000);
             unit.view.drawRect(-width, -height + 10, -15, 2);
             unit.view.endFill();
         }
         else if (unit.type === UnitType.HUMAN_TANK) {
             unit.view.drawRoundedRect(-width/2, -height, width, height, 8);
             unit.view.endFill();
             unit.view.beginFill(0xfacc15);
             unit.view.drawRect(-10, -height + 10, 20, 10);
             unit.view.endFill();
         }
         else if (unit.type === UnitType.HUMAN_PYRO) {
             unit.view.drawRect(-width/2, -height, width, height);
             unit.view.endFill();
             unit.view.beginFill(0xff4500); // Fuel tank
             unit.view.drawRect(width/2, -height + 5, 6, 20);
             unit.view.endFill();
         }
         else {
             unit.view.drawRect(-width / 2, -height, width, height);
             unit.view.endFill();
             unit.view.beginFill(0x60a5fa);
             unit.view.drawRect(-8, -height + 6, 16, 4);
             unit.view.endFill();
         }
      }
  }

  recycle(unit: Unit) {
    unit.active = false;
    unit.isDead = false;
    if (unit.view) unit.view.visible = false;
  }
  getActiveUnits(): Unit[] { return this.pool.filter(u => u.active); }
}

interface ActiveParticle {
    view: Graphics | Text;
    type: 'GRAPHICS' | 'TEXT';
    life: number;
    maxLife: number;
    update: (p: ActiveParticle, dt: number) => boolean;
}

export class GameEngine {
  public app: Application | null = null;
  public world: Container;
  
  private bgLayer: TilingSprite | null = null;
  private groundLayer: TilingSprite | null = null;
  public unitPool: UnitPool | null = null;
  private unitLayer: Container;
  private particleLayer: Container;

  // Object Pooling for Particles
  private graphicsPool: Graphics[] = [];
  private textPool: Text[] = [];
  private activeParticles: ActiveParticle[] = [];
  
  // Spatial Hash
  public spatialHash: SpatialHash;

  // Access via DataManager.instance.modifiers
  get modifiers(): GameModifiers {
      return DataManager.instance.modifiers;
  }

  public humanDifficultyMultiplier: number = 1.0;
  public activeRegionId: number = 0;
  private deploymentTimer: number = 0; 
  private humanSpawnTimer: number = 0;
  
  public cameraX: number = 0;
  
  public isPaused: boolean = false;
  private isDestroyed: boolean = false;
  public isStockpileMode: boolean = false;

  // --- STAGE CONTROL PROPERTIES ---
  private currentStageIndex: number = 0;
  private stageTransitionTimer: number = 0;
  private gracePeriodTimer: number = 0; // New: prevents instant win/loss on load

  constructor(thisRef?: any) {
    this.world = new Container();
    this.unitLayer = new Container();
    this.particleLayer = new Container();
    this.spatialHash = new SpatialHash(100); // 100px cells
  }

  async init(element: HTMLElement) {
    if (this.app || this.isDestroyed) return;
    while (element.firstChild) element.removeChild(element.firstChild);
    const app = new Application({ resizeTo: element, backgroundColor: 0x0a0a0a, antialias: true, resolution: window.devicePixelRatio || 1, autoDensity: true });
    this.app = app;
    // @ts-ignore
    element.appendChild(this.app.view);
    
    // Background Setup
    const bgGfx = new Graphics(); bgGfx.beginFill(0x111111); bgGfx.drawRect(0, 0, 512, 512); bgGfx.endFill();
    const bgTex = this.app.renderer.generateTexture(bgGfx);
    this.bgLayer = new TilingSprite(bgTex, this.app.screen.width, this.app.screen.height);
    this.app.stage.addChild(this.bgLayer);

    const floorGfx = new Graphics(); floorGfx.beginFill(0x222222); floorGfx.drawRect(0, 0, 128, 128); floorGfx.endFill();
    const floorTex = this.app.renderer.generateTexture(floorGfx);
    this.groundLayer = new TilingSprite(floorTex, this.app.screen.width, this.app.screen.height / 2 + 200);
    this.groundLayer.anchor.set(0, 0);
    this.groundLayer.y = (this.app.screen.height / 2) - 50; 
    this.app.stage.addChild(this.groundLayer);

    this.world.position.set(0, this.app.screen.height / 2);
    this.world.sortableChildren = true;
    this.app.stage.addChild(this.world);
    
    // --- DEBUG: DRAW TERRAIN OBSTACLES ---
    const debugGfx = new Graphics();
    debugGfx.lineStyle(2, 0x444444);
    OBSTACLES.forEach(obs => {
        debugGfx.drawCircle(obs.x, LANE_Y + obs.y, obs.radius);
    });
    this.world.addChild(debugGfx);
    // ---------------------------------------------------

    this.unitLayer.sortableChildren = true;
    this.world.addChild(this.unitLayer);
    this.world.addChild(this.particleLayer);
    this.unitPool = new UnitPool(1000, this.unitLayer); 
    this.app.ticker.add(this.update.bind(this));
    
    // Initialize stage from DataManager
    if (this.activeRegionId > 0) {
        const saved = DataManager.instance.state.world.regions[this.activeRegionId];
        this.currentStageIndex = Math.floor(saved ? saved.devourProgress : 0);
        this.cameraX = this.currentStageIndex * STAGE_WIDTH;
        
        // --- SEED BATTLEFIELD IMMEDIATELY ---
        // Prevents entering an empty stage and instantly winning/losing
        this.populateBattlefield();
        this.gracePeriodTimer = 2.0; // 2 seconds safety
    }
  }

  public setStockpileMode(enabled: boolean) {
      this.isStockpileMode = enabled;
      if (enabled) {
          this.cameraX = 0;
          if (this.world) this.world.position.x = 0;
          this.clearParticles();
      } else {
          // Entering Battle Logic (if not destroyed)
          const saved = DataManager.instance.state.world.regions[this.activeRegionId];
          this.currentStageIndex = Math.floor(saved ? saved.devourProgress : 0);
          this.cameraX = this.currentStageIndex * STAGE_WIDTH;
          
          this.populateBattlefield();
          this.gracePeriodTimer = 2.0;
      }
  }

  // --- NEW: FORCE SPAWN ENEMIES ON ENTRY ---
  private populateBattlefield() {
      if (!this.unitPool) return;
      
      // 1. Populate Current Stage (Defenders)
      // This is crucial: if we evacuate and return, this stage needs enemies so we don't just walk through.
      this.spawnHumanWaveInStage(this.currentStageIndex);

      // 2. Populate Next Stage (Reinforcements)
      this.spawnHumanWaveInStage(this.currentStageIndex + 1);

      // 3. Populate Previous Stage (Zerg Army)
      // So the player feels the "Flood" immediately
      this.spawnZergWaveInStage(this.currentStageIndex - 1);
  }

  private spawnHumanWaveInStage(stageIdx: number) {
      if (!this.unitPool) return;
      const stageStart = stageIdx * STAGE_WIDTH;
      const stageEnd = (stageIdx + 1) * STAGE_WIDTH;
      const width = stageEnd - stageStart;
      
      const difficultyMult = 1 + (stageIdx / 100) * this.humanDifficultyMultiplier * 3.0;
      const count = Math.floor((3 + Math.random() * 3) * difficultyMult);
      
      const regionConfig = INITIAL_REGIONS_CONFIG.find(r => r.id === this.activeRegionId);
      const spawnTable = regionConfig?.spawnTable || [{ type: UnitType.HUMAN_MARINE, weight: 1.0 }];

      for(let i=0; i<count; i++) {
           const x = stageStart + Math.random() * width;
           // Humans mostly in right half of their stage
           const safeX = Math.max(stageStart + width * 0.2, Math.min(stageEnd - 50, x));
           
           const totalWeight = spawnTable.reduce((acc, entry) => acc + entry.weight, 0);
           let random = Math.random() * totalWeight;
           let selectedType = UnitType.HUMAN_MARINE;
           for (const entry of spawnTable) {
               random -= entry.weight;
               if (random <= 0) { selectedType = entry.type; break; }
           }
           
           const u = this.unitPool.spawn(Faction.HUMAN, selectedType, safeX, this.modifiers);
           if (u) u.state = 'MOVE';
      }
  }

  private spawnZergWaveInStage(stageIdx: number) {
      if (!this.unitPool) return;
      const stageStart = stageIdx * STAGE_WIDTH;
      const stageEnd = (stageIdx + 1) * STAGE_WIDTH;
      const width = stageEnd - stageStart;
      
      const count = 10; // Immediate retinue
      const stockpile = DataManager.instance.state.hive.unitStockpile;
      const availableTypes = Object.values(UnitType).filter(t => (stockpile[t] || 0) > 0);

      if (availableTypes.length === 0) return;

      for(let i=0; i<count; i++) {
           const x = stageStart + Math.random() * width;
           const safeX = Math.max(stageStart + 50, Math.min(stageEnd - 50, x));
           
           // Simple random selection
           const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
           
           if (DataManager.instance.consumeStockpile(type)) {
               const u = this.unitPool.spawn(Faction.ZERG, type, safeX, this.modifiers);
               if (u) u.state = 'MOVE';
           }
      }
  }

  private clearParticles() {
      this.activeParticles.forEach(p => this.recycleParticle(p));
      this.activeParticles = [];
  }

  private recycleUnitToStockpile(u: Unit) {
      if (!this.unitPool) return;
      this.unitPool.recycle(u);
      DataManager.instance.addToStockpile(u.type, 1);
  }

  private update(delta: number) {
    if (this.isPaused || !this.app || this.isDestroyed) return;
    const dt = delta / 60; 

    // Update Spatial Hash
    this.spatialHash.clear();
    const allUnits = this.unitPool!.getActiveUnits();
    for (const u of allUnits) {
        if (!u.isDead) this.spatialHash.insert(u);
    }

    if (this.isStockpileMode) {
        this.updateStockpileVisualization(dt);
        this.world.position.x = 0;
        if (this.bgLayer) this.bgLayer.tilePosition.x += 0.2; 
    } else {
        this.updateBattleMode(dt);
    }

    // --- Update Particles ---
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
        const p = this.activeParticles[i];
        const alive = p.update(p, dt);
        if (!alive) {
            this.recycleParticle(p);
            this.activeParticles.splice(i, 1);
        }
    }

    // --- Process Units (Using Spatial Hash for Neighbors) ---
    const livingUnits = allUnits.filter(u => !u.active ? false : !u.isDead);
    livingUnits.forEach(u => u.engagedCount = 0);
    
    // Optimization: Only sort for depth every few frames if needed, but per-frame is smoother
    this.unitLayer.children.sort((a, b) => a.zIndex - b.zIndex);

    for (const u of allUnits) {
        if (!u.active) continue;
        if (u.isDead) {
            this.processCorpse(u, dt);
        } else {
            // GENE TICK
            if (u.genes) {
                u.genes.forEach(g => {
                    if (g.onTick) g.onTick(u, dt, this);
                });
            }
            
            this.processUnit(u, dt);
        }
    }

    // --- Culling (3-Stage Window) ---
    if (this.unitPool && !this.isStockpileMode) {
        const centerStage = this.currentStageIndex * STAGE_WIDTH;
        const minX = centerStage - STAGE_WIDTH * 1.5; // Keep N-1
        const maxX = centerStage + STAGE_WIDTH * 2.5; // Keep N+1 and a bit more
        
        allUnits.forEach(u => { 
            if (u.active) {
                if (u.x < minX) {
                    // Friendly units falling too far behind are recycled to stockpile
                    if (u.faction === Faction.ZERG) this.recycleUnitToStockpile(u);
                    else this.unitPool!.recycle(u);
                } else if (u.x > maxX) {
                    this.unitPool!.recycle(u);
                }
            }
        });
    }
  }

  private updateBattleMode(dt: number) {
      if (this.gracePeriodTimer > 0) this.gracePeriodTimer -= dt;

      // 1. Camera Control (Lerp to Stage Center)
      const targetCamX = (this.currentStageIndex * STAGE_WIDTH) + (STAGE_WIDTH / 2) - (this.app!.screen.width / 2);
      // Smooth lerp
      const camDiff = targetCamX - this.cameraX;
      this.cameraX += camDiff * 0.05;
      
      this.world.position.x = -this.cameraX; 
      if (this.bgLayer) this.bgLayer.tilePosition.x = -this.cameraX * 0.1;
      if (this.groundLayer) this.groundLayer.tilePosition.x = -this.cameraX;

      // 2. Deployment (Spawning)
      this.handleDeployment(dt);
      this.handleHumanSpawning(dt);

      // 3. Stage Progression Logic (Tug of War)
      if (this.stageTransitionTimer > 0) {
          this.stageTransitionTimer -= dt;
      } else {
          this.checkStageProgression();
      }
  }

  private checkStageProgression() {
      if (!this.unitPool || this.gracePeriodTimer > 0) return;
      
      const stageStart = this.currentStageIndex * STAGE_WIDTH;
      const stageEnd = (this.currentStageIndex + 1) * STAGE_WIDTH;
      
      // Get units strictly inside current stage rect
      const active = this.unitPool.getActiveUnits().filter(u => !u.isDead && u.x >= stageStart && u.x <= stageEnd);
      
      const humanCount = active.filter(u => u.faction === Faction.HUMAN).length;
      const zergCount = active.filter(u => u.faction === Faction.ZERG).length;
      
      // ALSO check for incoming Zerg from previous stage (The Flood)
      const incomingStart = (this.currentStageIndex - 1) * STAGE_WIDTH;
      const incomingZerg = this.unitPool.getActiveUnits().filter(u => !u.isDead && u.faction === Faction.ZERG && u.x >= incomingStart && u.x < stageStart).length;

      // Win Condition: Region N has NO enemies, and we have presence
      if (humanCount === 0 && (zergCount > 0 || incomingZerg > 0)) {
          if (this.currentStageIndex < 100) {
              this.advanceStage();
          }
      }
      // Loss Condition: Region N has Enemies, and we have NO presence (wiped out)
      else if (humanCount > 0 && zergCount === 0 && incomingZerg === 0) {
          if (this.currentStageIndex > 0) {
              this.retreatStage();
          }
      }
  }

  private advanceStage() {
      this.currentStageIndex++;
      this.stageTransitionTimer = STAGE_TRANSITION_COOLDOWN;
      this.gracePeriodTimer = 1.0; // Short safety after advancing
      this.createFloatingText(this.cameraX + this.app!.screen.width/2, LANE_Y - 100, "SECTOR CLEARED", 0x4ade80, 32);
      
      if (this.activeRegionId) {
          DataManager.instance.updateRegionProgress(this.activeRegionId, 1);
      }
      
      // Seed the next stage (N+1) with humans so it's not empty when we slide over
      // Current stage N becomes N-1 (Zerg territory)
      this.spawnHumanWaveInStage(this.currentStageIndex + 1);
  }

  private retreatStage() {
      this.currentStageIndex--;
      this.stageTransitionTimer = STAGE_TRANSITION_COOLDOWN;
      this.gracePeriodTimer = 1.0; 
      this.createFloatingText(this.cameraX + this.app!.screen.width/2, LANE_Y - 100, "FALLBACK!", 0xf87171, 32);
      
      if (this.activeRegionId) {
          DataManager.instance.updateRegionProgress(this.activeRegionId, -1);
      }
      
      // Respawn defense in the stage we just fell back to (N) to prevent instant loss again
      this.spawnHumanWaveInStage(this.currentStageIndex);
  }

  private handleDeployment(dt: number) {
    if (!this.app || !this.unitPool) return;
    this.deploymentTimer += dt;
    if (this.deploymentTimer < 0.1) return; 
    this.deploymentTimer = 0;

    const activeZerg = this.unitPool.getActiveUnits().filter(u => u.faction === Faction.ZERG && !u.isDead);
    const stockpile = DataManager.instance.state.hive.unitStockpile;
    
    // Spawn Zone: Stage N-1 (The Safe Zone Left)
    const spawnZoneStart = (this.currentStageIndex - 1) * STAGE_WIDTH;
    const spawnZoneEnd = (this.currentStageIndex) * STAGE_WIDTH - 100; // Stop before enter
    const spawnX = Math.max(spawnZoneStart, spawnZoneStart + Math.random() * (spawnZoneEnd - spawnZoneStart));

    const availableTypes = Object.values(UnitType).filter(t => (stockpile[t] || 0) > 0);
    if (availableTypes.length === 0) return;

    // Filter by Per-Unit Screen Caps
    const spawnableTypes = availableTypes.filter(t => {
        const currentCount = activeZerg.filter(u => u.type === t).length;
        const cap = UNIT_SCREEN_CAPS[t] || 5;
        return currentCount < cap;
    });

    if (spawnableTypes.length === 0) return;

    // Weighted selection logic
    const totalAvailable = spawnableTypes.reduce((acc, t) => acc + (stockpile[t] || 0), 0);
    let r = Math.random() * totalAvailable;
    let selectedType = spawnableTypes[0];
    for (const t of spawnableTypes) {
        r -= (stockpile[t] || 0);
        if (r <= 0) { selectedType = t; break; }
    }

    const success = DataManager.instance.consumeStockpile(selectedType);
    if (success) {
        this.unitPool.spawn(Faction.ZERG, selectedType, spawnX, this.modifiers);
        if (Math.random() < this.modifiers.doubleSpawnChance) {
            const currentCount = activeZerg.filter(u => u.type === selectedType).length;
            if (currentCount + 1 < UNIT_SCREEN_CAPS[selectedType]) {
                 this.unitPool.spawn(Faction.ZERG, selectedType, spawnX - 20, this.modifiers);
            }
        }
    }
  }

  private handleHumanSpawning(dt: number) {
    if (!this.app || !this.unitPool) return;
    
    // Difficulty based on stage index
    const difficultyMult = 1 + (this.currentStageIndex / 100) * this.humanDifficultyMultiplier * 3.0; 
    const baseHumanInterval = Math.max(0.5, 4.0 / difficultyMult); 
    
    this.humanSpawnTimer += dt;
    if (this.humanSpawnTimer > baseHumanInterval) {
        this.humanSpawnTimer = 0;
        
        // Spawn Zone: Stage N+1 (The Hostile Zone Right)
        const spawnZoneStart = (this.currentStageIndex + 1) * STAGE_WIDTH + 100;
        const spawnZoneEnd = (this.currentStageIndex + 2) * STAGE_WIDTH - 200;
        const spawnX = spawnZoneStart + Math.random() * (spawnZoneEnd - spawnZoneStart);
        
        const waveSize = 2 + Math.floor(Math.random() * difficultyMult);
        const regionConfig = INITIAL_REGIONS_CONFIG.find(r => r.id === this.activeRegionId);
        const spawnTable = regionConfig?.spawnTable || [{ type: UnitType.HUMAN_MARINE, weight: 1.0 }];

        for(let i=0; i<waveSize; i++) {
             const finalX = spawnX + (Math.random() * 200); 
             const totalWeight = spawnTable.reduce((acc, entry) => acc + entry.weight, 0);
             let random = Math.random() * totalWeight;
             let selectedType = UnitType.HUMAN_MARINE;
             for (const entry of spawnTable) {
                 random -= entry.weight;
                 if (random <= 0) { selectedType = entry.type; break; }
             }
             
             // Check Enemy Cap
             const currentEnemyCount = this.unitPool.getActiveUnits().filter(u => u.type === selectedType && !u.isDead).length;
             const cap = UNIT_SCREEN_CAPS[selectedType] || 10;
             if (currentEnemyCount < cap) {
                 const u = this.unitPool!.spawn(Faction.HUMAN, selectedType, finalX, this.modifiers);
                 if (u) {
                     u.state = 'MOVE'; 
                 }
             }
        }
    }
  }

  private updateStockpileVisualization(dt: number) {
      // Realistic visualization: Iterate through all Zerg unit types and match screen count to stockpile count
      const stockpile = DataManager.instance.state.hive.unitStockpile;
      const activeVisuals = this.unitPool!.getActiveUnits().filter(u => u.faction === Faction.ZERG);
      
      Object.values(UnitType).forEach(type => {
          // Skip Human types
          if (type.startsWith('HUMAN')) return;
          
          const storedCount = stockpile[type] || 0;
          const visualCap = UNIT_SCREEN_CAPS[type] || 10;
          // Show up to the screen cap
          const targetVisualCount = Math.min(storedCount, visualCap);
          
          const currentVisuals = activeVisuals.filter(u => u.type === type);
          
          // Spawn if deficit
          if (currentVisuals.length < targetVisualCount) {
             const spawnX = Math.random() * this.app!.screen.width;
             const u = this.unitPool!.spawn(Faction.ZERG, type, spawnX, this.modifiers);
             if (u) {
                 u.state = 'WANDER';
                 // Spread vertically
                 u.y = LANE_Y + (Math.random() - 0.5) * LANE_HEIGHT;
             }
          }
          // Despawn if surplus (e.g. stockpile consumed elsewhere or cap lowered)
          else if (currentVisuals.length > targetVisualCount) {
              const u = currentVisuals[0];
              this.unitPool!.recycle(u);
          }
      });
  }

  private processUnit(u: Unit, dt: number) {
     // Status Effects Tick
     this.updateStatusEffects(u, dt);
     
     // Update Flash Timer & Visuals
     if (u.flashTimer > 0) u.flashTimer -= dt;
     this.updateUnitVisuals(u);

     // --- 1. Stockpile Wander Logic ---
     if (this.isStockpileMode && u.faction === Faction.ZERG) {
         u.state = 'WANDER'; u.target = null;
         u.wanderTimer -= dt;
         if (u.wanderTimer <= 0) { u.wanderTimer = 1 + Math.random() * 2; u.wanderDir = Math.random() > 0.5 ? 1 : -1; if (Math.random() < 0.3) u.wanderDir = 0; }
         const speed = u.stats.speed * 0.3; let dx = u.wanderDir * speed * dt;
         if (this.app) { if (u.x < 50) u.wanderDir = 1; if (u.x > this.app.screen.width - 50) u.wanderDir = -1; }
         u.x += dx; u.y += (Math.random() - 0.5) * 0.5; 
         if (u.y < LANE_Y - LANE_HEIGHT/2) u.y = LANE_Y - LANE_HEIGHT/2; if (u.y > LANE_Y + LANE_HEIGHT/2) u.y = LANE_Y + LANE_HEIGHT/2;
         if (u.view) { u.view.position.x = u.x; u.view.y = u.y; u.view.zIndex = u.y; if (Math.abs(dx) > 0.1) u.view.scale.x = Math.sign(dx); }
         return; 
     }

     // Micro-Stun Check (Shock)
     if (u.statuses['SHOCKED'] && Math.random() < 0.05) return; 

     // --- 2. Advanced Swarm AI: Targeting (Using Spatial Hash) ---
     
     const AGGRO_RANGE = 500; // Increased for stage width
     const getCapacity = (target: Unit) => Math.max(3, Math.floor((target.radius * 2.5) / 10));
     const isRanged = u.stats.range > 60; 

     let shouldSearch = true;

     // A. Check if current target is still valid
     if (u.target) {
         if (u.target.isDead || !u.target.active) {
             u.target = null;
         } else {
             const distSq = (u.target.x - u.x)**2 + (u.target.y - u.y)**2;
             if (distSq > AGGRO_RANGE * AGGRO_RANGE) {
                 u.target = null;
             } else {
                 if (isRanged) {
                     shouldSearch = false;
                 } else {
                     const capacity = getCapacity(u.target as Unit);
                     const dist = Math.sqrt(distSq);
                     const isEngaged = dist <= u.stats.range * 1.2;
                     if (isEngaged) { (u.target as Unit).engagedCount++; shouldSearch = false; }
                     else {
                         if ((u.target as Unit).engagedCount < capacity) { (u.target as Unit).engagedCount++; shouldSearch = false; }
                         else { u.target = null; shouldSearch = true; }
                     }
                 }
             }
         }
     }

     // B. Search for new target using Spatial Hash
     if (shouldSearch) {
        let bestTarget: Unit | null = null;
        let minDist = Infinity;
        
        // Query larger area for potential targets
        const enemies = this.spatialHash.query(u.x, u.y, AGGRO_RANGE);

        for (const enemy of enemies) {
            if (enemy.faction === u.faction) continue;
            
            const distSq = (enemy.x - u.x)**2 + (enemy.y - u.y)**2;
            // Additional checks handled by spatial hash, but refining circle
            if (distSq > AGGRO_RANGE * AGGRO_RANGE) continue;
            
            if (!isRanged) {
                const capacity = getCapacity(enemy as Unit);
                if ((enemy as Unit).engagedCount >= capacity) continue; 
            }
            if (distSq < minDist) { minDist = distSq; bestTarget = enemy as Unit; }
        }
        u.target = bestTarget;
        if (u.target && !isRanged) { (u.target as Unit).engagedCount++; }
     }

     // --- 3. PHYSICS & MOVEMENT ---
     
     let dxMove = 0;
     let dyMove = 0;
     let isMoving = false;
     const time = Date.now() / 1000;

     if (u.target && !u.target.isDead) {
         const dist = Math.sqrt((u.target.x - u.x)**2 + (u.target.y - u.y)**2);
         const stopThreshold = !isRanged ? (u.radius + u.target.radius + COLLISION_BUFFER) : (u.stats.range * 0.2); 

         if (dist > stopThreshold) {
             let currentSpeed = u.stats.speed * u.speedVar;
             if (isRanged && dist <= u.stats.range) { currentSpeed *= 0.4; }
             const dirX = (u.target.x - u.x) / dist;
             const dirY = (u.target.y - u.y) / dist;
             const noise = 1 + Math.sin(time * 3 + u.waveOffset) * 0.1;
             dxMove += dirX * currentSpeed * noise * dt;
             dyMove += dirY * currentSpeed * noise * dt;
             isMoving = true;
         }
     } else {
         // No Target: Move towards Stage Center / Enemy side
         // Zerg go Right, Humans go Left
         const moveDir = u.faction === Faction.ZERG ? 1 : -1;
         
         const currentSpeed = u.stats.speed * u.speedVar;
         const wave = Math.sin(time + u.waveOffset) * 20; 
         const surge = 1 + Math.sin(time * 2 + u.waveOffset) * 0.2; 
         
         dxMove += moveDir * currentSpeed * surge * dt;
         dyMove += wave * dt;
         isMoving = true;
     }

     // Separation (Using Spatial Hash Neighbors)
     // Query smaller radius for repulsion
     const friends = this.spatialHash.query(u.x, u.y, 40);
     for (const friend of friends) {
        if (friend === u) continue;
        if (friend.faction !== u.faction) continue; 
        if (u.faction === Faction.ZERG && u.type !== friend.type) continue;
        
        const distSq = (u.x - friend.x)**2 + (u.y - friend.y)**2;
        const repelRadius = u.radius + friend.radius + 3; 
        if (distSq < repelRadius * repelRadius && distSq > 0.001) {
            const d = Math.sqrt(distSq);
            const force = (repelRadius - d) / repelRadius; 
            const pushX = (u.x - friend.x) / d * force * 100 * dt;
            const pushY = (u.y - friend.y) / d * force * 800 * dt; 
            dxMove += pushX;
            dyMove += pushY;
            if (Math.abs(pushX) > 0.5) isMoving = true;
        }
    }
    
    // Gene Move Hook
    const velocity = { x: dxMove, y: dyMove };
    if (u.genes) u.genes.forEach(g => { if(g.onMove) g.onMove(u, velocity); });
    dxMove = velocity.x;
    dyMove = velocity.y;

    u.x += dxMove;
    u.y += dyMove;

    // Obstacles
    for (const obs of OBSTACLES) {
        const stage = Math.floor(u.x / STAGE_WIDTH);
        // Simple procedural obstacle: Center block every odd stage
        if (stage % 2 !== 0) {
             const obsX = (stage * STAGE_WIDTH) + (STAGE_WIDTH/2);
             const obsY = LANE_Y;
             const radius = 40;
             const dx = u.x - obsX;
             const dy = u.y - obsY;
             const dSq = dx*dx + dy*dy;
             const minS = u.radius + radius;
             if (dSq < minS * minS) {
                 const d = Math.sqrt(dSq);
                 u.x += (dx/d) * (minS-d);
                 u.y += (dy/d) * (minS-d);
                 u.y += (dy > 0 ? 1 : -1) * 200 * dt; 
             }
        }
    }

    if (u.y < LANE_Y - LANE_HEIGHT/2) u.y = LANE_Y - LANE_HEIGHT/2; 
    if (u.y > LANE_Y + LANE_HEIGHT/2) u.y = LANE_Y + LANE_HEIGHT/2;

    if (u.view) {
        u.view.position.x = u.x;
        u.view.y = u.y;
        u.view.zIndex = u.y;
        if (Math.abs(dxMove) > 0.1) {
            u.view.scale.x = dxMove < 0 ? -1 : 1;
            u.view.y += Math.sin(u.x * 0.15) * 2;
        }
        if (u.hpBar) {
            u.hpBar.clear();
            if (u.stats.hp < u.stats.maxHp) {
                const pct = Math.max(0, u.stats.hp / u.stats.maxHp);
                u.hpBar.beginFill(0x000000); u.hpBar.drawRect(-12, -u.radius * 2 - 10, 24, 4); u.hpBar.endFill();
                u.hpBar.beginFill(pct < 0.3 ? 0xff0000 : 0x00ff00); u.hpBar.drawRect(-12, -u.radius * 2 - 10, 24 * pct, 4); u.hpBar.endFill();
            }
        }
    }

    u.attackCooldown -= dt;
    if (u.target && !u.target.isDead) {
         const dist = Math.sqrt((u.target.x - u.x)**2 + (u.target.y - u.y)**2);
         if (dist <= u.stats.range) {
             u.state = 'ATTACK'; 
             if (u.attackCooldown <= 0) {
                 u.attackCooldown = u.stats.attackSpeed;
                 if (u.statuses['FROZEN']) u.attackCooldown *= 1.5;
                 this.performAttack(u, u.target);
             }
         } else {
             u.state = isMoving ? 'MOVE' : 'IDLE';
         }
    } else {
        u.state = isMoving ? 'MOVE' : 'IDLE';
    }
  }

  // --- REST OF HELPERS (Damage, Status, Visuals) UNCHANGED ---
  public updateUnitVisuals(u: Unit) {
      if (!u.view) return;
      if (u.flashTimer > 0) { u.view.tint = 0xffffaa; return; }
      let tint = 0xffffff;
      if (u.statuses['BURNING']) {
          const intensity = Math.min(1, u.statuses['BURNING'].stacks / 50);
          tint = this.lerpColor(0xffffff, 0xff4500, intensity); 
      } else if (u.statuses['FROZEN']) {
          const intensity = Math.min(1, u.statuses['FROZEN'].stacks / 50);
          tint = this.lerpColor(0xffffff, 0x60a5fa, intensity); 
      } else if (u.statuses['POISONED']) { tint = 0x4ade80; } else if (u.statuses['ARMOR_BROKEN']) { tint = 0x555555; }
      u.view.tint = tint;
  }
  
  private lerpColor(a: number, b: number, amount: number): number {
      const ar = (a >> 16) & 0xff; const ag = (a >> 8) & 0xff; const ab = a & 0xff;
      const br = (b >> 16) & 0xff; const bg = (b >> 8) & 0xff; const bb = b & 0xff;
      const rr = ar + amount * (br - ar);
      const rg = ag + amount * (bg - ag);
      const rb = ab + amount * (bb - ab);
      return (rr << 16) + (rg << 8) + (rb | 0);
  }

  public performAttack(source: Unit, target: Unit) {
     if (source.view) source.view.x += (source.faction === Faction.ZERG ? -1 : 1) * 4; 
     
     // v2.0 GENE INTERCEPTION
     let handled = false;
     if (source.genes) {
         for (const g of source.genes) {
             if (g.onPreAttack) {
                 const result = g.onPreAttack(source, target, this);
                 if (result === false) { handled = true; break; } // Gene took over
             }
         }
     }
     
     if (!handled) {
         // Fallback default
         this.createFlash(target.x + (Math.random()*10-5), target.y - 10, ELEMENT_COLORS[source.stats.element]); 
         this.processDamagePipeline(source, target);
     }
  }

  public updateStatusEffects(unit: Unit, dt: number) {
      if (unit.isDead) return;
      for (const key in unit.statuses) {
          const type = key as StatusType;
          const effect = unit.statuses[type];
          if (!effect) continue;
          effect.duration -= dt;
          if (effect.duration <= 0) { delete unit.statuses[type]; continue; }
          if (type === 'BURNING') { this.dealTrueDamage(unit, effect.stacks * 0.5 * dt); } 
          else if (type === 'POISONED') { this.dealTrueDamage(unit, effect.stacks * 0.3 * dt); }
          if (!effect.decayAccumulator) effect.decayAccumulator = 0;
          effect.decayAccumulator += dt;
          const decayInterval = 1.0 / STATUS_CONFIG.DECAY_RATE; 
          while (effect.decayAccumulator >= decayInterval) {
              if (effect.stacks > 0) effect.stacks--;
              effect.decayAccumulator -= decayInterval;
          }
      }
      const burn = unit.statuses['BURNING'];
      if (burn && burn.stacks >= STATUS_CONFIG.THRESHOLD_BURNING) { this.applyStatus(unit, 'ARMOR_BROKEN', 1, STATUS_CONFIG.ARMOR_BREAK_DURATION); }
      const freeze = unit.statuses['FROZEN'];
      if (freeze) {
          const slowFactor = Math.min(0.9, freeze.stacks / STATUS_CONFIG.THRESHOLD_FROZEN); 
          unit.stats.speed = unit.stats.speed * (1 - slowFactor); // Temporarily reduce speed? 
          // Note: Unit stats are reset every frame in spawn usually, but in this engine they persist.
          // Correct way is to have baseSpeed vs speed. For simplicity, just modifying current speed is risky if it drifts.
          // Better: Reset speed to base * mod at start of tick? 
          // v2.0: Genes handle Move, they use stats.speed. 
          if (freeze.stacks >= STATUS_CONFIG.THRESHOLD_FROZEN) { unit.stats.speed = 0; }
      }
  }

  public applyStatus(target: Unit, type: StatusType, stacks: number, duration: number) {
      if (target.isDead) return;
      if (!target.statuses[type]) { target.statuses[type] = { type, stacks: 0, duration: 0, decayAccumulator: 0 }; }
      const s = target.statuses[type]!;
      s.stacks = Math.min(STATUS_CONFIG.MAX_STACKS, s.stacks + stacks);
      s.duration = Math.max(s.duration, duration);
  }

  public processDamagePipeline(source: Unit, target: Unit) {
      if (target.isDead) return;
      const elementType = source.stats.element;
      let rawDamage = source.stats.damage;
      let isCrit = false;
      if (Math.random() < source.stats.critChance) { rawDamage *= source.stats.critDamage; isCrit = true; }
      
      let bonusMultiplier = 1.0;

      // v2.0 Gene Hook for Hit
      if (source.genes) source.genes.forEach(g => { if (g.onHit) g.onHit(source, target, rawDamage, this); });

      // v2.0 Elemental Reaction Registry
      ReactionRegistry.handle(target, elementType, this, rawDamage);

      let armor = target.stats.armor;
      if (target.statuses['ARMOR_BROKEN']) armor = 0; 
      const reduction = armor / (armor + 50);
      let finalDamage = (rawDamage * bonusMultiplier) * (1 - reduction);
      if (elementType === 'TOXIN') finalDamage = rawDamage * bonusMultiplier;
      target.stats.hp -= finalDamage;
      
      if (target.view) { target.flashTimer = 0.1; if (!target.isDead) this.updateUnitVisuals(target); }
      if (isCrit || finalDamage > target.stats.maxHp * 0.1) { this.createDamagePop(target.x, target.y - 30, Math.floor(finalDamage), elementType); }
      if (target.stats.hp <= 0) this.killUnit(target);
  }

  public dealTrueDamage(target: Unit, amount: number) {
      if (target.isDead) return; target.stats.hp -= amount; if (target.stats.hp <= 0) this.killUnit(target);
  }

  public killUnit(u: Unit) {
      if (u.isDead) return;
      u.isDead = true; u.state = 'DEAD'; u.decayTimer = DECAY_TIME;
      
      // v2.0 Gene Hook for Death
      if (u.genes) u.genes.forEach(g => { if(g.onDeath) g.onDeath(u, this); });

      if (u.faction === Faction.HUMAN) {
          DataManager.instance.recordKill(); 
          let bioReward = 10;
          if (u.type === UnitType.HUMAN_RIOT) { bioReward = 15; } else if (u.type === UnitType.HUMAN_TANK) { bioReward = 50; }
          DataManager.instance.modifyResource('biomass', bioReward);
      } else {
          const recycleRate = DataManager.instance.getRecycleRate(); const recycleValue = 5; DataManager.instance.modifyResource('biomass', recycleValue * recycleRate);
      }
      if (u.statuses['POISONED']) {
          this.createExplosion(u.x, u.y, 40, 0x4ade80); 
          this.unitPool!.getActiveUnits().forEach(other => {
              if (other === u || other.isDead || other.faction === u.faction) return;
              if (Math.abs(other.x - u.x) < 40 && Math.abs(other.y - u.y) < 40) { this.applyStatus(other, 'POISONED', 20, 5); }
          });
      }
      if (u.view) { u.view.tint = 0x555555; u.view.zIndex = -9999; u.view.rotation = (Math.random() * 0.5 - 0.25) + Math.PI / 2; u.view.scale.y = 0.5; if (u.hpBar) u.hpBar.clear(); }
      
      // Legacy Global Modifier Check (Volatile Blood)
      if (u.faction === Faction.ZERG && this.modifiers.explodeOnDeath) {
         this.createExplosion(u.x, u.y, 80);
         const units = this.unitPool!.getActiveUnits();
         units.forEach(enemy => { if (!enemy.isDead && enemy.faction === Faction.HUMAN) { const dist = Math.sqrt((enemy.x - u.x)**2 + (enemy.y - u.y)**2); if (dist < 80) { enemy.stats.hp -= 40; if (enemy.stats.hp <= 0) this.killUnit(enemy); } } });
      }
  }

  // --- PARTICLE SYSTEM ---
  private getGraphics(): Graphics {
      let g = this.graphicsPool.pop(); if (!g) g = new Graphics();
      g.clear(); g.alpha = 1; g.scale.set(1); g.rotation = 0; g.visible = true;
      this.particleLayer.addChild(g); return g;
  }
  private recycleParticle(p: ActiveParticle) {
      p.view.visible = false;
      if (p.type === 'GRAPHICS' && p.view instanceof Graphics) this.graphicsPool.push(p.view);
      if (p.type === 'TEXT' && p.view instanceof Text) this.textPool.push(p.view);
  }
  public createDamagePop(x: number, y: number, value: number, element: string) {
      if (!this.app || this.isDestroyed) return;
      const g = this.getGraphics();
      g.beginFill(ELEMENT_COLORS[element as ElementType] || 0xffffff, 0.8);
      const rOuter = 10; const rInner = 4; const points = [];
      for (let i = 0; i < 8; i++) { const radius = (i % 2 === 0) ? rOuter : rInner; const angle = i * Math.PI / 4; points.push(Math.sin(angle) * radius, Math.cos(angle) * radius); }
      g.drawPolygon(points); g.endFill(); g.position.set(x, y);
      this.activeParticles.push({ view: g, type: 'GRAPHICS', life: 20, maxLife: 20, update: (p, dt) => { p.life -= dt * 60; p.view.y -= 1; p.view.alpha = p.life / 20; return p.life > 0; } });
  }
  public createFloatingText(x: number, y: number, text: string, color: number, fontSize: number = 12) {
      if (!this.app || this.isDestroyed) return;
      let t = this.textPool.pop();
      if (!t) { t = new Text({ text, style: { fontFamily: 'Courier New', fontSize, fontWeight: 'bold', fill: color, stroke: { color: 0x000000, width: 2 } } }); } 
      else { t.text = text; t.style.fill = color; t.style.fontSize = fontSize; }
      t.visible = true; t.alpha = 1; t.scale.set(0.5); t.anchor.set(0.5); t.position.set(x, y); this.particleLayer.addChild(t);
      this.activeParticles.push({ view: t, type: 'TEXT', life: 60, maxLife: 60, update: (p, dt) => { p.life -= dt * 60; p.view.y -= 0.5; p.view.scale.set(p.view.scale.x + 0.01); p.view.alpha = p.life / 20; return p.life > 0; } });
  }
  public createFlash(x: number, y: number, color: number) { 
      if (!this.app || this.isDestroyed) return; 
      const g = this.getGraphics(); g.beginFill(color, 0.9); g.drawCircle(0, 0, 4); g.endFill(); g.position.set(x, y);
      this.activeParticles.push({ view: g, type: 'GRAPHICS', life: 5, maxLife: 5, update: (p, dt) => { p.life -= dt * 60; p.view.alpha = p.life / 5; return p.life > 0; } });
  }
  public createProjectile(x1: number, y1: number, x2: number, y2: number, color: number) { 
      if (!this.app || this.isDestroyed) return; 
      const g = this.getGraphics(); g.lineStyle(2, color, 1); g.moveTo(0, 0); g.lineTo(12, 0); g.position.set(x1, y1); g.rotation = Math.atan2(y2 - y1, x2 - x1); 
      const speed = 800; const dist = Math.sqrt((x2-x1)**2 + (y2-y1)**2); const duration = dist / speed; 
      this.activeParticles.push({ view: g, type: 'GRAPHICS', life: 0, maxLife: duration, startX: x1, startY: y1, endX: x2, endY: y2, update: (p: any, dt: number) => { p.life += dt; const t = Math.min(1, p.life / p.maxLife); p.view.x = p.startX + (p.endX - p.startX) * t; p.view.y = p.startY + (p.endY - p.startY) * t; return t < 1; } } as any);
  }
  public createExplosion(x: number, y: number, radius: number, color: number = 0x00ff00) { 
      if (!this.app || this.isDestroyed) return; 
      const g = this.getGraphics(); g.beginFill(color, 0.5); g.drawCircle(0, 0, 10); g.endFill(); g.position.set(x, y); 
      this.activeParticles.push({ view: g, type: 'GRAPHICS', life: 0, maxLife: 20, update: (p: any, dt: number) => { p.life++; p.view.width += 8; p.view.height += 8; p.view.alpha -= 0.05; return p.view.alpha > 0; } });
  }
  private processCorpse(u: Unit, dt: number) {
      u.decayTimer -= dt; if (u.view) { u.view.y += 10 * dt; u.view.alpha = Math.max(0, u.decayTimer / DECAY_TIME); } if (u.decayTimer <= 0) this.unitPool!.recycle(u);
  }

  public getSnapshot(): GameStateSnapshot {
      const s = DataManager.instance.state;
      const baseSnapshot = {
          resources: s.resources.biomass,
          distance: this.currentStageIndex, // Now represents Stage
          stockpileMelee: s.hive.unitStockpile[UnitType.MELEE] || 0,
          stockpileRanged: s.hive.unitStockpile[UnitType.RANGED] || 0,
          stockpileTotal: (s.hive.unitStockpile[UnitType.MELEE] || 0) + (s.hive.unitStockpile[UnitType.RANGED] || 0),
          populationCap: DataManager.instance.getMaxPopulationCap(),
          isPaused: this.isPaused
      };

      const activeZergCounts: Record<string, number> = {};
      [UnitType.MELEE, UnitType.RANGED, UnitType.PYROVORE, UnitType.CRYOLISK, UnitType.OMEGALIS, UnitType.QUEEN].forEach(t => { activeZergCounts[t] = 0; });

      if (!this.app || !this.unitPool) {
          return { ...baseSnapshot, unitCountZerg: 0, unitCountHuman: 0, activeZergCounts };
      }
      
      const active = this.unitPool.getActiveUnits();
      const zergUnits = active.filter(u => u.faction === Faction.ZERG && !u.isDead);
      zergUnits.forEach(u => { if (activeZergCounts[u.type] !== undefined) { activeZergCounts[u.type]++; } });

      return {
          ...baseSnapshot,
          unitCountZerg: zergUnits.length,
          unitCountHuman: active.filter(u => u.faction === Faction.HUMAN && !u.isDead).length,
          activeZergCounts
      };
  }
  
  public applyCard(card: RoguelikeCard) { card.apply(this.modifiers); }
  public resume() { this.isPaused = false; }
  public pause() { this.isPaused = true; }
  public destroy() { 
      this.isDestroyed = true;
      
      // FIX: Refund units if we are in battle mode and destroying (e.g. retreating or evacuating)
      // This is crucial because GameCanvas destroys the engine when unmounting or switching regions.
      if (!this.isStockpileMode && this.unitPool) {
          const activeZerg = this.unitPool.getActiveUnits().filter(u => u.faction === Faction.ZERG && !u.isDead);
          activeZerg.forEach(u => {
              DataManager.instance.addToStockpile(u.type, 1);
          });
      }

      if (this.app) { 
          try { this.app.destroy(true, { children: true, texture: true }); } catch (e) { console.warn("GameEngine destroy error", e); } 
      } 
      this.app = null; 
      this.unitPool = null; 
  }
}
