// Genera la «Design preview» SIN MARCA de la web, para compartirla con un link de revisión (artifact de claude.ai).
// La web real (con nombre, logo, fundador y redes de Lost Eagle) NO se publica: se entrega en archivos.
// Aquí se reemplazan nombre, logo, foto y nombre del fundador, ciudad, redes y correo por marcadores, y se agrega un aviso.
// Uso: node herramientas/preparar-preview.js  → produccion/preview/ (index.html + assets) y produccion/preview/files.json
const fs = require('fs');
const path = require('path');
const R = path.resolve(__dirname, '..');
const OUT = path.join(R, 'produccion', 'preview');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'assets', 'css'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'assets', 'js'), { recursive: true });

// Reemplazos de texto, en este orden (de lo más largo a lo más corto).
const TEXTOS = [
  ['Lost Eagle Studios LLC', '[Company name]'],
  ['Luke Farrer', '[Founder name]'],
  ['Nature with Luke', 'Nature with [Founder]'],
  ['The EagleVision&trade; process', 'Our capture process'],
  ['EagleVision&trade;', '[Process name]&trade;'],
  ['Lost Eagle', '[Brand]'],
  ['Boston, Massachusetts', '[City]'],
  ['Boston', '[City]'],
];
const marcar = (s) => TEXTOS.reduce((t, [a, b]) => t.split(a).join(b), s);

const index = fs.readFileSync(path.join(R, 'index.html'), 'utf8');
let cuerpo = index.match(/<body[^>]*>([\s\S]*?)<\/body>/)[1];
cuerpo = cuerpo
  .replace(/<!--[\s\S]*?-->/g, '')                                                     // comentarios internos
  .replace(/<img[^>]*logo-blanco\.png[^>]*>/g, '<span class="ph-logo">[Your logo]</span>') // logo
  .replace(/<img[^>]*luke-farrer\.webp[^>]*>/g, '<div class="ph-photo"><span>Founder photo</span></div>') // foto del fundador
  .replace(/<a href="https:\/\/www\.(instagram|facebook|youtube)[^"]*"[^>]*>/g, '<a aria-disabled="true" title="Link pending">') // redes
  .replace(/<a href="mailto:"([^>]*)>([\s\S]*?)<\/a>/g, '<span$1>$2</span>');            // correo
cuerpo = marcar(cuerpo);
const aviso = '<p class="ph-note" role="note">Design preview. Brand name, logo, founder and links are placeholders. The form does not send messages.</p>\n';

const head = index.match(/<head>([\s\S]*?)<\/head>/)[1];
const fuentes = (head.match(/<link rel="(preconnect|stylesheet)" href="https:\/\/fonts[^>]*>/g) || []).join('\n');
const extra = `<style>
.ph-logo { display: inline-flex; align-items: center; height: 34px; padding: 0 12px; border: 1.5px dashed currentColor; border-radius: 8px; font: 600 .8125rem/1 var(--head); letter-spacing: .08em; text-transform: uppercase; opacity: .9; white-space: nowrap; }
.ph-photo { width: 100%; height: 100%; display: grid; place-items: center; border: 2px dashed rgba(20, 38, 31, .35); border-radius: 18px; }
.ph-photo span { font: 600 .875rem/1 var(--head); letter-spacing: .14em; text-transform: uppercase; color: var(--soft); }
.ph-note { position: fixed; z-index: 70; left: 50%; transform: translateX(-50%); bottom: calc(14px + env(safe-area-inset-bottom, 0px)); width: max-content; max-width: calc(100% - 32px); padding: 9px 16px; border-radius: 999px; background: rgba(15, 34, 29, .9); color: var(--lichen); font: 500 .8125rem/1.35 var(--text); text-align: center; box-shadow: 0 10px 30px -12px rgba(0,0,0,.6); }
a[aria-disabled="true"] { cursor: default; }
</style>`;

const pagina = `<title>VR Nature Studio Preview</title>\n${fuentes}\n<link rel="stylesheet" href="assets/css/style.css">\n${extra}\n${aviso}${cuerpo.trim()}\n`;
fs.writeFileSync(path.join(OUT, 'index.html'), pagina);
fs.copyFileSync(path.join(R, 'assets', 'css', 'style.css'), path.join(OUT, 'assets', 'css', 'style.css'));
fs.writeFileSync(path.join(OUT, 'assets', 'js', 'main.js'), marcar(fs.readFileSync(path.join(R, 'assets', 'js', 'main.js'), 'utf8')));

// Solo las imágenes que la página usa (sin logo ni foto del fundador).
const usadas = [...new Set((pagina.match(/assets\/img\/[\w.-]+/g) || []))];
const files = { 'assets/css/style.css': 'produccion/preview/assets/css/style.css', 'assets/js/main.js': 'produccion/preview/assets/js/main.js' };
usadas.forEach((f) => { files[f] = f; });
fs.writeFileSync(path.join(OUT, 'files.json'), JSON.stringify(files, null, 1));

// Control: no debe quedar ningún dato de la marca real.
const resto = (pagina + fs.readFileSync(path.join(OUT, 'assets', 'js', 'main.js'), 'utf8')).match(/Lost Eagle|lost-eagle|Luke|Farrer|EagleVision|losteagle|Boston/gi);
console.log(resto ? 'OJO quedan datos de la marca: ' + [...new Set(resto)].join(', ') : 'sin datos de la marca');
console.log(Object.keys(files).length, 'archivos ->', OUT);
