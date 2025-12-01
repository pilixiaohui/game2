
import { Application, Container, Graphics, TilingSprite, Text, TextStyle } from 'pixi.js';
import { Faction, GameModifiers, UnitType, GameStateSnapshot, RoguelikeCard, ElementType, StatusType, StatusEffect, IUnit, UnitRuntimeStats, GeneTrait, IGameEngine, GeneConfig } from '../types';
import { UNIT_CONFIGS, LANE_Y, LANE_HEIGHT, DECAY_TIME, MILESTONE_DISTANCE, COLLISION_BUFFER, UNIT_SCREEN_CAPS, ELEMENT_COLORS, INITIAL_REGIONS_CONFIG, STATUS_CONFIG, STAGE_WIDTH, STAGE_TRANSITION_COOLDOWN, OBSTACLES } from '../constants';
import { DataManager } from './DataManager';
import { GeneLibrary, ReactionRegistry, StatusRegistry } from './GeneSystem';
import { SpatialHash } from './SpatialHash';

export class Unit implements IUnit {
  active: boolean = false;
  id: number = 0;
  faction: Faction = Faction.ZERG;
  type: UnitType = UnitType.MELEE;
  
  // Physics & Transform
  x: number = 0;
  y: number = 0;
  radius: number = 15;
  
  // Compositional Stats
  stats: UnitRuntimeStats;
  
  // Runtime Context
  attackCooldown: number = 0;
  flashTimer: number = 0;
  
  // AI State
  state: 'MOVE' | 'ATTACK' | 'IDLE' | 'DEAD' | 'WANDER' = 'IDLE';
  isDead: boolean = false;
  target: IUnit | null = null;
  
  // Runtime Fields (IUnit Implementation)
  decayTimer: number = 0;
  wanderTimer: number = 0;
  wanderDir: number = 0;
  engagedCount: number = 0; 
  speedVar: number = 1.0;   
  waveOffset: number = 0;
  frameOffset: number = 0;
  steeringForce: { x: number, y: number } = { x: 0, y: 0 };
  
  // Visuals
  view: Graphics | null = null;
  hpBar: Graphics | null = null;
  
  // --- COMPONENTS ---
  statuses: Partial<Record<StatusType, StatusEffect>> = {};
  geneConfig: GeneConfig[] = [];

  constructor(id: number) { 
      this.id = id; 
      this.speedVar = 0.9 + Math.random() * 0.2; 
      this.waveOffset = Math.random() * 100;
      this.frameOffset = Math.floor(Math.random() * 60);
      this.stats = {
          hp: 0, maxHp: 0, damage: 0, range: 0, speed: 0, attackSpeed: 0,
          width: 0, height: 0, color: 0, armor: 0,
          critChance: 0, critDamage: 0, element: 'PHYSICAL'
      };
  }
}

class UnitPool {
  private pool: Unit[] = [];
  private freeIndices: number[] = []; // Stack for O(1) allocation
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
      this.freeIndices.push(i); // Initialize stack
    }
  }

  spawn(faction: Faction, type: UnitType, x: number, modifiers: GameModifiers): Unit | null {
    if (this.freeIndices.length === 0) return null; // Pool exhausted
    
    const idx = this.freeIndices.pop()!;
    const unit = this.pool[idx];

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
    unit.decayTimer = 0;
    unit.engagedCount = 0;
    unit.speedVar = 0.85 + Math.random() * 0.3; 
    unit.waveOffset = Math.random() * 100;
    unit.wanderTimer = 0;
    unit.wanderDir = 1;
    unit.frameOffset = Math.floor(Math.random() * 60);
    unit.steeringForce.x = 0;
    unit.steeringForce.y = 0;

    let stats: UnitRuntimeStats;
    const config = UNIT_CONFIGS[type];

    if (faction === Faction.ZERG) {
        stats = DataManager.instance.getUnitStats(type, modifiers);
    } else {
        stats = {
            hp: config.baseStats.hp * (1 + (x/5000)),
            maxHp: config.baseStats.hp * (1 + (x/5000)),
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

    // Apply stats
    unit.stats = stats;
    unit.radius = stats.width / 2;
    
    // Initialize Genes via Config
    unit.geneConfig = config.genes || [];

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
  
  // v2.1: Data-Driven Rendering
  drawUnitView(unit: Unit, width: number, height: number, color: number) {
      if (!unit.view) return;
      unit.view.clear();

      const config = UNIT_CONFIGS[unit.type];
      const visual = config.visual;

      // 1. Draw Shadow
      unit.view.beginFill(0x000000, 0.4);
      const sScale = visual?.shadowScale || 1.0;
      unit.view.drawEllipse(0, 0, (width / 1.8) * sScale, (width / 4) * sScale);
      unit.view.endFill();
      
      // 2. Draw Shapes defined in Config
      if (visual && visual.shapes) {
          for (const shape of visual.shapes) {
              const shapeColor = shape.color !== undefined ? shape.color : color;
              
              // Handle Color Darkening (e.g., Shields)
              let finalColor = shapeColor;
              if (shape.colorDarken) {
                  // Simple darken: reduce RGB components
                  // This is a rough approx for Hex numbers
                  // A better way is using PIXI Utils or separating channels, but keeping it simple for now
                  // 0xffffff -> 0xcccccc
              }

              unit.view.beginFill(finalColor);

              // Calculate Dimensions
              const w = width * (shape.widthPct ?? 1.0);
              const h = height * (shape.heightPct ?? 1.0);
              const cx = width * (shape.xOffPct ?? 0);
              const cy = -height + (height * (shape.yOffPct ?? 0)); // Anchored at bottom-center

              if (shape.type === 'ROUNDED_RECT') {
                  // Center X, Bottom Y usually
                  unit.view.drawRoundedRect(cx - w/2, cy, w, h, shape.cornerRadius || 4);
              } 
              else if (shape.type === 'RECT') {
                  unit.view.drawRect(cx - w/2, cy, w, h);
              }
              else if (shape.type === 'CIRCLE') {
                  const r = shape.radiusPct ? width * shape.radiusPct : w/2;
                  unit.view.drawCircle(cx, cy, r);
              }
              
              unit.view.endFill();
          }
      } else {
          // Fallback (Error Pink)
          unit.view.beginFill(0xff00ff);
          unit.view.drawRect(-10, -10, 20, 20);
          unit.view.endFill();
      }
      
      // Eye (Generic for all units for now, can be configured later)
      unit.view.beginFill(0xffffff, 0.9);
      unit.view.drawCircle(5, -height + 8, 3);
      unit.view.endFill();
  }

  recycle(unit: Unit) {
    if (!unit.active) return;
    unit.active = false;
    unit.isDead = false;
    unit.geneConfig = []; // Clear ref
    if (unit.view) unit.view.visible = false;
    this.freeIndices.push(unit.id); // Return index to stack
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

export class GameEngine implements IGameEngine {
  public app: Application | null = null;
  public world: Container;
  
  private bgLayer: TilingSprite | null = null;
  private groundLayer: TilingSprite | null = null;
  public unitPool: UnitPool | null = null;
  private unitLayer: Container;
  private particleLayer: Container;

  private graphicsPool: Graphics[] = [];
  private textPool: Text[] = [];
  private activeParticles: ActiveParticle[] = [];
  
  // v2.0 Spatial Hash
  public spatialHash: SpatialHash;
  // v2.0 Shared Query Buffer for Zero-Alloc
  public _sharedQueryBuffer: IUnit[] = [];

  get modifiers(): GameModifiers { return DataManager.instance.modifiers; }

  public humanDifficultyMultiplier: number = 1.0;
  public activeRegionId: number = 0;
  private deploymentTimer: number = 0; 
  private humanSpawnTimer: number = 0;
  
  public cameraX: number = 0;
  
  public isPaused: boolean = false;
  private isDestroyed: boolean = false;
  public isStockpileMode: boolean = false;

  private currentStageIndex: number = 0;
  private stageTransitionTimer: number = 0;
  private gracePeriodTimer: number = 0;

  constructor() {
    this.world = new Container();
    this.unitLayer = new Container();
    this.particleLayer = new Container();
    this.spatialHash = new SpatialHash(100); // 100px grid cells
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
    
    // Debug Obstacles
    const debugGfx = new Graphics();
    debugGfx.lineStyle(2, 0x444444);
    OBSTACLES.forEach(obs => { debugGfx.drawCircle(obs.x, LANE_Y + obs.y, obs.radius); });
    this.world.addChild(debugGfx);

    this.unitLayer.sortableChildren = true;
    this.world.addChild(this.unitLayer);
    this.world.addChild(this.particleLayer);
    this.unitPool = new UnitPool(1000, this.unitLayer); 
    this.app.ticker.add(this.update.bind(this));
    
    if (this.activeRegionId > 0) {
        const saved = DataManager.instance.state.world.regions[this.activeRegionId];
        this.currentStageIndex = Math.floor(saved ? saved.devourProgress : 0);
        this.cameraX = this.currentStageIndex * STAGE_WIDTH;
        this.populateBattlefield();
        this.gracePeriodTimer = 2.0;
    }
  }

  public setStockpileMode(enabled: boolean) {
      this.isStockpileMode = enabled;
      if (enabled) {
          this.cameraX = 0;
          if (this.world) this.world.position.x = 0;
          this.clearParticles();
      } else {
          const saved = DataManager.instance.state.world.regions[this.activeRegionId];
          this.currentStageIndex = Math.floor(saved ? saved.devourProgress : 0);
          this.cameraX = this.currentStageIndex * STAGE_WIDTH;
          this.populateBattlefield();
          this.gracePeriodTimer = 2.0;
      }
  }

  private populateBattlefield() {
      if (!this.unitPool) return;
      this.spawnHumanWaveInStage(this.currentStageIndex);
      this.spawnHumanWaveInStage(this.currentStageIndex + 1);
      this.spawnZergWaveInStage(this.currentStageIndex - 1);
  }

  private spawnHumanWaveInStage(stageIdx: number) {
      if (!this.unitPool) return;
      const stageStart = stageIdx * STAGE_WIDTH;
      const width = STAGE_WIDTH;
      const difficultyMult = 1 + (stageIdx / 100) * this.humanDifficultyMultiplier * 3.0;
      const count = Math.floor((3 + Math.random() * 3) * difficultyMult);
      const regionConfig = INITIAL_REGIONS_CONFIG.find(r => r.id === this.activeRegionId);
      const spawnTable = regionConfig?.spawnTable || [{ type: UnitType.HUMAN_MARINE, weight: 1.0 }];

      for(let i=0; i<count; i++) {
           const x = stageStart + Math.random() * width;
           const u = this.unitPool.spawn(Faction.HUMAN, spawnTable[0].type, x, this.modifiers);
           if (u) u.state = 'MOVE';
      }
  }

  private spawnZergWaveInStage(stageIdx: number) {
      if (!this.unitPool) return;
      const stageStart = stageIdx * STAGE_WIDTH;
      const stockpile = DataManager.instance.state.hive.unitStockpile;
      const availableTypes = Object.values(UnitType).filter(t => (stockpile[t] || 0) > 0);
      if (availableTypes.length === 0) return;

      for(let i=0; i<10; i++) {
           const x = stageStart + Math.random() * STAGE_WIDTH;
           const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
           if (DataManager.instance.consumeStockpile(type)) {
               const u = this.unitPool.spawn(Faction.ZERG, type, x, this.modifiers);
               if (u) u.state = 'MOVE';
           }
      }
  }

  private clearParticles() {
      this.activeParticles.forEach(p => this.recycleParticle(p));
      this.activeParticles = [];
  }

  private update(delta: number) {
    if (this.isPaused || !this.app || this.isDestroyed) return;
    const dt = delta / 60; 

    // --- Spatial Hash Rebuild ---
    this.spatialHash.clear();
    const allUnits = this.unitPool!.getActiveUnits();
    for (const u of allUnits) {
        if (!u.isDead) this.spatialHash.insert(u);
    }

    if (this.isStockpileMode) {
        this.updateStockpileVisualization(dt);
        this.world.position.x = 0;
    } else {
        this.updateBattleMode(dt);
    }

    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
        const p = this.activeParticles[i];
        if (!p.update(p, dt)) {
            this.recycleParticle(p);
            this.activeParticles.splice(i, 1);
        }
    }

    this.unitLayer.children.sort((a, b) => a.zIndex - b.zIndex);

    for (const u of allUnits) {
        if (!u.active) continue;
        if (u.isDead) {
            this.processCorpse(u, dt);
        } else {
            // GENE HOOK: Tick
            if (u.geneConfig) {
                for (const cfg of u.geneConfig) {
                    const gene = GeneLibrary.get(cfg.id);
                    if (gene && gene.onTick) gene.onTick(u, dt, this, cfg.params || {});
                }
            }
            this.processUnit(u, dt);
        }
    }
  }

  private updateBattleMode(dt: number) {
      if (this.gracePeriodTimer > 0) this.gracePeriodTimer -= dt;
      const targetCamX = (this.currentStageIndex * STAGE_WIDTH) + (STAGE_WIDTH / 2) - (this.app!.screen.width / 2);
      this.cameraX += (targetCamX - this.cameraX) * 0.05;
      
      this.world.position.x = -this.cameraX; 
      if (this.bgLayer) this.bgLayer.tilePosition.x = -this.cameraX * 0.1;
      
      this.handleDeployment(dt);
      this.handleHumanSpawning(dt);

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
      const active = this.unitPool.getActiveUnits().filter(u => !u.isDead && u.x >= stageStart && u.x <= stageEnd);
      
      const humanCount = active.filter(u => u.faction === Faction.HUMAN).length;
      const zergCount = active.filter(u => u.faction === Faction.ZERG).length;
      
      if (humanCount === 0 && zergCount > 0 && this.currentStageIndex < 100) {
          this.advanceStage();
      } else if (humanCount > 0 && zergCount === 0 && this.currentStageIndex > 0) {
          this.retreatStage();
      }
  }

  private advanceStage() {
      this.currentStageIndex++;
      this.stageTransitionTimer = STAGE_TRANSITION_COOLDOWN;
      this.gracePeriodTimer = 1.0;
      this.createFloatingText(this.cameraX + this.app!.screen.width/2, LANE_Y - 100, "SECTOR CLEARED", 0x4ade80, 32);
      if (this.activeRegionId) DataManager.instance.updateRegionProgress(this.activeRegionId, 1);
      this.spawnHumanWaveInStage(this.currentStageIndex + 1);
  }

  private retreatStage() {
      this.currentStageIndex--;
      this.stageTransitionTimer = STAGE_TRANSITION_COOLDOWN;
      this.gracePeriodTimer = 1.0; 
      this.createFloatingText(this.cameraX + this.app!.screen.width/2, LANE_Y - 100, "FALLBACK!", 0xf87171, 32);
      if (this.activeRegionId) DataManager.instance.updateRegionProgress(this.activeRegionId, -1);
      this.spawnHumanWaveInStage(this.currentStageIndex);
  }

  private handleDeployment(dt: number) {
    if (!this.app || !this.unitPool) return;
    this.deploymentTimer += dt;
    if (this.deploymentTimer < 0.1) return; 
    this.deploymentTimer = 0;

    const activeZerg = this.unitPool.getActiveUnits().filter(u => u.faction === Faction.ZERG && !u.isDead);
    const stockpile = DataManager.instance.state.hive.unitStockpile;
    const spawnZoneStart = (this.currentStageIndex - 1) * STAGE_WIDTH;
    const spawnZoneEnd = (this.currentStageIndex) * STAGE_WIDTH - 100;
    const spawnX = Math.max(spawnZoneStart, spawnZoneStart + Math.random() * (spawnZoneEnd - spawnZoneStart));

    const availableTypes = Object.values(UnitType).filter(t => (stockpile[t] || 0) > 0);
    const spawnableTypes = availableTypes.filter(t => {
        const currentCount = activeZerg.filter(u => u.type === t).length;
        const cap = UNIT_SCREEN_CAPS[t] || 5;
        return currentCount < cap;
    });

    if (spawnableTypes.length === 0) return;
    const selectedType = spawnableTypes[Math.floor(Math.random() * spawnableTypes.length)];
    if (DataManager.instance.consumeStockpile(selectedType)) {
        this.unitPool.spawn(Faction.ZERG, selectedType, spawnX, this.modifiers);
    }
  }

  private handleHumanSpawning(dt: number) {
    if (!this.app || !this.unitPool) return;
    const difficultyMult = 1 + (this.currentStageIndex / 100) * this.humanDifficultyMultiplier * 3.0; 
    const baseHumanInterval = Math.max(0.5, 4.0 / difficultyMult); 
    this.humanSpawnTimer += dt;
    if (this.humanSpawnTimer > baseHumanInterval) {
        this.humanSpawnTimer = 0;
        const spawnZoneStart = (this.currentStageIndex + 1) * STAGE_WIDTH + 100;
        const spawnZoneEnd = (this.currentStageIndex + 2) * STAGE_WIDTH - 200;
        const spawnX = spawnZoneStart + Math.random() * (spawnZoneEnd - spawnZoneStart);
        const u = this.unitPool.spawn(Faction.HUMAN, UnitType.HUMAN_MARINE, spawnX, this.modifiers);
        if (u) u.state = 'MOVE'; 
    }
  }

  private updateStockpileVisualization(dt: number) {
      const stockpile = DataManager.instance.state.hive.unitStockpile;
      const activeVisuals = this.unitPool!.getActiveUnits().filter(u => u.faction === Faction.ZERG);
      Object.values(UnitType).forEach(type => {
          if (type.startsWith('HUMAN')) return;
          const storedCount = stockpile[type] || 0;
          const targetVisualCount = Math.min(storedCount, UNIT_SCREEN_CAPS[type] || 10);
          const currentVisuals = activeVisuals.filter(u => u.type === type);
          if (currentVisuals.length < targetVisualCount) {
             const u = this.unitPool!.spawn(Faction.ZERG, type, Math.random() * this.app!.screen.width, this.modifiers);
             if (u) u.state = 'WANDER';
          } else if (currentVisuals.length > targetVisualCount) {
              this.unitPool!.recycle(currentVisuals[0]);
          }
      });
  }

  private processUnit(u: IUnit, dt: number) {
     this.updateStatusEffects(u, dt);
     if (u.flashTimer > 0) u.flashTimer -= dt;
     this.updateUnitVisuals(u);

     if (u.statuses['SHOCKED'] && Math.random() < 0.05) return; 

     // --- TARGETING SYSTEM (Gene Based) ---
     const AGGRO_RANGE = 600;
     const potentialTargets = this._sharedQueryBuffer;
     this.spatialHash.query(u.x, u.y, AGGRO_RANGE, potentialTargets);

     // 1. Validation
     if (u.target && (u.target.isDead || !u.target.active || ((u.target.x-u.x)**2 > AGGRO_RANGE**2))) {
         u.target = null;
     }

     // 2. Acquisition (Delegated to Gene)
     if (!u.target && u.geneConfig) {
         for (const cfg of u.geneConfig) {
             const gene = GeneLibrary.get(cfg.id);
             if (gene && gene.onAcquireTarget) {
                 const t = gene.onAcquireTarget(u, potentialTargets, this, cfg.params || {});
                 if (t) { u.target = t; break; }
             }
         }
     }

     // --- MOVEMENT SYSTEM (Gene Based) ---
     const velocity = { x: 0, y: 0 };
     let moved = false;
     
     if (u.geneConfig) {
         for (const cfg of u.geneConfig) {
            const gene = GeneLibrary.get(cfg.id);
            if (gene && gene.onMove) {
                gene.onMove(u, velocity, dt, this, cfg.params || {});
                moved = true;
            }
         }
     }
     
     if (moved) {
        u.x += velocity.x;
        u.y += velocity.y;
     }

     // View Sync
     if (u.view) {
         u.view.position.x = u.x;
         u.view.y = u.y;
         u.view.zIndex = u.y;
         if (Math.abs(velocity.x) > 0.1) u.view.scale.x = velocity.x < 0 ? -1 : 1;
     }

     // --- COMBAT SYSTEM ---
     u.attackCooldown -= dt;
     if (u.target && !u.target.isDead) {
         const dist = Math.sqrt((u.target.x - u.x)**2 + (u.target.y - u.y)**2);
         if (dist <= u.stats.range) {
             u.state = 'ATTACK'; 
             if (u.attackCooldown <= 0) {
                 u.attackCooldown = u.stats.attackSpeed;
                 this.performAttack(u, u.target);
             }
         }
     }
  }

  public updateUnitVisuals(u: IUnit) {
      if (!u.view) return;
      if (u.flashTimer > 0) { u.view.tint = 0xffffaa; return; }
      
      // Decoupled Visuals via Registry
      const statusTint = StatusRegistry.getVisual(u);
      u.view.tint = statusTint !== null ? statusTint : 0xffffff;
  }

  public performAttack(source: IUnit, target: IUnit) {
     let handled = false;
     // GENE HOOK: PreAttack (e.g., suicide bombers, healers, projectiles)
     if (source.geneConfig) {
         for (const cfg of source.geneConfig) {
             const gene = GeneLibrary.get(cfg.id);
             if (gene && gene.onPreAttack) {
                 const result = gene.onPreAttack(source, target, this, cfg.params || {});
                 if (result === false) { handled = true; break; }
             }
         }
     }
     
     // Default Melee (If no gene handled it)
     if (!handled) {
         this.createFlash(target.x, target.y - 10, ELEMENT_COLORS[source.stats.element]); 
         this.processDamagePipeline(source, target);
     }
  }

  public updateStatusEffects(unit: IUnit, dt: number) {
      if (unit.isDead) return;
      for (const key in unit.statuses) {
          const type = key as StatusType;
          const effect = unit.statuses[type];
          if (!effect) continue;
          
          effect.duration -= dt;
          if (effect.duration <= 0) { delete unit.statuses[type]; continue; }
          
          StatusRegistry.onTick(unit, type, dt, this);
      }
  }

  public applyStatus(target: IUnit, type: StatusType, stacks: number, duration: number) {
      if (target.isDead) return;
      if (!target.statuses[type]) { target.statuses[type] = { type, stacks: 0, duration: 0 }; }
      const s = target.statuses[type]!;
      s.stacks = Math.min(STATUS_CONFIG.MAX_STACKS, s.stacks + stacks);
      s.duration = Math.max(s.duration, duration);
  }

  public processDamagePipeline(source: IUnit, target: IUnit) {
      if (target.isDead) return;
      const elementType = source.stats.element;
      let rawDamage = source.stats.damage;
      
      // GENE HOOK: OnHit
      if (source.geneConfig) {
          source.geneConfig.forEach(cfg => { 
             const gene = GeneLibrary.get(cfg.id);
             if (gene && gene.onHit) gene.onHit(source, target, rawDamage, this, cfg.params || {});
          });
      }

      // ELEMENTAL REGISTRY
      ReactionRegistry.handle(target, elementType, this, rawDamage);

      let armor = target.stats.armor;
      if (target.statuses['ARMOR_BROKEN']) armor = 0; 
      const reduction = armor / (armor + 50);
      let finalDamage = rawDamage * (1 - reduction);
      target.stats.hp -= finalDamage;
      
      if (target.view) { target.flashTimer = 0.1; }
      if (target.stats.hp <= 0) this.killUnit(target);
  }

  public dealTrueDamage(target: IUnit, amount: number) {
      if (target.isDead) return; target.stats.hp -= amount; if (target.stats.hp <= 0) this.killUnit(target);
  }

  public killUnit(u: IUnit) {
      if (u.isDead) return;
      u.isDead = true; u.state = 'DEAD'; 
      u.decayTimer = DECAY_TIME;
      
      // GENE HOOK: OnDeath
      if (u.geneConfig) {
         u.geneConfig.forEach(cfg => { 
            const gene = GeneLibrary.get(cfg.id);
            if(gene && gene.onDeath) gene.onDeath(u, this, cfg.params || {}); 
         });
      }

      if (u.faction === Faction.HUMAN) DataManager.instance.modifyResource('biomass', 10);
      else DataManager.instance.modifyResource('biomass', 5 * 0.5); // Recycle

      if (u.view) { u.view.tint = 0x555555; u.view.zIndex = -9999; }
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
      const g = this.getGraphics();
      g.beginFill(ELEMENT_COLORS[element as ElementType] || 0xffffff, 0.8);
      g.drawCircle(0, 0, 10); g.endFill(); g.position.set(x, y);
      this.activeParticles.push({ view: g, type: 'GRAPHICS', life: 20, maxLife: 20, update: (p, dt) => { p.life -= dt * 60; p.view.y -= 1; p.view.alpha = p.life / 20; return p.life > 0; } });
  }
  public createFloatingText(x: number, y: number, text: string, color: number, fontSize: number = 12) {
      let t = this.textPool.pop();
      if (!t) { t = new Text({ text, style: { fontFamily: 'Courier New', fontSize, fontWeight: 'bold', fill: color } }); } 
      else { t.text = text; t.style.fill = color; }
      t.visible = true; t.alpha = 1; t.position.set(x, y); this.particleLayer.addChild(t);
      this.activeParticles.push({ view: t, type: 'TEXT', life: 60, maxLife: 60, update: (p, dt) => { p.life -= dt * 60; p.view.y -= 0.5; p.view.alpha = p.life / 20; return p.life > 0; } });
  }
  public createFlash(x: number, y: number, color: number) { 
      const g = this.getGraphics(); g.beginFill(color, 0.9); g.drawCircle(0, 0, 4); g.endFill(); g.position.set(x, y);
      this.activeParticles.push({ view: g, type: 'GRAPHICS', life: 5, maxLife: 5, update: (p, dt) => { p.life -= dt * 60; p.view.alpha = p.life / 5; return p.life > 0; } });
  }
  public createProjectile(x1: number, y1: number, x2: number, y2: number, color: number) { 
      const g = this.getGraphics(); g.lineStyle(2, color, 1); g.moveTo(0, 0); g.lineTo(12, 0); g.position.set(x1, y1); g.rotation = Math.atan2(y2 - y1, x2 - x1); 
      const dist = Math.sqrt((x2-x1)**2 + (y2-y1)**2); 
      this.activeParticles.push({ view: g, type: 'GRAPHICS', life: 0, maxLife: dist/800, startX: x1, startY: y1, endX: x2, endY: y2, update: (p: any, dt: number) => { p.life += dt; const t = Math.min(1, p.life / p.maxLife); p.view.x = p.startX + (p.endX - p.startX) * t; p.view.y = p.startY + (p.endY - p.startY) * t; return t < 1; } } as any);
  }
  public createExplosion(x: number, y: number, radius: number, color: number = 0x00ff00) { 
      const g = this.getGraphics(); g.beginFill(color, 0.5); g.drawCircle(0, 0, 10); g.endFill(); g.position.set(x, y); 
      this.activeParticles.push({ view: g, type: 'GRAPHICS', life: 0, maxLife: 20, update: (p: any, dt: number) => { p.life++; p.view.width += 8; p.view.height += 8; p.view.alpha -= 0.05; return p.view.alpha > 0; } });
  }
  private processCorpse(u: IUnit, dt: number) {
      u.decayTimer -= dt; if (u.view) { u.view.y += 10 * dt; u.view.alpha = Math.max(0, u.decayTimer / DECAY_TIME); } if (u.decayTimer <= 0) this.unitPool!.recycle(u as Unit);
  }

  public getSnapshot(): GameStateSnapshot {
      const s = DataManager.instance.state;
      const activeZergCounts: Record<string, number> = {};
      Object.values(UnitType).forEach(t => { activeZergCounts[t] = 0; });

      if (!this.unitPool) return { resources: s.resources.biomass, distance: this.currentStageIndex, unitCountZerg: 0, unitCountHuman: 0, activeZergCounts, stockpileMelee: 0, stockpileRanged: 0, stockpileTotal: 0, populationCap: 0, isPaused: this.isPaused };
      
      const active = this.unitPool.getActiveUnits();
      active.filter(u => u.faction === Faction.ZERG).forEach(u => activeZergCounts[u.type]++);

      return {
          resources: s.resources.biomass,
          distance: this.currentStageIndex,
          stockpileMelee: s.hive.unitStockpile[UnitType.MELEE] || 0,
          stockpileRanged: s.hive.unitStockpile[UnitType.RANGED] || 0,
          stockpileTotal: Object.values(s.hive.unitStockpile).reduce((a,b)=>a+b,0),
          populationCap: DataManager.instance.getMaxPopulationCap(),
          unitCountZerg: active.filter(u => u.faction === Faction.ZERG).length,
          unitCountHuman: active.filter(u => u.faction === Faction.HUMAN).length,
          activeZergCounts,
          isPaused: this.isPaused
      };
  }
  
  public resume() { this.isPaused = false; }
  public pause() { this.isPaused = true; }
  public destroy() { 
      this.isDestroyed = true;
      if (!this.isStockpileMode && this.unitPool) {
          const activeZerg = this.unitPool.getActiveUnits().filter(u => u.faction === Faction.ZERG && !u.isDead);
          activeZerg.forEach(u => DataManager.instance.addToStockpile(u.type, 1));
      }
      if (this.app) { try { this.app.destroy(true, { children: true, texture: true }); } catch (e) {} } 
      this.app = null; this.unitPool = null; 
  }
}
