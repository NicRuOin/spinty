// Ep. 01 "everybody has a diamond sword... except me. BONK BONK BONK": pure function of time.
// window.seek(t) paints frame t. Timing in beats (u) at 120 bpm; docs/shotlist.md is the plan.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import { makeCharacter, makeSword, faceTexture, POSES, mixPose } from './sets/bix.js';
const { THREE } = G;
const { W, H, FORMAT, E, prog, lerp, clamp, springU, SPRING, wobble, font, fill, hash01, kf } = M;

const DISPLAY = 'Display';
const C = { ink: '#14101c', white: '#ffffff', bonk: '#ffd23f' };

// beats of the three bonks in each fight
const SLIME_HITS = [9, 10, 11];
const BOSS_HITS = [13, 14, 15];

// [beat, label, sfx, opts]: sfx.mjs voices each one
const HITS = [
  [0, 'hook: swords gleam', 'bell', { pitch: 'C7' }],
  [0.25, 'caption line 1', 'pop', { pitch: 'A5' }],
  [1.5, 'caption line 2', 'pop', { pitch: 'D6' }],
  [3.4, 'pan to Bix', 'whoosh', { len: 0.5 }],
  [4.5, 'except me', 'tok', { pitch: 'D4' }],
  [5.5, 'sad note', 'tok', { pitch: 'C4' }],
  [6.5, 'sad note 2', 'tok', { pitch: 'A3' }],
  [8, 'drop: bix charges', 'riser', { len: 1.2 }],
  [8, 'drop impact', 'impact'],
  ...SLIME_HITS.map((b, i) => [b, `slime bonk ${i + 1}`, 'thud', { pitch: 110 - i * 12 }]),
  ...SLIME_HITS.map((b, i) => [b + 0.02, `slime boing ${i + 1}`, 'boing', { pitch: 'G4', to: 'C4' }]),
  [11.5, 'slime splat', 'pop', { pitch: 'C4' }],
  [12, 'cut to boss', 'sub', { len: 0.6 }],
  ...BOSS_HITS.map((b, i) => [b, `boss bonk ${i + 1}`, 'thud', { pitch: 70 - i * 8 }]),
  [15.6, 'boss falls', 'whoosh', { len: 0.5, from: 1800, to: 300 }],
  [16, 'boss lands', 'impact'],
  [17, 'sword drops', 'bell', { pitch: 'E6' }],
  [17.6, 'sword hits ground', 'click'],
  [20, 'now everybody', 'pop', { pitch: 'G5' }],
  [21, 'baguettes up', 'coins'],
  [22, 'little bonk', 'boing', { pitch: 'C5', to: 'G5' }],
];

// ---------------------------------------------------------------- world
let S;
function world() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8fd3ff);
  scene.fog = new THREE.Fog(0x8fd3ff, 30, 70);
  scene.environment = G.ENV;
  const cam = G.camera(38, 0.1, 200);
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.8); sun.position.set(-6, 12, 8);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.03;
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, far: 60 });
  sun.target.position.set(5, 0, 0); scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xcfeaff, 0x4a6b2a, 1.1); scene.add(hemi);

  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
  // checker grass ground
  const tex = G.canvasTexture(64, 64);
  tex.draw((c) => { c.fillStyle = '#5fbf4a'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#56b043'; c.fillRect(0, 0, 32, 32); c.fillRect(32, 32, 32, 32); });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(40, 40); tex.magFilter = THREE.NearestFilter;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  // stone plaza under the knights
  const plaza = new THREE.Mesh(new THREE.BoxGeometry(7, 0.12, 4), std(0xd9d2c3)); plaza.position.set(0, 0.06, 0); plaza.receiveShadow = true; scene.add(plaza);
  // blocky trees and houses (deterministic layout)
  const trunkM = std(0x7a4e2b), leafM = std(0x3f9e3a), wallM = std(0xf1e4c8), roofM = std(0xd2553f);
  const addBox = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; scene.add(b); return b; };
  [[-6, -5], [-9, -9], [4, -8], [9, -6], [16, -7], [-3, -12], [20, -10], [12, -12]].forEach(([x, z], i) => {
    const h = 1.6 + hash01(i, 4) * 1.2;
    addBox(0.6, h, 0.6, trunkM, x, h / 2, z);
    addBox(2.2, 1.8, 2.2, leafM, x, h + 0.8, z);
  });
  [[-2.5, -7], [1.8, -6.5]].forEach(([x, z]) => { addBox(3, 2.4, 2.6, wallM, x, 1.2, z); addBox(3.3, 0.9, 2.9, roofM, x, 2.85, z); });

  // characters
  const knights = [-1.6, 0, 1.6].map(() => makeCharacter('knight'));
  knights.forEach((k) => scene.add(k.root));
  const bix = makeCharacter('bix'); scene.add(bix.root);
  const droppedSword = makeSword(); scene.add(droppedSword);

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

  // slime (green cube with a face)
  const slimeFace = faceTexture('#6bd46a');
  const slimeM = std(0x6bd46a, { roughness: 0.35 });
  const slime = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1).translate(0, 0.55, 0),
    [slimeM, slimeM, slimeM, slimeM, new THREE.MeshStandardMaterial({ map: slimeFace, roughness: 0.35 }), slimeM]);
  slime.castShadow = true; scene.add(slime);
  // boss (huge red cube), pivots on its far bottom edge to tip over
  const bossFace = faceTexture('#e2463c');
  const bossM = std(0xe2463c);
  const bossPivot = new THREE.Group(); scene.add(bossPivot);
  const boss = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.4, 3.4).translate(-1.7, 1.7, 0),
    [bossM, bossM, bossM, bossM, new THREE.MeshStandardMaterial({ map: bossFace, roughness: 0.8 }), bossM]);
  boss.castShadow = true; bossPivot.add(boss);
  // splat cubes for the slime pop (precomputed directions)
  const BITS = 14;
  const bits = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), slimeM, BITS); bits.castShadow = true; scene.add(bits);
  const bitDir = Array.from({ length: BITS }, (_, i) => [hash01(i, 21) * 2 - 1, 0.8 + hash01(i, 22) * 1.6, hash01(i, 23) * 2 - 1]);

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  return {
    scene, camera: cam,
    update(t, u, o) {
      const shot = o.shot;
      // ---- camera
      const [cx, cy, cz, tx, ty, tz, fov] = o.cam;
      G.lookFrom(cam, [cx, cy, cz], [tx, ty, tz], o.roll || 0);
      cam.fov = fov || 38; cam.updateProjectionMatrix();

      // ---- knights
      knights.forEach((k, i) => {
        const x = [-1.6, 0, 1.6][i];
        const bob = 0.04 * Math.sin(u * Math.PI + i);
        let pose = { ...POSES.hero, x, z: 0, yaw: [0.25, 0, -0.25][i], bob, armRout: 0.15 };
        if (shot === 5) {
          const k5 = springU(u, 16.2 + i * 0.12, SPRING.snappy);
          pose = mixPose(pose, { ...POSES.shock, x, yaw: [0.25, 0, -0.25][i], prop: i !== 1, propKind: 'sword' }, clamp(k5));
          if (k5 < 0.5) pose.prop = true;
          if (i === 1 && u >= 17) pose.prop = false;
        }
        if (shot === 6 || shot === 0) {
          const raise = shot === 6 ? springU(u, 21 + i * 0.1, SPRING.bouncy) : 1;
          pose = { ...POSES.hero, x, yaw: [0.25, 0, -0.25][i], bob, propKind: 'baguette', armR: lerp(-0.4, -2.5, raise) };
        }
        k.pose(pose);
        k.root.visible = shot === 1 || shot === 5 || shot === 6 || shot === 0;
      });
      // dropped sword falls from the middle knight's hand (shot 5)
      const fall = prog(u, 17, 17.6);
      droppedSword.visible = shot === 5 && u >= 17;
      droppedSword.position.set(0.5, lerp(2.9, 0.08, E.inQuad(fall)), 0.4 + fall * 0.3);
      droppedSword.rotation.set(0, 0.4, lerp(0, Math.PI / 2, E.inQuad(fall)) + 0.12 * wobble(u - 17.6, 3, 8));

      // ---- Bix
      let bp = { ...POSES.idle };
      if (shot === 1 || shot === 2) {
        bp = { ...POSES.sad, x: 6.5, yaw: -0.25, bob: 0.03 * Math.sin(u * 0.9) };
        // head sinks then snaps up angry right before the drop
        const lift = springU(u, 7.4, SPRING.snappy);
        if (shot === 2) bp = mixPose(bp, { ...POSES.swing, x: 6.5, yaw: -0.25, expr: 'angry' }, clamp(lift));
        bp.blink = bump01(u, 5.9, 0.15);
      } else if (shot === 3) {
        // runs in from the left, then three bonks
        const run = E.outCubic(prog(u, 8, 8.8));
        const x = lerp(3.2, 6.3, run);
        const stride = run < 1 ? Math.sin(u * Math.PI * 4) : 0;
        bp = bonkPose(u, SLIME_HITS, { x, yaw: Math.PI / 2, legL: 0.6 * stride, legR: -0.6 * stride });
      } else if (shot === 4) {
        const hop = BOSS_HITS.reduce((a, b) => a + Math.max(0, Math.sin(Math.PI * clamp((u - (b - 0.75)) / 0.85))) * 1.9, 0);
        bp = bonkPose(u, BOSS_HITS, { x: 9.0, y: hop, yaw: Math.PI / 2 });
        if (u > 15.4) bp = { ...POSES.hero, x: 9.0, y: 0, yaw: 0.4, expr: 'happy', armR: -2.6 };
      } else if (shot === 6 || shot === 0) {
        bp = { ...POSES.hero, x: 3.4, yaw: -0.35, propKind: 'baguette', armR: -2.6, bob: 0.04 * Math.sin(u * Math.PI) };
      }
      bix.pose(bp);
      bix.root.visible = shot !== 5;

      // ---- rain cloud
      const rainOn = shot === 1 || shot === 2;
      cloud.visible = rain.visible = rainOn;
      const bx = 6.5;
      cloud.position.set(bx + 0.05 * Math.sin(u), 4.1, 0);
      if (rainOn) for (let i = 0; i < DROPS; i++) {
        const [dx, dz, ph] = rainSeed[i];
        const y = 3.8 - (((t * 1.4 + ph) % 1) * 3.8);
        v.set(bx + dx, y, dz); sc.set(1, 1, 1);
        m4.compose(v, q.identity(), sc); rain.setMatrixAt(i, m4);
      }
      rain.instanceMatrix.needsUpdate = true;

      // ---- slime
      slime.visible = shot === 3 && u < 11.5;
      slime.position.set(7.75, 0, 0); slime.rotation.y = -0.5;
      const hitsDone = SLIME_HITS.filter((b) => u >= b).length;
      const lastHit = SLIME_HITS[Math.max(0, hitsDone - 1)];
      const flat = [0, 0.22, 0.45, 0.7][hitsDone];
      const jig = hitsDone ? 0.35 * wobble((u - lastHit) * 0.5, 3, 6) : 0;
      const sy = Math.max(0.12, 1 - flat - jig);
      slime.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
      slimeFace.set(hitsDone ? 'shock' : 'angry', 0);
      // splat
      const sp = prog(u, 11.5, 12.2);
      bits.visible = shot === 3 && u >= 11.5;
      for (let i = 0; i < BITS; i++) {
        const [dx, dy, dz] = bitDir[i], tt = sp * 0.7;
        v.set(7.75 + dx * tt * 3, Math.max(0.11, 0.3 + dy * tt * 4 - 9.8 * tt * tt), dz * tt * 3);
        sc.setScalar(1 - sp * 0.4);
        m4.compose(v, q.setFromEuler(new THREE.Euler(tt * 9 * dx, tt * 7, 0)), sc); bits.setMatrixAt(i, m4);
      }
      bits.instanceMatrix.needsUpdate = true;

      // ---- boss
      bossPivot.visible = shot === 4;
      bossPivot.position.set(13.3, 0, 0);
      const bHits = BOSS_HITS.filter((b) => u >= b).length;
      const bLast = BOSS_HITS[Math.max(0, bHits - 1)];
      const bJig = bHits ? 0.08 * wobble((u - bLast) * 0.5, 2.5, 5) : 0;
      const tip = E.inQuad(prog(u, 15.5, 16));
      bossPivot.rotation.set(0, 0, -tip * Math.PI / 2 * 1.0);
      bossPivot.rotation.y = 0.3;
      boss.scale.set(1 + bJig, 1 - bJig, 1 + bJig);
      bossFace.set(bHits >= 2 ? 'shock' : 'angry', 0);
    },
  };
}
// a soft bump 0..1 centred on c (half-width w)
function bump01(u, c, w) { return M.bump(u, c, w); }

// wind up before each hit, snap down on it, follow through
function bonkPose(u, hits, base) {
  let k = 0; // 0 = bonk (down), 1 = swing (up)
  for (const b of hits) {
    if (u >= b - 0.55 && u < b) k = E.outCubic(prog(u, b - 0.55, b - 0.12)) * (1 - prog(u, b - 0.06, b));
  }
  if (u < hits[0] - 0.55) k = 0.6;
  const p = mixPose({ ...POSES.bonk, ...base }, { ...POSES.swing, ...base }, k);
  // impact squash on the beat
  const last = hits.filter((b) => u >= b).pop();
  if (last !== undefined) p.squash = (p.squash || 0) + 0.12 * wobble((u - last) * 0.5, 3, 7);
  return p;
}

// ---------------------------------------------------------------- shots: [u0, u1, shot id]
function shotAt(u) {
  if (u < 4) return 1;
  if (u < 8) return 2;
  if (u < 12) return 3;
  if (u < 16) return 4;
  if (u < 20) return 5;
  return 6;
}
const CAM1 = [0, 2.6, 12.5, 0, 2.0, 0, 46];
function camFor(shot, u) {
  if (shot === 1) {
    // push on the knights, then pan right (both groups on screen mid-pan) to Bix
    const push = E.inOutSine(prog(u, 0, 3.4));
    const pan = E.inOutCubic(prog(u, 3.2, 4.25));
    const z = lerp(12.5, 10.8, push);
    return [lerp(0, 6.5, pan), lerp(2.6, 2.2, pan), lerp(z, 7.5, pan), lerp(0, 6.5, pan), lerp(2.0, 2.0, pan), 0, lerp(46, 42, pan)];
  }
  if (shot === 2) {
    const k = E.inOutSine(prog(u, 4.25, 8));
    return [6.5 + lerp(0.25, 0.1, k), lerp(2.2, 1.8, k), lerp(7.5, 5.2, k), 6.5, lerp(2.0, 1.75, k), 0, 42];
  }
  if (shot === 3) {
    const k = E.inOutSine(prog(u, 8, 12));
    return [lerp(6.7, 7.1, k), 1.5, lerp(9.0, 8.2, k), 7.0, 1.3, 0, 45];
  }
  if (shot === 4) {
    const k = E.inOutSine(prog(u, 12, 16));
    return [lerp(9.6, 10.2, k), 1.4, lerp(14.5, 13.0, k), 10.6, 2.4, 0, 46];
  }
  if (shot === 5) {
    const k = E.inOutSine(prog(u, 16, 20));
    return [lerp(0.3, -0.3, k), 2.1, lerp(9.0, 8.0, k), 0, 1.9, 0, 44];
  }
  // shot 6 pulls back and lands exactly on shot 1's first camera, so the loop is seamless
  const k = E.inOutCubic(prog(u, 20, 24));
  return [lerp(1.6, CAM1[0], k), lerp(3.4, CAM1[1], k), lerp(15, CAM1[2], k), lerp(1.4, CAM1[3], k), lerp(1.8, CAM1[4], k), 0, 46];
}

// ---------------------------------------------------------------- 2-D captions (meme style)
function caption(ctx, lines, u0, opts = {}) {
  const size = opts.size || 104;
  const f = font(size, 900, DISPLAY);
  ctx.font = f; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  const y0 = opts.y ?? H * 0.17;
  lines.forEach((ln, i) => {
    const li = Array.isArray(u0) ? u0[i] : u0 + i * 0.12;
    const k = springU(opts.u, li, SPRING.bouncy);
    if (k <= 0.001) return;
    const out = opts.out ? E.inBack(prog(opts.u, opts.out, opts.out + 0.35), 1.6) : 0;
    ctx.save();
    ctx.translate(W / 2 + out * -W * 1.2, y0 + i * size * 1.12);
    ctx.scale(k, k);
    ctx.lineWidth = size * 0.2; ctx.strokeStyle = C.ink; ctx.strokeText(ln, 0, 0);
    ctx.fillStyle = opts.color || C.white; ctx.fillText(ln, 0, 0);
    ctx.restore();
  });
}
function bonkWord(ctx, u, b, i) {
  const k = springU(u, b, SPRING.bouncy);
  const life = 1 - prog(u, b + 0.7, b + 0.95);
  if (k <= 0 || life <= 0) return;
  const size = 200;
  ctx.save();
  ctx.font = font(size, 900, DISPLAY); ctx.textAlign = 'center'; ctx.lineJoin = 'round';
  const pos = [[0.36, 0.2], [0.64, 0.25], [0.5, 0.3]][i % 3];
  ctx.translate(W * pos[0], H * pos[1]);
  ctx.rotate([-0.18, 0.14, -0.05][i % 3]);
  ctx.scale(k * life, k * life);
  ctx.lineWidth = size * 0.16; ctx.strokeStyle = C.ink; ctx.strokeText('BONK', 0, 0);
  ctx.fillStyle = C.bonk; ctx.fillText('BONK', 0, 0);
  ctx.restore();
}

M.film({
  fonts: [font(100, 900, DISPLAY)],
  hits: HITS,
  samples: 3,
  async init() { await G.initGL(); S = world(); },
  draw(ctx, u, t) {
    const shot = shotAt(u);
    // impact shake on the bonks and the boss landing
    const allHits = [...SLIME_HITS, ...BOSS_HITS, 16, 8];
    const last = allHits.filter((b) => u >= b).sort((a, b) => b - a)[0];
    ctx.save();
    if (last !== undefined) {
      const a = (last === 16 || last === 8 ? 34 : 20) * Math.exp(-(u - last) * 7);
      ctx.translate(a * (hash01(Math.floor(t * 60), 5) - 0.5) * 2, a * (hash01(Math.floor(t * 60), 6) - 0.5) * 2);
    }
    G.renderSet(ctx, S, t, u, { shot: u >= 23.99 ? 0 : shot, cam: camFor(shot, u) });
    ctx.restore();
    // sad blue tint in shot 2
    if (shot === 2) { ctx.fillStyle = `rgba(30,50,110,${0.28 * prog(u, 4.1, 4.8) * (1 - prog(u, 7.4, 7.9))})`; ctx.fillRect(0, 0, W, H); }

    if (shot === 1) caption(ctx, ['in this server', 'everybody has a', 'diamond sword'], [0, 0.6, 1.5], { u, out: 3.3 });
    if (shot === 2) caption(ctx, ['...except me.'], 4.5, { u, size: 110 });
    if (shot === 3) SLIME_HITS.forEach((b, i) => bonkWord(ctx, u, b, i));
    if (shot === 4) BOSS_HITS.forEach((b, i) => bonkWord(ctx, u, b, i + 1));
    if (shot === 5) caption(ctx, ['...'], 18, { u, size: 160 });
    if (shot === 6) caption(ctx, ['now everybody', 'has a baguette'], [20, 20.4], { u });
  },
});
