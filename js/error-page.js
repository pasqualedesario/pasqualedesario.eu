/** 404 page — clock/weather shared; Agip/Fiat face for the code. */
import { $, whenIdle, bindLangButtons, scrollbarWidth, setScrollbarComp } from "./utils.js";
import { createColophonClock, fetchTerlizziWeather } from "./time.js";

setScrollbarComp(scrollbarWidth());

const FACES = Object.freeze([
  { className: "is-query-agip", family: '"Agip 77"' },
  { className: "is-query-fiat", family: '"LL Fiat 77 Ritmo"' }
]);

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

const readLangParam = () => {
  const v = new URLSearchParams(location.search).get("lang");
  return v === "en" || v === "it" ? v : null;
};

const langText = (el, code) => {
  if (!el) return "";
  return el.getAttribute(`data-${code}`) || "";
};

const configureLangButton = (btn, cfg) => {
  if (!btn || !cfg) return;
  btn.textContent = cfg.text;
  btn.dataset.targetLang = cfg.target;
  btn.setAttribute("aria-label", `Set language ${cfg.text}`);
};

const heading = $("error-heading");
const homeLink = $("error-home-link");
const typographyLabel = $("error-typography-label");
const langPrimary = $("error-lang-primary");
const langSecondary = $("error-lang-secondary");
const code = $("error-code");

let lang =
  readLangParam() ||
  (document.documentElement.lang === "en" ? "en" : "it");

const writeUrl = (next) => {
  const url = new URL(location.href);
  url.searchParams.set("lang", next);
  history.replaceState(null, "", url);
};

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
  writeUrl(next);
};

const bindFace = () => {
  if (!code) return;
  const face = FACES[(Math.random() * FACES.length) | 0];
  code.classList.add(face.className);
  const warm = () => document.fonts?.load?.(`400 80px ${face.family}`).catch(() => {});
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(warm, { timeout: 2000 });
  } else {
    window.setTimeout(warm, 1);
  }
};

const clock = createColophonClock({
  time: "error-colophon-time",
  date: "error-colophon-date"
});

bindFace();
applyLanguage(lang);
bindLangButtons([langPrimary, langSecondary], (target) => {
  if (target !== lang) applyLanguage(target);
});

clock.start();
document.addEventListener("visibilitychange", () => {
  if (document.hidden) clock.stop();
  else clock.start();
});

whenIdle(() => fetchTerlizziWeather("error-colophon-weather"));
