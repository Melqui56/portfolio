import { Application, Container, Graphics, Sprite } from 'pixi.js';
import { createShip } from './ship';

/** Horizon sits this fraction down the canvas; everything below is sea. */
const HORIZON = 0.62;

/** Wave bands, far to near. Nearer bands are taller, faster and more opaque. */
const WAVE_BANDS = [
  { depth: 0.02, amp: 5, wavelength: 520, speed: 0.16, color: 0x101a2e, alpha: 0.9 },
  { depth: 0.09, amp: 9, wavelength: 400, speed: 0.26, color: 0x0c1526, alpha: 0.92 },
  { depth: 0.19, amp: 14, wavelength: 310, speed: 0.4, color: 0x09101f, alpha: 0.94 },
  { depth: 0.32, amp: 20, wavelength: 240, speed: 0.62, color: 0x060b16, alpha: 0.97 },
];

/** The ship rides this band, so the two nearest swells pass in front of her. */
const SHIP_BAND = 1;

/** Embers drifting up from the water — the crimson signature, kept sparse. */
const EMBER_COUNT = 46;

interface Ember {
  sprite: Sprite;
  vx: number;
  vy: number;
  phase: number;
  drift: number;
}

/**
 * Mount the night-sea scene into `host` and return a cleanup function.
 * Framework-free: called from OceanBackground.astro after browser idle.
 */
export function mountOcean(host: HTMLElement, label: string): () => void {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;

  let app: Application | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let destroyed = false;
  const cleanups: Array<() => void> = [];

  async function init() {
    app = new Application();
    await app.init({
      resizeTo: host,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio, 2),
      powerPreference: 'high-performance',
    });

    if (destroyed || !app) {
      app?.destroy(true, { children: true, texture: true });
      return;
    }

    host.appendChild(app.canvas);

    const w = () => app!.renderer.width / app!.renderer.resolution;
    const h = () => app!.renderer.height / app!.renderer.resolution;

    // Soft radial glow texture, generated once the renderer exists (Pixi v8).
    const glowSource = new Graphics();
    for (let i = 16; i > 0; i--) {
      glowSource.circle(32, 32, (i / 16) * 30).fill({ color: 0xffffff, alpha: 0.045 });
    }
    const glowTexture = app.renderer.generateTexture(glowSource);

    // ---- Blood moon: the single dominant light source ----
    const moonLayer = new Container();
    app.stage.addChild(moonLayer);

    const halo = new Sprite(glowTexture);
    halo.anchor.set(0.5);
    halo.tint = 0xff2a6d;
    halo.alpha = 0.5;
    moonLayer.addChild(halo);

    const moon = new Graphics();
    moonLayer.addChild(moon);

    // ---- Moonlight reflection on the water ----
    const glint = new Container();
    app.stage.addChild(glint);
    const glintBars: Graphics[] = [];
    for (let i = 0; i < 22; i++) {
      const bar = new Graphics();
      glint.addChild(bar);
      glintBars.push(bar);
    }

    // ---- Far bands, then the ship, then the near bands on top of her ----
    const farWaves = new Container();
    const shipLayer = new Container();
    const nearWaves = new Container();
    app.stage.addChild(farWaves, shipLayer, nearWaves);

    const waves = WAVE_BANDS.map((_, i) => {
      const g = new Graphics();
      (i <= SHIP_BAND ? farWaves : nearWaves).addChild(g);
      return g;
    });

    const ship = createShip(glowTexture, label);
    shipLayer.addChild(ship.root);

    // ---- Embers ----
    const emberLayer = new Container();
    app.stage.addChild(emberLayer);
    const embers: Ember[] = [];

    let moonX = 0;
    let moonY = 0;
    let moonR = 0;

    /** Height of the ship's band at x — mirrors what drawWaves() renders. */
    function waveAt(x: number, t: number) {
      const band = WAVE_BANDS[SHIP_BAND];
      const height = h();
      const horizon = height * HORIZON;
      const baseY = horizon + (height - horizon) * band.depth;
      return (
        baseY +
        Math.sin((x / band.wavelength) * Math.PI * 2 + t * band.speed) * band.amp +
        Math.sin((x / (band.wavelength * 0.37)) * Math.PI * 2 - t * band.speed * 1.4) * band.amp * 0.32
      );
    }

    function layout() {
      const width = w();
      const height = h();

      moonR = Math.max(46, Math.min(width, height) * 0.11);
      moonX = width * 0.76;
      moonY = height * HORIZON - moonR * 1.5;

      moon.clear().circle(moonX, moonY, moonR).fill(0xff2a6d);
      moon.alpha = 0.16;

      halo.position.set(moonX, moonY);
      halo.scale.set((moonR * 7) / 64);
    }

    function spawnEmbers() {
      for (const e of embers) e.sprite.destroy();
      embers.length = 0;
      const width = w();
      const height = h();
      for (let i = 0; i < EMBER_COUNT; i++) {
        const sprite = new Sprite(glowTexture);
        sprite.anchor.set(0.5);
        const roll = Math.random();
        sprite.tint = roll > 0.86 ? 0x00e5ff : roll > 0.74 ? 0xd4af37 : 0xff2a6d;
        const size = 1.5 + Math.random() * 4;
        sprite.scale.set(size / 64);
        sprite.alpha = 0.25 + Math.random() * 0.5;
        sprite.position.set(Math.random() * width, height * HORIZON + Math.random() * height * 0.4);
        emberLayer.addChild(sprite);
        embers.push({
          sprite,
          vx: (Math.random() - 0.5) * 0.18,
          vy: -(0.12 + Math.random() * 0.42),
          phase: Math.random() * Math.PI * 2,
          drift: 0.2 + Math.random() * 0.5,
        });
      }
    }

    function drawWaves(t: number) {
      const width = w();
      const height = h();
      const horizon = height * HORIZON;

      WAVE_BANDS.forEach((band, i) => {
        const g = waves[i];
        const baseY = horizon + (height - horizon) * band.depth;
        const step = 14;

        const yAt = (x: number) =>
          baseY +
          Math.sin((x / band.wavelength) * Math.PI * 2 + t * band.speed) * band.amp +
          Math.sin((x / (band.wavelength * 0.37)) * Math.PI * 2 - t * band.speed * 1.4) * band.amp * 0.32;

        g.clear();
        g.moveTo(0, baseY);
        for (let x = 0; x <= width; x += step) g.lineTo(x, yAt(x));
        g.lineTo(width, height);
        g.lineTo(0, height);
        g.closePath();
        g.fill({ color: band.color, alpha: band.alpha });

        // Crimson crest catching the moonlight.
        g.moveTo(0, baseY);
        for (let x = 0; x <= width; x += step) g.lineTo(x, yAt(x));
        g.stroke({ color: 0xff2a6d, alpha: 0.1 + i * 0.05, width: 1 });
      });
    }

    function drawGlint(t: number, pointerX: number | null) {
      const height = h();
      const horizon = height * HORIZON;
      // The reflection leans toward the pointer, as if the scene turned.
      const lean = pointerX === null ? 0 : (pointerX - moonX) * 0.12;

      glintBars.forEach((bar, i) => {
        const p = i / glintBars.length;
        const y = horizon + p * (height - horizon) * 0.85;
        const spread = moonR * (0.35 + p * 3.2);
        const wobble = Math.sin(t * (0.5 + p) + i * 1.7) * spread * 0.35;
        const width = spread * (0.4 + Math.abs(Math.sin(t * 0.6 + i)) * 0.6);
        const alpha = (1 - p) * 0.16;

        bar
          .clear()
          .roundRect(moonX + wobble + lean * p - width / 2, y, width, Math.max(1.5, 2 + p * 3), 2)
          .fill({ color: 0xff2a6d, alpha });
      });
    }

    // ---- Pointer & scroll input -----------------------------------------
    // The canvas is pointer-events:none so the hero's links stay clickable;
    // we listen on the window and hit-test the ship ourselves.
    const state = {
      progress: 0,
      pointer: null as { x: number; y: number } | null,
      hovered: false,
    };

    /** 0 while the hero fills the view, 1 once it has scrolled past. */
    function heroProgress() {
      const rect = host.getBoundingClientRect();
      return Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height)));
    }

    const onPointerMove = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
      state.pointer = inside ? { x, y } : null;

      const box = ship.hitBox();
      state.hovered = inside && x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;
      document.body.style.cursor = state.hovered ? 'pointer' : '';
    };

    const onPointerLeave = () => {
      state.pointer = null;
      state.hovered = false;
      document.body.style.cursor = '';
    };

    const onPointerDown = () => {
      if (!state.hovered) return;
      ship.weighAnchor();
      // Embers spill from the stern as she pulls away.
      const stern = ship.sternPosition();
      for (const e of embers.slice(0, 14)) {
        e.sprite.position.set(stern.x + (Math.random() - 0.5) * 30, stern.y + (Math.random() - 0.5) * 12);
        e.sprite.alpha = 0.6 + Math.random() * 0.4;
        e.vy = -(0.5 + Math.random() * 0.8);
      }
    };

    const onScroll = () => {
      state.progress = heroProgress();
    };

    if (!prefersReduced) {
      if (!coarsePointer) {
        window.addEventListener('pointermove', onPointerMove, { passive: true });
        window.addEventListener('pointerdown', onPointerDown, { passive: true });
        document.addEventListener('pointerleave', onPointerLeave);
        cleanups.push(() => {
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerdown', onPointerDown);
          document.removeEventListener('pointerleave', onPointerLeave);
          document.body.style.cursor = '';
        });
      }
      window.addEventListener('scroll', onScroll, { passive: true });
      cleanups.push(() => window.removeEventListener('scroll', onScroll));
      onScroll();
    }

    const bounds = () => ({ width: w(), height: h(), horizon: h() * HORIZON });

    layout();
    spawnEmbers();
    drawWaves(0);
    drawGlint(0, null);
    ship.update(0, 1, state, waveAt, bounds());

    if (prefersReduced) return;

    let t = 0;
    app.ticker.add((ticker) => {
      const dt = ticker.deltaTime;
      t += dt * 0.016;
      const width = w();
      const height = h();
      const horizon = height * HORIZON;

      drawWaves(t);
      drawGlint(t, state.pointer ? state.pointer.x : null);
      ship.update(t, dt, state, waveAt, { width, height, horizon });

      // Moon breathes very slowly.
      halo.alpha = 0.42 + Math.sin(t * 0.5) * 0.08;

      for (const e of embers) {
        e.sprite.position.x += e.vx + Math.sin(t * e.drift + e.phase) * 0.25;
        e.sprite.position.y += e.vy;
        const above = horizon - e.sprite.position.y;
        if (above > 0) e.sprite.alpha -= 0.0025;
        if (e.sprite.alpha <= 0.02 || e.sprite.position.y < -10) {
          e.sprite.position.set(Math.random() * width, horizon + Math.random() * (height - horizon) * 0.6);
          e.sprite.alpha = 0.25 + Math.random() * 0.5;
          e.vy = -(0.12 + Math.random() * 0.42);
        }
        if (e.sprite.position.x > width + 10) e.sprite.position.x = -10;
        if (e.sprite.position.x < -10) e.sprite.position.x = width + 10;
      }
    });

    // Re-lay out the scene when the hero is resized.
    const ro = new ResizeObserver(() => {
      layout();
      drawWaves(t);
      drawGlint(t, null);
      ship.update(t, 1, state, waveAt, bounds());
    });
    ro.observe(host);
    resizeObserver = ro;
  }

  init().catch((err) => console.error('PixiJS init failed:', err));

  return () => {
    destroyed = true;
    for (const fn of cleanups) fn();
    resizeObserver?.disconnect();
    if (app) {
      app.destroy(true, { children: true, texture: true });
      app = null;
    }
  };
}