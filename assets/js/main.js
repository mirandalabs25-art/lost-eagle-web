/* Lost Eagle — one page. */

// Formulario → correo comercial. REVISAR: falta el correo y la clave del servicio de envío
// (Web3Forms o Formspree, a decidir). Mientras endpoint sea null, la página NO dice que se envió.
const FORMULARIO = {
  endpoint: null,      // p. ej. 'https://api.web3forms.com/submit'
  accessKey: null,     // clave pública del servicio, ligada al correo comercial
  asunto: 'New message from the Lost Eagle website'
};

// Video real del hero: si data-video tiene ruta, reemplaza a la imagen (que queda como póster).
(function heroVideo() {
  const media = document.querySelector('.hero__media');
  const src = media && media.dataset.video;
  if (!src) return;
  const img = media.querySelector('img');
  const v = document.createElement('video');
  Object.assign(v, { muted: true, loop: true, playsInline: true, autoplay: true, preload: 'auto', poster: img.currentSrc || img.src });
  v.setAttribute('aria-hidden', 'true');
  v.src = src;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) v.autoplay = false;
  img.replaceWith(v);
  v.play().catch(() => {});
})();

// Atlas: elegir un lugar cambia la imagen.
(function atlas() {
  const buttons = document.querySelectorAll('.place');
  const img = document.querySelector('.viewer img');
  if (!buttons.length || !img) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  buttons.forEach(b => b.setAttribute('aria-pressed', b.classList.contains('is-active')));

  function show(btn) {
    if (btn.classList.contains('is-active')) return;
    buttons.forEach(b => { b.classList.toggle('is-active', b === btn); b.setAttribute('aria-pressed', b === btn); });
    const swap = () => { img.src = btn.dataset.img; img.alt = btn.dataset.alt; img.classList.remove('is-fading'); };
    if (reduce) return swap();
    img.classList.add('is-fading');
    setTimeout(swap, 300);
  }
  buttons.forEach(b => {
    b.addEventListener('click', () => show(b));
    b.addEventListener('mouseenter', () => { if (matchMedia('(hover: hover)').matches) show(b); });
  });
  // Precarga liviana: las imágenes del atlas pesan 50-210 KB.
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
