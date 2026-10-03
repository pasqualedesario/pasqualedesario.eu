/** 404 page — clock/weather shared; Agip/Fiat face for the code. */
import {
  $,
  bindLangButtons,
  scrollbarWidth,
  setScrollbarComp,
  readLangParam,
  writeLangUrl,
  configureLangButton,
  bindQueryFace
} from "./utils-shared.js";
import { createColophonClock, bindTerlizziWeather } from "./time.js";

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

const applyErrorLanguage = (next) => {
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
  if (homeLink) homeLink.href = next === "en" ? "/?lang=en" : "/";

  const ui = LANG_UI[next];
  configureLangButton(langPrimary, ui.primary);
  configureLangButton(langSecondary, ui.secondary);
  writeLangUrl(next);
};

bindQueryFace(code);
applyErrorLanguage(lang);
bindLangButtons([langPrimary, langSecondary], (target) => {
  if (target !== lang) applyErrorLanguage(target);
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
