export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Reads the CSS env(safe-area-inset-*) values (device notches, camera
 * cutouts, gesture-navigation bars) in CSS pixels. There's no direct
 * JS API for these — the standard technique is measuring computed
 * padding on a throwaway element, since env() only resolves inside
 * CSS. Requires viewport-fit=cover in the viewport meta tag (already
 * set in index.html) or the env() values are always 0.
 */
export function readSafeAreaInsetsPx(): SafeAreaInsets {
  if (typeof document === "undefined") {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;top:0;left:0;right:0;bottom:0;visibility:hidden;pointer-events:none;" +
    "padding-top:env(safe-area-inset-top,0px);" +
    "padding-right:env(safe-area-inset-right,0px);" +
    "padding-bottom:env(safe-area-inset-bottom,0px);" +
    "padding-left:env(safe-area-inset-left,0px);";
  document.body.appendChild(probe);

  const style = getComputedStyle(probe);
  const insets: SafeAreaInsets = {
    top: parseFloat(style.paddingTop) || 0,
    right: parseFloat(style.paddingRight) || 0,
    bottom: parseFloat(style.paddingBottom) || 0,
    left: parseFloat(style.paddingLeft) || 0,
  };

  document.body.removeChild(probe);
  return insets;
}

/**
 * Converts CSS-pixel safe-area insets into the game's fixed design
 * coordinate space (GAME_WIDTH x GAME_HEIGHT), given the canvas's
 * current on-screen CSS size — needed because Phaser.Scale.FIT scales
 * the whole canvas uniformly, so a CSS-pixel inset maps to a different
 * number of game-space units depending on that scale factor.
 */
export function safeAreaInsetsToGameSpace(
  cssInsets: SafeAreaInsets,
  canvasCssWidth: number,
  canvasCssHeight: number,
  gameWidth: number,
  gameHeight: number
): SafeAreaInsets {
  if (canvasCssWidth <= 0 || canvasCssHeight <= 0) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const scaleX = gameWidth / canvasCssWidth;
  const scaleY = gameHeight / canvasCssHeight;

  return {
    top: cssInsets.top * scaleY,
    right: cssInsets.right * scaleX,
    bottom: cssInsets.bottom * scaleY,
    left: cssInsets.left * scaleX,
  };
}
