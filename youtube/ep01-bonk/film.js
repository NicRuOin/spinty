// MODEL SHEET (temporary): shows Bix + the knight crowd before anything is animated.
// Replaced by the real film once the shot list and character are approved.
import * as M from './lib/motion.js';
import * as G from './lib/gl.js';
import { makeCharacter, POSES } from './sets/bix.js';
const { THREE } = G;
const { W, H, font, text, fill } = M;

let SET;
function sheetSet() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf2ecdf);
  const cam = new THREE.OrthographicCamera(-4.2, 4.2, 4.2 * H / W, -4.2 * H / W, 0.1, 100);
  G.lookFrom(cam, [3, 4, 14], [0, 0.2, 0]);
  G.keyLights(scene, { keyPos: [-5, 8, 8] });
  scene.environment = G.ENV;
  const k = scene.children.find((c) => c.isDirectionalLight);
  k.castShadow = true; k.shadow.mapSize.set(2048, 2048); k.shadow.bias = -0.0008; k.shadow.normalBias = 0.03;
  Object.assign(k.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.18 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const cells = [
    ['bix', 'idle', -2.7, 2.2], ['bix', 'sad', 0, 2.2], ['bix', 'swing', 2.7, 2.2],
    ['bix', 'bonk', -2.7, -3.6], ['bix', 'shock', 0, -3.6], ['knight', 'hero', 2.7, -3.6],
  ];
  const chars = cells.map(([kind, pose, x, y]) => {
    const c = makeCharacter(kind); scene.add(c.root);
    const g = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3), new THREE.ShadowMaterial({ opacity: 0.2 }));
    g.rotation.x = -Math.PI / 2; g.receiveShadow = true; c.root.add(g);
    return { c, pose, x, y };
  });
  ground.visible = false;
  return { scene, camera: cam, cells: chars, update() {
    chars.forEach(({ c, pose, x, y }) => { c.pose({ ...POSES[pose], x, y, yaw: -0.35 }); c.root.position.set(x, y, 0); });
  } };
}

M.film({
  fonts: [font(80, 900, 'Display'), font(40, 600, 'UI')],
  samples: 1,
  async init() { await G.initGL(); SET = sheetSet(); },
  draw(ctx, u, t) {
    fill(ctx, '#f2ecdf');
    G.renderSet(ctx, SET, t, u);
    text(ctx, 'BIX — model sheet', 70, 130, font(82, 900, 'Display'), '#1b1320');
    const lab = font(38, 600, 'UI');
    const names = ['idle', 'sad', 'swing', 'BONK!', 'shock', 'knight (crowd)'];
    SET.cells.forEach(({ x, y }, i) => {
      const v = new THREE.Vector3(x, y - 0.35, 0).project(SET.camera);
      text(ctx, names[i], (v.x + 1) / 2 * W, (1 - v.y) / 2 * H + 40, lab, '#5b5266', 'center');
    });
  },
});
