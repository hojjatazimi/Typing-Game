import type { PenaltyPolicy } from '../core/types';

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 640;

export const PLATFORM_WIDTH = 110;
export const PLATFORM_HEIGHT = 20;

export const BASE_X = 130;
export const X_STEP = 145;
export const BASE_Y = GAME_HEIGHT - 80;

export const LEVEL_VERTICAL_GAP = 210;

export const PLAYER_SPEED_X = 240;
export const PLAYER_JUMP_VELOCITY = -460;

export const PENALTY_POLICY: PenaltyPolicy = {
  wrongKeyDrop: 'previous_platform',
  burstWindowMs: 2600,
  burstThreshold: 3,
  burstDrop: 'previous_level'
};
