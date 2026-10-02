/** Shared DOM / runtime helpers (zero-framework). */

export const $ = (id) => document.getElementById(id);

/** Classic scrollbar width (0 with overlay scrollbars). */
export const scrollbarWidth = () => {
  const outer = document.createElement("div");
  outer.style.cssText =
    "visibility:hidden;overflow:scroll;position:absolute;top:0;left:0;width:100px;height:100px";
  document.body.appendChild(outer);
  const w = outer.offsetWidth - outer.clientWidth;
  outer.remove();
  return w;
};

/** Keep fixed archive/404 frame aligned with in-flow home columns. */
export const setScrollbarComp = (px) => {
  document.documentElement.style.setProperty("--sbw", `${Math.max(0, px | 0)}px`);
};

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

/** Resolve element ids (or nodes) to a live element list. */
export const nodesFor = (ids) =>
  (Array.isArray(ids) ? ids : [ids])
    .filter(Boolean)
    .map((id) => (typeof id === "string" ? $(id) : id))
    .filter(Boolean);

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

/** Wrap digit runs for tabular figures; leave punctuation proportional. */
export const wrapTnum = (value) =>
  String(value || "").replace(/\d+/g, (digits) => `<span class="tnum">${digits}</span>`);

export const pauseVideos = (root) => {
  root?.querySelectorAll("video").forEach((video) => {
    try {
      video.pause();
    } catch {
      /* ignore */
    }
  });
};

/** Defer non-critical work past first paint / interaction. */
export const whenIdle = (fn, timeout = 2500) => {
  if (typeof scheduler?.postTask === "function") {
    scheduler.postTask(fn, { priority: "background", delay: 0 }).catch(() => fn());
    return;
  }
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(() => fn(), { timeout });
    return;
  }
  window.setTimeout(fn, 1);
};

export const scrollToTop = (behavior = "smooth") => {
  window.scrollTo({ top: 0, behavior });
};

/** Wire language toggle buttons (dataset.targetLang). */
export const bindLangButtons = (buttons, onChange) => {
  for (const btn of buttons) {
    btn?.addEventListener("click", (e) => {
      e.stopPropagation();
      const target = btn.dataset.targetLang;
      if (target) onChange?.(target);
    });
  }
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
