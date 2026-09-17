/**
 * Small shared helpers for the slanted-2.5D character presentation:
 * horizontal facing (flip, not rotate) and a procedural walking bob.
 * Deliberately framework-free (plain numbers in/out) so entities can
 * apply the results to whichever child GameObject actually carries the
 * visuals, keeping the outer Container's own transform — the one used
 * for physics/collision — completely untouched by either effect.
 */

const FACING_DEADZONE = 0.5;

export type Facing = 1 | -1;

/**
 * Resolves which way a character should face this frame. Only flips on
 * a clear horizontal velocity past the deadzone; holds the previous
 * facing otherwise (moving purely vertically, or standing still,
 * shouldn't snap back to a default facing).
 */
export function resolveFacing(velocityX: number, previousFacing: Facing): Facing {
  if (velocityX > FACING_DEADZONE) {
    return 1;
  }
  if (velocityX < -FACING_DEADZONE) {
    return -1;
  }
  return previousFacing;
}

/**
 * A continuous up/down sine offset simulating a walking stride, only
 * while actually moving (a stationary character shouldn't visibly bob).
 * `animTimeMs` is a per-entity elapsed-time accumulator (not the scene
 * clock directly) so pooled entities can each carry their own phase.
 */
export function walkBob(animTimeMs: number, moving: boolean, amplitude: number, frequencyHz: number): number {
  if (!moving) {
    return 0;
  }
  return Math.sin((animTimeMs / 1000) * frequencyHz * Math.PI * 2) * amplitude;
}
