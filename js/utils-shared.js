/** Shared DOM / runtime helpers — home + 404 (zero-framework). */

export const $ = (id) => document.getElementById(id);

/** `?lang=it|en` from the URL, or null. */
export const readLangParam = () => {
  const v = new URLSearchParams(location.search).get("lang");
  return v === "en" || v === "it" ? v : null;
};

/** Keep default locale clean (`/` not `/?lang=it`). Optional hash (e.g. archive). */
export const writeLangUrl = (lang, { hash = null } = {}) => {
  const url = new URL(location.href);
  if (lang === "it") url.searchParams.delete("lang");
  else url.searchParams.set("lang", lang);
  if (hash != null) url.hash = hash;
  history.replaceState(null, "", url);
};

/** Wire a language toggle button from `{ text, target }`. */
export const configureLangButton = (btn, cfg) => {
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
export const bindQueryFace = (...els) => {
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
export const scrollbarWidth = () => {
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
export const setScrollbarComp = (px) => {
  document.documentElement.style.setProperty("--sbw", `${Math.max(0, px | 0)}px`);
};

/** Resolve element ids (or nodes) to a live element list. */
export const nodesFor = (ids) =>
  (Array.isArray(ids) ? ids : [ids])
    .filter(Boolean)
    .map((id) => (typeof id === "string" ? $(id) : id))
    .filter(Boolean);

/** Wrap digit runs for tabular figures; leave punctuation proportional. */
export const wrapTnum = (value) =>
  String(value || "").replace(/\d+/g, (digits) => `<span class="tnum">${digits}</span>`);

/**
 * Defer non-critical work past first paint / interaction.
 * Prefer requestIdleCallback; always keep a hard setTimeout — Safari’s rIC
 * `timeout` is unreliable while the main thread stays busy (carousel boot).
 */
export const whenIdle = (fn, timeout = 2500) => {
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

/** Wire language toggle buttons (dataset.targetLang). */
export const bindLangButtons = (buttons, onChange) => {
  for (const btn of buttons) {
    if (!btn) continue;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const target = btn.dataset.targetLang;
      if (target) onChange?.(target);
    });
  }
};
