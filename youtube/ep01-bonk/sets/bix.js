// Blocky characters for the "everybody except me" series. Original designs (no game assets):
// Bix = the hero (orange cube head, purple hoodie, grey pants, holds a baguette).
// Knight = the "everybody" crowd (steel helmet head, teal tunic, glowing crystal sword).
// Every pose is set from a plain object each frame (pure function of time; see references/3d.md).
import * as G from '../lib/gl.js';
const { THREE } = G;

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...o });
function box(w, h, d, m, y = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(0, y, 0);
  const mesh = new THREE.Mesh(g, m);
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}
const pivot = (x, y, z) => { const p = new THREE.Group(); p.position.set(x, y, z); return p; };

// face drawn into a canvas texture: expressions 'happy' | 'sad' | 'angry' | 'shock'
export function faceTexture(skin) {
  const tex = G.canvasTexture(256, 256);
  let last = null;
  tex.set = (expr, blink = 0) => {
    const key = expr + '|' + blink.toFixed(2);
    if (key === last) return; last = key;
    tex.draw((c, w, h) => {
      c.fillStyle = skin; c.fillRect(0, 0, w, h);
      c.fillStyle = '#1b1320';
      const eh = 46 * (1 - blink) + 6 * blink;
      // eyes
      [[78, 104], [178, 104]].forEach(([x, y]) => {
        c.beginPath(); c.roundRect(x - 17, y - eh / 2, 34, eh, 12); c.fill();
        if (blink < 0.5) { c.fillStyle = '#fff'; c.fillRect(x - 6, y - eh / 2 + 7, 9, 9); c.fillStyle = '#1b1320'; }
      });
      c.lineCap = 'round'; c.lineWidth = 14; c.strokeStyle = '#1b1320';
      if (expr === 'sad') {
        // brows tilted up in the middle + frown + tear
        c.beginPath(); c.moveTo(56, 66); c.lineTo(100, 52); c.moveTo(200, 66); c.lineTo(156, 52); c.stroke();
        c.beginPath(); c.arc(128, 210, 34, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
        c.fillStyle = '#6fc8ff'; c.beginPath(); c.ellipse(70, 150, 9, 15, 0, 0, Math.PI * 2); c.fill();
      } else if (expr === 'angry') {
        c.beginPath(); c.moveTo(52, 52); c.lineTo(100, 72); c.moveTo(204, 52); c.lineTo(156, 72); c.stroke();
        c.fillStyle = '#1b1320'; c.beginPath(); c.roundRect(84, 160, 88, 40, 14); c.fill();
        c.fillStyle = '#fff'; c.fillRect(96, 164, 64, 12);
      } else if (expr === 'laugh') {
        // squeezed ^ ^ eyes over a huge open mouth
        c.fillStyle = skin; c.fillRect(40, 70, 180, 70); c.fillStyle = '#1b1320';
        c.beginPath(); c.moveTo(58, 112); c.lineTo(80, 92); c.lineTo(102, 112); c.moveTo(154, 112); c.lineTo(176, 92); c.lineTo(198, 112); c.stroke();
        c.beginPath(); c.moveTo(66, 150); c.lineTo(190, 150); c.quadraticCurveTo(128, 250, 66, 150); c.fill();
        c.fillStyle = '#e8606a'; c.beginPath(); c.ellipse(128, 200, 30, 14, 0, 0, Math.PI * 2); c.fill();
      } else if (expr === 'jaw') {
        // eyes popped wide, mouth left to the dropping jaw geometry
        c.fillStyle = '#fff'; [[78, 100], [178, 100]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 30, 0, Math.PI * 2); c.fill(); });
        c.fillStyle = '#1b1320'; [[78, 100], [178, 100]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 10, 0, Math.PI * 2); c.fill(); });
      } else if (expr === 'shock') {
        c.beginPath(); c.ellipse(128, 182, 22, 28, 0, 0, Math.PI * 2); c.fill();
      } else {
        c.beginPath(); c.arc(128, 150, 40, Math.PI * 0.15, Math.PI * 0.85); c.stroke();
      }
    });
  };
  return tex;
}

export function makeCharacter(kind = 'bix') {
  const P = kind === 'bix'
    ? { skin: '#ff8a1f', shirt: 0x7b4bd6, shirt2: 0x5d34b0, pants: 0x4a4f5c, shoe: 0x22222a }
    : { skin: '#c9d2dc', shirt: 0x1f9e8f, shirt2: 0x157a6e, pants: 0x2c3340, shoe: 0x1a1d24 };
  const root = new THREE.Group();
  const hips = pivot(0, 1.0, 0); root.add(hips);
  const torso = box(1.0, 1.0, 0.55, mat(P.shirt), 0.5); hips.add(torso);
  // hoodie pocket / tunic belt
  const trim = box(1.02, 0.16, 0.57, mat(P.shirt2), 0.12); hips.add(trim);
  const neck = pivot(0, 1.0, 0); hips.add(neck);
  const face = faceTexture(P.skin);
  const skinM = mat(P.skin);
  const faceM = new THREE.MeshStandardMaterial({ map: face, roughness: 0.7 });
  const headMats = [skinM, skinM, skinM, skinM, faceM, skinM];
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9).translate(0, 0.47, 0), headMats);
  head.castShadow = true; neck.add(head);
  if (kind === 'bix') {
    // tiny tuft of hair: the silhouette marker
    const tuft = box(0.18, 0.22, 0.18, mat(0x3a2414), 1.02); tuft.rotation.z = 0.3; neck.add(tuft);
  } else {
    // steel helmet with visor plume
    const helm = box(0.98, 0.32, 0.98, mat(0x9aa6b2, { metalness: 0.8, roughness: 0.3, envMap: G.ENV }), 0.86); neck.add(helm);
    const plume = box(0.12, 0.34, 0.6, mat(0xe0434c), 1.15); neck.add(plume);
  }
  const arm = (side) => {
    const sh = pivot(side * 0.68, 0.92, 0); hips.add(sh);
    const a = box(0.34, 0.9, 0.36, mat(P.shirt), -0.4); sh.add(a);
    const hand = box(0.3, 0.26, 0.3, skinM, -0.92); sh.add(hand);
    const grip = pivot(0, -0.92, 0.05); sh.add(grip);
    return { sh, grip };
  };
  const leg = (side) => {
    const hp = pivot(side * 0.26, 0.02, 0); hips.add(hp);
    hp.add(box(0.44, 0.84, 0.48, mat(P.pants), -0.42));
    hp.add(box(0.46, 0.18, 0.56, mat(P.shoe), -0.93));
    return hp;
  };
  const L = arm(-1), Rr = arm(1);
  // drop-jaw rig: a dark mouth slot that stretches down the front and a chin block at its end
  const mouth = box(0.56, 1, 0.04, new THREE.MeshBasicMaterial({ color: 0x2a0d14 }), -0.5); mouth.position.set(0, 0.36, 0.46); neck.add(mouth);
  const tongue = box(0.36, 0.1, 0.3, mat(0xe8606a), 0); neck.add(tongue);
  const chin = box(0.82, 0.28, 0.82, skinM, -0.14); neck.add(chin);
  const legL = leg(-1), legR = leg(1);

  // held props: every character owns both a baguette and a crystal sword; pose({ propKind }) picks one
  const baguette = makeBaguette();
  const sword = makeSword();
  const prop = new THREE.Group(); prop.add(baguette, sword);
  Rr.grip.add(prop);

  const ch = { root, hips, neck, head, face, L, R: Rr, legL, legR, prop, kind, sword, baguette };
  // pose: angles in radians; all fields optional, everything reset each call
  ch.pose = (p = {}) => {
    root.position.set(p.x || 0, p.y || 0, p.z || 0);
    root.rotation.set(0, p.yaw || 0, 0);
    const sq = p.squash || 0;   // + squash (wider, shorter), - stretch
    root.scale.set(1 + sq * 0.5, 1 - sq, 1 + sq * 0.5);
    hips.position.y = 1.0 + (p.bob || 0);
    hips.rotation.set(p.lean || 0, p.twist || 0, p.tilt || 0);
    neck.rotation.set(p.headPitch || 0, p.headYaw || 0, p.headRoll || 0);
    L.sh.rotation.set(p.armL ?? 0, 0, p.armLout ?? -0.12);
    Rr.sh.rotation.set(p.armR ?? -0.5, 0, p.armRout ?? 0.12);
    prop.rotation.set(Math.PI / 2 + (p.propPitch || 0), 0, 0);
    prop.visible = p.prop !== false;
    const pk = p.propKind || (kind === 'bix' ? 'baguette' : 'sword');
    baguette.visible = pk === 'baguette'; sword.visible = pk === 'sword';
    legL.rotation.set(p.legL || 0, 0, 0);
    legR.rotation.set(p.legR || 0, 0, 0);
    // jaw: 0 = closed (hidden), 1 = chin on the floor (neck sits ~2 units up)
    const jl = (p.jaw || 0) * 2.05;
    mouth.visible = chin.visible = tongue.visible = jl > 0.01;
    mouth.scale.set(1, Math.max(0.001, jl), 1);
    chin.position.set(0, 0.36 - jl, 0.05);
    tongue.position.set(0, 0.36 - jl + 0.03, 0.2);
    face.set(p.expr || 'happy', p.blink || 0);
  };
  ch.pose();
  return ch;
}

export function makeBaguette() {
  const g = new THREE.Group();
  const bread = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 1.5, 6, 14), mat(0xd9963f, { roughness: 0.9 }));
  bread.position.y = 0.75; bread.castShadow = true; g.add(bread);
  for (let i = 0; i < 4; i++) {
    const cut = box(0.2, 0.05, 0.12, mat(0xf3d39a), 0.3 + i * 0.32); cut.position.z = 0.15; cut.rotation.x = 0.5; g.add(cut);
  }
  return g;
}
export function makeSword() {
  const g = new THREE.Group();
  g.add(box(0.12, 0.3, 0.12, mat(0x5b3b22), 0.1));
  g.add(box(0.5, 0.1, 0.16, mat(0xd8b24a, { metalness: 0.7, roughness: 0.3 }), 0.28));
  g.add(box(0.2, 1.5, 0.06, new THREE.MeshStandardMaterial({ color: 0x7ff5ff, emissive: 0x2fd8ff, emissiveIntensity: 1.6, roughness: 0.2 }), 1.08));
  return g;
}
// blend two poses (numeric fields lerp, the rest switch at 0.5)
export function mixPose(a, b, k) {
  const o = {};
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[key], y = b[key];
    if (typeof x === 'number' || typeof y === 'number') o[key] = (x || 0) + ((y || 0) - (x || 0)) * k;
    else o[key] = k < 0.5 ? (x ?? y) : (y ?? x);
  }
  return o;
}

// named poses used by the shot list
export const POSES = {
  laugh: { expr: 'laugh', lean: -0.22, headPitch: -0.3, armL: -1.45, armLout: 0.1, armR: -0.4 },
  jaw: { expr: 'jaw', armL: -0.2, armLout: -0.35, armR: -0.2, armRout: 0.35, prop: false },
  idle: { expr: 'happy' },
  sad: { expr: 'sad', lean: 0.25, headPitch: 0.35, armR: 0.15, armL: 0.1, propPitch: -1.3 },
  swing: { expr: 'angry', twist: -0.5, armR: -2.9, armRout: 0.25, lean: -0.1, legL: 0.5, legR: -0.3, squash: -0.08 },
  bonk: { expr: 'angry', twist: 0.45, armR: -0.9, armRout: -0.1, lean: 0.3, legL: -0.4, legR: 0.5, squash: 0.12 },
  shock: { expr: 'shock', armL: -2.6, armLout: -0.5, armR: -2.6, armRout: 0.5, headPitch: -0.15, prop: false },
  hero: { expr: 'happy', armR: -2.5, armRout: 0.15, armL: 0, headPitch: -0.1, twist: 0.2 },
};
