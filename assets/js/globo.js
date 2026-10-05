/* Lost Eagle — globo 3D con sus lugares (efecto firma G03 del catálogo).
   El globo queda fijo (sticky) y gira hasta el lugar de la tarjeta que está en pantalla.
   Textura: NASA Blue Marble (dominio público), en sus colores reales (pedido de Rodrigo, 05/10). Sin WebGL o con movimiento
   reducido, la sección queda como lista de tarjetas (clase .globe--quieto). */
import * as THREE from '../vendor/three.module.min.js';

const seccion = document.querySelector('.globe');
const canvas = document.getElementById('globo');
const lugares = [...document.querySelectorAll('.place')];
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

function soportaWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
}

if (!seccion || !canvas || REDUCE || !soportaWebGL()) {
  seccion && seccion.classList.add('globe--quieto');
} else {
  iniciar();
}

function iniciar() {
  const escenario = canvas.parentElement;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camara.position.set(0, 0, 5.4);

  // Inclinación (latitud) en un grupo y giro (longitud) en otro: así se combinan sin trabarse.
  const inclinacion = new THREE.Group();
  const giro = new THREE.Group();
  inclinacion.add(giro);
  escena.add(inclinacion);

  const textura = new THREE.TextureLoader().load('assets/img/tierra-nasa.webp');
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const tierra = new THREE.Mesh(
    new THREE.SphereGeometry(1, 96, 96),
    new THREE.MeshStandardMaterial({ map: textura, roughness: 0.9, metalness: 0 })
  );
  giro.add(tierra);

  // Halo de atmósfera (efecto Fresnel) en el liquen de la marca
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(1.035, 64, 64),
    new THREE.ShaderMaterial({
      transparent: true, side: THREE.BackSide, depthWrite: false,
      uniforms: { color: { value: new THREE.Color('#7FB2E8') } },
      vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 color; varying vec3 vN; void main(){ float i = pow(0.7 - dot(vN, vec3(0.0,0.0,1.0)), 4.0); gl_FragColor = vec4(color, clamp(i * 1.2, 0.0, 0.32)); }'
    })
  );
  escena.add(halo);

  escena.add(new THREE.AmbientLight(0xffffff, 1.6));
  const sol = new THREE.DirectionalLight(0xffffff, 0.9);
  sol.position.set(-3, 2, 4);
  escena.add(sol);

  // lat/lon → punto sobre la esfera (convención de la textura equirectangular)
  const aVector = (lat, lon, r = 1) => {
    const phi = THREE.MathUtils.degToRad(90 - lat), theta = THREE.MathUtils.degToRad(lon + 180);
    return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
  };

  // Puntos: uno por lugar con coordenadas (la Amazonía no lleva punto)
  const puntos = lugares.map((li) => {
    if (li.hasAttribute('data-sin-punto')) return null;
    const grupo = new THREE.Group();
    const centro = new THREE.Mesh(new THREE.SphereGeometry(0.018, 16, 16), new THREE.MeshBasicMaterial({ color: '#1F5E36' }));
    const borde = new THREE.Mesh(new THREE.RingGeometry(0.018, 0.026, 32), new THREE.MeshBasicMaterial({ color: '#FFFFFF', side: THREE.DoubleSide }));
    const anillo = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.04, 40), new THREE.MeshBasicMaterial({ color: '#2F7443', transparent: true, opacity: 0, side: THREE.DoubleSide }));
    grupo.add(borde, centro, anillo);
    const pos = aVector(+li.dataset.lat, +li.dataset.lon, 1.005);
    grupo.position.copy(pos);
    grupo.lookAt(pos.clone().multiplyScalar(2));
    giro.add(grupo);
    return { grupo, centro, anillo };
  });

  // Ángulos para dejar un lugar al frente de la cámara
  const angulos = (lat, lon) => {
    const v = aVector(lat, lon);
    const ry = Math.atan2(-v.x, v.z);
    const rxz = Math.hypot(v.x, v.z);
    return { ry, rx: Math.atan2(v.y, rxz) * 0.85 };
  };
  const estado = { ry: angulos(-13.16, -72.55).ry, rx: 0.1, auto: true };
  let activo = -1;

  function enfocar(i) {
    if (i === activo) return;
    activo = i;
    const li = lugares[i];
    const { ry, rx } = angulos(+li.dataset.lat, +li.dataset.lon);
    // camino más corto
    let delta = ry - estado.ry;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta));
    estado.auto = false;
    const destino = { ry: estado.ry + delta, rx };
    if (window.gsap) window.gsap.to(estado, { ...destino, duration: 1.6, ease: 'power3.inOut' });
    else Object.assign(estado, destino);
    puntos.forEach((p, k) => {
      if (!p) return;
      const on = k === i;
      p.centro.scale.setScalar(on ? 1.6 : 1);
      p.anillo.material.opacity = on ? 0.9 : 0;
    });
    lugares.forEach((l, k) => l.classList.toggle('is-on', k === i));
  }

  // Tarjeta activa = la que cruza la mitad de la pantalla
  const io = new IntersectionObserver((entradas) => {
    entradas.forEach((e) => { if (e.isIntersecting) enfocar(lugares.indexOf(e.target)); });
  }, { rootMargin: '-48% 0px -48% 0px' });
  lugares.forEach((l) => io.observe(l));

  function medir() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
  }
  medir();
  addEventListener('resize', medir);

  // Solo dibuja cuando la sección está en pantalla (ahorra batería)
  let visible = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(seccion);
  const reloj = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    if (!visible) return;
    const t = reloj.getElapsedTime();
    if (estado.auto) estado.ry += 0.0025;
    giro.rotation.y = estado.ry;
    inclinacion.rotation.x = estado.rx;
    puntos.forEach((p, k) => { if (p && k === activo) { const s = 1 + (t * 0.8 % 1) * 1.6; p.anillo.scale.setScalar(s); p.anillo.material.opacity = 0.9 * (1 - (t * 0.8 % 1)); } });
    renderer.render(escena, camara);
  });
  seccion.classList.add('globe--listo');
}
