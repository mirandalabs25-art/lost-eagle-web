#!/usr/bin/env node
// Después de cada corrección de la web, rehace todo lo que depende de ella, en un solo comando:
//   1) vista previa sin marca (produccion/preview + files.json con rutas completas para publicar)
//   2) prueba en escritorio y celular (errores y desborde) con probar.js
//   3) capturas para la propuesta (hero, globo, página completa, celular) y PDF en inglés y español
//   4) videos del recorrido (escritorio y celular)
//   5) ZIP de entrega con la web completa con marca
// Uso: node herramientas/regenerar-entregables.js [--sin-video]
// Después: publicar produccion/preview/index.html con produccion/preview/files-abs.json (mismo link) y hacer commit.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const R = path.resolve(__dirname, '..');
const HUB = path.resolve(R, '..', '..');
const PROBAR = path.join(HUB, '.claude', 'skills', 'efectos-web', 'probar.js');
const PROPUESTA = path.join(HUB, 'Obsidian', 'mayumi', 'proyectos', 'orbis-lost-eagle', 'propuesta-pdf');
const CAP = path.join(R, 'capturas');
const html = path.join(R, 'index.html');
const correr = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: 'utf8', cwd: HUB, ...opts });
const paso = (t) => console.log('\n— ' + t);

paso('1. Vista previa sin marca');
console.log(correr('node', [path.join(R, 'herramientas', 'preparar-preview.js')]).trim());
const files = JSON.parse(fs.readFileSync(path.join(R, 'produccion', 'preview', 'files.json'), 'utf8'));
const abs = Object.fromEntries(Object.entries(files).map(([k, v]) => [k, path.join(R, v)]));
fs.writeFileSync(path.join(R, 'produccion', 'preview', 'files-abs.json'), JSON.stringify(abs, null, 1));

paso('2 y 3. Prueba + capturas para la propuesta');
const ultimas = (out) => out.trim().split('\n').slice(-2).join(' | ');
console.log('escritorio:', ultimas(correr('node', [PROBAR, html, 'escritorio', '--puntos=14', '--conservar'])));
const py = `
from PIL import Image
C=r'${CAP}\\\\'; P=r'${path.join(PROPUESTA, 'img')}\\\\'
Image.open(C+'p0.png').convert('RGB').save(P+'web-hero.jpg',quality=86)
Image.open(C+'p3.png').convert('RGB').save(P+'web-globo.jpg',quality=86)
fr=[Image.open(C+f'p{i}.png').convert('RGB').resize((756,472)) for i in range(14)]
H=Image.new('RGB',(756,472*14),'white')
for k,f in enumerate(fr): H.paste(f,(0,472*k))
H.save(P+'web-completa.jpg',quality=72)`;
correr('python', ['-c', py]);
console.log('celular:', ultimas(correr('node', [PROBAR, html, 'movil', '--puntos=2', '--conservar'])));
correr('python', ['-c', `from PIL import Image\nim=Image.open(r'${path.join(CAP, 'p0.png')}').convert('RGB'); im=im.resize((im.width//2, im.height//2)); im.save(r'${path.join(PROPUESTA, 'img', 'web-movil.jpg')}',quality=86)`]);
correr('node', [path.join(PROPUESTA, 'imprimir.js'), '--no-abrir'], { cwd: PROPUESTA });
console.log('propuesta regenerada (EN y ES)');

if (!process.argv.includes('--sin-video')) {
  paso('4. Videos del recorrido');
  for (const modo of ['escritorio', 'movil']) console.log(modo + ':', correr('node', [PROBAR, html, modo, '--video']).trim().split('\n')[0]);
}

paso('5. ZIP de entrega (con marca)');
const fecha = new Date().toISOString().slice(0, 10);
correr('python', ['-c', `import zipfile,os
os.chdir(r'${R}')
z=zipfile.ZipFile(r'produccion/lost-eagle-web-${fecha}.zip','w',zipfile.ZIP_DEFLATED)
z.write('index.html','lost-eagle-web/index.html')
for r,ds,fs in os.walk('assets'):
    for f in fs: z.write(os.path.join(r,f), os.path.join('lost-eagle-web',r,f))
z.close()`]);
console.log(`produccion/lost-eagle-web-${fecha}.zip`);
console.log('\nListo. Falta: publicar la vista previa (mismo link) y hacer commit.');
