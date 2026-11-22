// Ep. 01 v2 "everybody has a diamond sword... except me": pure function of time.
// window.seek(t) paints frame t. Timing in beats (u), 120 bpm (1 beat = 0.5 s), 48 beats = 24 s.
// Story (slower, per feedback): cool knights -> reveal Bix with a BAGUETTE (highlighted) ->
// knights laugh -> Bix bonks three slimes -> a knight's jaw drops to the floor -> now everybody has a baguette.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import { makeCharacter, makeSword, faceTexture, POSES, mixPose } from './sets/bix.js';
const { THREE } = G;
const { W, H, E, prog, lerp, clamp, springU, SPRING, wobble, font, hash01 } = M;

const DISPLAY = 'Display';
const C = { ink: '#14101c', white: '#ffffff', bonk: '#ffd23f', sword: '#7ff5ff', red: '#ff3b47' };
const BX = 4.6;                        // Bix stands off to the side of the plaza
const POSE_BEATS = [1, 3, 5];          // each knight strikes a pose
const SLIME_HITS = [30, 32, 34];       // one slime per bonk
const JAW = 38.6;                      // the jaw starts to fall

// [beat, label, sfx, opts]: sfx.mjs voices each one
const HITS = [
  ...POSE_BEATS.map((b, i) => [b, `knight ${i + 1} sword shing`, 'bell', { pitch: ['E6', 'G6', 'B6'][i] }]),
  ...POSE_BEATS.map((b, i) => [b, `knight ${i + 1} pose whoosh`, 'whoosh', { len: 0.3 }]),
  [12, 'pan to the side', 'whoosh', { len: 0.8, from: 400, to: 1600 }],
  [14, 'spotlight on Bix', 'thud', { pitch: 60 }],
  [15, 'arrow: baguette', 'pop', { pitch: 'C5' }],
  [20, 'knights turn', 'tick'],
  [21, 'HA', 'pop', { pitch: 'G5' }], [22, 'HA', 'pop', { pitch: 'A5' }], [23, 'HA', 'pop', { pitch: 'B5' }],
  [26, 'Bix glares', 'riser', { len: 1.0 }],
  [28, 'drop', 'impact'],
  ...SLIME_HITS.map((b, i) => [b, `bonk ${i + 1}`, 'thud', { pitch: 110 - i * 12 }]),
  ...SLIME_HITS.map((b, i) => [b + 0.02, `bonk boing ${i + 1}`, 'boing', { pitch: 'G4', to: 'C4' }]),
  [36, 'cut to knight', 'sub', { len: 0.5 }],
  [JAW, 'jaw slide', 'boing', { pitch: 'C6', to: 'C3' }],
  [JAW + 1, 'chin hits floor', 'thud', { pitch: 50 }],
  [41, 'swords drop', 'click'],
  [44, 'now everybody', 'pop', { pitch: 'G5' }],
  [45, 'baguettes up', 'coins'],
];

// ---------------------------------------------------------------- world
let S;
function world() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8fd3ff);
  scene.fog = new THREE.Fog(0x8fd3ff, 30, 70);
  scene.environment = G.ENV;
  const cam = G.camera(44, 0.1, 200);
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.8); sun.position.set(-6, 12, 8);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.03;
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, far: 60 });
  sun.target.position.set(3, 0, 0); scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(0xcfeaff, 0x4a6b2a, 1.1));

  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
  const tex = G.canvasTexture(64, 64);
  tex.draw((c) => { c.fillStyle = '#5fbf4a'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#56b043'; c.fillRect(0, 0, 32, 32); c.fillRect(32, 32, 32, 32); });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(40, 40); tex.magFilter = THREE.NearestFilter;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  // a gold-trimmed stone stage for the cool kids; Bix stands on the grass beside it
  const plaza = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.16, 3), std(0xd9d2c3)); plaza.position.set(0, 0.08, 0); plaza.receiveShadow = true; scene.add(plaza);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(5.7, 0.06, 3.1), std(0xd8b24a, { metalness: 0.6, roughness: 0.35 })); trim.position.set(0, 0.03, 0); scene.add(trim);
  const trunkM = std(0x7a4e2b), leafM = std(0x3f9e3a), wallM = std(0xf1e4c8), roofM = std(0xd2553f);
  const addBox = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; scene.add(b); return b; };
  [[-6, -5], [-9, -9], [4, -8], [9, -6], [13, -4], [-3, -12], [16, -10], [10, -12]].forEach(([x, z], i) => {
    const h = 1.6 + hash01(i, 4) * 1.2;
    addBox(0.6, h, 0.6, trunkM, x, h / 2, z); addBox(2.2, 1.8, 2.2, leafM, x, h + 0.8, z);
  });
  [[-2.5, -7], [1.8, -6.5]].forEach(([x, z]) => { addBox(3, 2.4, 2.6, wallM, x, 1.2, z); addBox(3.3, 0.9, 2.9, roofM, x, 2.85, z); });

  const KX = [-1.6, 0, 1.6];
  const knights = KX.map(() => makeCharacter('knight'));
  knights.forEach((k) => scene.add(k.root));
  const bix = makeCharacter('bix'); scene.add(bix.root);
  const dropped = [makeSword(), makeSword()]; dropped.forEach((d) => scene.add(d));

  // Bix's personal rain cloud
  const cloud = new THREE.Group();
  const cloudM = std(0x6d7686, { roughness: 1 });
  [[0, 0, 0, 1.6], [0.9, 0.1, 0.2, 1.2], [-0.9, -0.05, -0.1, 1.2], [0.3, 0.45, -0.2, 1.1]].forEach(([x, y, z, s]) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.6, s * 0.9), cloudM); b.position.set(x, y, z); cloud.add(b);
  });
  scene.add(cloud);
  const DROPS = 90;
  const rain = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 0.32, 0.03), new THREE.MeshBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.85 }), DROPS);
  scene.add(rain);
  const rainSeed = Array.from({ length: DROPS }, (_, i) => [hash01(i, 11) * 2.6 - 1.3, hash01(i, 12) * 1.6 - 0.8, hash01(i, 13)]);

  // three slimes, each hops in and gets bonked
  const slimeM = std(0x6bd46a, { roughness: 0.35 });
  const slimes = SLIME_HITS.map(() => {
    const face = faceTexture('#6bd46a');
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 1.0).translate(0, 0.5, 0),
      [slimeM, slimeM, slimeM, slimeM, new THREE.MeshStandardMaterial({ map: face, roughness: 0.35 }), slimeM]);
    m.castShadow = true; scene.add(m);
    return { m, face };
  });
  const BITS = 14;
  const bits = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), slimeM, BITS * 3); bits.castShadow = true; scene.add(bits);
  const bitDir = Array.from({ length: BITS * 3 }, (_, i) => [hash01(i, 21) * 2 - 1, 0.8 + hash01(i, 22) * 1.6, hash01(i, 23) * 2 - 1]);

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), eul = new THREE.Euler();
  const set = {
    scene, camera: cam,
    update(t, u, o) {
      const shot = o.shot;
      const [cx, cy, cz, tx, ty, tz, fov] = o.cam;
      G.lookFrom(cam, [cx, cy, cz], [tx, ty, tz]);
      cam.fov = fov; cam.updateProjectionMatrix();

      // ---- knights
      knights.forEach((k, i) => {
        const x = KX[i], yaw0 = [0.25, 0, -0.25][i];
        const bob = 0.04 * Math.sin(u * Math.PI + i);
        let p;
        if (shot === 1 || shot === 2) {
          // each knight snaps from relaxed into the hero pose on its beat
          const r = clamp(springU(u, POSE_BEATS[i] - 0.15, SPRING.bouncy), 0, 1.15);
          p = mixPose({ ...POSES.idle, x, yaw: yaw0, armR: -0.4, bob }, { ...POSES.hero, x, yaw: yaw0, bob }, r);
          p.expr = r > 0.5 ? 'happy' : 'idle';
        } else if (shot === 3) {
          // turn toward Bix, point and laugh (bodies shake)
          const turn = E.inOutCubic(prog(u, 20, 20.8));
          const laugh = prog(u, 20.6, 21);
          const shakeV = 0.06 * Math.sin(u * Math.PI * 6 + i * 1.7) * laugh;
          p = mixPose({ ...POSES.hero, x, yaw: yaw0, bob }, { ...POSES.laugh, x, yaw: 1.05, bob: shakeV, lean: -0.22 + shakeV * 2 }, turn);
          if (laugh > 0) p.expr = 'laugh';
        } else if (shot === 4) {
          p = { ...POSES.laugh, x, yaw: 1.05, bob: 0.06 * Math.sin(u * Math.PI * 6 + i * 1.7) };
          if (u > 30.2) p = { ...POSES.shock, x, yaw: 1.05, prop: true, propKind: 'sword' };
        } else if (shot === 5) {
          const jaw = i === 1 ? E.outBounce(prog(u, JAW, JAW + 1)) : 0;
          p = i === 1 ? { ...POSES.jaw, x, yaw: 0, jaw } : { ...POSES.shock, x, yaw: yaw0 * 2, prop: u < 41, propKind: 'sword' };
        } else {
          const raise = shot === 6 ? clamp(springU(u, 45 + i * 0.1, SPRING.bouncy), 0, 1.15) : 1;
          p = { ...POSES.hero, x, yaw: yaw0, bob, propKind: 'baguette', armR: lerp(-0.4, -2.5, raise) };
        }
        k.pose(p);
        k.root.visible = true;
      });
      // the two side knights drop their swords in the jaw shot
      dropped.forEach((d, j) => {
        const f = prog(u, 41, 41.6);
        d.visible = shot === 5 && u >= 41;
        d.position.set(KX[j * 2] + (j ? -0.6 : 0.6), lerp(2.5, 0.12, E.inQuad(f)), 0.5);
        d.rotation.set(0, j ? -0.5 : 0.5, (j ? -1 : 1) * lerp(0, Math.PI / 2, E.inQuad(f)));
      });

      // ---- Bix
      let bp;
      if (shot <= 3 && shot >= 1) {
        bp = { ...POSES.sad, x: BX, yaw: shot === 3 ? -0.2 : -0.35, bob: 0.03 * Math.sin(u * 0.9) };
        bp.blink = M.bump(u, 17.5, 0.2);
        if (shot === 3) bp = mixPose(bp, { ...POSES.swing, x: BX, yaw: 0.6, expr: 'angry' }, clamp(springU(u, 26, SPRING.snappy), 0, 1));
      } else if (shot === 4) {
        bp = bonkPose(u, SLIME_HITS, { x: BX, yaw: 1.15 });
      } else {
        bp = { ...POSES.hero, x: BX - 0.6, yaw: -0.35, propKind: 'baguette', armR: -2.6, bob: 0.04 * Math.sin(u * Math.PI) };
        if (shot === 5) bp = { ...POSES.hero, x: BX, yaw: -0.6, armR: -2.6 };
      }
      bix.pose(bp);
      bix.root.visible = shot !== 5;

      // ---- rain cloud (until he fights back)
      const rainOn = shot === 2 || (shot === 3 && u < 27.5);
      cloud.visible = rain.visible = rainOn;
      cloud.position.set(BX + 0.05 * Math.sin(u), 4.1, 0);
      if (rainOn) for (let i = 0; i < DROPS; i++) {
        const [dx, dz, ph] = rainSeed[i];
        v.set(BX + dx, 3.8 - ((t * 1.4 + ph) % 1) * 3.8, dz); sc.set(1, 1, 1);
        m4.compose(v, q.identity(), sc); rain.setMatrixAt(i, m4);
      }
      rain.instanceMatrix.needsUpdate = true;

      // ---- slimes: hop in from the right, bonked flat, burst
      const SX = BX + 1.5;
      slimes.forEach(({ m, face }, i) => {
        const b = SLIME_HITS[i];
        const arrive = prog(u, b - 2, b - 0.4);
        const hopY = Math.abs(Math.sin(arrive * Math.PI * 3)) * 0.7 * (1 - arrive);
        const hit = u >= b;
        const sq = hit ? Math.max(0.1, 0.22 - 0.3 * wobble((u - b) * 0.5, 3, 6)) : 1;
        const gone = prog(u, b + 0.5, b + 0.6);
        m.visible = shot === 4 && u > b - 2 && gone < 1;
        m.position.set(lerp(SX + 5, SX - 0.2, E.outQuad(arrive)), hopY, 0.55);
        m.rotation.y = -0.5;
        const s = 1 - gone;
        m.scale.set(s / Math.sqrt(sq), s * sq, s / Math.sqrt(sq));
        face.set(hit ? 'shock' : 'angry', 0);
        for (let j = 0; j < BITS; j++) {
          const idx = i * BITS + j, [dx, dy, dz] = bitDir[idx];
          const tt = prog(u, b + 0.45, b + 1.6) * 0.7;
          const on = shot === 4 && u >= b + 0.45 && tt < 0.7;
          v.set(SX - 0.2 + dx * tt * 3, Math.max(0.1, 0.3 + dy * tt * 4 - 9.8 * tt * tt), 0.55 + dz * tt * 3);
          sc.setScalar(on ? 1 - tt * 0.6 : 0);
          m4.compose(v, q.setFromEuler(eul.set(tt * 9 * dx, tt * 7, 0)), sc); bits.setMatrixAt(idx, m4);
        }
      });
      bits.instanceMatrix.needsUpdate = true;

      // screen positions for the 2-D highlight
      cam.updateMatrixWorld();
      const proj = (x, y, z) => { v.set(x, y, z).project(cam); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; };
      set.bixHead = proj(BX, 2.5, 0);
      set.bixBody = proj(BX, 1.4, 0);
      set.baguette = proj(BX + 0.55, 1.05, 0.3);
      set.knightHeads = KX.map((x) => proj(x, 3.1, 0));
    },
  };
  return set;
}

// wind up before each hit, snap down on it, follow through
function bonkPose(u, hits, base) {
  let k = 0.5;
  for (const b of hits) if (u >= b - 0.9 && u < b + 1.1) k = u < b ? E.outCubic(prog(u, b - 0.9, b - 0.15)) * (1 - prog(u, b - 0.07, b)) : 0;
  const p = mixPose({ ...POSES.bonk, lean: 0.15, ...base }, { ...POSES.swing, ...base }, k);
  const last = hits.filter((b) => u >= b).pop();
  if (last !== undefined) p.squash = (p.squash || 0) + 0.12 * wobble((u - last) * 0.5, 3, 7);
  return p;
}

// ---------------------------------------------------------------- shots and cameras
function shotAt(u) {
  if (u < 12) return 1;      // cool knights
  if (u < 20) return 2;      // pan + highlight Bix
  if (u < 28) return 3;      // laugh
  if (u < 36) return 4;      // bonk bonk bonk
  if (u < 44) return 5;      // jaw drop
  return 6;                  // everybody has a baguette (loops to shot 1)
}
const CAM1 = [0, 2.4, 11.5, 0, 2.0, 0, 44];
function camFor(shot, u) {
  if (shot === 1) {
    // slow push, then a slow drift close on the middle knight's sword
    const k = E.inOutSine(prog(u, 0, 8));
    return [lerp(0, 0.4, k), lerp(2.4, 2.6, k), lerp(11.5, 8.2, k), 0, lerp(2.0, 2.3, k), 0, 44];
  }
  if (shot === 2) {
    // pan right to Bix (slow), then settle on him
    const p = E.inOutCubic(prog(u, 12, 14));
    return [lerp(0.4, BX, p), lerp(2.6, 2.1, p), lerp(8.2, 7.6, p), lerp(0, BX, p), lerp(2.3, 1.7, p), 0, 44];
  }
  if (shot === 3) {
    // over Bix's shoulder: Bix big in the right foreground, the laughing knights behind on the left
    const k = E.inOutSine(prog(u, 20, 28));
    return [lerp(7.4, 7.0, k), 2.6, lerp(10.2, 9.4, k), lerp(1.9, 2.3, k), 1.8, 0, 50];
  }
  if (shot === 4) {
    const k = E.inOutSine(prog(u, 28, 36));
    return [lerp(5.2, 5.6, k), 1.5, lerp(8.6, 7.8, k), BX + 0.9, 1.25, 0, 45];
  }
  if (shot === 5) {
    const k = E.inOutSine(prog(u, 36, 44));
    return [lerp(0.4, 0.2, k), 1.9, lerp(7.2, 6.4, k), 0, 1.55, 0, 46];
  }
  const k = E.inOutCubic(prog(u, 44, 48));
  return [lerp(1.8, CAM1[0], k), lerp(3.2, CAM1[1], k), lerp(15, CAM1[2], k), lerp(1.4, CAM1[3], k), lerp(1.7, CAM1[4], k), 0, 44];
}

// ---------------------------------------------------------------- 2-D overlays
function caption(ctx, u, lines, u0, opts = {}) {
  const size = opts.size || 104;
  ctx.save();
  ctx.font = font(size, 900, DISPLAY); ctx.textAlign = 'center'; ctx.lineJoin = 'round';
  const y0 = opts.y ?? H * 0.15;
  lines.forEach((ln, i) => {
    const [str, color] = Array.isArray(ln) ? ln : [ln, C.white];
    const li = Array.isArray(u0) ? u0[i] : u0 + i * 0.15;
    const k = clamp(springU(u, li, SPRING.bouncy), 0, 1.2);
    if (k <= 0.001) return;
    const out = opts.out ? E.inBack(prog(u, opts.out, opts.out + 0.4), 1.6) : 0;
    ctx.save();
    ctx.translate(W / 2 - out * W * 1.2, y0 + i * size * 1.12);
    ctx.scale(k, k);
    ctx.lineWidth = size * 0.2; ctx.strokeStyle = C.ink; ctx.strokeText(str, 0, 0);
    ctx.fillStyle = color; ctx.fillText(str, 0, 0);
    ctx.restore();
  });
  ctx.restore();
}
function label(ctx, u, u0, str, x, y, color, size = 70, rot = 0) {
  const k = clamp(springU(u, u0, SPRING.bouncy), 0, 1.2);
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(k, k);
  ctx.font = font(size, 900, DISPLAY); ctx.textAlign = 'center'; ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.22; ctx.strokeStyle = C.ink; ctx.strokeText(str, 0, 0);
  ctx.fillStyle = color; ctx.fillText(str, 0, 0);
  ctx.restore();
}
function arrow(ctx, u, u0, [x0, y0], [x1, y1], color) {
  const p = E.outCubic(prog(u, u0, u0 + 0.5));
  if (p <= 0) return;
  const x = lerp(x0, x1, p), y = lerp(y0, y1, p), a = Math.atan2(y1 - y0, x1 - x0);
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const [w, c] of [[30, C.ink], [16, color]]) {
    ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 10, y + Math.sin(a) * 10);
    ctx.lineTo(x - Math.cos(a - 0.5) * 50, y - Math.sin(a - 0.5) * 50);
    ctx.lineTo(x - Math.cos(a + 0.5) * 50, y - Math.sin(a + 0.5) * 50); ctx.closePath();
    if (w === 30) { ctx.stroke(); } ctx.fill();
  }
  ctx.restore();
}
// darken everything except a soft circle around Bix
function spotlight(ctx, u, [x, y], a) {
  if (a <= 0) return;
  const r = lerp(W * 1.2, W * 0.3, E.outCubic(a));
  const g = ctx.createRadialGradient(x, y, r * 0.75, x, y, r * 1.15);
  g.addColorStop(0, 'rgba(10,8,20,0)'); g.addColorStop(1, `rgba(10,8,20,${0.62 * a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // red ring
  ctx.save(); ctx.strokeStyle = C.red; ctx.lineWidth = 12; ctx.globalAlpha = a;
  ctx.setLineDash([]); ctx.beginPath(); ctx.ellipse(x, y, r * 0.78, r * 1.25, 0, 0, Math.PI * 2 * E.outCubic(prog(u, 14, 14.8))); ctx.stroke();
  ctx.restore();
}
function sparkle(ctx, u, b, x, y) {
  const k = 1 - prog(u, b, b + 1.2);
  if (u < b || k <= 0) return;
  const s = 90 * Math.sin(Math.PI * prog(u, b, b + 1.2));
  ctx.save(); ctx.translate(x, y); ctx.rotate(u * 0.8); ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) { const r = i % 2 ? s * 0.18 : s; const a = (i / 8) * Math.PI * 2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  ctx.closePath(); ctx.fill(); ctx.restore();
}
function bonkWord(ctx, u, b, i) {
  const k = clamp(springU(u, b, SPRING.bouncy), 0, 1.2);
  const life = 1 - prog(u, b + 1.3, b + 1.7);
  if (k <= 0 || life <= 0) return;
  label(ctx, u, b, 'BONK!', W * [0.36, 0.64, 0.5][i], H * [0.2, 0.24, 0.28][i], C.bonk, 190 * life, [-0.16, 0.13, -0.05][i]);
}

M.film({
  fonts: [font(100, 900, DISPLAY)],
  // shot 1 was cut from 12 to 8 beats: everything after beat 8 plays 4 beats earlier
  hits: HITS.map(([b, ...r]) => [b >= 8 ? b - 4 : b, ...r]),
  samples: 3,
  async init() { await G.initGL(); S = world(); },
  draw(ctx, uPlay, t) {
    const u = uPlay < 8 ? uPlay : uPlay + 4;   // story time (see hits above)
    const shot = shotAt(u);
    const shakes = [...SLIME_HITS, 28, JAW + 1];
    const last = shakes.filter((b) => u >= b).sort((a, b) => b - a)[0];
    ctx.save();
    if (last !== undefined) {
      const a = (last === 28 || last === JAW + 1 ? 30 : 20) * Math.exp(-(u - last) * 7);
      ctx.translate(a * (hash01(Math.floor(t * 60), 5) - 0.5) * 2, a * (hash01(Math.floor(t * 60), 6) - 0.5) * 2);
    }
    G.renderSet(ctx, S, t, u, { shot, cam: camFor(shot, u) });
    ctx.restore();

    if (shot === 1) {
      POSE_BEATS.forEach((b, i) => sparkle(ctx, u, b + 0.1, S.knightHeads[i][0] + 60, S.knightHeads[i][1] - 90));
      caption(ctx, u, ['in this server', 'everybody has a', ['DIAMOND SWORD', C.sword]], [0, 0.7, 4.2]);
    }
    if (shot === 2) {
      const a = prog(u, 13.6, 14.4);
      spotlight(ctx, u, S.bixBody, a);
      caption(ctx, u, ['...except me.'], 14.4, { size: 116 });
      arrow(ctx, u, 15.6, [W * 0.2, H * 0.66], [S.baguette[0] - 30, S.baguette[1] + 10], C.bonk);
      label(ctx, u, 15.8, 'a BAGUETTE?!', W * 0.36, H * 0.71, C.bonk, 88, -0.06);
    }
    if (shot === 3) {
      [21, 22, 23].forEach((b, i) => {
        const [x, y] = S.knightHeads[i];
        label(ctx, u, b, 'HAHA', W * (0.17 + 0.27 * i), y - 40 - 50 * (i % 2) - 18 * Math.sin(u * Math.PI * 3 + i), C.white, 70, [-0.2, 0.05, 0.2][i]);
      });
      caption(ctx, u, ['they laughed at me'], 23.6, { size: 92, y: H * 0.13 });
    }
    if (shot === 4) {
      SLIME_HITS.forEach((b, i) => bonkWord(ctx, u, b, i));
    }
    if (shot === 6) caption(ctx, u, ['now everybody', ['has a BAGUETTE', C.bonk]], [44, 44.4]);
  },
});
