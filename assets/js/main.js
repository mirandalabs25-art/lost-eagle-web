/* Lost Eagle — one page. */

// Formulario → correo comercial. REVISAR: falta el correo y la clave del servicio de envío
// (Web3Forms o Formspree, a decidir). Mientras endpoint sea null, la página NO dice que se envió.
const FORMULARIO = {
  endpoint: null,      // p. ej. 'https://api.web3forms.com/submit'
  accessKey: null,     // clave pública del servicio, ligada al correo comercial
  asunto: 'New message from the Lost Eagle website'
};

// El visor: elegir un lugar cambia lo que muestran los dos lentes.
// Cuando lleguen los videos, cada botón lleva data-video y los dos lentes reproducen ese clip.
(function visor() {
  const buttons = document.querySelectorAll('.place');
  const lenses = document.querySelector('.lenses');
  const now = document.querySelector('.where__now strong');
  if (!buttons.length || !lenses) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function fill(btn) {
    lenses.querySelectorAll('.lens').forEach(lens => {
      const old = lens.querySelector('img, video');
      let el;
      if (btn.dataset.video) {
        el = document.createElement('video');
        Object.assign(el, { muted: true, loop: true, playsInline: true, autoplay: !reduce, preload: 'auto', poster: btn.dataset.img, src: btn.dataset.video });
      } else {
        el = document.createElement('img');
        el.src = btn.dataset.img; el.alt = '';
      }
      el.style.animation = 'none';
      old.replaceWith(el);
      if (el.play) el.play().catch(() => {});
    });
    now.textContent = btn.dataset.name;
    lenses.classList.remove('is-fading');
  }

  function show(btn) {
    if (btn.classList.contains('is-on')) return;
    buttons.forEach(b => { b.classList.toggle('is-on', b === btn); b.setAttribute('aria-pressed', String(b === btn)); });
    if (reduce) return fill(btn);
    lenses.classList.add('is-fading');
    setTimeout(() => fill(btn), 320);
  }
  buttons.forEach(b => b.addEventListener('click', () => show(b)));
  // Si el primer lugar ya tiene video, se pone al cargar.
  const first = document.querySelector('.place.is-on');
  if (first && first.dataset.video) fill(first);
  // Precarga liviana: las imágenes pesan 50-210 KB.
  addEventListener('load', () => buttons.forEach(b => { const i = new Image(); i.src = b.dataset.img; }));
})();

// Formulario.
(function form() {
  const f = document.getElementById('form');
  if (!f) return;
  const status = f.querySelector('.form__status');
  const say = (msg, kind) => { status.textContent = msg; status.className = 'form__status' + (kind ? ' is-' + kind : ''); };

  f.addEventListener('submit', async e => {
    e.preventDefault();
    if (f.website.value) return; // trampa para bots
    let bad = null;
    f.querySelectorAll('[required]').forEach(el => {
      const ok = el.type === 'email' ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()) : el.value.trim() !== '';
      el.setAttribute('aria-invalid', String(!ok));
      if (!ok && !bad) bad = el;
    });
    if (bad) {
      say(bad.type === 'email' ? 'Enter a valid email address so we can reply.' : 'Fill in your name, email and message.', 'error');
      bad.focus();
      return;
    }
    if (!FORMULARIO.endpoint) {
      say('[Preview] The form is not connected yet. Once it is, your message goes straight to the Lost Eagle commercial inbox.');
      return;
    }
    const btn = f.querySelector('button[type=submit]');
    btn.disabled = true; say('Sending…');
    try {
      const data = Object.fromEntries(new FormData(f));
      delete data.website;
      const r = await fetch(FORMULARIO.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ access_key: FORMULARIO.accessKey, subject: FORMULARIO.asunto, from_name: 'Lost Eagle website', ...data })
      });
      if (!r.ok) throw new Error(r.status);
      f.reset();
      say('Message sent. Our team will reply by email.', 'ok');
    } catch {
      say('Your message was not sent. Check your connection and try again.', 'error');
    } finally {
      btn.disabled = false;
    }
  });
})();
