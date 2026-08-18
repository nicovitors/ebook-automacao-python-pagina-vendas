import * as THREE from 'https://esm.sh/three@0.160.0';

const NAVY = 0x0f1e33, GOLD = 0xc08a2e, TEAL = 0x106862;
const reduced = window.matchMedia('(prefers-reduced-motion:reduce)').matches;

function waitFor(id, cb, tries = 0) {
  const el = document.getElementById(id);
  if (el) return cb(el);
  if (tries > 200) return;
  requestAnimationFrame(() => waitFor(id, cb, tries + 1));
}

waitFor('webgl-book', (host) => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0, 12.4);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);
  Object.assign(renderer.domElement.style, { width: '100%', height: '100%', display: 'block' });

  // ---- lights
  scene.add(new THREE.AmbientLight(0xffffff, 1.5));
  const key = new THREE.DirectionalLight(0xfff2dc, 3.2); key.position.set(4, 6, 8); scene.add(key);
  const goldLight = new THREE.PointLight(GOLD, 90, 26); goldLight.position.set(-6, 3, 6); scene.add(goldLight);
  const tealLight = new THREE.PointLight(TEAL, 70, 26); tealLight.position.set(6, -4, 4); scene.add(tealLight);
  const rim = new THREE.DirectionalLight(0xe3b463, 1.4); rim.position.set(-5, 2, -6); scene.add(rim);

  // ---- book
  const group = new THREE.Group();
  scene.add(group);

  const W = 3.4, H = 4.82, D = 0.46;
  const loader = new THREE.TextureLoader();
  const cover = loader.load('assets/capa.png', t => { t.colorSpace = THREE.SRGBColorSpace; });

  const paper = new THREE.MeshStandardMaterial({ color: 0xf3ece0, roughness: 0.85, metalness: 0 });
  const board = new THREE.MeshStandardMaterial({ color: NAVY, roughness: 0.62, metalness: 0.18 });
  const spine = new THREE.MeshStandardMaterial({ color: 0x0b1a2e, roughness: 0.5, metalness: 0.35 });
  const front = new THREE.MeshStandardMaterial({
    map: cover, roughness: 0.55, metalness: 0.05,
    emissiveMap: cover, emissive: 0xffffff, emissiveIntensity: 0.72
  });
  // order: +x, -x, +y, -y, +z, -z
  const book = new THREE.Mesh(new THREE.BoxGeometry(W, H, D, 1, 1, 1), [paper, spine, paper, paper, front, board]);
  group.add(book);

  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(W * 1.004, H * 1.004, D * 0.999),
    new THREE.MeshStandardMaterial({ color: 0xe3b463, roughness: 0.3, metalness: 0.8, transparent: true, opacity: 0.16 })
  );
  group.add(edge);

  // ---- orbiting gold rings
  const rings = new THREE.Group();
  [3.9, 4.5].forEach((r, i) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.012, 8, 160),
      new THREE.MeshBasicMaterial({ color: i ? TEAL : GOLD, transparent: true, opacity: i ? 0.5 : 0.75 })
    );
    ring.rotation.x = Math.PI / 2.1 + i * 0.22;
    ring.rotation.z = i * 0.5;
    rings.add(ring);
  });
  scene.add(rings);

  // ---- particles
  const COUNT = 900;
  const pos = new Float32Array(COUNT * 3), col = new Float32Array(COUNT * 3), seed = new Float32Array(COUNT);
  const cA = new THREE.Color(0xe3b463), cB = new THREE.Color(0x2f8f88), cC = new THREE.Color(0xdce7f5);
  for (let i = 0; i < COUNT; i++) {
    const r = 5 + Math.random() * 11, a = Math.random() * Math.PI * 2, y = (Math.random() - 0.5) * 16;
    pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = y; pos[i * 3 + 2] = Math.sin(a) * r * 0.6 - 2;
    const c = Math.random() < 0.55 ? cA : (Math.random() < 0.5 ? cB : cC);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    seed[i] = Math.random() * 100;
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const points = new THREE.Points(pg, new THREE.PointsMaterial({
    size: 0.055, vertexColors: true, transparent: true, opacity: 0.9,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
  }));
  scene.add(points);

  // ---- interaction
  let tx = 0, ty = 0, mx = 0, my = 0;
  const onMove = e => {
    const r = host.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
  };
  window.addEventListener('pointermove', onMove, { passive: true });

  const resize = () => {
    const w = host.clientWidth || 1, h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < 520 ? 42 : 34;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(host);
  resize();

  let visible = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0 }).observe(host);

  const clock = new THREE.Clock();
  (function loop() {
    requestAnimationFrame(loop);
    if (!visible) return;
    const t = clock.getElapsedTime();
    mx += (tx - mx) * 0.05; my += (ty - my) * 0.05;

    if (reduced) {
      group.rotation.set(-0.06, -0.32, 0);
    } else {
      group.rotation.y = Math.sin(t * 0.24) * 0.62 - mx * 0.42;
      group.rotation.x = Math.sin(t * 0.31) * 0.09 + my * 0.22;
      group.rotation.z = Math.sin(t * 0.19) * 0.03;
      group.position.y = Math.sin(t * 0.7) * 0.18;
      rings.rotation.y = t * 0.14;
      rings.rotation.z = Math.sin(t * 0.2) * 0.18;
      points.rotation.y = t * 0.035;
      const p = pg.attributes.position;
      for (let i = 0; i < COUNT; i += 1) {
        p.array[i * 3 + 1] += Math.sin(t * 0.6 + seed[i]) * 0.0016;
      }
      p.needsUpdate = true;
      goldLight.position.x = Math.cos(t * 0.4) * 7;
      goldLight.position.z = 5 + Math.sin(t * 0.4) * 3;
    }
    camera.position.x = mx * 0.7;
    camera.position.y = -my * 0.5;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  })();
});
