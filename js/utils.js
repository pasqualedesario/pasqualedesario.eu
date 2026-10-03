/** Home-only helpers; shared surface re-exported from utils-shared. */
export {
  $,
  readLangParam,
  writeLangUrl,
  configureLangButton,
  bindQueryFace,
  scrollbarWidth,
  setScrollbarComp,
  nodesFor,
  wrapTnum,
  whenIdle,
  bindLangButtons
} from "./utils-shared.js";

export const MQ = Object.freeze({
  mobile: "(max-width: 999px)",
  reduceMotion: "(prefers-reduced-motion: reduce)",
  finePointer: "(hover: hover) and (pointer: fine)"
});

/** Coalesce work onto the next animation frame (scroll / resize / pointer). */
export const rafSchedule = (fn) => {
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
export const onMediaChange = (mq, fn) => {
  if (typeof mq.addEventListener === "function") mq.addEventListener("change", fn);
  else mq.addListener?.(fn);
};

/** Paired home + archive colophon element ids. */
export const COLOPHON = Object.freeze({
  time: Object.freeze(["colophon-time", "index-colophon-time"]),
  date: Object.freeze(["colophon-date", "index-colophon-date"]),
  weather: Object.freeze(["colophon-weather", "index-colophon-weather"])
});

export const escapeHtml = (s) =>
  String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const pauseVideos = (root) => {
  root?.querySelectorAll("video").forEach((video) => {
    try {
      video.pause();
    } catch {
      /* ignore */
    }
  });
};

/** Fisher–Yates shuffle; mutates and returns the array. */
export const shuffleInPlace = (items) => {
  for (let i = items.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
};

export const scrollToTop = (behavior = "smooth") => {
  window.scrollTo({ top: 0, behavior });
};

/** Run a factory; log and return null on failure. */
export const tryCreate = (label, fn) => {
  try {
    return fn();
  } catch (err) {
    console.error(`[${label}]`, err);
    return null;
  }
};
