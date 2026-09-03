import { Container, Graphics, Text, type Texture, Sprite } from 'pixi.js';

/** Sampled height of the water the ship rides on, at a given x and time. */
export type WaveSampler = (x: number, t: number) => number;

export interface ShipState {
  /** 0 → 1 progress through the hero; scroll nudges the crossing along. */
  progress: number;
  /** Pointer position in canvas space, or null when the pointer left. */
  pointer: { x: number; y: number } | null;
  hovered: boolean;
}

/**
 * Square-rigged galleon, drawn bow-right so she sails left → right.
 *
 * Local space: (0,0) is the waterline amidships, negative y is up.
 * Stern sits at x ≈ -105 (raised sterncastle), bow at x ≈ +110.
 */
const MASTS = [
  { x: -58, height: -150, tops: 2 }, // mizzen
  { x: 4, height: -205, tops: 3 }, // main
  { x: 62, height: -160, tops: 2 }, // fore
];

/** Yards hung on each mast, as a fraction of mast height. */
const YARDS = [0.34, 0.6, 0.84];

export function createShip(glowTexture: Texture, label: string) {
  const root = new Container();

  // body carries position + pitch; flip carries heading, so mirroring the hull
  // never mirrors the way she sits on the wave.
  const body = new Container();
  root.addChild(body);

  const flip = new Container();
  body.addChild(flip);

  const wake = new Graphics();
  const silhouette = new Graphics();
  const blueprint = new Graphics();
  flip.addChild(wake, silhouette, blueprint);

  // Stern lantern: the one warm point of light on board.
  const lantern = new Sprite(glowTexture);
  lantern.anchor.set(0.5);
  lantern.tint = 0xd4af37;
  lantern.scale.set(30 / 64);
  lantern.alpha = 0.75;
  flip.addChild(lantern);

  const plate = new Text({
    text: label,
    style: {
      fontFamily: 'JetBrains Mono, ui-monospace, monospace',
      fontSize: 12,
      fill: 0xff2a6d,
      letterSpacing: 1.5,
    },
  });
  plate.anchor.set(0.5, 1);
  plate.alpha = 0;
  root.addChild(plate);

  const HULL = 0x03060e;
  const CANVAS_SAIL = 0x0a1120;
  const RIM = 0xff2a6d;

  /** @param billow 0 = slack, 1 = full — swells when the anchor is weighed. */
  function drawSilhouette(billow: number, t: number) {
    const g = silhouette;
    g.clear();

    // ---- Bowsprit, angled up from the beakhead ----
    g.moveTo(96, -34);
    g.lineTo(158, -70);
    g.stroke({ color: HULL, width: 4 });

    // ---- Masts, with a slight aft rake ----
    for (const m of MASTS) {
      g.moveTo(m.x, -8);
      g.lineTo(m.x - 10, m.height);
      g.stroke({ color: HULL, width: 5 });
    }

    // ---- Standing rigging: shrouds fanning down from each masthead ----
    for (const m of MASTS) {
      for (const dx of [-26, -13, 13, 26]) {
        g.moveTo(m.x - 10, m.height + 22);
        g.lineTo(m.x + dx, -20);
      }
    }
    // Forestays and backstay.
    g.moveTo(158, -70);
    g.lineTo(-6, -205);
    g.moveTo(158, -70);
    g.lineTo(52, -160);
    g.moveTo(-6, -205);
    g.lineTo(-105, -46);
    g.stroke({ color: HULL, alpha: 0.75, width: 1.2 });

    // ---- Square sails on their yards ----
    for (const m of MASTS) {
      for (let i = 0; i < m.tops; i++) {
        const yardY = m.height * YARDS[i];
        const halfWidth = (m.x === 4 ? 52 : 40) * (1 - i * 0.13);
        const sailH = (m.x === 4 ? 60 : 48) * (1 - i * 0.1);
        const belly = 10 + billow * 16 + Math.sin(t * 1.4 + i) * 2;
        const cx = m.x - 10 * (yardY / m.height);

        // Yard.
        g.moveTo(cx - halfWidth - 6, yardY);
        g.lineTo(cx + halfWidth + 6, yardY);
        g.stroke({ color: HULL, width: 3 });

        // Canvas, bellied by the wind toward the bow.
        g.moveTo(cx - halfWidth, yardY);
        g.quadraticCurveTo(cx - halfWidth + belly * 0.5, yardY + sailH * 0.55, cx - halfWidth + 4, yardY + sailH);
        g.quadraticCurveTo(cx, yardY + sailH + belly * 0.55, cx + halfWidth - 4, yardY + sailH);
        g.quadraticCurveTo(cx + halfWidth + belly * 0.5, yardY + sailH * 0.55, cx + halfWidth, yardY);
        g.closePath();
        g.fill({ color: CANVAS_SAIL, alpha: 0.96 });
        g.stroke({ color: RIM, alpha: 0.26, width: 1 });

        // Reef band, so the canvas reads as cloth rather than a slab.
        g.moveTo(cx - halfWidth + 4, yardY + sailH * 0.55);
        g.quadraticCurveTo(cx, yardY + sailH * 0.62, cx + halfWidth - 4, yardY + sailH * 0.55);
        g.stroke({ color: RIM, alpha: 0.14, width: 1 });
      }
    }

    // ---- Jib on the bowsprit ----
    g.moveTo(158, -70);
    g.quadraticCurveTo(112 + billow * 10, -108, 60, -152);
    g.lineTo(84, -46);
    g.closePath();
    g.fill({ color: CANVAS_SAIL, alpha: 0.9 });
    g.stroke({ color: RIM, alpha: 0.22, width: 1 });

    // ---- Crow's nest on the mainmast ----
    g.rect(-24, -168, 40, 13);
    g.fill({ color: HULL });
    g.stroke({ color: RIM, alpha: 0.4, width: 1 });

    // ---- Hull: raised sterncastle aft, beakhead forward ----
    g.moveTo(-105, -46); // top of the sterncastle
    g.lineTo(-96, -8);
    g.quadraticCurveTo(-40, -18, 20, -20); // sheer line dipping amidships
    g.quadraticCurveTo(70, -22, 96, -34); // rising to the forecastle
    g.lineTo(110, -30); // beakhead
    g.quadraticCurveTo(104, -4, 84, 4); // stem down to the waterline
    g.quadraticCurveTo(20, 30, -46, 24); // rounded bottom
    g.quadraticCurveTo(-88, 18, -100, -6); // stern quarter
    g.closePath();
    g.fill({ color: HULL, alpha: 0.99 });

    // Sterncastle box, stepped above the main deck.
    g.moveTo(-105, -46);
    g.lineTo(-62, -50);
    g.lineTo(-58, -20);
    g.lineTo(-96, -8);
    g.closePath();
    g.fill({ color: HULL });

    // Moonlit rim along the sheer and the sterncastle.
    g.moveTo(-105, -46);
    g.lineTo(-62, -50);
    g.moveTo(-96, -8);
    g.quadraticCurveTo(-40, -18, 20, -20);
    g.quadraticCurveTo(70, -22, 96, -34);
    g.lineTo(110, -30);
    g.stroke({ color: RIM, alpha: 0.6, width: 1.6 });

    // Wale: the strake running the length of the hull.
    g.moveTo(-94, 2);
    g.quadraticCurveTo(-20, 14, 88, -6);
    g.stroke({ color: RIM, alpha: 0.18, width: 1 });

    // ---- Gunports, lit from within ----
    for (let i = 0; i < 6; i++) {
      const px = -74 + i * 27;
      const py = -8 + Math.sin((px + 100) / 90) * 6;
      g.rect(px, py, 9, 7);
      g.fill({ color: 0xd4af37, alpha: 0.5 });
    }

    // Sterncastle windows.
    for (let i = 0; i < 3; i++) {
      g.rect(-98 + i * 12, -40, 8, 9);
      g.fill({ color: 0xd4af37, alpha: 0.6 });
    }

    // ---- Jolly Roger at the mainmast head ----
    const flagWave = Math.sin(t * 2.2) * 5;
    g.moveTo(-6, -205);
    g.lineTo(30 + billow * 8, -200 + flagWave);
    g.lineTo(28 + billow * 8, -184 + flagWave);
    g.lineTo(-6, -180);
    g.closePath();
    g.fill({ color: RIM, alpha: 0.85 });

    // Skull on the flag, at this size just two sockets and a jaw.
    g.circle(10, -194 + flagWave * 0.6, 3.4);
    g.fill({ color: 0x03060e, alpha: 0.9 });

    // Pennants on the other two mastheads.
    for (const m of [MASTS[0], MASTS[2]]) {
      g.moveTo(m.x - 10, m.height);
      g.lineTo(m.x + 12 + billow * 6, m.height + 4 + flagWave * 0.5);
      g.lineTo(m.x - 10, m.height + 9);
      g.closePath();
      g.fill({ color: 0xd4af37, alpha: 0.7 });
    }
  }

  /** The same vessel as a technical drawing — under the picture, engineering. */
  function drawBlueprint() {
    const g = blueprint;
    g.clear();

    // Waterline and perpendiculars.
    g.moveTo(-150, 0);
    g.lineTo(170, 0);
    g.stroke({ color: 0x00e5ff, alpha: 0.5, width: 1 });

    for (const x of [-105, 110]) {
      g.moveTo(x, 30);
      g.lineTo(x, -60);
      g.stroke({ color: 0x00e5ff, alpha: 0.3, width: 1 });
    }

    // Masts as centrelines.
    for (const m of MASTS) {
      g.moveTo(m.x, 26);
      g.lineTo(m.x - 10, m.height - 12);
      g.stroke({ color: 0x00e5ff, alpha: 0.24, width: 1 });
    }

    // Construction arcs.
    for (const r of [60, 110, 165] as const) {
      g.circle(4, 0, r);
      g.stroke({ color: 0xd4af37, alpha: 0.13, width: 1 });
    }

    // Frame stations across the hull.
    for (let x = -90; x <= 90; x += 22) {
      g.moveTo(x, -20);
      g.lineTo(x, 24);
      g.stroke({ color: 0xd4af37, alpha: 0.26, width: 1 });
    }

    // Sail envelopes.
    for (const m of MASTS) {
      for (let i = 0; i < m.tops; i++) {
        const yardY = m.height * YARDS[i];
        const halfWidth = (m.x === 4 ? 52 : 40) * (1 - i * 0.13);
        const sailH = (m.x === 4 ? 60 : 48) * (1 - i * 0.1);
        g.rect(m.x - 10 - halfWidth, yardY, halfWidth * 2, sailH);
        g.stroke({ color: 0x00e5ff, alpha: 0.3, width: 1 });
      }
    }

    // Length overall, with tick marks.
    g.moveTo(-105, 48);
    g.lineTo(110, 48);
    g.stroke({ color: 0xd4af37, alpha: 0.45, width: 1 });
    for (const x of [-105, 110]) {
      g.moveTo(x, 42);
      g.lineTo(x, 54);
      g.stroke({ color: 0xd4af37, alpha: 0.45, width: 1 });
    }

    // Air draught.
    g.moveTo(140, 0);
    g.lineTo(140, -205);
    g.stroke({ color: 0xd4af37, alpha: 0.35, width: 1 });
    for (const y of [0, -205]) {
      g.moveTo(134, y);
      g.lineTo(146, y);
      g.stroke({ color: 0xd4af37, alpha: 0.35, width: 1 });
    }
  }

  drawSilhouette(0.3, 0);
  drawBlueprint();
  blueprint.alpha = 0;

  let billow = 0.3;
  let boost = 0;
  /** Autonomous progress along the lane — she sails whether you scroll or not. */
  let voyage = 0;
  /** +1 sailing to starboard, -1 after coming about; eased through zero. */
  let heading = 1;
  let drift = 0;
  let hoverMix = 0;
  let x = 0;
  let y = 0;
  let scale = 1;

  /** Weigh anchor: a burst of speed, fuller sails, a wider wake. */
  function weighAnchor() {
    boost = 1;
  }

  function update(
    t: number,
    dt: number,
    state: ShipState,
    wave: WaveSampler,
    bounds: { width: number; height: number; horizon: number },
  ) {
    const { width, height, horizon } = bounds;

    scale = Math.max(0.5, Math.min(1.15, width / 1500));
    body.scale.set(scale);

    // --- The crossing ---
    // She makes way on her own; scrolling the hero hurries her along.
    // The voyage is a round trip: out to starboard, come about, and back.
    voyage = (voyage + dt * 0.00028) % 1;
    const phase = ((voyage + state.progress * 0.4) % 1) * 2;

    // Triangle wave: 0 → 1 → 0, so she never runs off the edge.
    const outbound = phase < 1;
    const along = outbound ? phase : 2 - phase;

    // The lane clears the headline and stops short of the right edge, leaving
    // room for the full rig and the bowsprit at maximum scale.
    const margin = 190 * scale;
    const laneStart = Math.max(width * 0.62, width - margin - 340 * scale);
    const laneEnd = width - margin;
    const travelled = laneStart + Math.max(0, laneEnd - laneStart) * along;

    // --- Helm: leans toward the pointer, with inertia ---
    const target = state.pointer ? (state.pointer.x - travelled) * 0.05 : 0;
    drift += (Math.max(-60, Math.min(60, target)) - drift) * Math.min(1, dt * 0.04);

    boost = Math.max(0, boost - dt * 0.012);
    const ease = boost * boost;
    x = travelled + drift + ease * 40;

    // --- Seat the hull in the actual wave, and pitch along its slope ---
    const sampleGap = 60 * scale;
    const yAhead = wave(x + sampleGap, t);
    const yBehind = wave(x - sampleGap, t);

    y = (yAhead + yBehind) / 2;
    const slope = Math.atan2(yAhead - yBehind, sampleGap * 2);

    // Ease the heading through zero: the hull narrows to nothing and opens up
    // the other way, which reads as the ship coming about.
    heading += ((outbound ? 1 : -1) - heading) * Math.min(1, dt * 0.045);
    flip.scale.x = Math.abs(heading) < 0.04 ? 0.04 * Math.sign(heading || 1) : heading;

    body.position.set(x, y);
    body.rotation = slope + drift * 0.0014 + Math.sin(t * 0.6) * 0.01;

    const targetBillow = 0.3 + ease * 0.7;
    billow += (targetBillow - billow) * Math.min(1, dt * 0.05);
    drawSilhouette(billow, t);

    lantern.position.set(-100, -52);
    lantern.alpha = 0.5 + Math.sin(t * 2.1) * 0.16;

    const targetHover = state.hovered ? 1 : 0;
    hoverMix += (targetHover - hoverMix) * Math.min(1, dt * 0.09);
    blueprint.alpha = hoverMix * 0.9;
    silhouette.alpha = 1 - hoverMix * 0.3;

    plate.position.set(x, y - 250 * scale);
    plate.alpha = hoverMix;
    plate.scale.set(Math.max(0.8, scale * 1.4));

    // --- Wake: drawn in local space so it always trails the stern ---
    wake.clear();
    const wakeLen = 210 + ease * 220;
    const wakeWide = 20 + ease * 26;
    wake.moveTo(-100, 6);
    wake.quadraticCurveTo(-100 - wakeLen * 0.6, 6 + wakeWide, -100 - wakeLen, 6 + wakeWide * 0.3);
    wake.lineTo(-100 - wakeLen, 6 - wakeWide * 0.25);
    wake.quadraticCurveTo(-100 - wakeLen * 0.6, 6 - wakeWide * 0.55, -100, 0);
    wake.closePath();
    wake.fill({ color: RIM, alpha: 0.07 + ease * 0.1 });

    root.visible = y < height && y > horizon - 60;
  }

  /** Axis-aligned box in canvas space, used for pointer hit-testing. */
  function hitBox() {
    return {
      x: x - 140 * scale,
      y: y - 215 * scale,
      w: 300 * scale,
      h: 250 * scale,
    };
  }

  function sternPosition() {
    return { x: x - 100 * scale * Math.sign(heading || 1), y: y - 20 * scale };
  }

  return { root, update, weighAnchor, hitBox, sternPosition };
}
