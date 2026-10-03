/*! Pasquale de Sario — main.js from js/*.js */
(function () {
'use strict';

/* === utils.js === */
/** Shared DOM / runtime helpers (zero-framework). */

const $ = (id) => document.getElementById(id);

const MQ = Object.freeze({
  mobile: "(max-width: 999px)",
  reduceMotion: "(prefers-reduced-motion: reduce)",
  finePointer: "(hover: hover) and (pointer: fine)"
});

/** `?lang=it|en` from the URL, or null. */
const readLangParam = () => {
  const v = new URLSearchParams(location.search).get("lang");
  return v === "en" || v === "it" ? v : null;
};

/** Keep default locale clean (`/` not `/?lang=it`). Optional hash (e.g. archive). */
const writeLangUrl = (lang, { hash = null } = {}) => {
  const url = new URL(location.href);
  if (lang === "it") url.searchParams.delete("lang");
  else url.searchParams.set("lang", lang);
  if (hash != null) url.hash = hash;
  history.replaceState(null, "", url);
};

/** Wire a language toggle button from `{ text, target }`. */
const configureLangButton = (btn, cfg) => {
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
const bindQueryFace = (...els) => {
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
const scrollbarWidth = () => {
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
const setScrollbarComp = (px) => {
  document.documentElement.style.setProperty("--sbw", `${Math.max(0, px | 0)}px`);
};

/** Coalesce work onto the next animation frame (scroll / resize / pointer). */
const rafSchedule = (fn) => {
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
const onMediaChange = (mq, fn) => {
  if (typeof mq.addEventListener === "function") mq.addEventListener("change", fn);
  else mq.addListener?.(fn);
};

/** Resolve element ids (or nodes) to a live element list. */
const nodesFor = (ids) =>
  (Array.isArray(ids) ? ids : [ids])
    .filter(Boolean)
    .map((id) => (typeof id === "string" ? $(id) : id))
    .filter(Boolean);

/** Paired home + archive colophon element ids. */
const COLOPHON = Object.freeze({
  time: Object.freeze(["colophon-time", "index-colophon-time"]),
  date: Object.freeze(["colophon-date", "index-colophon-date"]),
  weather: Object.freeze(["colophon-weather", "index-colophon-weather"])
});

const escapeHtml = (s) =>
  String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Wrap digit runs for tabular figures; leave punctuation proportional. */
const wrapTnum = (value) =>
  String(value || "").replace(/\d+/g, (digits) => `<span class="tnum">${digits}</span>`);

const pauseVideos = (root) => {
  root?.querySelectorAll("video").forEach((video) => {
    try {
      video.pause();
    } catch {
      /* ignore */
    }
  });
};

/** Fisher–Yates shuffle; mutates and returns the array. */
const shuffleInPlace = (items) => {
  for (let i = items.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
};

/**
 * Defer non-critical work past first paint / interaction.
 * Prefer requestIdleCallback (bounded); fall back to postTask + hard timeout.
 */
const whenIdle = (fn, timeout = 2500) => {
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    fn();
  };

  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(run, { timeout });
    return;
  }
  // Avoid delay:0 during carousel boot — give the main thread a short breath.
  if (typeof scheduler?.postTask === "function") {
    scheduler
      .postTask(run, { priority: "background", delay: 400 })
      .catch(run);
  } else {
    window.setTimeout(run, 1);
  }
  window.setTimeout(run, timeout);
};

const scrollToTop = (behavior = "smooth") => {
  window.scrollTo({ top: 0, behavior });
};

/** Wire language toggle buttons (dataset.targetLang). */
const bindLangButtons = (buttons, onChange) => {
  for (const btn of buttons) {
    btn?.addEventListener("click", (e) => {
      e.stopPropagation();
      const target = btn.dataset.targetLang;
      if (target) onChange?.(target);
    });
  }
};

/** Run a factory; log and return null on failure. */
const tryCreate = (label, fn) => {
  try {
    return fn();
  } catch (err) {
    console.error(`[${label}]`, err);
    return null;
  }
};

/* === i18n.js === */
/** Bilingual copy — single source of truth for home + archive + carousel. */

const THIN = "\u2009";
const HAIR = "\u200A";
const NBSP = "\u00A0";
const PLUS = `${HAIR}<span class="plus">+</span>${HAIR}`;
const EM = `${THIN}<span class="dash">\u2014</span>${THIN}`;
const EN = "\u2013";
const SLASH = `${HAIR}/${HAIR}`;

/** Keep school-name tails together (text-wrap:pretty is incomplete in links). */
const SCHOOL = Object.freeze({
  iuavIt: `Università Iuav${NBSP}di${NBSP}Venezia`,
  polibaIt: `Politecnico${NBSP}di${NBSP}Bari`,
  iuavEn: `Iuav University${NBSP}of${NBSP}Venice`,
  polibaEn: `Polytechnic${NBSP}of${NBSP}Bari`
});

const ext = (href, html) =>
  `<a href="${href}" target="_blank" rel="noopener noreferrer">${html}</a>`;

const colophonLines = (...lines) =>
  lines.map((html) => `<div class="colophon-line">${html}</div>`).join("");

const HREF = Object.freeze({
  mtf: "https://meme-things-first.github.io/MTF/",
  iuav: "https://www.iuav.it",
  poliba: "https://www.poliba.it/",
  bruno: "https://www.b-r-u-n-o.it/",
  sos: "https://www.lascuolaopensource.xyz/",
  mtd: "https://www.lascuolaopensource.xyz/it/attivita/molecular-type-design",
  dinamo: "https://abcdinamo.com/",
  lineto: "https://lineto.com/",
  alelaie: "https://www.instagram.com/p/DEAFcCboJDO",
  ar: "https://www.instagram.com/p/DMsBdTpI6SL"
});

const em = (html) => `<em>${html}</em>`;

/** Recurring supervision credit for bruno studio. */
const BRUNO_SUP = `${ext(HREF.bruno, "bruno")} (Andrea Codolo &amp; Giacomo Covacich)`;
const linked = (href, html) => ext(href, em(html));

/** Apex degree note after a research title in the curtain. */
const degreeNote = (label) =>
  `<sup class="research-degree">${label}</sup>`;

const MTF = Object.freeze({
  it: `Meme Things First${EM}Design tra politica, educazione e memetica`,
  en: `Meme Things First${EM}Design between politics, education and memetics`
});

const MC_TITLE = "Mimmo Castellano: furor graphicus";
/** Desktop soft break after IT name / EN colon; degree note ends the title. */
const VECCHI = Object.freeze({
  it: Object.freeze({
    head: "Il caso studio del tipografo-editore Valdemaro Vecchi",
    tail: "e la stampa a caratteri mobili nel progetto contemporaneo"
  }),
  en: Object.freeze({
    head: "Typographer-Publisher Valdemaro Vecchi:",
    tail: "A Case Study on Movable Type in Contemporary Design"
  })
});
const BR_DESKTOP = '<br class="title-break-desktop">';
/** Space before break so mobile (br hidden) still separates the two halves. */
const vecchiTitleEm = (lang) => {
  const { head, tail } = VECCHI[lang] || VECCHI.it;
  return em(`${head} ${BR_DESKTOP}${tail}`);
};
const vecchiResearchLine = (lang, bachelorLabel) => {
  const { head, tail } = VECCHI[lang] || VECCHI.it;
  return `${em(head)} ${BR_DESKTOP}${em(tail)}${degreeNote(bachelorLabel)}`;
};

/** Re-inject desktop soft-break after plain-text archive titles (HTML stripped). */
const withDesktopTitleBreak = (html) =>
  String(html || "").replace(/(Valdemaro Vecchi:?)\s+/, `$1 ${BR_DESKTOP}`);

const DEGREE = Object.freeze({
  master: Object.freeze({ it: "Tesi magistrale", en: "MA Thesis" }),
  bachelor: Object.freeze({ it: "Tesi triennale", en: "BA Thesis" })
});

const RESEARCH_LINES = Object.freeze({
  it: [
    ext(HREF.mtf, em(MTF.it)),
    `${em(MC_TITLE)}${degreeNote(DEGREE.master.it)}`,
    vecchiResearchLine("it", DEGREE.bachelor.it)
  ].join("<br>"),
  en: [
    ext(HREF.mtf, em(MTF.en)),
    `${em(MC_TITLE)}${degreeNote(DEGREE.master.en)}`,
    vecchiResearchLine("en", DEGREE.bachelor.en)
  ].join("<br>")
});

/** Servizi curtain = SERVICE_IDS only. Archive tags may also use extras below. */
const SERVICE_IDS = Object.freeze([
  "artDirection",
  "visualIdentity",
  "publishing",
  "graphicDesign",
  "typeDesign",
  "informationDesign",
  "webDesign"
]);

const TAGS = Object.freeze({
  artDirection: { it: "Art Direction", en: "Art Direction" },
  visualIdentity: { it: "Identità visiva", en: "Visual Identity" },
  publishing: { it: "Editoria", en: "Publishing" },
  graphicDesign: { it: "Graphic Design", en: "Graphic Design" },
  typeDesign: { it: "Type Design", en: "Type Design" },
  informationDesign: { it: "Information Design", en: "Information Design" },
  webDesign: {
    it: `Web Design${PLUS}Development`,
    en: `Web Design${PLUS}Development`
  },
  photography: { it: "Fotografia", en: "Photography" },
  research: { it: "Ricerca", en: "Research" },
  manifesto: { it: "Manifesto", en: "Manifesto" },
  curation: { it: "Curatela", en: "Curation" },
  artwork: { it: "Artwork", en: "Artwork" },
  lettering: { it: "Lettering", en: "Lettering" },
  exhibitDesign: { it: "Exhibit Design", en: "Exhibit Design" },
  soundDesign: { it: "Sound Design", en: "Sound Design" }
});

const serviziList = (lang) =>
  SERVICE_IDS.map((id) => TAGS[id][lang]).join("<br>");

const tagLabels = (tags, lang) =>
  (tags || [])
    .map((id) => TAGS[id]?.[lang])
    .filter(Boolean);

const tagSearchText = (tags) =>
  (tags || [])
    .flatMap((id) => {
      const t = TAGS[id];
      return t ? [t.it, t.en] : [];
    })
    .join(" ");

const FONTS = `${ext(HREF.dinamo, "ABC Monument Grotesk")} <span class="plus">+</span> ${ext(HREF.lineto, "LL Fiat77")} <span class="plus">+</span> ${ext(HREF.lineto, "Agip77LL")}`;

const SHARED = Object.freeze({
  esperienza: `${ext(HREF.bruno, "bruno")}<br>${ext(HREF.sos, "La Scuola Open Source")}`,
  credit: colophonLines(
    `Design <span class="plus">+</span> Development:`,
    "Pasquale de Sario (2026)"
  ),
  typographyIt: colophonLines("Composto in:", FONTS),
  typographyEn: colophonLines("Typeset in:", FONTS),
  serviziEn: serviziList("en"),
  serviziIt: serviziList("it")
});

/** Project catalog for a locale (`con` | `with`). Fields: year, title, per, degree, con, sup, tags. */
function projects(collab) {
  const it = collab === "con";

  return {
    pf: {
      year: "2026",
      title: em("Pergine Festival 2026"),
      per: "",
      con: "Donato Loforese",
      tags: ["visualIdentity", "artDirection"]
    },
    mlbl: {
      year: "2026",
      title: em("Molecular Blackletter"),
      per: `SOS, ${ext(HREF.mtd, "Molecular Type Design")}`,
      con: "",
      sup: "Alberto Guerra, Puria Nafisi, Alessandro Tartaglia",
      tags: ["typeDesign"]
    },
    mr: {
      year: "2025",
      title: em("Morning Rituals 2025"),
      per: ext(HREF.bruno, "bruno"),
      con: "",
      sup: BRUNO_SUP,
      tags: ["graphicDesign", "photography"]
    },
    mc: {
      year: "2025",
      title: em(MC_TITLE),
      per: "Iuav",
      degree: it ? DEGREE.master.it : DEGREE.master.en,
      con: "",
      sup: "Monica Pastore, Fiorella Bulegato",
      tags: ["publishing", "research"]
    },
    vv: {
      year: "2023",
      title: vecchiTitleEm(it ? "it" : "en"),
      per: "PoliBa",
      degree: it ? DEGREE.bachelor.it : DEGREE.bachelor.en,
      con: "",
      sup: "Antonio Labalestra, Marco Pietrosante",
      tags: ["research", "publishing"]
    },
    sm: {
      year: "2024",
      title: em(`Singolarità multiple. Esoeditoria in Italia 1920\u20131980`),
      per: "Iuav",
      con: "Jolanda Baudino, Chiara Lorenzo, Irene Mazzoleni",
      sup: "Fiorella Bulegato, Valentina Nitti",
      tags: ["publishing", "research"]
    },
    alelaie: {
      year: "2024",
      title: linked(HREF.alelaie, "Modernizzare stanca"),
      per: "Spazio Alelaie",
      con: "",
      tags: ["manifesto"]
    },
    "4v": {
      year: "2023",
      title: em("4VISIONS. Esplorazioni sonore"),
      per: "MAT",
      con: "",
      tags: ["visualIdentity"]
    },
    mtf: {
      year: `2024${EN}2026`,
      title: linked(HREF.mtf, it ? MTF.it : MTF.en),
      per: "Iuav",
      con: "Rebecca Bertero, Serena De Mola",
      tags: ["visualIdentity", "publishing", "webDesign", "research", "curation"]
    },
    bp: {
      year: "2024",
      title: em("Biennale Parola"),
      per: "Iuav",
      con: "Giulia Gatta, Tommaso Antonelli",
      sup: "Luciano Perondi, Bruno Calza",
      tags: ["publishing", "informationDesign"]
    },
    ar: {
      year: "2025",
      title: linked(HREF.ar, it ? "La dimora del Minotauro" : "The Minotaur’s abode"),
      per: "Apparati Radicali",
      con: "",
      sup: `Noemi Biasetton, ${BRUNO_SUP}`,
      tags: ["publishing", "artwork"]
    },
    forma: {
      year: "2023",
      title: em("Forma"),
      per: "MAT",
      con: "",
      tags: ["visualIdentity", "lettering"]
    },
    ermes: {
      year: "2022",
      title: em("Ermes"),
      per: "PoliBa",
      con: "",
      sup: "Michele Colonna, Enzo Ruta",
      tags: ["typeDesign"]
    },
    ic: {
      year: "2021",
      title: em("L'incendio della casa abominevole"),
      per: "PoliBa",
      con: "Marcella Carlucci, Erasmo Giove",
      sup: "Nino Perrone, Vito Battista",
      tags: ["informationDesign", "publishing"]
    },
    serenissima: {
      year: "2024",
      title: em("Serenissima"),
      per: "Iuav",
      con: "Andrea Pintauro",
      sup: "Nicola Di Croce",
      tags: ["publishing", "photography", "soundDesign"]
    },
    em: {
      year: "2022",
      title: em("La creatività è una merda"),
      per: it ? "Omaggio a Enzo Mari" : "Homage to Enzo Mari",
      con: "",
      tags: ["manifesto"]
    },
    mm: {
      year: "2024",
      title: em("M.I.S.T.A.K.E.S."),
      per: "Posterheroes",
      con: "",
      tags: ["manifesto"]
    },
    mag: {
      year: "2024",
      title: em("Il magazzino dei destini incrociati"),
      per: "Iuav",
      con: "Tommaso Antonelli, Alessio Costantini, Andrea Pintauro",
      sup: "Gianni Sinni, Irene Sgarro",
      tags: ["informationDesign", "publishing"]
    },
    chiomarosa: {
      year: "2025",
      title: em("Chiomarosa"),
      per: ext(HREF.bruno, "bruno"),
      con: "",
      sup: BRUNO_SUP,
      tags: ["graphicDesign", "photography"]
    },
    supernico: {
      year: "2026",
      title: em("SUPERNICO"),
      per: "",
      con: "Donato Loforese",
      tags: ["visualIdentity", "artDirection"]
    },
    matteatro: {
      year: "2023",
      title: em(it ? "MAT teatro" : "MAT theatre"),
      per: it
        ? `Comune di Terlizzi, Collettivo Zebù, MAT laboratorio urbano<br>Illustrazioni: Almanacco Press`
        : `Comune di Terlizzi, Collettivo Zebù, MAT laboratorio urbano<br>Illustrations: Almanacco Press`,
      con: "",
      tags: ["graphicDesign"]
    },
    cgil: {
      year: "2023",
      title: em(it ? "VI Congresso CGIL Bari" : "6th CGIL Bari Congress"),
      per: it
        ? `CGIL Bari<br>Illustrazioni: Almanacco Press`
        : `CGIL Bari<br>Illustrations: Almanacco Press`,
      con: "",
      tags: ["exhibitDesign"]
    },
    musa: {
      year: "2023",
      title: em("Musa"),
      per: it
        ? `Musa${HAIR}<span class="dash">${EN}</span>${HAIR}Storie d’aperitivo<br>Illustrazioni: Émile<span class="dash">-</span>Allain Séguy<br>Fotografie: Vito Lauciello`
        : `Musa${HAIR}<span class="dash">${EN}</span>${HAIR}Storie d’aperitivo<br>Illustrations: Émile<span class="dash">-</span>Allain Séguy<br>Photographs: Vito Lauciello`,
      con: "",
      tags: ["artDirection", "graphicDesign"]
    }
  };
}

const TRANSLATIONS = Object.freeze({
  it: {
    langPrimary: { text: "Italiano", target: "it" },
    langSecondary: { text: "Inglese", target: "en" },
    skipLink: "Vai al contenuto",
    metaDescription:
      "Pasquale de Sario, designer e art director di base in Puglia. Tipografia, editoria, information e web design.",
    documentTitle: "Pasquale de Sario",
    ogLocale: "it_IT",
    indexLabels: {
      title: "Archivio",
      collab: "Con",
      supervision: "Supervisione"
    },
    // about* also mirrored in index.html early-boot (FOUC); keep in sync.
    aboutShort:
      "Designer e art director di base in Puglia.",
    aboutFull:
      "Designer e art director di base in Puglia. La sua pratica esplora tipografia, editoria, information e web design e tutte le modalità con le quali questi assi si interpolano nella costruzione dei sistemi visivi. Fonde curiosità e controllo, concentrandosi egualmente su processo ed esecuzione progettuale nello sviluppo di identità visive e spazi digitali per brand, istituzioni culturali e clienti privati. La sua ricerca è orientata anche alle storie del design, agli strumenti aperti e agli ecosistemi collettivi di apprendimento al di fuori delle mura istituzionali.",
    aboutExpand: "Espandi",
    aboutCollapse: "Comprimi",
    archiveCueDesktop:
      "Scrivi archivio e premi ↙ invio per visualizzare l’archivio completo",
    archiveCueMobile:
      "Esplora l’archivio completo sul sito desktop",
    projects: projects("con"),
    curtain: {
      serviziLabel: "Servizi",
      serviziValue: SHARED.serviziIt,
      formazioneLabel: "Formazione",
      formazioneValue: `Design della comunicazione @${ext(HREF.iuav, SCHOOL.iuavIt)}<br>Disegno industriale @${ext(HREF.poliba, SCHOOL.polibaIt)}`,
      esperienzaLabel: "Esperienza",
      esperienzaValue: SHARED.esperienza,
      ricercheLabel: "Ricerca",
      ricercheValue: RESEARCH_LINES.it,
      contactLabel: "Per progetti, collaborazioni e ulteriori info",
      piattaformeLabel: "Piattaforme",
      colophonCredit: SHARED.credit,
      colophonTypography: SHARED.typographyIt
    }
  },
  en: {
    langPrimary: { text: "English", target: "en" },
    langSecondary: { text: "Italian", target: "it" },
    skipLink: "Skip to content",
    metaDescription:
      "Pasquale de Sario, designer and art director based in Puglia, Italy. Typography, publishing, information and web design.",
    documentTitle: "Pasquale de Sario",
    ogLocale: "en_US",
    indexLabels: {
      title: "Archive",
      collab: "With",
      supervision: "Tutoring"
    },
    aboutShort:
      "Designer and art director based in Puglia, Italy.",
    aboutFull:
      "Designer and art director based in Puglia, Italy. His practice explores typography, publishing, information and web design and all the ways they interpolate each other within and without visual systems. His approach mixes curiosity and control, focusing equally on process and execution for the development of visual identities and digital spaces for brands, institutions and private clients. His research is also oriented towards design histories, open tools and learning collective ecosystems outside the institutional walls.",
    aboutExpand: "Expand",
    aboutCollapse: "Collapse",
    archiveCueDesktop:
      "Write archive and press ↙ enter to view the full archive",
    archiveCueMobile:
      "Explore the complete archive on desktop",
    projects: projects("with"),
    curtain: {
      serviziLabel: "Services",
      serviziValue: SHARED.serviziEn,
      formazioneLabel: "Education",
      formazioneValue: `Communication Design @${ext(HREF.iuav, SCHOOL.iuavEn)}<br>Industrial Design @${ext(HREF.poliba, SCHOOL.polibaEn)}`,
      esperienzaLabel: "Work experience",
      esperienzaValue: SHARED.esperienza,
      ricercheLabel: "Research",
      ricercheValue: RESEARCH_LINES.en,
      contactLabel: "Get in touch for job inquiries and more information",
      piattaformeLabel: "Platforms",
      colophonCredit: SHARED.credit,
      colophonTypography: SHARED.typographyEn
    }
  }
});

const TEXT_FIELDS = Object.freeze([
  ["servizi", "serviziLabel"],
  ["formazione", "formazioneLabel"],
  ["esperienza", "esperienzaLabel"],
  ["ricerche", "ricercheLabel"],
  ["contact", "contactLabel"],
  ["piattaforme", "piattaformeLabel"]
]);

const HTML_FIELDS = Object.freeze([
  ["servizi", "serviziValue"],
  ["formazione", "formazioneValue"],
  ["esperienza", "esperienzaValue"],
  ["ricerche", "ricercheValue"],
  ["credit", "colophonCredit"],
  ["typography", "colophonTypography"]
]);

const META_SELECTORS = Object.freeze([
  'meta[name="description"]',
  'meta[property="og:description"]',
  'meta[name="twitter:description"]'
]);

const syncDocumentMeta = (t) => {
  if (t.documentTitle) document.title = t.documentTitle;
  if (!t?.metaDescription) return;
  for (const sel of META_SELECTORS) {
    document.querySelector(sel)?.setAttribute("content", t.metaDescription);
  }
  if (t.ogLocale) {
    document
      .querySelector('meta[property="og:locale"]')
      ?.setAttribute("content", t.ogLocale);
  }
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const twTitle = document.querySelector('meta[name="twitter:title"]');
  if (t.documentTitle) {
    ogTitle?.setAttribute("content", t.documentTitle);
    twTitle?.setAttribute("content", t.documentTitle);
  }
};

function applyLanguage(dom, lang, onApplied) {
  const t = TRANSLATIONS[lang];
  if (!t) return;

  document.documentElement.lang = lang;
  syncDocumentMeta(t);

  configureLangButton(dom.langBtnPrimary, t.langPrimary);
  configureLangButton(dom.langBtnSecondary, t.langSecondary);
  if (dom.skipLink) dom.skipLink.textContent = t.skipLink;

  const { labels: L, values: V } = dom;
  const C = t.curtain;

  for (const [key, field] of TEXT_FIELDS) {
    if (L[key]) L[key].textContent = C[field];
  }
  for (const [key, field] of HTML_FIELDS) {
    if (V[key]) V[key].innerHTML = C[field];
  }

  onApplied?.();
}

function projectCopy(lang, projectId) {
  return TRANSLATIONS[lang]?.projects?.[projectId] ?? null;
}

/**
 * Carousel footer credits from structured `per` / `con`.
 * Multi-line `per` values use the first line only (archive shows the rest).
 * Home carousel shows collaborators only; archive also renders `sup`.
 */
const firstCreditLine = (html) =>
  String(html || "")
    .trim()
    .split(/<br\s*\/?>/i)[0]
    .trim();

function projectFooterPer(project) {
  const per = firstCreditLine(project?.per);
  const at = per ? `@${per}` : "";
  const degree = stripHtml(project?.degree);
  if (degree && at) return `${degree} ${at}`;
  return degree || at;
}

function projectFooterCon(project, collab = "Con") {
  const con = firstCreditLine(project?.con);
  return con ? `${collab}: ${con}` : "";
}

const stripHtml = (html) =>
  String(html || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/[\u2009\u200A\u2002\u00A0]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const indexCache = Object.create(null);

const yearSortKey = (year) => {
  const nums = String(year || "").match(/\d{4}/g);
  if (!nums?.length) return 0;
  return Math.max(...nums.map(Number));
};

/** Flat project rows for the archive index / keyboard filter. */
function projectIndex(lang) {
  const hit = indexCache[lang];
  if (hit) return hit;

  const catalog = TRANSLATIONS[lang]?.projects;
  if (!catalog) return [];

  const rows = Object.entries(catalog).map(([id, project]) => {
    const title = stripHtml(project.title);
    const per = stripHtml(project.per);
    const degree = stripHtml(project.degree);
    const con = stripHtml(project.con);
    const sup = stripHtml(project.sup);
    const year = stripHtml(project.year);
    const tagsSearch = stripHtml(tagSearchText(project.tags));
    return {
      id,
      title,
      year,
      yearKey: yearSortKey(year),
      search: `${title} ${year} ${degree} ${per} ${con} ${sup} ${tagsSearch}`.toLowerCase()
    };
  });

  rows.sort(
    (a, b) =>
      b.yearKey - a.yearKey ||
      a.title.localeCompare(b.title, lang === "en" ? "en" : "it", {
        sensitivity: "base"
      })
  );

  indexCache[lang] = rows;
  return rows;
}

function indexLabels(lang) {
  return TRANSLATIONS[lang]?.indexLabels ?? null;
}

/** Archive meta line: service tags joined with thin-space em dashes. */
function projectTagsHtml(tags, lang) {
  return tagLabels(tags, lang).join(EM);
}

/* === time.js === */
/** Terlizzi (Europe/Rome) live clock, date + weather. */

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
function createColophonClock({
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
async function fetchTerlizziWeather(targets) {
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
    // No custom headers → simple CORS request (avoids preflight on mobile networks).
    const res = await fetch(WEATHER_URL, { signal });
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

/* === carousel.js === */

/**
 * Infinite horizontal project carousel.
 * Active slide = last whose left edge ≤ scrollLeft.
 */
function createCarousel(root, { getLang } = {}) {
  if (!root) return null;

  const counter = $("gallery-counter");
  const year = $("gallery-year");
  const title = $("gallery-title");
  const per = $("gallery-per");
  const con = $("gallery-con");
  const reduceMotion = matchMedia(MQ.reduceMotion).matches;
  const finePointer = matchMedia(MQ.finePointer).matches;
  const BLUR_MAX = 18;

  const state = {
    slides: [],
    geometry: [],
    originalCount: 0,
    loopStart: 0,
    cycle: 0,
    active: -1,
    activeProject: "",
    jumping: false,
    bootstrapping: true,
    covered: false,
    rect: null,
    coverH: 0,
    lastBlur: -1,
    videoIO: null
  };

  const originals = () =>
    state.slides.filter((s) => !s.hasAttribute("data-loop-clone"));

  const cacheGeometry = () => {
    state.slides = [...root.children].filter((el) =>
      el.classList.contains("carousel-slide")
    );
    state.geometry = state.slides.map((slide) => slide.offsetLeft);

    const base = originals();
    state.originalCount = base.length;
    if (!base.length) {
      state.loopStart = 0;
      state.cycle = 0;
      return;
    }

    const firstAfter = state.slides.find(
      (s) => s.getAttribute("data-loop-clone") === "after"
    );
    state.loopStart = base[0].offsetLeft;
    const last = base.at(-1);
    state.cycle = firstAfter
      ? firstAfter.offsetLeft - state.loopStart
      : last.offsetLeft + last.offsetWidth - state.loopStart;
  };

  const setScrollInstant = (x) => {
    state.jumping = true;
    const prev = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    root.scrollLeft = x;
    root.style.scrollBehavior = prev;
    state.jumping = false;
  };

  const activePhysical = () => {
    const { geometry, slides } = state;
    if (!geometry.length) return null;
    const align = root.scrollLeft;
    let i = 0;
    for (let n = 0; n < geometry.length; n++) {
      if (geometry[n] <= align + 0.5) i = n;
      else break;
    }
    return slides[i] || null;
  };

  const updateFooter = (force = false) => {
    if (!state.geometry.length) return;
    const slide = activePhysical();
    const index = Number(slide?.dataset.originIndex);
    const logical = Number.isFinite(index) ? index : 0;
    const projectId = slide?.dataset.project || "";
    if (!force && logical === state.active) return;
    state.active = logical;

    if (counter) {
      counter.innerHTML = wrapTnum(
        `${logical + 1}${SLASH}${state.originalCount || state.geometry.length}`
      );
    }

    if (!force && projectId === state.activeProject) return;
    state.activeProject = projectId;

    const code = getLang?.() || "it";
    const copy = projectCopy(code, projectId);
    if (!copy) return;
    if (year) year.innerHTML = wrapTnum(copy.year || "");
    if (title) title.innerHTML = copy.title || "";
    const collab = indexLabels(code)?.collab || "Con";
    if (per) per.innerHTML = projectFooterPer(copy);
    if (con) con.innerHTML = projectFooterCon(copy, collab);
  };

  const goFirst = () => {
    cacheGeometry();
    setScrollInstant(state.loopStart || 0);
    state.active = -1;
    state.activeProject = "";
    updateFooter(true);
  };

  const scrollToLogical = (logical = state.active) => {
    cacheGeometry();
    if (!state.slides.length) return;
    const idx = Number.isFinite(logical) && logical >= 0 ? logical : 0;
    const slide =
      state.slides.find(
        (s) =>
          !s.hasAttribute("data-loop-clone") &&
          Number(s.dataset.originIndex) === idx
      ) || null;
    if (slide) setScrollInstant(slide.offsetLeft);
    else setScrollInstant(state.loopStart || 0);
  };

  const normalizeLoop = () => {
    if (state.jumping || !state.cycle) return;
    const { loopStart, cycle } = state;
    const x = root.scrollLeft;
    if (x >= loopStart + cycle - 1) setScrollInstant(x - cycle);
    else if (x <= 1) setScrollInstant(x + cycle);
  };

  const clearClones = () => {
    root.querySelectorAll(".carousel-slide[data-loop-clone]").forEach((el) => {
      el.remove();
    });
  };

  const prepareCloneMedia = (node) => {
    node.querySelectorAll("img").forEach((img) => {
      img.loading = "lazy";
      img.removeAttribute("fetchpriority");
      img.decoding = "async";
      const src = img.getAttribute("src");
      if (src && !img.dataset.src) {
        img.dataset.src = src;
        img.removeAttribute("src");
      }
    });
    node.querySelectorAll("video").forEach((video) => {
      video.removeAttribute("autoplay");
      video.preload = "none";
      video.pause();
      try {
        video.removeAttribute("src");
        video.querySelectorAll("source").forEach((source) => {
          if (source.dataset.src) return;
          source.dataset.src = source.getAttribute("src") || "";
          source.removeAttribute("src");
        });
        video.load();
      } catch {
        /* ignore */
      }
    });
  };

  const hydrateImg = (img) => {
    if (img.getAttribute("src") || !img.dataset.src) return;
    img.setAttribute("src", img.dataset.src);
  };

  const hydrateVideo = (video) => {
    let changed = false;
    for (const source of video.querySelectorAll("source")) {
      if (!source.getAttribute("src") && source.dataset.src) {
        source.setAttribute("src", source.dataset.src);
        changed = true;
      }
    }
    if (!video.getAttribute("src") && video.dataset.src) {
      video.setAttribute("src", video.dataset.src);
      changed = true;
    }
    if (changed || video.readyState === 0) video.load();
  };

  const cloneBank = (slides, side) => {
    const frag = document.createDocumentFragment();
    slides.forEach((slide, i) => {
      const node = slide.cloneNode(true);
      node.setAttribute("data-loop-clone", side);
      node.dataset.originIndex = String(i);
      prepareCloneMedia(node);
      frag.appendChild(node);
    });
    return frag;
  };

  const setupLoop = () => {
    clearClones();
    const base = [...root.querySelectorAll(".carousel-slide")];
    if (!base.length) return;

    base.forEach((slide, i) => {
      slide.dataset.originIndex = String(i);
    });

    root.insertBefore(cloneBank(base, "before"), root.firstChild);
    root.appendChild(cloneBank(base, "after"));
    goFirst();
  };

  const tuneLoading = (img, i) => {
    if (i < 3) {
      img.loading = "eager";
      if (i === 0) img.setAttribute("fetchpriority", "high");
      else img.removeAttribute("fetchpriority");
    } else {
      img.loading = "lazy";
      img.removeAttribute("fetchpriority");
    }
  };

  /** Point LCP preload at the first image after shuffle. */
  const syncLcpPreload = (img) => {
    const href = img?.getAttribute("src") || img?.currentSrc || "";
    if (!href) return;
    let link = document.head.querySelector("link[data-carousel-lcp]");
    if (!link) {
      link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.setAttribute("fetchpriority", "high");
      link.dataset.carouselLcp = "";
      document.head.appendChild(link);
    }
    const abs = new URL(href, location.href).href;
    if (link.href !== abs) link.href = href;
    if (href.endsWith(".webp")) link.type = "image/webp";
    else link.removeAttribute("type");
  };

  const groupHasImg = (group) =>
    group.some((slide) => slide.querySelector("img"));

  const shuffle = () => {
    clearClones();
    const slides = [...root.querySelectorAll(".carousel-slide")];
    if (!slides.length) return;

    const byProject = new Map();
    for (const slide of slides) {
      const key = slide.dataset.project || "default";
      let group = byProject.get(key);
      if (!group) {
        group = [];
        byProject.set(key, group);
      }
      group.push(slide);
    }

    const groups = shuffleInPlace([...byProject.values()]);

    // Prefer an image-bearing lead so LCP/preload stay meaningful.
    if (groups.length && !groupHasImg(groups[0])) {
      const withImg = groups.findIndex(groupHasImg);
      if (withImg > 0) [groups[0], groups[withImg]] = [groups[withImg], groups[0]];
    }

    // Avoid repeating the same lead project on consecutive loads when possible.
    try {
      const last = sessionStorage.getItem("carousel_lead");
      const lead = groups[0]?.[0]?.dataset.project || "";
      if (last && lead && last === lead && groups.length > 1) {
        const candidates = groups
          .map((g, i) => i)
          .filter((i) => i > 0 && groupHasImg(groups[i]));
        const pool = candidates.length ? candidates : [1];
        const swap = pool[(Math.random() * pool.length) | 0];
        [groups[0], groups[swap]] = [groups[swap], groups[0]];
      }
      const nextLead = groups[0]?.[0]?.dataset.project || "";
      if (nextLead) sessionStorage.setItem("carousel_lead", nextLead);
    } catch {
      /* private mode */
    }

    const frag = document.createDocumentFragment();
    let origin = 0;
    let imgRank = 0;
    let leadImg = null;
    for (const group of groups) {
      for (const slide of group) {
        slide.removeAttribute("data-loop-clone");
        slide.dataset.originIndex = String(origin++);
        const img = slide.querySelector("img");
        if (img) {
          tuneLoading(img, imgRank);
          if (imgRank === 0) leadImg = img;
          imgRank++;
        }
        frag.appendChild(slide);
      }
    }
    root.appendChild(frag);
    syncLcpPreload(leadImg);
    setupLoop();

    const refresh = rafSchedule(() => {
      if (state.bootstrapping) goFirst();
      else {
        cacheGeometry();
        updateFooter(true);
      }
    });

    root
      .querySelectorAll(".carousel-slide:not([data-loop-clone]) img")
      .forEach((img) => {
        if (!img.complete) img.addEventListener("load", refresh, { once: true });
      });
  };

  const setCovered = (covered) => {
    if (state.covered === covered) return;
    state.covered = covered;
    root.classList.toggle("is-carousel-idle", covered);
    if (covered) {
      pauseVideos(root);
      if (state.lastBlur !== 0) {
        root.style.filter = "";
        state.lastBlur = 0;
      }
    } else if (!reduceMotion) {
      handleBlur(true);
    }
  };

  const initVideos = () => {
    state.videoIO?.disconnect();

    const videos = root.querySelectorAll("video");
    const cloneImgs = root.querySelectorAll(
      ".carousel-slide[data-loop-clone] img[data-src]"
    );

    videos.forEach((video) => {
      video.preload = "none";
    });

    if (!("IntersectionObserver" in window)) {
      cloneImgs.forEach(hydrateImg);
      videos.forEach((video) => {
        hydrateVideo(video);
        if (!state.covered) video.play().catch(() => {});
      });
      return;
    }

    state.videoIO = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target;
          if (el.tagName === "IMG") {
            if (entry.isIntersecting) {
              hydrateImg(el);
              state.videoIO.unobserve(el);
            }
            continue;
          }
          if (entry.isIntersecting && !state.covered) {
            hydrateVideo(el);
            el.play().catch(() => {});
          } else {
            el.pause();
          }
        }
      },
      { root, threshold: 0.15, rootMargin: "20% 0px" }
    );
    cloneImgs.forEach((img) => state.videoIO.observe(img));
    videos.forEach((video) => state.videoIO.observe(video));
  };

  const half = (clientX) => {
    if (!state.rect) state.rect = root.getBoundingClientRect();
    return clientX - state.rect.left < state.rect.width / 2;
  };

  const nudge = (dir) => {
    const width = state.rect?.width || root.clientWidth;
    const amount = Math.max(300, width * 0.45);
    root.scrollBy({
      left: dir * amount,
      behavior: reduceMotion ? "auto" : "smooth"
    });
  };

  const bindInteractions = () => {
    if (finePointer) {
      let cursorLeft = null;
      root.addEventListener("mouseenter", () => {
        state.rect = root.getBoundingClientRect();
      });
      root.addEventListener("mousemove", (e) => {
        const left = half(e.clientX);
        if (left === cursorLeft) return;
        cursorLeft = left;
        root.classList.toggle("cursor-left", left);
        root.classList.toggle("cursor-right", !left);
      });
      root.addEventListener("mouseleave", () => {
        state.rect = null;
        cursorLeft = null;
        root.classList.remove("cursor-left", "cursor-right");
      });
      root.addEventListener("click", (e) => {
        if (e.target.closest("a")) return;
        nudge(half(e.clientX) ? -1 : 1);
      });
    }

    root.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        nudge(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        nudge(1);
      } else if (e.key === "Home") {
        e.preventDefault();
        goFirst();
      }
    });

    root.addEventListener(
      "scroll",
      () => {
        if (!state.jumping) state.bootstrapping = false;
        onCarouselScroll();
      },
      { passive: true }
    );

    root.addEventListener(
      "scrollend",
      () => {
        normalizeLoop();
      },
      { passive: true }
    );
  };

  const measureCover = () => {
    const section = root.closest(".stack-section--white");
    state.coverH = section?.offsetHeight || window.innerHeight || 1;
  };

  const resumeVisibleVideos = () => {
    if (state.covered || document.hidden) return;
    const rootRect = root.getBoundingClientRect();
    root.querySelectorAll("video").forEach((video) => {
      const r = video.getBoundingClientRect();
      if (r.right <= rootRect.left || r.left >= rootRect.right) return;
      hydrateVideo(video);
      video.play().catch(() => {});
    });
  };

  const handleBlur = (force = false) => {
    const y = window.scrollY;
    if (!state.coverH) measureCover();
    const coverH = state.coverH || window.innerHeight || 1;

    // Sticky hero stays in the viewport; use scroll depth as the cover signal.
    if (y >= coverH) {
      setCovered(true);
      return;
    }

    if (state.covered) setCovered(false);
    if (reduceMotion) return;

    if (y <= 0) {
      if (force || state.lastBlur !== 0) {
        root.style.filter = "";
        state.lastBlur = 0;
      }
      return;
    }

    const blur = Math.round((y / coverH) * BLUR_MAX * 10) / 10;
    if (force || blur !== state.lastBlur) {
      root.style.filter = `blur(${blur}px)`;
      state.lastBlur = blur;
    }
  };

  const onCarouselScroll = rafSchedule(() => {
    normalizeLoop();
    updateFooter();
  });

  const onPageScroll = rafSchedule(() => handleBlur());

  const onResize = rafSchedule(() => {
    state.rect = null;
    measureCover();
    scrollToLogical(Math.max(0, state.active));
    updateFooter(true);
    handleBlur(true);
  });

  /** After outer layout changes (e.g. mobile bio expand), resnap slides. */
  const relayout = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        state.rect = null;
        measureCover();
        scrollToLogical(Math.max(0, state.active));
        updateFooter(true);
        handleBlur(true);
      });
    });
  };

  shuffle();
  measureCover();
  initVideos();
  bindInteractions();
  handleBlur(true);

  window.addEventListener("scroll", onPageScroll, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pauseVideos(root);
    else resumeVisibleVideos();
  });
  window.addEventListener("pageshow", (e) => {
    if (!e.persisted) return;
    state.bootstrapping = true;
    goFirst();
    state.bootstrapping = false;
  });
  window.addEventListener(
    "load",
    () => {
      requestAnimationFrame(() => {
        goFirst();
        state.bootstrapping = false;
      });
    },
    { once: true }
  );

  if ("ResizeObserver" in window) {
    new ResizeObserver(onResize).observe(root);
  } else {
    window.addEventListener("resize", onResize, { passive: true });
  }

  return { updateFooter, relayout };
}

/* === query-surface.js === */
/** Shared query typing surfaces (site gate + archive filter). */

/** Keywords that open the archive (typed gate + URL hash). */
const ARCHIVE_OPEN_KEYWORDS = Object.freeze(
  new Set(["archivio", "archive"])
);

const queryTextNode = (el) => el?.querySelector(".query-text") ?? null;

const normalizeQuery = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const isOpenKeyword = (value) =>
  ARCHIVE_OPEN_KEYWORDS.has(normalizeQuery(value));

const editText = (value, key) => {
  if (key === "Backspace") return value.slice(0, -1);
  if (key === "Enter") return value + "\n";
  if (key.length === 1) return value + key;
  return null;
};

const paintQuerySurface = (el, { show, text, reduceMotion = false }) => {
  if (!el) return;
  el.hidden = !show;
  el.toggleAttribute("aria-hidden", !show);
  if (!show) {
    el.classList.remove("is-caret-blink");
    el.replaceChildren();
    return;
  }
  if (!text) {
    el.classList.toggle("is-caret-blink", !reduceMotion);
    if (el.firstElementChild?.classList.contains("query-caret")) return;
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

const selectQueryContents = (el) => {
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
const querySelectionRange = (el) => {
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
const resolveQueryInput = ({ key, value, range, canOpen }) => {
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

const setQueryTyping = (on, html = document.documentElement) => {
  html.classList.toggle("is-query-typing", on);
};

/* === index-panel.js === */

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
  const seen = new Map();

  for (const slide of document.querySelectorAll(MEDIA_SELECTOR)) {
    const id = slide.dataset.project;
    if (!id) continue;

    let list = map.get(id);
    let srcs = seen.get(id);
    if (!list) {
      list = [];
      srcs = new Set();
      map.set(id, list);
      seen.set(id, srcs);
    }

    const img = slide.querySelector("img");
    if (img) {
      const src = mediaSrc(img);
      if (src && !srcs.has(src)) {
        srcs.add(src);
        list.push({ type: "img", src, alt: img.getAttribute("alt") || "" });
      }
      continue;
    }

    const video = slide.querySelector("video");
    if (!video) continue;
    const src = mediaSrc(video.querySelector("source")) || mediaSrc(video);
    if (!src || srcs.has(src)) continue;
    srcs.add(src);
    list.push({
      type: "video",
      src,
      poster: video.getAttribute("poster") || ""
    });
  }

  return map;
};

/** Year en-dashes bare; em dashes → thin + .dash (case 0). Keep last two words together. */
const withDashSpans = (s) =>
  escapeHtml(String(s || "").replace(/\s+(\S+)\s*$/u, "\u00A0$1"))
    .replace(/(\d)[\u2009\u200A\s]*[\u2013\-][\u2009\u200A\s]*(\d)/g, `$1\u2013$2`)
    .replace(
      /[\u2009\u200A\s]*\u2014[\u2009\u200A\s]*/g,
      `\u2009<span class="dash">\u2014</span>\u2009`
    );

/** Archive curtain — type archivio/archive + Enter to open (desktop). */
function createIndexPanel({
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
  const metaSup = $("index-meta-sup");
  const gateQuery = $("site-gate-query");
  const siteGate = gateQuery?.closest(".site-gate") || $("site-gate");
  const cueRoots = [...document.querySelectorAll(".archive-cues")];
  const cueDesktop = [...document.querySelectorAll("[data-archive-cue]")];
  const cueMobile = [...document.querySelectorAll("[data-archive-cue-mobile]")];
  const contactSection = document.querySelector(".stack-section--contact");
  const aboutRow = contactSection?.querySelector(".curtain-about-row");
  const colophonBar = contactSection?.querySelector(".footer-bar--colophon");
  const emailBlock = contactSection?.querySelector(".info-block--contact");
  const platformsBlock = contactSection?.querySelector(".info-block--platforms");
  const desktopAboutBand = contactSection?.querySelector(
    ".archive-cues--desktop.archive-cues--band-about"
  );
  const mobileEmailBand = contactSection?.querySelector(".archive-cues--band-email");
  const mobileAboutBand = contactSection?.querySelector(
    ".archive-cues--mobile.archive-cues--band-about"
  );
  if (!curtain || !results || !queryEl) return null;

  bindQueryFace(queryEl, gateQuery);

  const colophon = {
    credit: $("index-colophon-credit"),
    typography: $("index-colophon-typography"),
    langPrimary: $("index-lang-btn-primary"),
    langSecondary: $("index-lang-btn-secondary")
  };

  const mobileMq = window.matchMedia(MQ.mobile);
  const html = document.documentElement;
  const reduceMotion = matchMedia(MQ.reduceMotion).matches;

  const state = {
    open: false,
    query: "",
    gate: "",
    cueReady: false,
    minuteReady: false,
    scrolledEnd: false,
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
    if (metaSup) metaSup.innerHTML = "";
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
    const degree = stripHtml(project.degree);
    const con = stripHtml(project.con);
    const supHtml = String(project.sup || "").trim();
    const labels = indexLabels(lang()) || {};
    const collab = labels.collab || "Con";
    const supervision = labels.supervision || "Supervisione";

    if (metaYear) metaYear.innerHTML = wrapTnum(year);
    if (metaTags) metaTags.innerHTML = tagsHtml;
    if (metaPer) {
      const atLines = perHtml
        ? perHtml
            .split(/<br\s*\/?>/i)
            .map((part, i) => (i === 0 ? `@${part}` : part))
            .join("<br>")
        : "";
      metaPer.innerHTML =
        degree && atLines ? `${degree} ${atLines}` : degree || atLines;
    }
    if (metaCon) metaCon.textContent = con ? `${collab}: ${con}` : "";
    if (metaSup) {
      metaSup.innerHTML = supHtml ? `${supervision}: ${supHtml}` : "";
    }

    metaRoot.hidden = !(year || tagsHtml || perHtml || degree || con || supHtml);
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
    // Desktop gate typing is always available; cues are only a visual hint.
    if (!state.mobile) return gateQuery;
    return null;
  };

  const activeQueryValue = () => (state.open ? state.query : state.gate);

  const isQueryTyping = () =>
    state.open || (!state.mobile && Boolean(state.gate));

  const syncTypingClass = () => setQueryTyping(isQueryTyping(), html);

  const commitQuery = (next) => {
    if (state.open) setQuery(next);
    else setGate(next);
  };

  const syncArchiveQueryDisplay = () => paint(queryEl, state.open, state.query);

  const syncCueCopy = (code = lang()) => {
    const t = TRANSLATIONS[code];
    const desktop = t?.archiveCueDesktop || "";
    const mobile = t?.archiveCueMobile || "";
    for (const el of cueDesktop) {
      if (el.textContent !== desktop) el.textContent = desktop;
    }
    for (const el of cueMobile) {
      if (el.textContent !== mobile) el.textContent = mobile;
    }
  };

  const clearBand = (el) => {
    if (!el) return;
    el.style.top = "";
    el.style.bottom = "";
  };

  /** Absolute cue band between two elements inside the contact section. */
  const placeBand = (el, above, below, sec) => {
    if (!el || !above || !below) {
      clearBand(el);
      return;
    }
    const a = above.getBoundingClientRect();
    const b = below.getBoundingClientRect();
    el.style.top = `${Math.max(0, a.bottom - sec.top)}px`;
    el.style.bottom = `${Math.max(0, sec.bottom - b.top)}px`;
  };

  /** Position cue overlays without touching about / colophon flow. */
  const layoutCueBands = () => {
    if (!contactSection) return;
    const sec = contactSection.getBoundingClientRect();
    if (state.mobile) {
      clearBand(desktopAboutBand);
      placeBand(mobileEmailBand, emailBlock, platformsBlock, sec);
      placeBand(mobileAboutBand, aboutRow, colophonBar, sec);
      return;
    }
    clearBand(mobileEmailBand);
    clearBand(mobileAboutBand);
    placeBand(desktopAboutBand, aboutRow, colophonBar, sec);
  };

  const syncCueVisibility = () => {
    // Hints only — hide while typing into the gate or when archive is open.
    const show = state.cueReady && !state.open && !state.gate;
    html.classList.toggle("is-archive-cue-visible", show);
    for (const root of cueRoots) {
      root.hidden = !show;
      root.setAttribute("aria-hidden", show ? "false" : "true");
    }
    if (show) layoutCueBands();
  };

  const refreshCueReady = () => {
    const next = state.minuteReady && state.scrolledEnd;
    if (state.cueReady === next) return;
    state.cueReady = next;
    // syncGateDisplay → syncCueVisibility (layout once when cues appear).
    syncGateDisplay();
  };

  const checkScrolledEnd = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return max <= 4 || window.scrollY >= max - 8;
  };

  const onScrollCue = rafSchedule(() => {
    if (state.scrolledEnd) return;
    if (!checkScrolledEnd()) return;
    state.scrolledEnd = true;
    refreshCueReady();
  });

  const syncGateDisplay = () => {
    // No empty caret: show the gate surface only while typing a keyword.
    const show = !state.open && !state.mobile && Boolean(state.gate);
    paint(gateQuery, show, state.gate);
    if (siteGate) siteGate.setAttribute("aria-hidden", show ? "false" : "true");
    syncTypingClass();
    syncCueVisibility();
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
      const titleHtml = withDesktopTitleBreak(withDashSpans(entry.title));
      el.innerHTML = `<span class="index-result__num tnum">[${num}]</span>${titleHtml}`;
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

  const clearResults = () => {
    results.replaceChildren();
    state.resultNodes = [];
    state.resultById = new Map();
    state.activeEl = null;
  };

  const render = (code = lang()) => {
    state.mediaByProject = null;
    state.query = "";
    clearSelection();
    if (state.mobile) {
      clearResults();
    } else if (state.open) {
      buildResults(projectIndex(code));
    } else {
      // Defer DOM list until first open (rebuilds on next open after lang change).
      clearResults();
    }
    syncColophon(code);
    syncCueCopy(code);
    setAriaLabels();
    if (state.open) applyFilter();
    syncCueVisibility();
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

  bindLangButtons(
    [colophon.langPrimary, colophon.langSecondary],
    (target) => onLanguageChange?.(target)
  );

  curtain.addEventListener("click", onCurtainClick);
  onMediaChange(mobileMq, onMobileChange);

  window.addEventListener("scroll", onScrollCue, { passive: true });
  window.addEventListener(
    "resize",
    rafSchedule(() => {
      if (!state.scrolledEnd && checkScrolledEnd()) {
        state.scrolledEnd = true;
        refreshCueReady();
      }
      if (html.classList.contains("is-archive-cue-visible")) layoutCueBands();
    }),
    { passive: true }
  );

  window.setTimeout(() => {
    state.minuteReady = true;
    if (!state.scrolledEnd && checkScrolledEnd()) state.scrolledEnd = true;
    refreshCueReady();
  }, HINT_DELAY_MS);

  onMobileChange();
  render();
  if (checkScrolledEnd()) state.scrolledEnd = true;
  onLanguageBound?.((code) => render(code));

  return {
    open: () => setOpen(true),
    close: () => setOpen(false),
    isOpen: () => state.open
  };
}

/* === app.js === */
/**
 * Site runtime — carousel · i18n · archive · Terlizzi clock/weather.
 */

if ("scrollRestoration" in history) history.scrollRestoration = "manual";
window.scrollTo(0, 0);

const ARCHIVE_HASH = "archive";

const readHash = () => location.hash.replace(/^#/, "").toLowerCase();

/** Legacy site used #it / #en for language; migrate into ?lang=. */
const readLegacyLangHash = () => {
  const h = readHash();
  return h === "en" || h === "it" ? h : null;
};

const hasArchiveHash = () => ARCHIVE_OPEN_KEYWORDS.has(readHash());

const dom = {
  carousel: document.querySelector(".inline-carousel"),
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
  writeLangUrl(nextLang, { hash: archive ? ARCHIVE_HASH : "" });
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
  // Contact curtain bio stays full on every viewport.
  dom.introSmall?.forEach((el) => {
    el.textContent = t.aboutFull;
  });
  if (dom.introExpand) {
    dom.introExpand.hidden = !mobile;
    dom.introExpand.textContent = aboutExpanded ? t.aboutCollapse : t.aboutExpand;
    dom.introExpand.setAttribute("aria-expanded", expanded ? "true" : "false");
  }
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
  carousel?.relayout();
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
})();
