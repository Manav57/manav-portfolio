/* Verification for the manav-portfolio rework.
   Drives real Chrome: scroll depths, pin behavior, console errors, content checks. */
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const BASE = "http://localhost:8080/";
const OUT = "C:/Users/mp701/Downloads/portfolio-verify";
fs.mkdirSync(OUT, { recursive: true });

const CHROME =
  process.env.CHROME_PATH ||
  "C:/Program Files/Google/Chrome/Application/chrome.exe";

const PROJECT_HREFS = [
  "https://github.com/Manav57/-Multimodal-Human-Computer-Interaction-System-Using-Eye-Tracking-and-Voice-Commands",
  "https://github.com/Manav57/ai-stock-finder",
  "https://github.com/Manav57/complaint-system",
  "https://github.com/Manav57/J.A.R.V.I.S-Mk85-Python",
  "https://github.com/Manav57/Vision-Based-Intelligent-Touchless-Interface-for-Smart-Systems",
];

const CONTACT_HREFS = [
  "https://github.com/Manav57",
  "https://www.linkedin.com/in/manav-patidar-44956a312/",
  "mailto:manavpatidar2311@gmail.com",
  "tel:+917697177471",
];

let failures = [];
let warnings = [];

function check(name, ok, extra) {
  const tag = ok ? "PASS" : "FAIL";
  console.log(`[${tag}] ${name}${extra ? " — " + extra : ""}`);
  if (!ok) failures.push(name);
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name) });
}

async function scrollTo(page, y) {
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await new Promise((r) => setTimeout(r, 700)); // let scrub + pin settle
}

async function stateAt(page) {
  return page.evaluate(() => {
    const portrait = document.querySelector(".portrait-frame");
    const heroCopy = document.querySelector(".hero-copy");
    const tint = document.getElementById("sectionTint");
    const about = document.getElementById("about");
    const p = portrait.getBoundingClientRect();
    const aboutR = about.getBoundingClientRect();
    // what element actually paints on top at the portrait's center?
    const topEl = document.elementFromPoint(p.left + p.width / 2, p.top + p.height / 2);
    const topInsideAbout = !!topEl && (topEl.id === "about" || !!topEl.closest("#about"));
    return {
      y: window.scrollY,
      portraitPos: getComputedStyle(portrait).position,
      portraitTop: Math.round(p.top),
      portraitBottom: Math.round(p.bottom),
      portraitOpacity: getComputedStyle(portrait).opacity,
      portraitTransform: getComputedStyle(portrait).transform,
      copyOpacity: heroCopy ? getComputedStyle(heroCopy).opacity : null,
      aboutTop: Math.round(aboutR.top),
      topInsideAbout,
      scrollW: document.documentElement.scrollWidth,
      innerW: window.innerWidth,
      tintBg: tint ? getComputedStyle(tint).backgroundImage : null,
    };
  });
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });

  /* ───────────── 1. DESKTOP INDEX ───────────── */
  console.log("\n===== DESKTOP index.html (1280x800) =====");
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("response", (r) => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`); });

  await page.goto(BASE + "index.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction(() => document.body.classList.contains("loaded"), { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 1200)); // reveals + ScrollTrigger refresh

  check("GSAP + ScrollTrigger loaded", await page.evaluate(() => !!window.gsap && !!window.ScrollTrigger));

  const bodyText = await page.evaluate(() => document.body.innerText);
  check("no 'Full Stack' text", !/full[\s-]*stack/i.test(bodyText));
  check("no 'Creative Director' text", !/creative director/i.test(bodyText));
  check("no consultation/revenue text", !/consultation|estimated annual revenue|biggest challenge/i.test(bodyText));
  check("no <form> in DOM", !(await page.evaluate(() => !!document.querySelector("form"))));

  const hrefs = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".work-card")).map((a) => a.getAttribute("href"))
  );
  check("5 work cards", hrefs.length === 5, `got ${hrefs.length}`);
  const hrefMatch = PROJECT_HREFS.every((h, i) => hrefs[i] === h);
  check("work card hrefs match real repos, in order", hrefMatch);
  const externalOk = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".work-card")).every((a) => a.target === "_blank" && a.rel === "noopener")
  );
  check("work cards open in new tab (noopener)", externalOk);

  const cHrefs = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".contact-btn")).map((a) => a.getAttribute("href"))
  );
  check("4 contact buttons", cHrefs.length === 4, `got ${cHrefs.length}`);
  check("contact button hrefs correct", CONTACT_HREFS.every((h, i) => cHrefs[i] === h));

  const portrait = await page.evaluate(() => {
    const img = document.querySelector(".portrait-frame img");
    return img ? { src: img.getAttribute("src"), w: img.naturalWidth, h: img.naturalHeight } : null;
  });
  check("portrait loaded from assets", !!portrait && portrait.w > 0, JSON.stringify(portrait));

  /* scroll depths — cover the pin (≈1.3×vh) and beyond */
  const depths = [0, 300, 600, 900, 1200, 1600, 2000];
  const snapshots = [];
  for (const d of depths) {
    await scrollTo(page, d);
    const s = await stateAt(page);
    snapshots.push(s);
    await shot(page, `index_desktop_${d}.png`);
    console.log(`  scrollY=${s.y} portrait=${s.portraitPos} pTop=${s.portraitTop} pOp=${s.portraitOpacity} aboutTop=${s.aboutTop} over=${s.topInsideAbout} xOverflow=${s.scrollW > s.innerW + 1 ? "YES" : "no"}`);
  }

  // pin assertions across the sequence
  const sStart = snapshots[1];   // 300: pin active, About not covering yet
  const sMid = snapshots[2];     // 600: pin active, About sliding over the portrait
  const sLate = snapshots[4];    // 1200: near/after pin end, portrait dimmed
  check("portrait pinned (fixed) during scroll", sStart.portraitPos === "fixed", sStart.portraitPos);
  // while pinned the portrait must not scroll away with the page — it stays on
  // screen (its animated settle moves it only a few px, never off the viewport)
  check("portrait stays in the viewport while pinned", sMid.portraitTop >= 0 && sMid.portraitBottom <= 800, `top ${sStart.portraitTop} → ${sMid.portraitTop} (scrollY ${sStart.y} → ${sMid.y})`);
  check("About slides over the still-pinned portrait", sMid.aboutTop < sMid.portraitBottom && sMid.aboutTop > sMid.portraitTop - 400, `aboutTop=${sMid.aboutTop} pBottom=${sMid.portraitBottom}`);
  check("About paints on top of the pinned portrait", sMid.topInsideAbout);
  check("hero copy fades out during pin", parseFloat(sMid.copyOpacity) < 0.5, `op=${sMid.copyOpacity}`);
  check("portrait scaled during pin", sMid.portraitTransform && sMid.portraitTransform !== "none" && !sMid.portraitTransform.includes("matrix(1, 0, 0, 1, 0, 0)"), sMid.portraitTransform);
  check("portrait dimmed by end of pin", parseFloat(sLate.portraitOpacity) < 0.8, `op=${sLate.portraitOpacity}`);
  check("tint differs between early and late scroll", snapshots[1].tintBg !== snapshots[3].tintBg, snapshots[3].tintBg);
  check("tint gradient set while scrolling", !!snapshots[3].tintBg && snapshots[3].tintBg !== "none", snapshots[3].tintBg);
  check("no horizontal overflow at any depth", snapshots.every((s) => s.scrollW <= s.innerW + 1));

  // contact section reveal
  await scrollTo(page, await page.evaluate(() => document.getElementById("contact").offsetTop - 200));
  const contactVisible = await page.evaluate(() =>
    Array.from(document.querySelectorAll("#contact .reveal")).every((el) => el.classList.contains("visible"))
  );
  check("contact reveals fired", contactVisible);
  await shot(page, "index_desktop_contact.png");

  // full page screenshot
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(OUT, "index_desktop_full.png"), fullPage: true });

  check("no console errors (desktop)", errors.length === 0, errors.slice(0, 5).join(" | ") || "clean");
  console.log("console errors:", errors.length ? errors : "none");

  /* ───────────── 1b. TABLET (769-960, pin active) ───────────── */
  console.log("\n===== TABLET index.html (900x800) =====");
  const tp = await browser.newPage();
  await tp.setViewport({ width: 900, height: 800 });
  await tp.goto(BASE + "index.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  await tp.waitForFunction(() => document.body.classList.contains("loaded"), { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 1200));
  await scrollTo(tp, 500);
  const tPin = await tp.evaluate(() => ({
    portraitPos: getComputedStyle(document.querySelector(".portrait-frame")).position,
    scrollW: document.documentElement.scrollWidth,
    innerW: window.innerWidth,
  }));
  check("tablet: portrait pinned", tPin.portraitPos === "fixed", tPin.portraitPos);
  check("tablet: no horizontal overflow", tPin.scrollW <= tPin.innerW + 1, `scrollW=${tPin.scrollW}`);
  await shot(tp, "index_tablet_scrolled.png");

  /* ───────────── 2. MOBILE ───────────── */
  console.log("\n===== MOBILE index.html (390x844) ===== ");
  const mp = await browser.newPage();
  await mp.setViewport({ width: 390, height: 844 });
  const mErr = [];
  mp.on("pageerror", (e) => mErr.push(String(e)));
  await mp.goto(BASE + "index.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  await mp.waitForFunction(() => document.body.classList.contains("loaded"), { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 1200));
  await scrollTo(mp, 800);
  const mPin = await mp.evaluate(() => ({
    portraitPos: getComputedStyle(document.querySelector(".portrait-frame")).position,
    scrollW: document.documentElement.scrollWidth,
    innerW: window.innerWidth,
  }));
  check("mobile: portrait NOT pinned", mPin.portraitPos !== "fixed", mPin.portraitPos);
  check("mobile: no horizontal overflow", mPin.scrollW <= mPin.innerW + 1, `scrollW=${mPin.scrollW}`);
  await shot(mp, "index_mobile_scrolled.png");
  check("mobile: no page errors", mErr.length === 0, mErr.slice(0, 3).join(" | ") || "clean");

  /* ───────────── 3. REDUCED MOTION ───────────── */
  console.log("\n===== REDUCED-MOTION index.html =====");
  const rp = await browser.newPage();
  await rp.setViewport({ width: 1280, height: 800 });
  await rp.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await rp.goto(BASE + "index.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  await rp.waitForFunction(() => document.body.classList.contains("loaded"), { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 1200));
  await scrollTo(rp, 500);
  const rPin = await rp.evaluate(() => getComputedStyle(document.querySelector(".portrait-frame")).position);
  check("reduced-motion: portrait NOT pinned", rPin !== "fixed", rPin);
  const rVisible = await rp.evaluate(() =>
    Array.from(document.querySelectorAll(".reveal")).every((el) => getComputedStyle(el).opacity === "1")
  );
  check("reduced-motion: content visible without animation", rVisible);
  await shot(rp, "index_reduced_motion.png");

  /* ───────────── 4. PROJECTS PAGE ───────────── */
  console.log("\n===== projects.html =====");
  const pp = await browser.newPage();
  await pp.setViewport({ width: 1280, height: 800 });
  const pErr = [];
  pp.on("pageerror", (e) => pErr.push(String(e)));
  await pp.goto(BASE + "projects.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  await pp.waitForFunction(() => document.body.classList.contains("loaded"), { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 1200));
  const pHrefs = await pp.evaluate(() =>
    Array.from(document.querySelectorAll(".showcase-card")).map((a) => a.getAttribute("href"))
  );
  check("projects page: 5 showcase cards", pHrefs.length === 5, `got ${pHrefs.length}`);
  check("projects page: hrefs match real repos", PROJECT_HREFS.every((h, i) => pHrefs[i] === h));
  const pText = await pp.evaluate(() => document.body.innerText);
  check("projects page: no 'Full Stack' text", !/full[\s-]*stack/i.test(pText));
  check("projects page: no page errors", pErr.length === 0, pErr.slice(0, 3).join(" | ") || "clean");
  await pp.screenshot({ path: path.join(OUT, "projects_full.png"), fullPage: true });

  /* ───────────── 5. LINKS SANITY (HTTP status) ───────────── */
  console.log("\n===== Outbound link HTTP status =====");
  const linkStatus = await (async () => {
    const results = [];
    for (const u of [...new Set([...PROJECT_HREFS, ...CONTACT_HREFS.slice(0, 2)])]) {
      try {
        // LinkedIn rejects HEAD (405) and blocks bots with 999; those are reachability
        // responses, not dead links — the URL itself comes from the user's own profile.
        const r = await fetch(u, { method: u.includes("linkedin") ? "GET" : "HEAD", redirect: "follow" });
        results.push([u, r.status]);
      } catch (e) {
        results.push([u, "ERR"]);
      }
    }
    return results;
  })();
  const linkOk = (s) => (s >= 200 && s < 400) || s === 999;
  check("all outbound repo/contact links resolve", linkStatus.every(([, s]) => linkOk(s)), JSON.stringify(linkStatus.filter(([, s]) => !linkOk(s))));
  linkStatus.forEach(([u, s]) => console.log(`  ${s} ${u}`));

  await browser.close();

  console.log("\n==============================================");
  if (failures.length) {
    console.log(`RESULT: ${failures.length} FAILURE(S)`);
    failures.forEach((f) => console.log("  ✗ " + f));
    process.exit(1);
  }
  console.log("RESULT: ALL CHECKS PASSED ✓");
  console.log("Screenshots saved to: " + OUT);
})().catch((e) => {
  console.error("SCRIPT ERROR:", e);
  process.exit(2);
});
