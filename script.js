// Nav scroll state
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('nav--scrolled', window.scrollY > 40);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Mobile menu
const burger = document.getElementById('burger');
const mobileMenu = document.getElementById('mobileMenu');
const setMenu = open => {
  burger.classList.toggle('open', open);
  mobileMenu.classList.toggle('open', open);
  document.body.classList.toggle('menu-open', open);
};
burger.addEventListener('click', () => setMenu(!mobileMenu.classList.contains('open')));
mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
window.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
window.addEventListener('resize', () => { if (window.innerWidth > 820) setMenu(false); });

// Reveal on scroll
const revealObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
);
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// Animated stat counters
const formatNum = n => n.toLocaleString('en-US');
const countObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.count, 10);
      const duration = 1600;
      const start = performance.now();
      const tick = now => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = formatNum(Math.round(target * eased));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      countObserver.unobserve(el);
    });
  },
  { threshold: 0.6 }
);
document.querySelectorAll('.stat__num').forEach(el => countObserver.observe(el));

// ---------- spray paint wall ----------
(() => {
  const canvas = document.getElementById('spray');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  const MOBILE = matchMedia('(max-width: 700px)').matches;

  let W = 0, H = 0;
  const resize = () => {
    W = canvas.width = Math.round(innerWidth * DPR);
    H = canvas.height = Math.round(innerHeight * DPR);
  };
  resize();
  window.addEventListener('resize', resize);

  const WORDS = [
    'KLMHONOS', 'KALOVEL', 'GHOUL', '#GHOULTAPE', '5ORROW', 'WASTED',
    'TROOPZ', 'SIT N PRAY', 'NEVER LEARN', 'KLM', 'THIS LOVE', 'TOO GONE',
    'LOBOTOMY', 'ROKKSTAR', 'AUGUST 10', 'SILHOUETTE', 'PRAY',
    '✞', '☠', '✕', '★', '☠', '✞'
  ];
  const pickColor = () => Math.random() < 0.65 ? '233,229,218' : '217,43,28';
  const gauss = () => (Math.random() + Math.random() + Math.random()) / 1.5 - 1;

  const jobs = [];
  const MAX_JOBS = 3;
  const CAP = MOBILE ? 4 : 7;      // max tags visible on the wall at once
  const TAG_LIFE = 50000;          // ms a tag counts as "live" before it fades away
  const live = [];                 // spawn timestamps of tags still on the wall

  const makeJob = () => {
    const word = WORDS[(Math.random() * WORDS.length) | 0];
    const isSymbol = word.length <= 2 && !/[A-Z0-9#]/i.test(word);
    const fs = (MOBILE ? 36 : 54) * (0.85 + Math.random()) * (isSymbol ? 1.7 : 1) * DPR;
    const off = document.createElement('canvas');
    const octx = off.getContext('2d');
    octx.font = `${fs}px Anton, sans-serif`;
    const tw = Math.ceil(octx.measureText(word).width + fs * 0.4);
    const th = Math.ceil(fs * 1.3);
    off.width = tw; off.height = th;
    octx.font = `${fs}px Anton, sans-serif`;
    octx.textBaseline = 'middle';
    octx.fillStyle = '#fff';
    octx.fillText(word, fs * 0.2, th / 2);

    const img = octx.getImageData(0, 0, tw, th).data;
    const step = Math.max(2, Math.round((MOBILE ? 3 : 2.2) * DPR));
    const pts = [];
    for (let y = 0; y < th; y += step)
      for (let x = 0; x < tw; x += step)
        if (img[(y * tw + x) * 4 + 3] > 90) pts.push(y * tw + x);
    for (let i = pts.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const t = pts[i]; pts[i] = pts[j]; pts[j] = t;
    }

    const drips = [];
    if (!REDUCED && Math.random() < 0.55) {
      const n = 1 + (Math.random() * 3 | 0);
      for (let i = 0; i < n; i++)
        drips.push({ x: Math.random() * tw, y: th * 0.55, len: 0, max: (10 + Math.random() * 22) * DPR });
    }

    jobs.push({
      pts, i: 0, tw, th,
      x: Math.random() * W - tw * 0.5,
      y: Math.random() * H - th * 0.5,
      rot: (Math.random() - 0.5) * (Math.random() < 0.25 ? 0.9 : 0.3),
      color: pickColor(),
      drips,
      done: false
    });
    live.push(performance.now());
  };

  const frame = () => {
    // slow fade so the wall never saturates
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,0.0007)';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';

    for (const job of jobs) {
      ctx.save();
      ctx.translate(job.x + job.tw / 2, job.y + job.th / 2);
      ctx.rotate(job.rot);
      ctx.translate(-job.tw / 2, -job.th / 2);

      if (job.i < job.pts.length) {
        const n = REDUCED
          ? job.pts.length - job.i
          : Math.min(Math.max(25, job.pts.length / 45), job.pts.length - job.i);
        for (let k = 0; k < n; k++) {
          const p = job.pts[job.i++];
          const px = p % job.tw, py = (p / job.tw) | 0;
          ctx.fillStyle = `rgba(${job.color},${0.09 + Math.random() * 0.14})`;
          for (let d = 0; d < 8; d++) {
            const a = Math.random() * Math.PI * 2;
            const r = Math.abs(gauss()) * 4 * DPR;
            ctx.beginPath();
            ctx.arc(px + Math.cos(a) * r, py + Math.sin(a) * r,
              (0.4 + Math.random() * 0.9) * DPR, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        // overspray halo
        for (let s = 0; s < 7; s++) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.abs(gauss());
          ctx.fillStyle = `rgba(${job.color},${0.05 + Math.random() * 0.06})`;
          ctx.beginPath();
          ctx.arc(job.tw / 2 + Math.cos(a) * r * job.tw * 0.7,
                  job.th / 2 + Math.sin(a) * r * job.th,
                  Math.random() * 1.4 * DPR, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (job.drips.length) {
        // drips run for a few frames after the word is done
        let alive = false;
        for (const dr of job.drips) {
          if (dr.len >= dr.max) continue;
          alive = true;
          dr.len += 3 + Math.random() * 5;
          ctx.fillStyle = `rgba(${job.color},${0.08 + Math.random() * 0.1})`;
          ctx.beginPath();
          ctx.arc(dr.x + gauss() * DPR, dr.y + dr.len, Math.random() * 1.2 * DPR, 0, Math.PI * 2);
          ctx.fill();
        }
        if (!alive) job.done = true;
      } else {
        job.done = true;
      }
      ctx.restore();
    }

    for (let i = jobs.length - 1; i >= 0; i--) if (jobs[i].done) jobs.splice(i, 1);
    requestAnimationFrame(frame);
  };

  const spawn = () => {
    const now = performance.now();
    while (live.length && now - live[0] > TAG_LIFE) live.shift();
    try { if (live.length < CAP && jobs.length < MAX_JOBS) makeJob(); } catch (e) { /* skip tag */ }
    setTimeout(spawn, 1800 + Math.random() * 2800);
  };

  const boot = () => {
    try { makeJob(); } catch (e) { /* skip tag */ }
    setTimeout(() => { try { makeJob(); } catch (e) {} }, 700);
    setTimeout(spawn, 2500);
    requestAnimationFrame(frame);
  };

  setTimeout(boot, 500);
})();

