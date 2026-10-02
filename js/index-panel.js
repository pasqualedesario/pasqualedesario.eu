import {
  projectIndex,
  indexLabels,
  TRANSLATIONS,
  projectTagsHtml,
  stripHtml,
  configureLangButton
} from "./i18n.js";
import { $, pauseVideos, bindLangButtons, scrollToTop, escapeHtml, wrapTnum, setScrollbarComp, rafSchedule } from "./utils.js";
import {
  normalizeQuery,
  paintQuerySurface,
  selectQueryContents,
  querySelectionRange,
  resolveQueryInput,
  bindQueryFace,
  setQueryTyping
} from "./query-surface.js";

const MOBILE_MQ = "(max-width: 999px)";
const CLOSE_IGNORE = "a, button, .index-result, .index-preview__media";
const MEDIA_SELECTOR =
  ".inline-carousel .carousel-slide:not([data-loop-clone]), #archive-media-bank .archive-media";
const HINT_DELAY_MS = 60_000;

const mediaSrc = (el) => {
  if (!el) return "";
  return (
    el.getAttribute("src") ||
    el.dataset.src ||
    (el.tagName === "IMG" || el.tagName === "VIDEO" ? el.currentSrc : "") ||
    ""
  );
};

const collectProjectMedia = () => {
  const map = new Map();

  for (const slide of document.querySelectorAll(MEDIA_SELECTOR)) {
    const id = slide.dataset.project;
    if (!id) continue;

    let list = map.get(id);
    if (!list) {
      list = [];
      map.set(id, list);
    }

    const hasSrc = (src) => list.some((item) => item.src === src);

    const img = slide.querySelector("img");
    if (img) {
      const src = mediaSrc(img);
      if (src && !hasSrc(src)) {
        list.push({ type: "img", src, alt: img.getAttribute("alt") || "" });
      }
      continue;
    }

    const video = slide.querySelector("video");
    if (!video) continue;
    const src = mediaSrc(video.querySelector("source")) || mediaSrc(video);
    if (!src || hasSrc(src)) continue;
    list.push({
      type: "video",
      src,
      poster: video.getAttribute("poster") || ""
    });
  }

  return map;
};

/** Year en-dashes bare; em dashes → thin + .dash (case 0). */
const withDashSpans = (s) =>
  escapeHtml(s)
    .replace(/(\d)[\u2009\u200A\s]*[\u2013\-][\u2009\u200A\s]*(\d)/g, `$1\u2013$2`)
    .replace(
      /[\u2009\u200A\s]*\u2014[\u2009\u200A\s]*/g,
      `\u2009<span class="dash">\u2014</span>\u2009`
    );

/** Archive curtain — type archivio/archive + Enter to open (desktop). */
export function createIndexPanel({
  getLang,
  onLanguageBound,
  onLanguageChange,
  onOpenChange
} = {}) {
  const curtain = $("index-curtain");
  const title = $("index-title");
  const results = $("index-results");
  const queryEl = $("index-query");
  const preview = $("index-preview");
  const previewMedia = $("index-preview-media");
  const metaRoot = $("index-meta");
  const metaYear = $("index-meta-year");
  const metaTags = $("index-meta-tags");
  const metaPer = $("index-meta-per");
  const metaCon = $("index-meta-con");
  const gateQuery = $("site-gate-query");
  const siteGate = gateQuery?.closest(".site-gate") || $("site-gate");
  if (!curtain || !results || !queryEl) return null;

  bindQueryFace(queryEl, gateQuery);

  const colophon = {
    credit: $("index-colophon-credit"),
    typography: $("index-colophon-typography"),
    langPrimary: $("index-lang-btn-primary"),
    langSecondary: $("index-lang-btn-secondary")
  };

  const mobileMq = window.matchMedia(MOBILE_MQ);
  const html = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const state = {
    open: false,
    query: "",
    gate: "",
    cueReady: false,
    mediaByProject: null,
    selected: [],
    hoverId: null,
    overPreview: false,
    previewKey: "",
    mobile: mobileMq.matches,
    resultNodes: [],
    resultById: new Map(),
    activeEl: null
  };

  let lastPointer = { x: 0, y: 0 };

  const lang = () => getLang?.() || "it";

  const ensureMedia = () => {
    if (!state.mediaByProject) state.mediaByProject = collectProjectMedia();
    return state.mediaByProject;
  };

  const syncSelectedClasses = () => {
    const selected = new Set(state.selected);
    for (const el of state.resultNodes) {
      el.classList.toggle("is-selected", selected.has(el.dataset.project));
    }
  };

  const syncActiveClass = (projectId) => {
    if (state.activeEl?.dataset.project === projectId) return;
    state.activeEl?.classList.remove("is-active");
    state.activeEl = projectId ? state.resultById.get(projectId) || null : null;
    state.activeEl?.classList.add("is-active");
  };

  const setPreviewVisibility = (visible) => {
    if (!preview) return;
    preview.hidden = !visible;
    preview.setAttribute("aria-hidden", visible ? "false" : "true");
  };

  const hidePreview = () => {
    if (!preview || !previewMedia) return;
    pauseVideos(previewMedia);
    previewMedia.replaceChildren();
    setPreviewVisibility(false);
    state.previewKey = "";
  };

  const hideMeta = () => {
    if (!metaRoot) return;
    metaRoot.hidden = true;
    if (metaYear) metaYear.textContent = "";
    if (metaTags) metaTags.innerHTML = "";
    if (metaPer) metaPer.innerHTML = "";
    if (metaCon) metaCon.textContent = "";
  };

  const clearSelection = () => {
    state.selected = [];
    state.hoverId = null;
    syncActiveClass(null);
    hideMeta();
    hidePreview();
    syncSelectedClasses();
  };

  const appendMediaItem = (frag, item) => {
    if (item.type === "img") {
      const img = document.createElement("img");
      img.src = item.src;
      img.alt = item.alt;
      img.loading = "eager";
      img.decoding = "async";
      img.draggable = false;
      frag.appendChild(img);
      return;
    }
    const video = document.createElement("video");
    video.src = item.src;
    if (item.poster) video.poster = item.poster;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.preload = "none";
    frag.appendChild(video);
  };

  const previewIds = () => {
    const ids = state.selected.slice();
    if (state.hoverId && !ids.includes(state.hoverId)) ids.push(state.hoverId);
    return ids;
  };

  const renderPreview = ({ syncSelected = true } = {}) => {
    if (!preview || !previewMedia) return;

    const ids = previewIds();
    const key = ids.join("\0");
    if (key === state.previewKey) {
      if (syncSelected) syncSelectedClasses();
      return;
    }

    pauseVideos(previewMedia);
    previewMedia.replaceChildren();
    state.previewKey = key;

    const finish = (visible) => {
      setPreviewVisibility(visible);
      if (syncSelected) syncSelectedClasses();
    };

    if (!ids.length) {
      finish(false);
      return;
    }

    const mediaMap = ensureMedia();
    const frag = document.createDocumentFragment();
    let hasMedia = false;

    for (const id of ids) {
      for (const item of mediaMap.get(id) || []) {
        appendMediaItem(frag, item);
        hasMedia = true;
      }
    }

    if (!hasMedia) {
      state.previewKey = "";
      finish(false);
      return;
    }

    previewMedia.appendChild(frag);
    finish(true);
    for (const video of previewMedia.querySelectorAll("video")) {
      video.play?.().catch(() => {});
    }
  };

  const selectProject = (projectId) => {
    if (!projectId) return;
    const idx = state.selected.indexOf(projectId);
    if (idx >= 0) state.selected.splice(idx, 1);
    else state.selected.push(projectId);
    renderPreview();

    if (idx < 0) return;
    // Drop sticky :focus so a deselected row returns to black when not hovered.
    const el = state.resultById.get(projectId);
    if (el && el === document.activeElement) el.blur();
    syncActiveClass(
      state.hoverId === projectId
        ? projectId
        : state.selected[state.selected.length - 1] || null
    );
  };

  const showMeta = (projectId) => {
    if (!metaRoot || !projectId) {
      hideMeta();
      return;
    }
    const project = TRANSLATIONS[lang()]?.projects?.[projectId];
    if (!project) {
      hideMeta();
      return;
    }

    const year = stripHtml(project.year);
    const tagsHtml = projectTagsHtml(project.tags, lang());
    const perHtml = String(project.per || "").trim();
    const con = stripHtml(project.con);
    const collab = indexLabels(lang())?.collab || "Con";

    if (metaYear) metaYear.innerHTML = wrapTnum(year);
    if (metaTags) metaTags.innerHTML = tagsHtml;
    if (metaPer) {
      metaPer.innerHTML = perHtml
        ? perHtml
            .split(/<br\s*\/?>/i)
            .map((part, i) => (i === 0 ? `@${part}` : part))
            .join("<br>")
        : "";
    }
    if (metaCon) metaCon.textContent = con ? `${collab}: ${con}` : "";

    metaRoot.hidden = !(year || tagsHtml || perHtml || con);
  };

  const setHover = (projectId) => {
    if (state.hoverId === projectId) return;
    state.hoverId = projectId;
    syncActiveClass(projectId);
    showMeta(projectId);
    renderPreview({ syncSelected: false });
  };

  const clearHover = () => {
    if (state.hoverId == null) return;
    state.hoverId = null;
    const keepId = state.selected[state.selected.length - 1] || null;
    syncActiveClass(keepId);
    if (keepId) showMeta(keepId);
    else hideMeta();
    renderPreview({ syncSelected: false });
  };

  const paint = (el, show, text) =>
    paintQuerySurface(el, { show, text, reduceMotion });

  const activeQueryEl = () => {
    if (state.open) return queryEl;
    if (!state.mobile && (state.cueReady || state.gate)) return gateQuery;
    return null;
  };

  const activeQueryValue = () => (state.open ? state.query : state.gate);

  const isQueryTyping = () =>
    state.open || (!state.mobile && (state.cueReady || Boolean(state.gate)));

  const syncTypingClass = () => setQueryTyping(isQueryTyping(), html);

  const commitQuery = (next) => {
    if (state.open) setQuery(next);
    else setGate(next);
  };

  const syncArchiveQueryDisplay = () => paint(queryEl, state.open, state.query);

  const syncGateDisplay = () => {
    const show =
      !state.open && !state.mobile && (state.cueReady || Boolean(state.gate));
    paint(gateQuery, show, state.gate);
    if (siteGate) siteGate.setAttribute("aria-hidden", show ? "false" : "true");
    syncTypingClass();
  };

  const setGate = (next) => {
    state.gate = next;
    syncGateDisplay();
  };

  const clearGate = () => setGate("");

  const syncColophon = (code = lang()) => {
    const t = TRANSLATIONS[code];
    const C = t?.curtain;
    if (!C) return;

    if (colophon.credit) colophon.credit.innerHTML = C.colophonCredit;
    if (colophon.typography) colophon.typography.innerHTML = C.colophonTypography;
    configureLangButton(colophon.langPrimary, t.langPrimary);
    configureLangButton(colophon.langSecondary, t.langSecondary);
  };

  const buildResults = (items) => {
    const frag = document.createDocumentFragment();
    state.resultNodes = [];
    state.resultById = new Map();
    state.activeEl = null;
    const total = items.length;

    for (let i = 0; i < total; i++) {
      const entry = items[i];
      // Bottom of the list is [01]; numbers ascend toward the top
      const num = String(total - i).padStart(2, "0");
      const el = document.createElement("span");
      el.className = "index-result";
      el.dataset.project = entry.id;
      el.dataset.search = entry.search;
      el.tabIndex = 0;
      el.innerHTML = `<span class="index-result__num tnum">[${num}]</span>${withDashSpans(entry.title)}`;
      state.resultNodes.push(el);
      state.resultById.set(entry.id, el);
      frag.appendChild(el);
    }

    results.replaceChildren(frag);
    syncResultsFade();
  };

  const syncResultsFade = () => {
    const top = results.scrollTop;
    const max = results.scrollHeight - results.clientHeight;
    const eps = 1;
    results.classList.toggle("is-fade-top", top > eps);
    results.classList.toggle("is-fade-bottom", max > eps && top < max - eps);
  };

  const scheduleFade = rafSchedule(syncResultsFade);
  const scheduleHover = rafSchedule(() => {
    const el = results.querySelector(".index-result:hover");
    if (el && !el.hidden) {
      setHover(el.dataset.project);
      return;
    }
    if (state.overPreview) return;
    if (pointerOverPreview()) {
      state.overPreview = true;
      return;
    }
    clearHover();
  });

  const applyFilter = () => {
    const q = normalizeQuery(state.query);
    const visibleIds = new Set();

    for (const el of state.resultNodes) {
      const show = !q || el.dataset.search.includes(q);
      el.hidden = !show;
      if (show) visibleIds.add(el.dataset.project);
    }

    if (state.selected.length || state.hoverId) {
      const next = state.selected.filter((id) => visibleIds.has(id));
      let changed = next.length !== state.selected.length;
      if (changed) state.selected = next;
      if (state.hoverId && !visibleIds.has(state.hoverId)) {
        state.hoverId = null;
        syncActiveClass(null);
        hideMeta();
        changed = true;
      }
      if (changed) renderPreview();
      else syncSelectedClasses();
    }

    syncArchiveQueryDisplay();
    syncResultsFade();
  };

  const setQuery = (next) => {
    state.query = next;
    applyFilter();
  };

  const setAriaLabels = () => {
    const labels = indexLabels(lang());
    if (!labels?.title) return;
    if (title) title.textContent = labels.title;
    curtain.setAttribute("aria-label", labels.title);
  };

  const render = (code = lang()) => {
    state.mediaByProject = null;
    state.query = "";
    clearSelection();
    if (state.mobile) {
      results.replaceChildren();
      state.resultNodes = [];
      state.resultById = new Map();
      state.activeEl = null;
    } else {
      buildResults(projectIndex(code));
    }
    syncColophon(code);
    setAriaLabels();
    applyFilter();
  };

  const setOpen = (open) => {
    if (state.mobile && open) return;
    if (state.open === open) return;
    state.open = open;
    // Measure before overflow:hidden so archive columns match the home frame
    if (open) setScrollbarComp(window.innerWidth - document.documentElement.clientWidth);
    html.classList.toggle("is-index-open", open);
    if (!open) setScrollbarComp(0);
    curtain.setAttribute("aria-hidden", open ? "false" : "true");
    state.query = "";

    if (open) {
      clearGate();
      curtain.removeAttribute("inert");
      results.scrollTop = 0;
      if (!state.resultNodes.length) buildResults(projectIndex(lang()));
      ensureMedia();
      syncColophon();
      requestAnimationFrame(syncResultsFade);
    } else {
      curtain.setAttribute("inert", "");
      clearSelection();
    }

    applyFilter();
    setAriaLabels();
    syncGateDisplay();
    onOpenChange?.(open);
  };

  const onMobileChange = () => {
    const wasMobile = state.mobile;
    state.mobile = mobileMq.matches;
    if (state.mobile && state.open) setOpen(false);
    if (state.mobile) clearGate();
    if (wasMobile !== state.mobile) render();
    else syncGateDisplay();
  };

  const onCurtainClick = (e) => {
    if (!state.open || state.mobile) return;
    if (e.target.closest(CLOSE_IGNORE)) return;
    setOpen(false);
  };

  const resultFromEvent = (e) => {
    const el = e.target.closest(".index-result");
    if (!el || !results.contains(el) || el.hidden) return null;
    return el;
  };

  const pointerOverPreview = (x = lastPointer.x, y = lastPointer.y) => {
    if (!previewMedia) return false;
    const under = document.elementFromPoint(x, y);
    return !!(under && previewMedia.contains(under));
  };

  const trackPointer = (e) => {
    lastPointer = { x: e.clientX, y: e.clientY };
  };

  const onKeydown = (e) => {
    if (state.mobile) return;
    if (e.target.closest?.("input, textarea, select, [contenteditable]")) return;

    const typing = isQueryTyping();
    const surface = activeQueryEl();
    const value = activeQueryValue();

    if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "a") {
      if (!typing) return;
      e.preventDefault();
      if (value) selectQueryContents(surface);
      return;
    }

    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (state.open && (e.key === "Enter" || e.key === " ")) {
      const el = e.target.closest?.(".index-result");
      if (el && results.contains(el) && !el.hidden) {
        e.preventDefault();
        selectProject(el.dataset.project);
        return;
      }
    }

    const range = querySelectionRange(surface);

    if (e.key === "Escape" && !range) {
      if (state.open) {
        e.preventDefault();
        if (state.query) setQuery("");
        else setOpen(false);
        return;
      }
      if (!state.gate) return;
      e.preventDefault();
      clearGate();
      return;
    }

    const result = resolveQueryInput({
      key: e.key,
      value,
      range,
      canOpen: !state.open
    });
    if (result == null) return;
    e.preventDefault();
    if (result === "open") setOpen(true);
    else commitQuery(result.next);
  };

  results.addEventListener("scroll", scheduleFade, { passive: true });
  if ("ResizeObserver" in window) {
    new ResizeObserver(scheduleFade).observe(results);
  } else {
    window.addEventListener("resize", scheduleFade, { passive: true });
  }

  results.addEventListener(
    "pointermove",
    (e) => {
      trackPointer(e);
      scheduleHover();
    },
    { passive: true }
  );
  results.addEventListener("pointerleave", (e) => {
    trackPointer(e);
    if (state.overPreview) return;
    // Wide preview can sit under the cursor without firing pointerenter.
    if (pointerOverPreview(e.clientX, e.clientY)) {
      state.overPreview = true;
      return;
    }
    clearHover();
  });
  results.addEventListener("focusin", (e) => {
    const el = resultFromEvent(e);
    if (el) setHover(el.dataset.project);
  });
  results.addEventListener("focusout", (e) => {
    if (state.overPreview) return;
    const next = e.relatedTarget;
    if (next && results.contains(next)) return;
    if (results.matches(":hover")) return;
    if (pointerOverPreview()) {
      state.overPreview = true;
      return;
    }
    clearHover();
  });
  results.addEventListener("click", (e) => {
    const el = resultFromEvent(e);
    if (el) selectProject(el.dataset.project);
  });

  if (previewMedia) {
    previewMedia.addEventListener("pointerenter", () => {
      state.overPreview = true;
    });
    previewMedia.addEventListener("pointerleave", () => {
      state.overPreview = false;
      if (
        !results.matches(":hover") &&
        !results.contains(document.activeElement)
      ) {
        clearHover();
      }
    });
  }

  document.addEventListener("keydown", onKeydown);

  curtain.querySelector(".brand-name")?.addEventListener("click", (e) => {
    e.preventDefault();
    setOpen(false);
    scrollToTop();
  });

  bindLangButtons(
    [colophon.langPrimary, colophon.langSecondary],
    (target) => onLanguageChange?.(target)
  );

  curtain.addEventListener("click", onCurtainClick);

  if (typeof mobileMq.addEventListener === "function") {
    mobileMq.addEventListener("change", onMobileChange);
  } else {
    mobileMq.addListener?.(onMobileChange);
  }

  window.setTimeout(() => {
    state.cueReady = true;
    syncGateDisplay();
  }, HINT_DELAY_MS);

  onMobileChange();
  render();
  onLanguageBound?.((code) => render(code));

  return {
    open: () => setOpen(true),
    close: () => setOpen(false),
    isOpen: () => state.open
  };
}
