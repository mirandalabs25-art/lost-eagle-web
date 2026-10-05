// Graba un video del recorrido de la página bajando con el scroll (para verla en el celular con sus efectos).
// Sin dependencias (Node 22+) + ffmpeg. Abre la página UNA vez, baja de a poco, saca un cuadro por paso y arma el mp4.
// Uso: node herramientas/grabar-scroll.js movil|escritorio   → produccion/recorrido-<modo>.mp4
const { spawn, execFileSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const RAIZ = path.resolve(__dirname, '..');
const MODO = process.argv[2] || 'movil';
const MODOS = {
  movil: { width: 390, height: 844, deviceScaleFactor: 2, mobile: true, paso: 26, escala: 1 },
  escritorio: { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false, paso: 30, escala: 1 },
};
const m = MODOS[MODO];
const FFMPEG = 'C:/ffmpeg/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe';
const CUADROS = fs.mkdtempSync(path.join(os.tmpdir(), 'rec-'));
const SALIDA = path.join(RAIZ, 'produccion', `recorrido-${MODO}.mp4`);
const PUERTO = 9346;
const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'recp-'));
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
  ws.addEventListener('message', (msg) => {
    const d = JSON.parse(msg.data);
    if (d.id && pend[d.id]) { d.error ? pend[d.id].rej(new Error(d.error.message)) : pend[d.id].res(d.result); delete pend[d.id]; }
  });
  await cmd('Page.enable'); await cmd('Runtime.enable');
  await cmd('Emulation.setDeviceMetricsOverride', { width: m.width, height: m.height, deviceScaleFactor: m.deviceScaleFactor, mobile: m.mobile });
  await cmd('Emulation.setTouchEmulationEnabled', { enabled: m.mobile });
  await cmd('Page.navigate', { url: 'file:///' + path.join(RAIZ, 'index.html').replace(/\\/g, '/') });
  for (let k = 0; k < 40; k++) { await espera(150); if (await ev('document.readyState') === 'complete') break; }

  let n = 0;
  const cuadro = async () => {
    const shot = await cmd('Page.captureScreenshot', { format: 'jpeg', quality: 80, clip: { x: 0, y: await ev('scrollY'), width: m.width, height: m.height, scale: m.mobile ? 0.5 : 0.75 } });
    fs.writeFileSync(path.join(CUADROS, `f${String(n++).padStart(5, '0')}.jpg`), Buffer.from(shot.data, 'base64'));
  };
  // 1) La entrada del hero (2,5 s).
  for (let k = 0; k < 30; k++) { await cuadro(); await espera(70); }
  // 2) Bajar de a poco hasta el final; pausa corta en cada paso para que corran las animaciones.
  const alto = await ev('document.documentElement.scrollHeight') - m.height;
  for (let y = 0; y <= alto; y += m.paso) {
    await ev(`scrollTo(0, ${y})`);
    await espera(40);
    await cuadro();
  }
  for (let k = 0; k < 15; k++) { await cuadro(); await espera(70); }
  ws.close(); chrome.kill();

  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-framerate', '24', '-i', path.join(CUADROS, 'f%05d.jpg'),
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', '-movflags', '+faststart', SALIDA]);
  fs.rmSync(CUADROS, { recursive: true, force: true });
  console.log('ok', SALIDA, n, 'cuadros');
  process.exit(0);
})().catch((e) => { console.error(e); chrome.kill(); process.exit(1); });
