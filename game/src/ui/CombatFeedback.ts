import Phaser from "phaser";

/**
 * Short-lived world-space combat feedback (floating damage numbers,
 * hit bursts). These aren't pooled: they're capped naturally by the
 * player's fire rate and a short lifespan, so plain create/destroy is
 * cheap and simpler than adding another pool.
 */
export function spawnDamageNumber(scene: Phaser.Scene, x: number, y: number, amount: number): void {
  const text = scene.add
    .text(x, y, `-${Math.round(amount)}`, {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#ffe08a",
    })
    .setOrigin(0.5)
    .setDepth(1500);

  scene.tweens.add({
    targets: text,
    y: y - 30,
    alpha: 0,
    duration: 500,
    ease: "Cubic.Out",
    onComplete: () => text.destroy(),
  });
}

export function spawnHitEffect(scene: Phaser.Scene, x: number, y: number, color: number): void {
  const burst = scene.add.circle(x, y, 8, color, 0.8).setDepth(1400);

  scene.tweens.add({
    targets: burst,
    scale: { from: 0.4, to: 1.6 },
    alpha: 0,
    duration: 180,
    ease: "Cubic.Out",
    onComplete: () => burst.destroy(),
  });
}
