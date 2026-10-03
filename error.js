/*! Pasquale de Sario — error.js from js/*.js */
(function () {
'use strict';

/* === utils.js === */
/** Shared DOM / runtime helpers (zero-framework). */

const $ = (id) => document.getElementById(id);

const MQ = Object.freeze({
  mobile: "(max-width: 999px)",
  reduceMotion: "(prefers-reduced-motion: reduce)",
  finePointer: "(hover: hover) and (pointer: fine)"
});

/** `?lang=it|en` from the URL, or null. */
const readLangParam = () => {
  const v = new URLSearchParams(location.search).get("lang");
  return v === "en" || v === "it" ? v : null;
};

/** Keep default locale clean (`/` not `/?lang=it`). Optional hash (e.g. archive). */
const writeLangUrl = (lang, { hash = null } = {}) => {
  const url = new URL(location.href);
  if (lang === "it") url.searchParams.delete("lang");
  else url.searchParams.set("lang", lang);
  if (hash != null) url.hash = hash;
  history.replaceState(null, "", url);
};

/** Wire a language toggle button from `{ text, target }`. */
const configureLangButton = (btn, cfg) => {
  if (!btn || !cfg) return;
  btn.textContent = cfg.text;
  btn.dataset.targetLang = cfg.target;
  btn.setAttribute("aria-label", `Set language ${cfg.text}`);
};

const QUERY_FACES = Object.freeze([
  { className: "is-query-agip", family: '"Agip 77"' },
  { className: "is-query-fiat", family: '"LL Fiat 77 Ritmo"' }
]);

/** Assign Agip or Fiat for this session; warm the face after first paint. */
const bindQueryFace = (...els) => {
  const face = QUERY_FACES[(Math.random() * QUERY_FACES.length) | 0];
  for (const el of els) el?.classList.add(face.className);
  const warm = () =>
    document.fonts?.load?.(`400 80px ${face.family}`).catch(() => {});
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(warm, { timeout: 2000 });
  } else {
    window.setTimeout(warm, 1);
  }
};

/** Classic scrollbar width (0 with overlay scrollbars). Measured once. */
let _sbw;
const scrollbarWidth = () => {
  if (_sbw != null) return _sbw;
  const outer = document.createElement("div");
  outer.style.cssText =
    "visibility:hidden;overflow:scroll;position:absolute;top:0;left:0;width:100px;height:100px";
  document.body.appendChild(outer);
  _sbw = outer.offsetWidth - outer.clientWidth;
  outer.remove();
  return _sbw;
};

/** Keep fixed archive/404 frame aligned with in-flow home columns. */
const setScrollbarComp = (px) => {
  document.documentElement.style.setProperty("--sbw", `${Math.max(0, px | 0)}px`);
};

/** Coalesce work onto the next animation frame (scroll / resize / pointer). */
const rafSchedule = (fn) => {
  let pending = false;
  return () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      fn();
    });
  };
};

/** Subscribe to a MediaQueryList change (Safari < 14 fallback). */
const onMediaChange = (mq, fn) => {
  if (typeof mq.addEventListener === "function") mq.addEventListener("change", fn);
  else mq.addListener?.(fn);
};

/** Resolve element ids (or nodes) to a live element list. */
const nodesFor = (ids) =>
  (Array.isArray(ids) ? ids : [ids])
    .filter(Boolean)
    .map((id) => (typeof id === "string" ? $(id) : id))
    .filter(Boolean);

/** Paired home + archive colophon element ids. */
const COLOPHON = Object.freeze({
  time: Object.freeze(["colophon-time", "index-colophon-time"]),
  date: Object.freeze(["colophon-date", "index-colophon-date"]),
  weather: Object.freeze(["colophon-weather", "index-colophon-weather"])
});

const escapeHtml = (s) =>
  String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Wrap digit runs for tabular figures; leave punctuation proportional. */
const wrapTnum = (value) =>
  String(value || "").replace(/\d+/g, (digits) => `<span class="tnum">${digits}</span>`);

const pauseVideos = (root) => {
  root?.querySelectorAll("video").forEach((video) => {
    try {
      video.pause();
    } catch {
      /* ignore */
    }
  });
};

/** Fisher–Yates shuffle; mutates and returns the array. */
const shuffleInPlace = (items) => {
  for (let i = items.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
};

/**
 * Defer non-critical work past first paint / interaction.
 * Prefer requestIdleCallback; always keep a hard setTimeout — Safari’s rIC
 * `timeout` is unreliable while the main thread stays busy (carousel boot).
 */
const whenIdle = (fn, timeout = 2500) => {
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    fn();
  };

  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(run, { timeout });
  } else if (typeof scheduler?.postTask === "function") {
    scheduler
      .postTask(run, { priority: "background", delay: 400 })
      .catch(run);
  } else {
    window.setTimeout(run, 1);
  }
  window.setTimeout(run, timeout);
};

const scrollToTop = (behavior = "smooth") => {
  window.scrollTo({ top: 0, behavior });
};

/** Wire language toggle buttons (dataset.targetLang). */
const bindLangButtons = (buttons, onChange) => {
  for (const btn of buttons) {
    btn?.addEventListener("click", (e) => {
      e.stopPropagation();
      const target = btn.dataset.targetLang;
      if (target) onChange?.(target);
    });
  }
};

/** Run a factory; log and return null on failure. */
const tryCreate = (label, fn) => {
  try {
    return fn();
  } catch (err) {
    console.error(`[${label}]`, err);
    return null;
  }
};

/* === time.js === */
/** Terlizzi (Europe/Rome) live clock, date + weather. */

const TZ = "Europe/Rome";
const WEATHER_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=41.1306&longitude=16.5453&current=temperature_2m";
const WEATHER_TTL_MS = 30 * 60 * 1000;
const WEATHER_KEY = "terlizzi_temp";
const WEATHER_AT = "terlizzi_temp_time";
const WEATHER_FETCH_MS = 10_000;
const WEATHER_IDLE_MS = 1200;
const WEATHER_PLACEHOLDER = /^(?:—|–|-|−)?$/;

const timeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZoneName: "short",
  hour12: false
});

const datePartsFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});

const formatClock = (date = new Date()) => wrapTnum(timeFmt.format(date));

/** Always XX.XX.XXXX (Europe/Rome); digits tabular, dots proportional. */
const formatDate = (date = new Date()) => {
  const parts = datePartsFmt.formatToParts(date);
  let d = "";
  let m = "";
  let y = "";
  for (const { type, value } of parts) {
    if (type === "day") d = value;
    else if (type === "month") m = value;
    else if (type === "year") y = value;
  }
  return d && m && y ? wrapTnum(`${d}.${m}.${y}`) : "";
};

/**
 * 1 Hz clock + calendar date for one or more element ids.
 * @param {{ time?: string|string[], date?: string|string[] }} [opts]
 */
function createColophonClock({
  time = "colophon-time",
  date = []
} = {}) {
  let timeNodes = [];
  let dateNodes = [];
  let timer = 0;
  let lastClock = "";
  let lastDateKey = "";

  const resolve = () => {
    timeNodes = nodesFor(time);
    dateNodes = nodesFor(date);
  };

  const tick = () => {
    if (document.hidden) return;
    const now = new Date();
    const clock = formatClock(now);
    if (clock !== lastClock) {
      lastClock = clock;
      for (const el of timeNodes) el.innerHTML = clock;
    }

    if (!dateNodes.length) return;
    const key = now.toLocaleDateString("en-CA", { timeZone: TZ });
    if (key === lastDateKey) return;
    lastDateKey = key;
    const text = formatDate(now);
    for (const el of dateNodes) el.innerHTML = text;
  };

  return {
    start() {
      resolve();
      lastClock = "";
      lastDateKey = "";
      tick();
      if (!timer) timer = window.setInterval(tick, 1000);
    },
    stop() {
      if (!timer) return;
      clearInterval(timer);
      timer = 0;
    }
  };
}

const setWeatherHtml = (els, html) => {
  for (const el of els) el.innerHTML = html;
};

const isWeatherPlaceholder = (el) =>
  WEATHER_PLACEHOLDER.test(String(el?.textContent || "").trim());

const readWeatherCache = () => {
  try {
    const cached = sessionStorage.getItem(WEATHER_KEY);
    const at = Number(sessionStorage.getItem(WEATHER_AT));
    if (cached && at && Date.now() - at < WEATHER_TTL_MS) return cached;
  } catch {
    /* private mode */
  }
  return "";
};

const writeWeatherCache = (temp) => {
  try {
    sessionStorage.setItem(WEATHER_KEY, temp);
    sessionStorage.setItem(WEATHER_AT, String(Date.now()));
  } catch {
    /* ignore */
  }
};

const abortAfter = (ms) => {
  if (typeof AbortSignal.timeout === "function") {
    return { signal: AbortSignal.timeout(ms), cancel: () => {} };
  }
  const ctrl = new AbortController();
  const id = window.setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, cancel: () => clearTimeout(id) };
};

/** Open-Meteo Terlizzi temperature; updates every given element / id. */
async function fetchTerlizziWeather(targets) {
  const els = nodesFor(targets);
  if (!els.length) return false;

  const cached = readWeatherCache();
  if (cached) {
    setWeatherHtml(els, wrapTnum(cached));
    return true;
  }

  const { signal, cancel } = abortAfter(WEATHER_FETCH_MS);
  try {
    // No custom headers → simple CORS request (avoids preflight on mobile networks).
    const res = await fetch(WEATHER_URL, { signal, cache: "no-store" });
    if (!res.ok) return false;
    const data = await res.json();
    const n = data?.current?.temperature_2m;
    if (typeof n !== "number") return false;
    const temp = `${Math.round(n)}°C`;
    setWeatherHtml(els, wrapTnum(temp));
    writeWeatherCache(temp);
    return true;
  } catch {
    return false;
  } finally {
    cancel();
  }
}

/**
 * Load weather after first paint; retry when the colophon becomes visible
 * (covers Safari idle-callback flakiness + late network on mobile).
 */
function bindTerlizziWeather(targets) {
  let inflight = null;
  const run = () => {
    if (inflight) return inflight;
    inflight = fetchTerlizziWeather(targets).finally(() => {
      inflight = null;
    });
    return inflight;
  };

  whenIdle(run, WEATHER_IDLE_MS);

  const probe = nodesFor(targets)[0];
  if (!probe) return;

  const stillEmpty = () => isWeatherPlaceholder(probe);

  // Retry once after a short beat if the first attempt lost the race to boot.
  window.setTimeout(() => {
    if (stillEmpty()) run();
  }, WEATHER_IDLE_MS + 800);

  if (!("IntersectionObserver" in window)) return;

  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      if (stillEmpty()) run();
      // Keep observing until we have a value — cellular can come up late.
      if (!stillEmpty()) io.disconnect();
    },
    { root: null, rootMargin: "120px 0px", threshold: 0 }
  );
  io.observe(probe);
}

/* === error-page.js === */
/** 404 page — clock/weather shared; Agip/Fiat face for the code. */

setScrollbarComp(scrollbarWidth());

const LANG_UI = Object.freeze({
  it: {
    primary: { text: "Italiano", target: "it" },
    secondary: { text: "Inglese", target: "en" }
  },
  en: {
    primary: { text: "English", target: "en" },
    secondary: { text: "Italian", target: "it" }
  }
});

const langText = (el, code) => el?.getAttribute(`data-${code}`) || "";

const heading = $("error-heading");
const homeLink = $("error-home-link");
const typographyLabel = $("error-typography-label");
const langPrimary = $("error-lang-primary");
const langSecondary = $("error-lang-secondary");
const code = $("error-code");

let lang =
  readLangParam() ||
  (document.documentElement.lang === "en" ? "en" : "it");

const applyLanguage = (next) => {
  if (next !== "it" && next !== "en") return;
  lang = next;
  document.documentElement.lang = next;

  const setCopy = (el) => {
    const copy = langText(el, next);
    if (el && copy) el.textContent = copy;
  };

  setCopy(heading);
  setCopy(homeLink);
  setCopy(typographyLabel);

  const ui = LANG_UI[next];
  configureLangButton(langPrimary, ui.primary);
  configureLangButton(langSecondary, ui.secondary);
  writeLangUrl(next);
};

bindQueryFace(code);
applyLanguage(lang);
bindLangButtons([langPrimary, langSecondary], (target) => {
  if (target !== lang) applyLanguage(target);
});

const clock = createColophonClock({
  time: "error-colophon-time",
  date: "error-colophon-date"
});
clock.start();
document.addEventListener("visibilitychange", () => {
  if (document.hidden) clock.stop();
  else clock.start();
});

bindTerlizziWeather("error-colophon-weather");
})();
