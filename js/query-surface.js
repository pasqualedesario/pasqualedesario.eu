/** Shared query typing surfaces (site gate + archive filter). */

const OPEN_KEYWORDS = new Set(["archivio", "archive"]);

const QUERY_FACES = Object.freeze([
  { className: "is-query-agip", family: '"Agip 77"' },
  { className: "is-query-fiat", family: '"LL Fiat 77 Ritmo"' }
]);

const pickQueryFace = () =>
  QUERY_FACES[(Math.random() * QUERY_FACES.length) | 0];

const queryTextNode = (el) => el?.querySelector(".query-text") ?? null;

export const normalizeQuery = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const isOpenKeyword = (value) =>
  OPEN_KEYWORDS.has(normalizeQuery(value));

const editText = (value, key) => {
  if (key === "Backspace") return value.slice(0, -1);
  if (key === "Enter") return value + "\n";
  if (key.length === 1) return value + key;
  return null;
};

export const paintQuerySurface = (el, { show, text, reduceMotion = false }) => {
  if (!el) return;
  el.hidden = !show;
  el.toggleAttribute("aria-hidden", !show);
  if (!show) {
    el.classList.remove("is-caret-blink");
    return;
  }
  if (!text) {
    el.classList.toggle("is-caret-blink", !reduceMotion);
    el.replaceChildren();
    const caret = document.createElement("span");
    caret.className = "query-caret";
    caret.setAttribute("aria-hidden", "true");
    el.appendChild(caret);
    return;
  }
  el.classList.remove("is-caret-blink");
  let node = el.firstElementChild?.classList.contains("query-text")
    ? el.firstElementChild
    : null;
  if (!node) {
    el.replaceChildren();
    node = document.createElement("span");
    node.className = "query-text";
    el.appendChild(node);
  }
  if (node.textContent !== text) node.textContent = text;
};

export const selectQueryContents = (el) => {
  const node = queryTextNode(el);
  if (!node?.firstChild) return false;
  const range = document.createRange();
  range.selectNodeContents(node);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
  return true;
};

/** Character offsets of the current selection inside a query surface, or null. */
export const querySelectionRange = (el) => {
  const node = queryTextNode(el);
  if (!node) return null;
  const sel = window.getSelection();
  if (!sel?.rangeCount || sel.isCollapsed) return null;
  if (!node.contains(sel.anchorNode) || !node.contains(sel.focusNode)) return null;
  const range = sel.getRangeAt(0);
  const pre = range.cloneRange();
  pre.selectNodeContents(node);
  pre.setEnd(range.startContainer, range.startOffset);
  const start = pre.toString().length;
  return { start, end: start + range.toString().length };
};

const spliceSelection = (value, range, insert) => {
  if (!range) return insert;
  return value.slice(0, range.start) + insert + value.slice(range.end);
};

/**
 * Resolve a key against the active query (+ optional selection).
 * @returns {"open" | { next: string } | null}
 */
export const resolveQueryInput = ({ key, value, range, canOpen }) => {
  if (range) {
    const coversAll = range.start === 0 && range.end === value.length;
    if (key === "Backspace" || key === "Delete") {
      return { next: spliceSelection(value, range, "") };
    }
    if (key === "Enter") {
      if (canOpen && coversAll && isOpenKeyword(value)) return "open";
      return { next: spliceSelection(value, range, "\n") };
    }
    if (key === "Escape") return { next: "" };
    if (key.length === 1) return { next: spliceSelection(value, range, key) };
    return null;
  }

  if (key === "Enter") {
    if (canOpen && isOpenKeyword(value)) return "open";
    return { next: value + "\n" };
  }

  if (key === "Backspace" && !value) return null;

  const next = editText(value, key);
  return next == null ? null : { next };
};

/** Assign Agip or Fiat for this session; warm the face after first paint. */
export const bindQueryFace = (...els) => {
  const { className, family } = pickQueryFace();
  for (const el of els) el?.classList.add(className);
  const warm = () => document.fonts?.load?.(`400 80px ${family}`).catch(() => {});
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(warm, { timeout: 2000 });
  } else {
    window.setTimeout(warm, 1);
  }
};

export const setQueryTyping = (on, html = document.documentElement) => {
  html.classList.toggle("is-query-typing", on);
};
