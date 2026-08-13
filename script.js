/* ═══════════════════════════════════════════════════════════
   MANAV PATIDAR — Portfolio engine
   Zero dependencies. Canvas scroll engine with rAF + lerp.

   Frame mode:    drops numbered JPGs into /frames/ (frame_0001.jpg
                  ... frame_1200.jpg, or frames/manifest.json with
                  { "frames": ["frame_0001.jpg", ...] }).
   Fallback mode: procedural 3D neon-galaxy flythrough so the site
                  is fully alive even with no frames present.
   ═══════════════════════════════════════════════════════════ */
(() => {
  "use strict";

  const canvas = document.getElementById("scene");
  const ctx = canvas.getContext("2d", { alpha: false });

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  const MAGENTA = "#ff2d78";
  const CRIMSON = "#ff1f3d";
  const VIOLET = "#8b5cf6";
  const WHITE = "#ffffff";

  /* ───────────────────────── state ───────────────────────── */

  let vw = 0, vh = 0, dpr = 1;
  let target = 0, current = 0;        // scroll progress 0..1 (raw vs lerped)
  let time = 0;                       // animation clock (seconds)
  let frames = [];
  let frameMode = false;
  let points = [];                    // galaxy particles
  let sprites = {};                   // glow sprites by color
  let bgGrad = null;
  let ready = false;

  /* ───────────────────────── helpers ───────────────────────── */

  function rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  function makeGlow(color, size = 96) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, color);
    grad.addColorStop(0.3, rgba(color, 0.5));
    grad.addColorStop(0.7, rgba(color, 0.12));
    grad.addColorStop(1, rgba(color, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    return c;
  }

  /* ───────────────────────── canvas sizing ───────────────────────── */

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    vw = window.innerWidth;
    vh = window.innerHeight;
    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const g = ctx.createLinearGradient(0, 0, 0, vh);
    g.addColorStop(0, "#060609");
    g.addColorStop(0.55, "#0a0a12");
    g.addColorStop(1, "#08080d");
    bgGrad = g;
  }

  /* ───────────────────────── frame sequence loader ───────────────────────── */

  function loadImage(url) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => rej(new Error(url));
      img.src = url;
    });
  }

  function probe(url) {
    return new Promise((res) => {
      const img = new Image();
      img.onload = () => res(true);
      img.onerror = () => res(false);
      img.src = url;
    });
  }

  const loaderSub = document.getElementById("loaderSub");
  function reportFrames(loaded, total) {
    if (loaderSub) loaderSub.textContent = `RENDERING FRAMES ${loaded}/${total}`;
  }

  async function loadFrames() {
    // 1) optional manifest — exact frame order, any names
    try {
      const man = await (await fetch("frames/manifest.json", { cache: "no-store" })).json();
      if (Array.isArray(man.frames) && man.frames.length) {
        const urls = man.frames.map((f) => "frames/" + f.replace(/^\/+/, ""));
        await Promise.all(urls.map(async (u) => {
          try { frames.push(await loadImage(u)); reportFrames(frames.length, urls.length); } catch (e) { /* skip */ }
        }));
        return frames.length > 0;
      }
    } catch (e) { /* no manifest */ }

    // 2) probe a numbered sequence: frame_0001.jpg … (stops after 5 misses)
    const urls = [];
    let misses = 0;
    for (let i = 1; i <= 4000 && misses < 5 && urls.length < 1200; i++) {
      const u = "frames/frame_" + String(i).padStart(4, "0") + ".jpg";
      if (await probe(u)) { urls.push(u); misses = 0; }
      else misses++;
    }
    if (!urls.length) return false;

    await Promise.all(urls.map(async (u) => {
      try { frames.push(await loadImage(u)); reportFrames(frames.length, urls.length); } catch (e) { /* skip */ }
    }));
    return frames.length > 0;
  }

  /* ───────────────────────── procedural galaxy (fallback) ───────────────────────── */

  function buildGalaxy() {
    const R = 5.2;
    const count = vw < 700 ? 1400 : reduceMotion ? 1000 : 2100;
    points = [];
    for (let i = 0; i < count; i++) {
      const isDust = Math.random() < 0.06;
      const arm = Math.random() < 0.5 ? 0 : Math.PI;
      const r = isDust ? Math.random() * 13 : Math.pow(Math.random(), 0.6) * R;
      const t = arm + r * 1.05 + (Math.random() - 0.5) * (isDust ? 2.4 : 0.55);
      const x = Math.cos(t) * r;
      const z = Math.sin(t) * r;
      const y = (Math.random() - 0.5) * (isDust ? 6 : 1.05 * Math.max(0.12, 1 - (r / R) * 0.65));
      const size = isDust ? 0.5 + Math.random() * 0.7 : 0.7 + Math.random() * 1.5;

      let c;
      if (isDust) c = WHITE;
      else {
        const p = r / R;
        if (p < 0.25) c = Math.random() < 0.6 ? WHITE : VIOLET;
        else if (p < 0.55) c = Math.random() < 0.55 ? VIOLET : MAGENTA;
        else c = Math.random() < 0.5 ? MAGENTA : CRIMSON;
      }
      points.push({ x, y, z, size, c, tw: Math.random() * Math.PI * 2, dust: isDust });
    }
  }

  function renderFallback(p, dt) {
    if (!reduceMotion) time += dt;
    const t = time;

    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, vw, vh);

    const cx = vw / 2;
    const cy = vh / 2;
    const baseScale = Math.min(vw, vh) * 0.5;
    const f = 3.4;

    // camera — orbit + dolly driven by scroll progress
    const camZ = 14 - p * 11.5;                       // 14 → 2.5 (dive into the core)
    const rotY = p * 0.85 + t * 0.02;
    const rotX = -0.42 + p * 0.18 + Math.sin(t * 0.11) * 0.03;
    const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
    const cosX = Math.cos(rotX), sinX = Math.sin(rotX);

    ctx.globalCompositeOperation = "lighter";

    // ambient nebula blobs (screen-space, additive)
    const blobs = [
      { x: 0.2 + Math.sin(t * 0.05) * 0.03, y: 0.28, r: 0.46, c: rgba(MAGENTA, 0.13) },
      { x: 0.8, y: 0.6 + Math.cos(t * 0.04) * 0.03, r: 0.5, c: rgba(VIOLET, 0.12) },
      { x: 0.55, y: 0.88, r: 0.42, c: rgba(CRIMSON, 0.1) },
    ];
    for (const b of blobs) {
      const g = ctx.createRadialGradient(vw * b.x, vh * b.y, 0, vw * b.x, vh * b.y, vw * b.r);
      g.addColorStop(0, b.c);
      g.addColorStop(1, rgba(MAGENTA, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, vw, vh);
    }

    // project + depth-sort
    const proj = [];
    for (const pt of points) {
      const x1 = pt.x * cosY + pt.z * sinY;
      const z1 = -pt.x * sinY + pt.z * cosY;
      const y1 = pt.y * cosX - z1 * sinX;
      const z2 = pt.y * sinX + z1 * cosX;
      const dz = camZ - z2;
      if (dz < 0.15) continue;
      const s = f / dz;
      proj.push({ px: cx + x1 * s * baseScale, py: cy + y1 * s * baseScale, s, pt });
    }
    proj.sort((a, b) => a.s - b.s); // far → near

    for (const it of proj) {
      if (it.px < -90 || it.px > vw + 90 || it.py < -90 || it.py > vh + 90) continue;
      const depthFade = Math.min(1, Math.max(0, (it.s - 0.12) / 1.1));
      const twinkle = reduceMotion ? 1 : 0.72 + 0.28 * Math.sin(t * 2.2 + it.pt.tw);
      const alpha = depthFade * twinkle * (it.pt.dust ? 0.32 : 0.85);
      const d = it.pt.size * it.s * 15;
      ctx.globalAlpha = alpha;
      ctx.drawImage(it.pt.sprite || sprites[it.pt.c], it.px - d, it.py - d, d * 2, d * 2);
    }
    ctx.globalAlpha = 1;

    // core glow — swells as the camera dives in
    const coreD = baseScale * 0.62 * (f / Math.max(0.6, camZ));
    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreD);
    cg.addColorStop(0, rgba(WHITE, 0.5));
    cg.addColorStop(0.25, rgba(MAGENTA, 0.34));
    cg.addColorStop(0.6, rgba(VIOLET, 0.14));
    cg.addColorStop(1, rgba(MAGENTA, 0));
    ctx.fillStyle = cg;
    ctx.fillRect(cx - coreD, cy - coreD, coreD * 2, coreD * 2);

    ctx.globalCompositeOperation = "source-over";
  }

  /* ───────────────────────── frame rendering (image sequence) ───────────────────────── */

  function renderFrame(p) {
    if (!frames.length) return;
    const idx = Math.min(frames.length - 1, Math.round(p * (frames.length - 1)));
    const img = frames[idx];
    if (!img || !img.naturalWidth) return;

    // subtle Ken Burns zoom across the sequence
    const zoom = 1 + 0.05 * p;
    const scale = Math.max(vw / (img.width * zoom), vh / (img.height * zoom));
    const w = img.width * zoom * scale;
    const h = img.height * zoom * scale;
    ctx.fillStyle = "#07070b";
    ctx.fillRect(0, 0, vw, vh);
    ctx.drawImage(img, (vw - w) / 2, (vh - h) / 2, w, h);
  }

  /* ───────────────────────── main loop ───────────────────────── */

  let last = performance.now();

  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    // progress: 0 at top, 1 at the very bottom of the document
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    target = Math.min(1, Math.max(0, window.scrollY / maxScroll));

    // exponential lerp — framerate independent, ultra smooth
    current += (target - current) * (1 - Math.exp(-6.5 * dt));
    if (Math.abs(target - current) < 0.00005) current = target;

    if (frameMode) renderFrame(current);
    else renderFallback(current, dt);

    updateCursorGlow();
    requestAnimationFrame(tick);
  }

  /* ───────────────────────── cursor glow ───────────────────────── */

  const glow = document.getElementById("cursorGlow");
  let mx = window.innerWidth / 2, my = window.innerHeight / 2, gx = mx, gy = my;

  function updateCursorGlow() {
    if (!finePointer || reduceMotion) return;
    gx += (mx - gx) * 0.085;
    gy += (my - gy) * 0.085;
    glow.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
  }

  /* ───────────────────────── nav / UI ───────────────────────── */

  const nav = document.getElementById("nav");
  const ham = document.getElementById("hamburger");
  const navLinks = document.getElementById("navLinks");
  const toTop = document.getElementById("toTop");

  window.addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", window.scrollY > 30);
    toTop.classList.toggle("show", window.scrollY > 480);
  }, { passive: true });

  ham.addEventListener("click", () => {
    const open = nav.classList.toggle("menu-open");
    ham.setAttribute("aria-expanded", String(open));
  });
  navLinks.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => nav.classList.remove("menu-open"))
  );

  toTop.addEventListener("click", () =>
    window.scrollTo({ top: 0, behavior: "smooth" })
  );

  // active section highlighting
  const sections = ["hero", "about", "skills", "projects", "education", "contact"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  const links = Array.from(navLinks.querySelectorAll("a"));
  const sectIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        links.forEach((l) =>
          l.classList.toggle("active", l.getAttribute("href") === "#" + en.target.id)
        );
      }
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  sections.forEach((s) => sectIO.observe(s));

  // loader — then fire scroll-reveal so hero animations play after the fade
  const hideLoader = () => document.body.classList.add("loaded");
  window.addEventListener("load", () => setTimeout(hideLoader, 400));
  setTimeout(hideLoader, 3200); // safety net

  // scroll reveal
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add("visible");
        revealIO.unobserve(en.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -7% 0px" });
  const initReveals = () => {
    const els = document.querySelectorAll(".reveal");
    els.forEach((el) => revealIO.observe(el));
    // safety: anything already inside the viewport must never stay hidden
    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("visible");
    });
  };
  window.addEventListener("load", () => setTimeout(initReveals, 650));
  setTimeout(initReveals, 3600); // safety net

  /* ───────────────────────── init ───────────────────────── */

  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });

  resize();
  buildGalaxy();

  // attach glow sprites to particles
  sprites = {
    [MAGENTA]: makeGlow(MAGENTA),
    [CRIMSON]: makeGlow(CRIMSON),
    [VIOLET]: makeGlow(VIOLET),
    [WHITE]: makeGlow(WHITE),
  };
  points.forEach((pt) => { pt.sprite = sprites[pt.c]; });

  // try to load the frame sequence — falls back to the galaxy when absent
  loadFrames().then((ok) => {
    frameMode = ok;
    if (ok) {
      resize();
      // recompute scroll range once fonts/images settle layout
      requestAnimationFrame(() => requestAnimationFrame(() => {}));
    }
  });

  requestAnimationFrame(tick);
})();
