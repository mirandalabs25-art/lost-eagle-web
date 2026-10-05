/* Lost Eagle — one page v3: efectos de scroll. Sin GSAP o con movimiento reducido, la página se ve completa y quieta. */

// Formulario → correo comercial. REVISAR: falta el correo y la clave del servicio de envío
// (Web3Forms o Formspree, a decidir). Mientras endpoint sea null, la página NO dice que se envió.
const FORMULARIO = {
  endpoint: null,      // p. ej. 'https://api.web3forms.com/submit'
  accessKey: null,     // clave pública del servicio, ligada al correo comercial
  asunto: 'New message from the Lost Eagle website'
};

// ?captura → modo para sacar fotos de cada sección (propuesta): todo en su estado final, sin entradas animadas ni scroll suave.
const CAPTURA = new URLSearchParams(location.search).has('captura');
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (REDUCE || CAPTURA) document.documentElement.classList.add('no-anim');
const clamp01 = (v) => Math.min(1, Math.max(0, v));

// Video real del hero: si data-video tiene ruta, reemplaza a la imagen (que queda como póster).
(function heroVideo() {
  const hero = document.querySelector('.hero');
  const src = hero && hero.dataset.video;
  if (!src) return;
  const img = hero.querySelector('.hero__img');
  const v = document.createElement('video');
  Object.assign(v, { muted: true, loop: true, playsInline: true, autoplay: !REDUCE, preload: 'auto', poster: img.currentSrc || img.src, src });
  v.setAttribute('aria-hidden', 'true');
  img.replaceWith(v);
  v.play().catch(() => {});
})();

// Scroll suave (S03, Lenis) sincronizado con ScrollTrigger. Los enlaces internos usan el mismo scroll suave.
let lenis = null;
if (!REDUCE && !CAPTURA && window.Lenis) {
  lenis = new Lenis({ lerp: 0.1 });
  if (window.gsap && window.ScrollTrigger) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
}
document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  const id = a.getAttribute('href');
  if (id.length < 2) return;
  const el = document.querySelector(id);
  if (!el) return;
  e.preventDefault();
  const destino = id === '#inicio' ? 0 : el;
  if (lenis) lenis.scrollTo(destino, { offset: id.startsWith('#lugar-') ? -innerHeight * 0.3 : -80, duration: 1.4 });
  else if (destino === 0) scrollTo({ top: 0, behavior: REDUCE ? 'instant' : 'smooth' });
  else el.scrollIntoView({ behavior: REDUCE ? 'instant' : 'smooth' });
}));

// Misión: dividir en palabras para revelarlas con el scroll.
const words = (function splitWords() {
  const el = document.querySelector('.reveal-words');
  if (!el) return null;
  el.innerHTML = el.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
  return { el, list: el.querySelectorAll('.w') };
})();

// Proceso: la foto de la izquierda cambia según el paso (al pasar el mouse, tocar o enfocar un paso).
const processSection = document.querySelector('.process');
let elegido = false;
function setStep(i) {
  document.querySelectorAll('.step').forEach(s => s.classList.toggle('is-on', Number(s.dataset.step) === i));
  document.querySelectorAll('.process__media img').forEach((im, k) => im.classList.toggle('is-on', k === i));
}
document.querySelectorAll('.step').forEach(s => {
  const elegir = () => { elegido = true; setStep(Number(s.dataset.step)); };
  s.addEventListener('mouseenter', elegir); s.addEventListener('focus', elegir); s.addEventListener('click', elegir);
});

// Bucle de scroll: cabecera, titular del hero, desfile horizontal y palabras de la misión.
(function scrollLoop() {
  const top = document.getElementById('top-bar');
  const heroCopy = document.querySelector('.hero__copy');
  const lockup = document.querySelector('.hero__foot');
  const parade = document.querySelector('.parade');
  const pin = parade && parade.querySelector('.parade__pin');
  const track = parade && parade.querySelector('.parade__track');
  const bg = parade && parade.querySelector('.parade__bg');
  const gsec = document.querySelector('.globe'), gbg = gsec && gsec.querySelector('.globe__bg');
  let travel = 0;
  const measure = () => { if (track) travel = Math.max(0, track.scrollWidth - pin.clientWidth); };
  // Flechas del desfile: saltan a la tarjeta anterior o siguiente (el desfile depende del scroll vertical).
  if (parade) {
    const cards = track.querySelectorAll('.card');
    parade.querySelectorAll('.arrow').forEach(btn => btn.addEventListener('click', () => {
      const recorrido = parade.offsetHeight - innerHeight;
      const a = clamp01((scrollY - parade.offsetTop) / recorrido);
      const n = cards.length - 1;
      const i = Math.min(n, Math.max(0, Math.round(a * n) + Number(btn.dataset.dir)));
      scrollTo({ top: parade.offsetTop + (i / n) * recorrido + 1, behavior: REDUCE ? 'instant' : 'smooth' });
    }));
  }

  function frame() {
    const y = scrollY, vh = innerHeight;
    top.classList.toggle('is-solid', y > vh * 0.5);
    if (REDUCE) return;
    // El titular del hero se desvanece y sube al empezar a bajar.
    const h = clamp01(y / (vh * 0.7));
    heroCopy.style.opacity = String(1 - h);
    heroCopy.style.transform = `translate3d(0, ${-h * 60}px, 0)`;
    lockup.style.opacity = String(1 - h);
    // Desfile: el scroll vertical se vuelve avance horizontal; el fondo pasa de transparente a opaco.
    if (parade) {
      const recorrido = parade.offsetHeight - vh;
      const a = clamp01((y - parade.offsetTop) / recorrido);
      track.style.transform = `translate3d(${-a * travel}px, 0, 0)`;
      const entrada = clamp01((y - (parade.offsetTop - vh)) / vh); // mientras sube sobre la foto
      bg.style.setProperty('--op', String(Math.min(0.94, entrada * 0.35 + a * 1.4)));
    }
    // Globo: la sección sube sobre la foto fija y se oscurece mientras entra.
    if (gsec) gbg.style.setProperty('--op', String(Math.min(0.97, clamp01((y - (gsec.offsetTop - vh)) / vh) * 1.15)));
    // Proceso: al bajar por la sección, se enciende el paso 1, 2 y 3 (salvo que el visitante haya elegido uno).
    if (processSection && !elegido && !CAPTURA) {
      const r = processSection.getBoundingClientRect();
      const p = clamp01((vh * 0.75 - r.top) / (r.height * 0.9));
      setStep(Math.min(2, Math.floor(p * 3)));
    }
    // Misión: las palabras se encienden a medida que el párrafo cruza la pantalla.
    if (words) {
      const r = words.el.getBoundingClientRect();
      const p = clamp01((vh * 0.85 - r.top) / (r.height + vh * 0.35));
      const n = Math.round(p * words.list.length);
      words.list.forEach((w, i) => { w.style.opacity = i < n ? '1' : ''; });
    }
  }
  let pend = false;
  addEventListener('scroll', () => { if (!pend) { pend = true; requestAnimationFrame(() => { pend = false; frame(); }); } }, { passive: true });
  addEventListener('resize', () => { measure(); frame(); });
  addEventListener('load', () => { measure(); frame(); });
  measure(); frame();
})();

// GSAP: entrada del hero, parallax y apariciones. Se carga desde cdnjs; si no está, no pasa nada.
addEventListener('load', () => {
  const g = window.gsap, ST = window.ScrollTrigger;
  if (!g || !ST || REDUCE || CAPTURA) return;
  g.registerPlugin(ST);

  // Entrada: el titular sube línea por línea y la foto se asienta.
  g.from('.hero__img, .hero video', { scale: 1.14, duration: 2.6, ease: 'power2.out' });
  g.from('.hero h1 .line > span', { yPercent: 110, duration: 1.1, ease: 'power4.out', stagger: 0.12, delay: 0.15 });
  g.from('.hero__desc, .hero .btn, .hero__foot', { y: 24, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1, delay: 0.6 });
  g.from('.top > *', { y: -30, opacity: 0, duration: 0.8, ease: 'power3.out', delay: 0.4 });

  // Encabezado del globo y preguntas frecuentes: aparecen al entrar.
  g.from('.globe__head > *', { y: 50, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.1, scrollTrigger: { trigger: '.globe', start: 'top 80%' } });
  g.from('.faq__list details', { y: 24, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08, scrollTrigger: { trigger: '.faq', start: 'top 75%' } });

  // Los tres pasos de la misión: la imagen se abre como una cortina y se mueve más lento que la página.
  g.utils.toArray('.beats__img').forEach(box => {
    g.from(box, { clipPath: 'inset(100% 0 0 0 round 18px)', duration: 1.3, ease: 'power3.inOut', scrollTrigger: { trigger: box, start: 'top 85%' } });
    g.fromTo(box.querySelector('img'), { yPercent: -12 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: box, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  g.from('.mission__big', { y: 60, opacity: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: '.mission__big', start: 'top 85%' } });

  // Águila: parallax de la foto y titular que sube.
  g.fromTo('.eagle__img', { yPercent: -10 }, { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.eagle', start: 'top bottom', end: 'bottom top', scrub: true } });
  g.from('.eagle__copy > *', { y: 70, opacity: 0, duration: 1.2, ease: 'power3.out', stagger: 0.12, scrollTrigger: { trigger: '.eagle', start: 'top 60%' } });

  // Historia: la línea de tiempo se dibuja con el scroll.
  const tl = document.querySelector('.timeline');
  g.fromTo(tl, { '--draw': 0 }, { '--draw': 1, ease: 'none', scrollTrigger: { trigger: tl, start: 'top 70%', end: 'bottom 60%', scrub: true } });
  g.from('.timeline li', { x: 40, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.15, scrollTrigger: { trigger: tl, start: 'top 75%' } });
  g.from('.founder', { y: 60, opacity: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.founder', start: 'top 90%' } });

  // Públicos y formas de verlo.
  g.from('.audience__list > div', { y: 30, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.1, scrollTrigger: { trigger: '.audience__list', start: 'top 80%' } });
  g.from('.ways figure', { y: 40, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.15, scrollTrigger: { trigger: '.ways', start: 'top 85%' } });

  // Contacto: la foto de fondo se mueve lento.
  g.fromTo('.contact__bg', { yPercent: -8, scale: 1.1 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'bottom top', scrub: true } });
});

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
