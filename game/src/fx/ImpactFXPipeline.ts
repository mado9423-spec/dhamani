import Phaser from "phaser";

// GLSL ES 1.00 (WebGL1-compatible). `uMainSampler`/`outTexCoord` are the
// standard names Phaser's PostFXPipeline binds automatically — see
// node_modules/phaser/src/renderer/webgl/shaders/src/PostFX.frag and
// FXVignette.frag, which this shader's structure mirrors.
const FRAG_SHADER = `
#define SHADER_NAME IMPACT_FX_FS

precision mediump float;

uniform sampler2D uMainSampler;
uniform float strength;
uniform vec2 center;

varying vec2 outTexCoord;

const int BLUR_SAMPLES = 5;

void main ()
{
    vec2 uv = outTexCoord;
    vec2 dir = uv - center;

    if (strength <= 0.001)
    {
        gl_FragColor = texture2D(uMainSampler, uv);
        return;
    }

    // Radial blur: average a handful of samples stepped toward/away from
    // center along the same line as the aberration offset below, scaled
    // by distance from center so it stays cheap and only affects the
    // frame edges, not the middle where the player's attention already is.
    vec4 sum = vec4(0.0);
    float blurScale = strength * 0.035;
    for (int i = 0; i < BLUR_SAMPLES; i++)
    {
        float t = (float(i) / float(BLUR_SAMPLES - 1)) - 0.5;
        sum += texture2D(uMainSampler, uv - dir * blurScale * t);
    }
    vec4 color = sum / float(BLUR_SAMPLES);

    // Chromatic aberration: sample red/blue from slightly either side of
    // the blurred green channel, offset along the same radial direction
    // (so it's proportional to distance from center, like a real lens).
    vec2 offset = dir * strength * 0.028;
    float r = texture2D(uMainSampler, uv - offset).r;
    float b = texture2D(uMainSampler, uv + offset).b;

    gl_FragColor = vec4(r, color.g, b, color.a);
}
`;

/**
 * Combined chromatic-aberration + radial-blur post-processing pipeline,
 * applied to the main camera and used only for brief "impact" moments
 * (damage taken, boss hits, death, boss defeats) — never left running at
 * full strength. Its `strength` uniform is tweened up then back down
 * rather than the pipeline being added/removed per trigger, mirroring how
 * Phaser's own built-in `VignetteFXPipeline` is designed to be used (a
 * single long-lived instance, modulated via a property Phaser reads every
 * frame in `onPreRender`) — and the shader itself early-exits to a plain
 * passthrough sample whenever `strength` is ~0, so idle gameplay (the
 * overwhelming majority of frames) pays for one branch check, not five
 * extra texture samples.
 *
 * Registered once with the renderer's pipeline manager — see
 * `MainScene.setupPostPipelines()` — and kept attached to the camera for
 * the scene's whole lifetime rather than swapped in/out, so there is
 * nothing extra to add/remove on every trigger, only the strength value.
 */
export class ImpactFXPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  static readonly PIPELINE_NAME = "ImpactFX";

  strength = 0;
  readonly center = { x: 0.5, y: 0.5 };

  constructor(game: Phaser.Game) {
    super({ game, fragShader: FRAG_SHADER });
  }

  onPreRender(): void {
    this.set1f("strength", this.strength);
    this.set2f("center", this.center.x, this.center.y);
  }
}
