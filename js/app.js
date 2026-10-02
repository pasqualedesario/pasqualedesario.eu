/**
 * Site runtime — carousel · i18n · archive · Terlizzi clock/weather.
 */
import { createCarousel } from "./carousel.js";
import { createIndexPanel } from "./index-panel.js";
import { applyLanguage, TRANSLATIONS } from "./i18n.js";
import { createColophonClock, fetchTerlizziWeather } from "./time.js";
import {
  $,
  COLOPHON,
  MQ,
  onMediaChange,
  whenIdle,
  bindLangButtons,
  scrollToTop,
  tryCreate
} from "./utils.js";

if ("scrollRestoration" in history) history.scrollRestoration = "manual";
window.scrollTo(0, 0);

const ARCHIVE_HASH = "archive";
const ARCHIVE_HASHES = new Set(["archive", "archivio"]);

const readHash = () => location.hash.replace(/^#/, "").toLowerCase();

const readLangParam = () => {
  const v = new URLSearchParams(location.search).get("lang");
  return v === "en" || v === "it" ? v : null;
};

/** Legacy site used #it / #en for language; migrate into ?lang=. */
const readLegacyLangHash = () => {
  const h = readHash();
  return h === "en" || h === "it" ? h : null;
};

const hasArchiveHash = () => ARCHIVE_HASHES.has(readHash());

const dom = {
  carousel: document.querySelector(".inline-carousel"),
  hero: document.querySelector(".stack-section--white"),
  introStart: $("intro-text-start"),
  introExpand: $("intro-expand"),
  introSmall: document.querySelectorAll(".intro-text-start-small"),
  skipLink: document.querySelector(".skip-link"),
  langBtnPrimary: $("lang-btn-primary"),
  langBtnSecondary: $("lang-btn-secondary"),
  brandLinks: document.querySelectorAll(".brand-name"),
  labels: {
    servizi: $("label-servizi"),
    formazione: $("label-formazione"),
    esperienza: $("label-esperienza"),
    ricerche: $("label-ricerche"),
    contact: $("label-contact-sec3"),
    piattaforme: $("label-piattaforme")
  },
  values: {
    servizi: $("val-servizi"),
    formazione: $("val-formazione"),
    esperienza: $("val-esperienza"),
    ricerche: $("val-ricerche"),
    credit: $("colophon-credit"),
    typography: $("colophon-typography")
  }
};

const legacyLang = readLegacyLangHash();
let lang =
  readLangParam() ||
  legacyLang ||
  (document.documentElement.lang === "en" ? "en" : "it");
let aboutExpanded = false;
const languageListeners = [];
const mobileMq = window.matchMedia(MQ.mobile);

const writeUrl = ({ lang: nextLang = lang, archive = index?.isOpen() } = {}) => {
  const url = new URL(location.href);
  url.searchParams.set("lang", nextLang);
  url.hash = archive ? ARCHIVE_HASH : "";
  history.replaceState(null, "", url);
};

/** Desktop: full bio. Mobile: short + optional expand. */
const syncAbout = (code = lang) => {
  const t = TRANSLATIONS[code];
  if (!t) return;
  const mobile = mobileMq.matches;
  const expanded = mobile && aboutExpanded;
  if (dom.introStart) {
    dom.introStart.textContent = !mobile || expanded ? t.aboutFull : t.aboutShort;
  }
  dom.introSmall?.forEach((el) => {
    el.textContent = mobile ? t.aboutShort : t.aboutFull;
  });
  if (dom.introExpand) {
    dom.introExpand.hidden = !mobile;
    dom.introExpand.textContent = aboutExpanded ? t.aboutCollapse : t.aboutExpand;
    dom.introExpand.setAttribute("aria-expanded", aboutExpanded ? "true" : "false");
  }
  dom.hero?.classList.toggle("is-about-expanded", expanded);
};

const liveClock = createColophonClock({
  time: COLOPHON.time,
  date: COLOPHON.date
});
liveClock.start();

const carousel = tryCreate("carousel", () =>
  createCarousel(dom.carousel, { getLang: () => lang })
);

const notifyLanguage = () => {
  carousel?.updateFooter(true);
  syncAbout();
  for (const fn of languageListeners) fn(lang);
};

const setLanguage = (next) => {
  if (!next || next === lang) return;
  lang = next;
  applyLanguage(dom, lang, notifyLanguage);
  writeUrl({ lang: next });
};

const index = tryCreate("archive", () =>
  createIndexPanel({
    getLang: () => lang,
    onLanguageBound: (fn) => languageListeners.push(fn),
    onLanguageChange: setLanguage,
    onOpenChange: (open) => writeUrl({ archive: open })
  })
);

applyLanguage(dom, lang, () => {
  carousel?.updateFooter(true);
  syncAbout();
});
if (hasArchiveHash()) index?.open();
writeUrl({ archive: Boolean(index?.isOpen()) });

window.addEventListener("hashchange", () => {
  const want = hasArchiveHash();
  if (want && !index?.isOpen()) {
    index?.open();
    // Archive is desktop-only: drop hash if open was a no-op.
    if (!index?.isOpen()) writeUrl({ archive: false });
  } else if (!want && index?.isOpen()) {
    index?.close();
  } else if (want) {
    writeUrl({ archive: true });
  }
});

for (const link of dom.brandLinks) {
  link.addEventListener("click", (e) => {
    if (link.closest("#index-curtain")) return;
    e.preventDefault();
    scrollToTop();
  });
}

dom.introExpand?.addEventListener("click", () => {
  aboutExpanded = !aboutExpanded;
  syncAbout();
});

onMediaChange(mobileMq, () => {
  if (!mobileMq.matches) aboutExpanded = false;
  syncAbout();
});

bindLangButtons([dom.langBtnPrimary, dom.langBtnSecondary], setLanguage);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) liveClock.stop();
  else liveClock.start();
});

whenIdle(() => fetchTerlizziWeather(COLOPHON.weather));
