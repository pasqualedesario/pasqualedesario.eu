/** Terlizzi (Europe/Rome) live clock, date + weather. */
import { nodesFor, wrapTnum, whenIdle } from "./utils-shared.js";

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
export function createColophonClock({
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
export async function fetchTerlizziWeather(targets) {
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
export function bindTerlizziWeather(targets) {
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
