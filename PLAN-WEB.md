# Plan de la web (2026-10-05)

Elegido por Rodrigo en modo plan, desde el catálogo de `.claude/skills/planificar-web` (21 opciones).
Ids: W01 O03 RB43 H01 NV02 ES11 TP02 PA01 G03 S03 SE36 SQ20 T01 T03 N04 L05 S04 S13 FM02 EN08 EN09

## Tipos de web

- **W01 · One page**: Todo en una página larga con secciones; negocios con poca información y un solo objetivo _(ref: web-scrolling)_

## Objetivos

- **O03 · Captar contactos (leads)**: Formulario corto + seguimiento automático _(ref: FM)_

## Rubros

- **RB43 · Estudio de realidad virtual (Lost Eagle)**: Lugares reales, proceso, impacto, contacto comercial; scroll y fotos amplias _(ref: orbis-lost-eagle)_

## Primera pantalla (hero)

- **H01 · Foto a sangre con titular abajo**: Una foto real potente; el clásico que funciona (Lost Eagle) _(ref: S01)_

## Navegación

- **NV02 · Píldora de vidrio**: Menú con blur que se vuelve sólido al bajar (Lost Eagle v4) _(ref: N09)_

## Estilos visuales

- **ES11 · Documental de naturaleza**: Fotos amplias, verdes profundos, tipografía sobria (Lost Eagle) _(ref: RB43)_

## Tipografías

- **TP02 · Futura PT + Proxima Nova**: La de Lost Eagle (Adobe Fonts, licencia del cliente) _(ref: Adobe Fonts)_

## Paletas

- **PA01 · Bosque nuboso**: #17302A · #3C8E51 · #C9DDB2 · #1C4276 · #EEF1EA (Lost Eagle) _(ref: RB43)_

## Efectos · giro y 3D

- **G03 · Globo terráqueo 3D**: Efecto firma. Librería: Three.js _(ref: efectos-web)_

## Efectos · scroll

- **S03 · Scroll suave sincronizado con ScrollTrigger**: Librería: Lenis _(ref: efectos-web)_
- **S04 · Parallax por capas con velocidades (`data-speed`)**: Librería: ScrollTrigger _(ref: efectos-web)_
- **S13 · Línea SVG que se dibuja al bajar**: Librería: DrawSVG _(ref: efectos-web)_

## Secciones

- **SE36 · Preguntas frecuentes (acordeón)**: Objeciones respondidas; alimenta a la IA _(ref: W34)_

## Calidad, SEO y accesibilidad

- **SQ20 · AEO: frase descriptora + FAQ**: Que la IA cite a la marca igual siempre _(ref: taglines-climate-week)_

## Efectos · tipografía

- **T01 · Titular que sube línea por línea con máscara**: Efecto firma. Librería: SplitText _(ref: efectos-web)_
- **T03 · Párrafo que se enciende palabra por palabra con el scroll**: Efecto firma. Librería: SplitText _(ref: efectos-web)_

## Efectos · minimalistas

- **N04 · Revelado con cortina (`clip-path`)**: Librería: GSAP / CSS _(ref: efectos-web)_

## Efectos · composición y capas

- **L05 · Imagen fija con texto que corre al lado (sticky split)**: Efecto firma. Librería: CSS + JS _(ref: efectos-web)_

## Formularios

- **FM02 · Contacto con interés (select)**: Clasifica el contacto (Lost Eagle) _(ref: FM02)_

## Entrega y hosting

- **EN08 · Artifact de claude.ai**: Solo vistas previas propias o sin marca de terceros _(ref: artifact-design)_
- **EN09 · ZIP de entrega**: Archivos completos para el cliente _(ref: EN09)_

## Librerías instaladas en assets/vendor/

gsap, scrolltrigger, splittext, drawsvg, lenis, three

---

# Recetas de los efectos elegidos

## G03 · Globo terráqueo 3D ✅
**Cuándo:** destinos en el mundo (Lost Eagle, agencias). Textura de la Tierra 2:1 (NASA Blue Marble, dominio público) en `assets/img/tierra.webp`.
```html
<script type="module">
import * as THREE from './assets/vendor/three.module.min.js';
const cont=document.querySelector('.globo'),r=new THREE.WebGLRenderer({alpha:true,antialias:true});r.setPixelRatio(Math.min(2,devicePixelRatio));cont.append(r.domElement);
const esc=new THREE.Scene(),cam=new THREE.PerspectiveCamera(35,1,.1,100);cam.position.z=4;
const tierra=new THREE.Mesh(new THREE.SphereGeometry(1,64,64),new THREE.MeshStandardMaterial({map:new THREE.TextureLoader().load('assets/img/tierra.webp')}));esc.add(tierra);
esc.add(new THREE.AmbientLight(0xffffff,.7));const sol=new THREE.DirectionalLight(0xffffff,1.6);sol.position.set(3,2,4);esc.add(sol);
// marcadores: lat/lon → vector
const punto=(lat,lon)=>{const p=THREE.MathUtils.degToRad(90-lat),t=THREE.MathUtils.degToRad(lon+180);return new THREE.Vector3(-Math.sin(p)*Math.cos(t),Math.cos(p),Math.sin(p)*Math.sin(t));};
[[-13.163,-72.545],[-33.6,150.3]].forEach(([la,lo])=>{const m=new THREE.Mesh(new THREE.SphereGeometry(.02),new THREE.MeshBasicMaterial({color:0xC9DDB2}));m.position.copy(punto(la,lo).multiplyScalar(1.01));tierra.add(m);});
const tam=()=>{r.setSize(cont.clientWidth,cont.clientHeight);cam.aspect=cont.clientWidth/cont.clientHeight;cam.updateProjectionMatrix();};tam();addEventListener('resize',tam);
r.setAnimationLoop(()=>{tierra.rotation.y+=.0025;r.render(esc,cam);});
</script>
```
Con el scroll: `gsap.to(tierra.rotation,{y:Math.PI*2,scrollTrigger:{scrub:true}})`. Coordenadas: siempre verificadas.

_Receta: .claude/skills/efectos-web/recetas/slots-giro.md_

---

## S03 · Scroll suave sincronizado con ScrollTrigger
**Cuándo:** webs de mucha imagen. **No** en formularios largos ni en webs de texto (lo hace más lento al leer).
```js
const lenis=new Lenis({lerp:.1});
lenis.on('scroll',ScrollTrigger.update);
gsap.ticker.add(t=>lenis.raf(t*1000)); gsap.ticker.lagSmoothing(0);
// anclas: document.querySelectorAll('a[href^="#"]').forEach(a=>a.onclick=e=>{e.preventDefault();lenis.scrollTo(a.getAttribute('href'))});
```
Cargar también `lenis.css`. Con movimiento reducido no crear Lenis.

_Receta: .claude/skills/efectos-web/recetas/scroll.md_

---

## T01 · Titular que sube línea por línea con máscara ✅
```js
document.fonts.ready.then(()=>{
  const s=SplitText.create('.hero h1',{type:'lines',mask:'lines',linesClass:'linea'});
  gsap.from(s.lines,{yPercent:110,duration:1.1,ease:'power4.out',stagger:.12});
});
```
Sin SplitText: envolver cada línea a mano en `<span class="line"><span>…</span></span>` con `overflow:hidden` (así está en Lost Eagle).

_Receta: .claude/skills/efectos-web/recetas/tipografia.md_

---

## T03 · Párrafo que se enciende palabra por palabra ✅
```js
const s=SplitText.create('.mision',{type:'words'});
gsap.fromTo(s.words,{opacity:.15},{opacity:1,stagger:.05,ease:'none',
  scrollTrigger:{trigger:'.mision',start:'top 80%',end:'bottom 45%',scrub:true}});
```
(En Lost Eagle está hecho sin librería: se parte en `<span class="w">` y se calcula el avance con `getBoundingClientRect`.)

_Receta: .claude/skills/efectos-web/recetas/tipografia.md_

---

## N04 · Revelado con cortina
```js
gsap.from('.cortina',{clipPath:'inset(100% 0 0 0)',duration:1.3,ease:'power3.inOut',scrollTrigger:{trigger:'.cortina',start:'top 85%'}});
// variantes: 'inset(0 100% 0 0)' (de izquierda), 'circle(0% at 50% 50%)' (desde el centro)
```

_Receta: .claude/skills/efectos-web/recetas/movimiento-minimal.md_

---

## L05 · Imagen fija con texto que corre al lado (sticky split) ✅
```css
.split{display:grid;grid-template-columns:1fr 1fr} .split .media{position:sticky;top:0;height:100svh} .split .media img{position:absolute;inset:0;opacity:0;transition:opacity .6s} .split .media img.on{opacity:1}
.split .paso{min-height:80svh;display:grid;align-content:center}
```
```js
document.querySelectorAll('.split .paso').forEach((p,i)=>ScrollTrigger.create({trigger:p,start:'top center',end:'bottom center',
  onToggle:t=>t.isActive&&document.querySelectorAll('.split .media img').forEach((im,k)=>im.classList.toggle('on',k===i))}));
```
En celular: la imagen arriba, sticky y más chica.

_Receta: .claude/skills/efectos-web/recetas/composicion-color.md_

---

## S04 · Parallax por capas con velocidades
```html
<img data-speed="0.8" …><h2 data-speed="1.15">…</h2>
```
```js
gsap.utils.toArray('[data-speed]').forEach(el=>{const v=parseFloat(el.dataset.speed);
  gsap.fromTo(el,{y:()=> (1-v)*-200},{y:()=> (1-v)*200,ease:'none',scrollTrigger:{trigger:el,start:'top bottom',end:'bottom top',scrub:true,invalidateOnRefresh:true}});});
```
Alternativa: `ScrollSmoother.create({smooth:1,effects:true})` lee `data-speed`/`data-lag` solo (necesita `#smooth-wrapper > #smooth-content`).

_Receta: .claude/skills/efectos-web/recetas/scroll.md_

---

## S13 · Línea SVG que se dibuja al bajar
**Cuándo:** un sendero, un río o una ruta en un mapa (Inkas Golden, Lost Eagle).
```js
gsap.registerPlugin(DrawSVGPlugin);
gsap.from('.ruta path',{drawSVG:'0%',ease:'none',scrollTrigger:{trigger:'.ruta',start:'top 70%',end:'bottom 40%',scrub:true}});
```
Sin plugin: `path{stroke-dasharray:L;stroke-dashoffset:L}` con L = `path.getTotalLength()`, y animar `strokeDashoffset` a 0.

_Receta: .claude/skills/efectos-web/recetas/scroll.md_
