import Phaser from 'phaser';
import backgroundUrl from '../assets/images/achaemenid/background-palace.png';
import characterUrl from '../assets/images/achaemenid/hero-trimmed.png';
import floorUrl from '../assets/images/achaemenid/floor-trimmed.png';
import platformUrl from '../assets/images/achaemenid/platform-trimmed.png';
import type { LevelSpec, ThemeSpec } from '../core/types';
import {
  BASE_X,
  BASE_Y,
  GAME_HEIGHT,
  GAME_WIDTH,
  LEVEL_VERTICAL_GAP,
  PENALTY_POLICY,
  PLATFORM_HEIGHT
} from '../data/config';
import { THEMES } from '../data/themes';
import { InputJudge } from './inputJudge';
import { LevelManager } from './levelManager';
import { PlatformWordBuilder } from './platformWordBuilder';
import { SeededRandom } from './random';
import { ScoreSystem } from './scoreSystem';
import { ThemeManager } from './themeManager';
import { WordProvider } from './wordProvider';

interface RenderedPlatform {
  sprite: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  specIndex: number;
}

const PLAYER_FOOT_OVERHANG = 8;
const FLOOR_STAND_OVERHANG = 14;

export class GameScene extends Phaser.Scene {
  private readonly seed = 1337;
  private random!: SeededRandom;
  private themeManager!: ThemeManager;
  private levelManager!: LevelManager;
  private inputJudge!: InputJudge;
  private scoreSystem!: ScoreSystem;

  private background!: Phaser.GameObjects.Image;
  private player!: Phaser.GameObjects.Image;
  private playerBaseScaleX = 1;
  private playerBaseScaleY = 1;
  private idleTween?: Phaser.Tweens.Tween;
  private jumpTween?: Phaser.Tweens.Tween;
  private velocityY = 0;

  private levels: LevelSpec[] = [];
  private renderedPlatforms: RenderedPlatform[] = [];
  private renderedFloors: Phaser.GameObjects.Image[] = [];

  private activeLevelIndex = 0;
  private activePlatformIndex = 0;
  private surfaceLevelIndex = 0;
  private surfacePlatformIndex = -1;

  private hudBackdrop!: Phaser.GameObjects.Rectangle;
  private hudText!: Phaser.GameObjects.Text;
  private isReady = false;

  constructor() {
    super('GameScene');
  }

  preload(): void {
    this.load.image('sky-background', backgroundUrl);
    this.load.image('player-character', characterUrl);
    this.load.image('floor-base', floorUrl);
    this.load.image('letter-platform', platformUrl);
  }

  create(): void {
    this.random = new SeededRandom(this.seed);
    this.themeManager = new ThemeManager(THEMES);
    const builder = new PlatformWordBuilder(this.random);
    this.inputJudge = new InputJudge(PENALTY_POLICY);
    this.scoreSystem = new ScoreSystem();

    this.cameras.main.setBackgroundColor('#31211b');
    this.background = this.add.image(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.5, 'sky-background');
    this.background.setScrollFactor(0);
    this.background.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.background.setDepth(-100);

    this.player = this.add.image(120, GAME_HEIGHT - 120, 'player-character');
    this.player.setOrigin(0.5, 1);
    this.player.setDisplaySize(46, 110);
    this.playerBaseScaleX = this.player.scaleX;
    this.playerBaseScaleY = this.player.scaleY;
    this.player.setDepth(20);

    this.hudBackdrop = this.add.rectangle(GAME_WIDTH * 0.5, 28, GAME_WIDTH - 32, 38, 0x2a1a13, 0.66);
    this.hudBackdrop.setScrollFactor(0);
    this.hudBackdrop.setDepth(90);
    this.hudText = this.add.text(16, 14, '', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#fff2cf'
    });
    this.hudText.setScrollFactor(0);
    this.hudText.setDepth(91);

    this.hudText.setText('Loading word feed...');

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      this.onKeydown(event.key);
    });

    void this.startGame(builder);
  }

  update(_: number, delta: number): void {
    if (!this.isReady) {
      return;
    }

    const dt = delta / 1000;

    if (!this.jumpTween?.isPlaying()) {
      this.velocityY += 980 * dt;
      this.player.y += this.velocityY * dt;

      const target = this.getStandingPosition();
      const targetY = target.y;

      if (this.player.y > targetY && this.velocityY > 0) {
        this.player.y = targetY;
        this.velocityY = 0;
        this.player.x = Phaser.Math.Linear(this.player.x, target.x, 0.18);
      }
    }

    const camTargetY = this.player.y - GAME_HEIGHT * 0.5;
    this.cameras.main.scrollY = Phaser.Math.Linear(this.cameras.main.scrollY, camTargetY, 0.08);
  }

  private onKeydown(key: string): void {
    if (!this.isReady) {
      return;
    }

    const now = this.time.now;
    const level = this.levels[this.activeLevelIndex];
    const expectedChar = level.platforms[this.activePlatformIndex].char;

    const result = this.inputJudge.judge(key, expectedChar, now);

    if (result === 'correct') {
      this.handleCorrectInput();
      return;
    }

    this.scoreSystem.onWrongKey();

    if (result === 'burstPenalty') {
      this.handleBurstPenalty();
    } else {
      this.handleWrongInput();
    }

    this.updateHud();
  }

  private async startGame(builder: PlatformWordBuilder): Promise<void> {
    const wordProvider = new WordProvider();
    const wordsByLength = await wordProvider.load();

    this.levelManager = new LevelManager(
      this.random,
      builder,
      (levelIndex) => this.themeManager.forLevel(levelIndex).id,
      wordsByLength
    );

    for (let i = 0; i < 5; i += 1) {
      this.ensureLevel(i);
    }

    this.renderAllLevels();
    this.snapToFloor(0);
    this.isReady = true;
    this.updateHud();
  }

  private handleCorrectInput(): void {
    this.scoreSystem.onCorrectJump();
    this.stopIdleAnimation();
    const jumpTarget = this.getCurrentPlatform();
    const jumpTargetPosition = {
      x: jumpTarget.sprite.x,
      y: this.platformStandY(jumpTarget)
    };
    const targetLevelIndex = this.activeLevelIndex;
    const targetPlatformIndex = this.activePlatformIndex;

    this.tweens.add({
      targets: this.player,
      angle: 7,
      yoyo: true,
      duration: 90,
      ease: 'Sine.out'
    });

    const currentLevel = this.levels[this.activeLevelIndex];
    this.activePlatformIndex += 1;

    this.surfaceLevelIndex = targetLevelIndex;
    this.surfacePlatformIndex = targetPlatformIndex;

    if (this.activePlatformIndex >= currentLevel.platforms.length) {
      this.scoreSystem.onLevelComplete(this.activeLevelIndex);
      this.activeLevelIndex += 1;
      this.activePlatformIndex = 0;
      this.ensureLevel(this.activeLevelIndex + 3);
      this.updateTheme();
      this.renderAllLevels();
    }

    this.animateJumpToPosition(jumpTargetPosition);
    this.inputJudge.clearMistakes(this.time.now);
    this.updateTheme();
    this.updateHud();
  }

  private handleWrongInput(): void {
    this.cameras.main.shake(120, 0.008);
    this.player.setTint(0xff6f7d);
    this.time.delayedCall(120, () => this.player.clearTint());

    this.dropToPreviousSurface();
  }

  private handleBurstPenalty(): void {
    this.cameras.main.shake(220, 0.014);
    this.player.setTint(0xff3864);
    this.time.delayedCall(180, () => this.player.clearTint());

    this.activeLevelIndex = Math.max(0, this.activeLevelIndex - 1);
    this.activePlatformIndex = 0;

    this.snapToFloor(this.activeLevelIndex);
    this.updateTheme();
  }

  private dropToPreviousSurface(): void {
    this.cancelActiveJump();
    const surface = this.getPreviousSurfaceForTarget();

    this.surfaceLevelIndex = surface.levelIndex;
    this.surfacePlatformIndex = surface.platformIndex;
    this.player.x = surface.x;
    this.player.y = surface.y - 10;
    this.velocityY = 180;
    this.startIdleAnimation();
  }

  private snapToFloor(levelIndex: number): void {
    this.cancelActiveJump();
    this.surfaceLevelIndex = levelIndex;
    this.surfacePlatformIndex = -1;
    const floor = this.floorPositionForLevel(levelIndex);
    this.player.x = floor.x;
    this.player.y = floor.y;
    this.velocityY = 0;
    this.startIdleAnimation();
  }

  private animateJumpToPosition(target: { x: number; y: number }): void {
    this.cancelActiveJump();

    const startX = this.player.x;
    const startY = this.player.y;
    const endX = target.x;
    const endY = target.y;
    const distance = Phaser.Math.Distance.Between(startX, startY, endX, endY);
    const duration = Phaser.Math.Clamp(distance * 0.55, 140, 260);
    const arcHeight = Phaser.Math.Clamp(distance * 0.18, 34, 72);
    const jumpState = { progress: 0 };

    this.velocityY = 0;
    this.jumpTween = this.tweens.add({
      targets: jumpState,
      progress: 1,
      duration,
      ease: 'Sine.out',
      onUpdate: () => {
        const t = jumpState.progress;
        this.player.x = Phaser.Math.Linear(startX, endX, t);
        this.player.y = Phaser.Math.Linear(startY, endY, t) - Math.sin(t * Math.PI) * arcHeight;
      },
      onComplete: () => {
        this.player.x = endX;
        this.player.y = endY;
        this.player.angle = 0;
        this.resetPlayerPose();
        this.velocityY = 0;
        this.jumpTween = undefined;
        this.startIdleAnimation();
      }
    });
  }

  private cancelActiveJump(): void {
    if (this.jumpTween?.isPlaying()) {
      this.jumpTween.stop();
    }

    this.jumpTween = undefined;
  }

  private startIdleAnimation(): void {
    if (this.idleTween?.isPlaying()) {
      return;
    }

    this.idleTween = this.tweens.add({
      targets: this.player,
      scaleX: this.playerBaseScaleX * 1.035,
      scaleY: this.playerBaseScaleY * 0.985,
      angle: -1.2,
      duration: 820,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut'
    });
  }

  private stopIdleAnimation(): void {
    if (this.idleTween?.isPlaying()) {
      this.idleTween.stop();
    }

    this.idleTween = undefined;
    this.resetPlayerPose();
  }

  private resetPlayerPose(): void {
    this.player.angle = 0;
    this.player.scaleX = this.playerBaseScaleX;
    this.player.scaleY = this.playerBaseScaleY;
  }

  private platformStandY(platform: RenderedPlatform): number {
    return platform.sprite.y - platform.sprite.displayHeight * 0.28 + PLAYER_FOOT_OVERHANG;
  }

  private getStandingPosition(): { x: number; y: number } {
    if (this.surfacePlatformIndex < 0) {
      return this.floorPositionForLevel(this.surfaceLevelIndex);
    }

    const platform = this.getPlatformAt(this.surfaceLevelIndex, this.surfacePlatformIndex);
    return {
      x: platform.sprite.x,
      y: this.platformStandY(platform)
    };
  }

  private getPreviousSurfaceForTarget(): {
    levelIndex: number;
    platformIndex: number;
    x: number;
    y: number;
  } {
    if (this.activePlatformIndex > 0) {
      const platformIndex = this.activePlatformIndex - 1;
      const platform = this.getPlatformAt(this.activeLevelIndex, platformIndex);
      return {
        levelIndex: this.activeLevelIndex,
        platformIndex,
        x: platform.sprite.x,
        y: this.platformStandY(platform)
      };
    }

    if (this.activeLevelIndex > 0) {
      const previousLevelIndex = this.activeLevelIndex - 1;
      const platformIndex = this.levels[previousLevelIndex].platforms.length - 1;
      const platform = this.getPlatformAt(previousLevelIndex, platformIndex);
      return {
        levelIndex: previousLevelIndex,
        platformIndex,
        x: platform.sprite.x,
        y: this.platformStandY(platform)
      };
    }

    const floor = this.floorPositionForLevel(0);
    return {
      levelIndex: 0,
      platformIndex: -1,
      x: floor.x,
      y: floor.y
    };
  }

  private floorPositionForLevel(levelIndex: number): { x: number; y: number } {
    return {
      x: BASE_X - 44,
      y: BASE_Y - levelIndex * LEVEL_VERTICAL_GAP + 58 + FLOOR_STAND_OVERHANG
    };
  }

  private getCurrentPlatform(): RenderedPlatform {
    return this.getPlatformAt(this.activeLevelIndex, this.activePlatformIndex);
  }

  private getPlatformAt(levelIndex: number, platformIndex: number): RenderedPlatform {
    const levelOffset = this.levels
      .slice(0, levelIndex)
      .reduce((sum, level) => sum + level.platforms.length, 0);

    return this.renderedPlatforms[levelOffset + platformIndex];
  }

  private ensureLevel(levelIndex: number): void {
    while (this.levels.length <= levelIndex) {
      const nextIndex = this.levels.length;
      const created = this.levelManager.createLevel(nextIndex);
      this.levels.push(created.level);
    }
  }

  private renderAllLevels(): void {
    this.renderedPlatforms.forEach((p) => {
      p.sprite.destroy();
      p.glow.destroy();
      p.label.destroy();
    });
    this.renderedFloors.forEach((floor) => floor.destroy());
    this.renderedPlatforms = [];
    this.renderedFloors = [];

    this.levels.forEach((level) => {
      const theme = this.themeForLevel(level.id);
      if (level.id === 0) {
        const floorPosition = this.floorPositionForLevel(level.id);
        const floor = this.add.image(floorPosition.x, floorPosition.y + 30, 'floor-base');
        floor.setDisplaySize(220, 75);
        floor.setDepth(4);
        this.renderedFloors.push(floor);
      }

      level.platforms.forEach((spec, index) => {
        const glow = this.add.rectangle(
          spec.x,
          spec.y + 15,
          spec.width + 18,
          PLATFORM_HEIGHT + 12,
          theme.accentColor,
          0.26
        );
        glow.setDepth(3);

        const sprite = this.add.image(spec.x, spec.y, 'letter-platform');
        sprite.setDisplaySize(spec.width + 72, 46);
        sprite.setDepth(5);

        const label = this.add.text(spec.x, spec.y + 29, spec.char.toUpperCase(), {
          fontFamily: 'monospace',
          fontSize: '24px',
          color: '#ffe2a3',
          stroke: '#2a1a13',
          strokeThickness: 6
        });
        label.setOrigin(0.5);
        label.setDepth(8);

        if (spec.behavior === 'movingHorizontal') {
          this.tweens.add({
            targets: [sprite, glow, label],
            x: spec.x + 28,
            yoyo: true,
            repeat: -1,
            duration: 1200 + index * 90,
            ease: 'Sine.inOut'
          });
        }

        this.renderedPlatforms.push({ sprite, glow, label, specIndex: index });
      });
    });
  }

  private themeForLevel(levelIndex: number): ThemeSpec {
    const themeId = this.levels[levelIndex]?.themeId;
    const fromId = THEMES.find((theme) => theme.id === themeId);
    return fromId ?? this.themeManager.forLevel(levelIndex);
  }

  private updateTheme(): void {
    const theme = this.themeForLevel(this.activeLevelIndex);
    this.cameras.main.setBackgroundColor(theme.background);
  }

  private updateHud(): void {
    const level = this.levels[this.activeLevelIndex];
    const score = this.scoreSystem.getState();
    const mistakeLoad = Math.round(this.inputJudge.getMistakeLoad(this.time.now) * 100);

    this.hudText.setText(
      [
        `Level: ${this.activeLevelIndex + 1}`,
        `Word: ${level.word}`,
        `Platform: ${this.activePlatformIndex + 1}/${level.platforms.length}`,
        `Score: ${score.score}`,
        `Combo: ${score.combo}`,
        `Multiplier: x${score.multiplier}`,
        `Mistake Meter: ${mistakeLoad}%`
      ].join('   ')
    );
  }
}
