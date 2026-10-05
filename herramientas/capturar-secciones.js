#!/usr/bin/env node
// Saca una captura limpia y completa de CADA sección de la web (para la propuesta), en escritorio 1440 px.
// Usa ?captura (main.js): todo en su estado final, sin entradas animadas a medias.
// Salida: capturas/secciones/NN-nombre.png
// Uso: node herramientas/capturar-secciones.js
const path = require('path');
const fs = require('fs');
const HUB = path.resolve(__dirname, '..', '..', '..');
const { chromium } = require(path.join(HUB, '.claude', 'skills', 'efectos-web', 'vendor', 'node_modules', 'playwright-core'));
const R = path.resolve(__dirname, '..');
const OUT = path.join(R, 'capturas', 'secciones');
fs.mkdirSync(OUT, { recursive: true });
fs.readdirSync(OUT).forEach((f) => fs.rmSync(path.join(OUT, f)));
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const servidor = require('http').createServer((q, r) => {
  const f = path.join(R, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(R) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// [archivo, cómo capturarla]
const SECCIONES = [
  ['01-inicio', { vista: 0 }],
  ['02-lugares-globo', { centrar: '.place:nth-child(5)' }],   // Machu Picchu al frente
  ['03-mision', { elemento: '#mission' }],
  ['04-sin-huella', { elemento: '.eagle' }],
  ['05-proceso', { elemento: '#process' }],
  ['06-historia', { elemento: '#story' }],
  ['07-con-quien', { elemento: '.audience' }],
  ['08-preguntas', { elemento: '#faq' }],
  ['09-contacto-y-pie', { elementos: ['#contact', '.foot'] }],
];

(async () => {
  await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(`http://127.0.0.1:${servidor.address().port}/index.html?captura`, { waitUntil: 'load' });
  await espera(2000);
  // la cabecera flotante tapa el borde de arriba de cada sección: se oculta salvo en el inicio
  for (const [nombre, como] of SECCIONES) {
    const archivo = path.join(OUT, nombre + '.png');
    await page.evaluate((mostrar) => { document.getElementById('top-bar').style.visibility = mostrar ? '' : 'hidden'; }, !!(como.vista === 0 || como.centrar));
    if (como.vista === 0) {
      await page.evaluate(() => scrollTo(0, 0)); await espera(800);
      await page.screenshot({ path: archivo });
    } else if (como.centrar) {
      await page.evaluate((sel) => { const el = document.querySelector(sel); scrollTo(0, el.getBoundingClientRect().top + scrollY - innerHeight / 2 + el.offsetHeight / 2); }, como.centrar);
      await espera(2600);   // que el globo termine de girar
      await page.screenshot({ path: archivo });
    } else {
      const sels = como.elementos || [como.elemento];
      const partes = [];
      for (const [k, sel] of sels.entries()) {
        await page.locator(sel).scrollIntoViewIfNeeded(); await espera(700);
        const p = path.join(OUT, `_${k}.png`); await page.locator(sel).screenshot({ path: p }); partes.push(p);
      }
      if (partes.length === 1) fs.renameSync(partes[0], archivo);
      else {
        require('child_process').execFileSync('python', ['-c', `from PIL import Image\nims=[Image.open(p) for p in ${JSON.stringify(partes)}]\nH=Image.new('RGB',(max(i.width for i in ims),sum(i.height for i in ims)),'white')\ny=0\nfor i in ims:\n    H.paste(i,(0,y)); y+=i.height\nH.save(r'${archivo}')`]);
        partes.forEach((p) => fs.rmSync(p));
      }
    }
    console.log('ok', nombre);
  }
  await browser.close(); servidor.close();
})().catch((e) => { console.error(e); process.exit(1); });
