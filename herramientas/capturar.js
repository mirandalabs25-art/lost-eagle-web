// Captura páginas de la web local en un Chrome sin pantalla, emulando celular (390 px) o escritorio.
// Sin dependencias (Node 22+). `chrome --screenshot` no sirve para celular: no baja de ~500 px de ancho.
// Uso: SALIDA=carpeta node herramientas/capturar.js tour-collpa-chuncho-2-dias.html:movil index.html:escritorio
//   Agregar :completa para la página entera (si no, solo la primera pantalla).
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const RAIZ = path.resolve(__dirname, '..');
const SALIDA = path.resolve(process.env.SALIDA || path.join(RAIZ, 'produccion', 'capturas'));
fs.mkdirSync(SALIDA, { recursive: true });
const PUERTO = 9345;
const MODOS = {
  movil: { width: 390, height: 844, deviceScaleFactor: 2, mobile: true },
  escritorio: { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false },
};
const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'cap-'));
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--remote-debugging-port=' + PUERTO, '--user-data-dir=' + perfil,
  '--no-first-run', '--hide-scrollbars', 'about:blank'
], { stdio: 'ignore' });

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, id = 0; const pend = {};
function cmd(method, params = {}, tope = 30000) {
  return new Promise((res, rej) => {
    const i = ++id; pend[i] = { res, rej };
    ws.send(JSON.stringify({ id: i, method, params }));
    setTimeout(() => { if (pend[i]) { delete pend[i]; rej(new Error('tiempo: ' + method)); } }, tope);
  });
}
const ev = async (expr) => ((await cmd('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result || {}).value;

(async () => {
  let lista;
  for (let k = 0; k < 40; k++) {
    try { lista = await (await fetch(`http://127.0.0.1:${PUERTO}/json/list`)).json(); break; } catch (e) { await espera(250); }
  }
  ws = new WebSocket(lista.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  ws.addEventListener('message', (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pend[d.id]) { d.error ? pend[d.id].rej(new Error(d.error.message)) : pend[d.id].res(d.result); delete pend[d.id]; }
  });
  await cmd('Page.enable'); await cmd('Runtime.enable');

  for (const arg of process.argv.slice(2)) {
    const [pagina, modo = 'movil', completa] = arg.split(':');
    const m = MODOS[modo];
    await cmd('Emulation.setDeviceMetricsOverride', m);
    await cmd('Emulation.setTouchEmulationEnabled', { enabled: m.mobile });
    await cmd('Page.navigate', { url: 'file:///' + path.join(RAIZ, pagina).replace(/\\/g, '/') });
    for (let k = 0; k < 40; k++) { await espera(150); if (await ev('document.readyState') === 'complete') break; }
    await ev(`(async()=>{for(let y=0;y<document.documentElement.scrollHeight;y+=600){scrollTo(0,y);await new Promise(r=>setTimeout(r,60));}scrollTo(0,0);})()`);
    await espera(600);
    const ancho = await ev('document.documentElement.scrollWidth');
    // :y1800 = una pantalla a esa altura (con la página desplazada de verdad, para que corran los efectos de scroll).
    const y = completa && completa.startsWith('y') ? Number(completa.slice(1)) : 0;
    if (y) { await ev(`scrollTo(0, ${y})`); await espera(900); }
    const entera = completa === 'completa';
    const alto = entera ? Math.min(await ev('document.documentElement.scrollHeight'), 14000) : m.height;
    const shot = await cmd('Page.captureScreenshot', {
      format: 'jpeg', quality: 70, captureBeyondViewport: entera,
      clip: { x: 0, y: entera ? 0 : await ev('scrollY'), width: m.width, height: alto, scale: m.mobile ? 0.5 : 0.7 },
    }, 60000);
    const archivo = path.join(SALIDA, `${pagina.replace(/[\\/]/g, '_').replace('.html', '')}-${modo}${y ? '-y' + y : ''}.jpg`);
    fs.writeFileSync(archivo, Buffer.from(shot.data, 'base64'));
    console.log(ancho > m.width ? `OJO desborde horizontal (${ancho} px)` : 'ok', archivo);
  }
  ws.close(); chrome.kill(); process.exit(0);
})().catch((e) => { console.error(e); chrome.kill(); process.exit(1); });
