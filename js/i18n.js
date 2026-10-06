/** Bilingual copy — single source of truth for home + archive + carousel. */

import { configureLangButton } from "./utils.js";

const THIN = "\u2009";
const HAIR = "\u200A";
const NBSP = "\u00A0";
const PLUS = `${HAIR}<span class="plus">+</span>${HAIR}`;
const EM = `${THIN}<span class="dash">\u2014</span>${THIN}`;
const EN = "\u2013";
export const SLASH = `${HAIR}/${HAIR}`;

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
  xyz2022: "https://v1.lascuolaopensource.xyz/xyz-2022-tradire-la-tradizione",
  biasetton: "https://noemibiasetton.com/",
  pinaultAr:
    "https://www.pinaultcollection.com/palazzograssi/it/masterclass-apparati-radicali",
  typeAround:
    "https://salgemmaproject.com/portfolio/type-around-workshop-di-tipografia-collletttivo/"
});

const em = (html) => `<em>${html}</em>`;

/** Recurring supervision credit for bruno studio. */
const BRUNO_SUP = `${ext(HREF.bruno, "bruno")} (Andrea Codolo &amp; Giacomo Covacich)`;
const linked = (href, html) => ext(href, em(html));

/** Apex note after a title (research curtain + archive list). */
const degreeNote = (label) =>
  `<sup class="research-degree">${label}</sup>`;

const NOTE = Object.freeze({
  workshop: "Workshop",
  masterclass: "Masterclass"
});

const titled = (name, note) => `${em(name)}${note ? degreeNote(note) : ""}`;

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
/** Desktop soft-break via block span (avoids oversized `<br>` line boxes). */
const breakTail = (html) => `<span class="title-break-desktop">${html}</span>`;
/** Space before break so mobile (inline) still separates the two halves. */
const vecchiTitleEm = (lang) => {
  const { head, tail } = VECCHI[lang] || VECCHI.it;
  return em(`${head} ${breakTail(tail)}`);
};
const vecchiResearchLine = (lang, bachelorLabel) => {
  const { head, tail } = VECCHI[lang] || VECCHI.it;
  // Keep apex on the last title line (inside the desktop break span).
  return `${em(head)} ${breakTail(`${em(tail)}${degreeNote(bachelorLabel)}`)}`;
};

/** Ensure desktop soft-break after Vecchi name when title was plain-stripped. */
export const withDesktopTitleBreak = (html) => {
  const s = String(html || "");
  if (s.includes("title-break-desktop")) return s;
  return s.replace(
    /(Valdemaro Vecchi:?)\s+(.+)$/s,
    `$1 <span class="title-break-desktop">$2</span>`
  );
};

const DEGREE = Object.freeze({
  master: Object.freeze({ it: "Tesi magistrale", en: "MA Thesis" }),
  bachelor: Object.freeze({ it: "Tesi triennale", en: "BA Thesis" })
});

const RESEARCH_LINES = Object.freeze({
  it: [
    ext(HREF.mtf, em(MTF.it)),
    titled(MC_TITLE, DEGREE.master.it),
    vecchiResearchLine("it", DEGREE.bachelor.it)
  ].join("<br>"),
  en: [
    ext(HREF.mtf, em(MTF.en)),
    titled(MC_TITLE, DEGREE.master.en),
    vecchiResearchLine("en", DEGREE.bachelor.en)
  ].join("<br>")
});

/** Servizi curtain = SERVICE_IDS only. Archive tags may also use extras below. */
const SERVICE_IDS = Object.freeze([
  "artDirection",
  "visualIdentity",
  "editorialDesign",
  "graphicDesign",
  "typeDesign",
  "informationDesign",
  "webDesign"
]);

const TAGS = Object.freeze({
  artDirection: { it: "Art Direction", en: "Art Direction" },
  visualIdentity: { it: "Identità visiva", en: "Visual Identity" },
  editorialDesign: { it: "Editorial Design", en: "Editorial Design" },
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
  soundDesign: { it: "Sound Design", en: "Sound Design" },
  videomaking: { it: "Videomaking", en: "Videomaking" },
  coDesign: { it: "Co-progettazione", en: "Co-design" }
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
      per: "SOS",
      con: "",
      sup: "Alberto Guerra, Puria Nafisi, Alessandro Tartaglia",
      tags: ["typeDesign"],
      links: [HREF.mtd]
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
      tags: ["editorialDesign", "research"]
    },
    sacroscarto: {
      year: "2025",
      title: em("SACROSCARTO"),
      per: "Iuav",
      con: "Jolanda Baudino, Andrea Malossi, Giulia Righi",
      sup: "Stefano Rovai, Alessandro Bulegato",
      tags: ["visualIdentity", "editorialDesign"]
    },
    vv: {
      year: "2023",
      title: vecchiTitleEm(it ? "it" : "en"),
      per: "PoliBa",
      degree: it ? DEGREE.bachelor.it : DEGREE.bachelor.en,
      con: "",
      sup: "Antonio Labalestra, Marco Pietrosante",
      tags: ["research", "editorialDesign"]
    },
    sm: {
      year: "2024",
      title: em(`Singolarità multiple. Esoeditoria in Italia 1920\u20131980`),
      per: "Iuav",
      con: "Jolanda Baudino, Chiara Lorenzo, Irene Mazzoleni",
      sup: "Fiorella Bulegato, Valentina Nitti",
      tags: ["editorialDesign", "research"]
    },
    egozip: {
      year: "2024",
      title: em("ego.zip"),
      per: "Iuav",
      con: "Jolanda Baudino, Lucrezia Bonaudo, Andrea Malossi",
      sup: "Massimiliano Ciammaichella, Olimpia Russo",
      tags: ["editorialDesign", "videomaking"]
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
      tags: ["visualIdentity", "editorialDesign", "webDesign", "research", "curation"]
    },
    bp: {
      year: "2024",
      title: em("Biennale Parola"),
      per: "Iuav",
      con: "Giulia Gatta, Tommaso Antonelli",
      sup: "Luciano Perondi, Bruno Calza",
      tags: ["editorialDesign", "informationDesign"]
    },
    ar: {
      year: "2025",
      title: titled(
        it ? "La dimora del Minotauro" : "The Minotaur’s abode",
        NOTE.masterclass
      ),
      per: "Apparati Radicali",
      con: "",
      sup: `Noemi Biasetton, ${BRUNO_SUP}`,
      tags: ["editorialDesign", "artwork"],
      links: [HREF.biasetton, HREF.pinaultAr]
    },
    typearound: {
      year: "2024",
      title: titled("Type Around", NOTE.workshop),
      per: "Voga",
      con: "",
      sup: "Collletttivo",
      tags: ["lettering", "typeDesign"],
      links: [HREF.typeAround]
    },
    forma: {
      year: "2023",
      title: em("Forma"),
      per: "MAT",
      con: "",
      tags: ["visualIdentity", "lettering"]
    },
    xyz2022: {
      year: "2022",
      title: titled("XYZ 2022 «Tradire la tradizione»", NOTE.workshop),
      per: "SOS",
      con: "Gruppo X",
      tags: ["research", "coDesign", "graphicDesign"],
      links: [HREF.xyz2022]
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
      tags: ["informationDesign", "editorialDesign"]
    },
    serenissima: {
      year: "2024",
      title: em("Serenissima"),
      per: "Iuav",
      con: "Andrea Pintauro",
      sup: "Nicola Di Croce",
      tags: ["editorialDesign", "photography", "soundDesign"]
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
      tags: ["informationDesign", "editorialDesign"]
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

/** Hero about copy — also injected into index.html early-boot by build.py. */
export const ABOUT_BOOT = Object.freeze({
  it: Object.freeze({
    short: "Designer e art director di base in Puglia.",
    full: "Designer e art director di base in Puglia. La sua pratica esplora tipografia, editoria, information e web design e tutte le modalità con le quali questi assi si interpolano nella costruzione dei sistemi visivi. Fonde curiosità e controllo, concentrandosi egualmente su processo ed esecuzione progettuale nello sviluppo di identità visive e spazi digitali per brand, istituzioni culturali e clienti privati. La sua ricerca è orientata anche alle storie del design, agli strumenti aperti e agli ecosistemi collettivi di apprendimento al di fuori delle mura istituzionali.",
    expand: "Espandi"
  }),
  en: Object.freeze({
    short: "Designer and art director based in Puglia, Italy.",
    full: "Designer and art director based in Puglia, Italy. His practice explores typography, publishing, information and web design and all the ways they interpolate each other within and without visual systems. His approach mixes curiosity and control, focusing equally on process and execution for the development of visual identities and digital spaces for brands, institutions and private clients. His research is also oriented towards design histories, open tools and learning collective ecosystems outside the institutional walls.",
    expand: "Expand"
  })
});

export const TRANSLATIONS = Object.freeze({
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
      supervision: "Supervisione",
      link: "Link"
    },
    aboutShort: ABOUT_BOOT.it.short,
    aboutFull: ABOUT_BOOT.it.full,
    aboutExpand: ABOUT_BOOT.it.expand,
    aboutCollapse: "Comprimi",
    archiveCueDesktop:
      "Scrivi archivio e premi ↙ invio per visualizzare l’archivio completo",
    archiveCueMobile:
      "Esplora l’archivio completo sul sito desktop",
    aria: Object.freeze({
      carousel: "Galleria progetti",
      projectDetails: "Dettagli progetto",
      curriculum: "Informazioni e Curriculum",
      contact: "Contatti Diretti e Colophon",
      lang: "Selettore lingua",
      archive: "Archivio"
    }),
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
      supervision: "Tutoring",
      link: "Link"
    },
    aboutShort: ABOUT_BOOT.en.short,
    aboutFull: ABOUT_BOOT.en.full,
    aboutExpand: ABOUT_BOOT.en.expand,
    aboutCollapse: "Collapse",
    archiveCueDesktop:
      "Write archive and press ↙ enter to view the full archive",
    archiveCueMobile:
      "Explore the complete archive on desktop",
    aria: Object.freeze({
      carousel: "Project gallery",
      projectDetails: "Project details",
      curriculum: "About and curriculum",
      contact: "Contact and colophon",
      lang: "Language selector",
      archive: "Archive"
    }),
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

const ARIA_ATTR = "data-i18n-aria";

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

const syncAriaLabels = (aria) => {
  if (!aria) return;
  for (const el of document.querySelectorAll(`[${ARIA_ATTR}]`)) {
    const key = el.getAttribute(ARIA_ATTR);
    const label = key && aria[key];
    if (label) el.setAttribute("aria-label", label);
  }
};

export function applyLanguage(dom, lang, onApplied) {
  const t = TRANSLATIONS[lang];
  if (!t) return;

  document.documentElement.lang = lang;
  syncDocumentMeta(t);
  syncAriaLabels(t.aria);

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

export function projectCopy(lang, projectId) {
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

export function projectFooterPer(project) {
  const per = firstCreditLine(project?.per);
  const at = per ? `@${per}` : "";
  const degree = stripHtml(project?.degree);
  if (degree && at) return `${degree} ${at}`;
  return degree || at;
}

export function projectFooterCon(project, collab = "Con") {
  const con = firstCreditLine(project?.con);
  return con ? `${collab}: ${con}` : "";
}

export const stripHtml = (html) =>
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
export function projectIndex(lang) {
  const hit = indexCache[lang];
  if (hit) return hit;

  const catalog = TRANSLATIONS[lang]?.projects;
  if (!catalog) return [];

  const rows = Object.entries(catalog).map(([id, project]) => {
    const titleHtml = project.title || "";
    const title = stripHtml(titleHtml);
    const per = stripHtml(project.per);
    const degree = stripHtml(project.degree);
    const con = stripHtml(project.con);
    const sup = stripHtml(project.sup);
    const year = stripHtml(project.year);
    const tagsSearch = stripHtml(tagSearchText(project.tags));
    const links = (project.links || []).join(" ");
    return {
      id,
      title,
      titleHtml,
      year,
      yearKey: yearSortKey(year),
      search:
        `${title} ${year} ${degree} ${per} ${con} ${sup} ${tagsSearch} ${links}`.toLowerCase()
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

export function indexLabels(lang) {
  return TRANSLATIONS[lang]?.indexLabels ?? null;
}

/** Archive meta line: service tags joined with thin-space em dashes. */
export function projectTagsHtml(tags, lang) {
  return tagLabels(tags, lang).join(EM);
}

/** Archive meta “Link:” line (protocol stripped from visible labels). */
export function projectLinksHtml(links, label = "Link") {
  const hrefs = (links || []).filter(Boolean);
  if (!hrefs.length) return "";
  return `${label}: ${hrefs
    .map((href) => ext(href, String(href).replace(/^https?:\/\//, "")))
    .join("<br>")}`;
}
