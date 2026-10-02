/** Terlizzi (Europe/Rome) live clock, date + weather. */
import { nodesFor, wrapTnum } from "./utils.js";

const TZ = "Europe/Rome";
const WEATHER_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=41.1306&longitude=16.5453&current=temperature_2m";
const WEATHER_TTL_MS = 30 * 60 * 1000;
const WEATHER_KEY = "terlizzi_temp";
const WEATHER_AT = "terlizzi_temp_time";

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

function formatClock(date = new Date()) {
  return wrapTnum(timeFmt.format(date));
}

/** Always XX.XX.XXXX (Europe/Rome); digits tabular, dots proportional. */
function formatDate(date = new Date()) {
  const parts = datePartsFmt.formatToParts(date);
  let d = "";
  let m = "";
  let y = "";
  for (const part of parts) {
    if (part.type === "day") d = part.value;
    else if (part.type === "month") m = part.value;
    else if (part.type === "year") y = part.value;
  }
  return d && m && y ? wrapTnum(`${d}.${m}.${y}`) : "";
}

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

/** Open-Meteo Terlizzi temperature; updates every given element / id. */
export async function fetchTerlizziWeather(targets) {
  const els = nodesFor(targets);
  if (!els.length) return;

  try {
    const cached = sessionStorage.getItem(WEATHER_KEY);
    const at = Number(sessionStorage.getItem(WEATHER_AT));
    if (cached && at && Date.now() - at < WEATHER_TTL_MS) {
      setWeatherHtml(els, wrapTnum(cached));
      return;
    }
  } catch {
    /* private mode */
  }

  let signal;
  let timeout = 0;
  if (typeof AbortSignal.timeout === "function") {
    signal = AbortSignal.timeout(6000);
  } else {
    const ctrl = new AbortController();
    signal = ctrl.signal;
    timeout = window.setTimeout(() => ctrl.abort(), 6000);
  }

  try {
    const res = await fetch(WEATHER_URL, {
      signal,
      headers: { Accept: "application/json" }
    });
    if (!res.ok) return;
    const data = await res.json();
    const n = data?.current?.temperature_2m;
    if (typeof n !== "number") return;
    const temp = `${Math.round(n)}°C`;
    setWeatherHtml(els, wrapTnum(temp));
    try {
      sessionStorage.setItem(WEATHER_KEY, temp);
      sessionStorage.setItem(WEATHER_AT, String(Date.now()));
    } catch {
      /* ignore */
    }
  } catch {
    /* keep HTML fallback */
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
