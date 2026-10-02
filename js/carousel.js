import { projectCopy, projectFooterPer, projectFooterCon, indexLabels, SLASH } from "./i18n.js";
import { $, pauseVideos, wrapTnum, rafSchedule, MQ, onMediaChange } from "./utils.js";

/**
 * Infinite horizontal project carousel.
 * Active slide = last whose left edge ≤ scrollLeft.
 */
export function createCarousel(root, { getLang } = {}) {
  if (!root) return null;

  const counter = $("gallery-counter");
  const year = $("gallery-year");
  const title = $("gallery-title");
  const per = $("gallery-per");
  const con = $("gallery-con");
  const reduceMotion = matchMedia(MQ.reduceMotion).matches;
  const finePointer = matchMedia(MQ.finePointer).matches;
  const mobileMq = matchMedia(MQ.mobile);
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

  const normalizeLoop = () => {
    if (state.jumping || !state.cycle) return;
    const { loopStart, cycle } = state;
    const x = root.scrollLeft;
    if (x >= loopStart + cycle - 1) setScrollInstant(x - cycle);
    else if (x <= 1) setScrollInstant(x + cycle);
  };

  const clearClones = () => {
    root
      .querySelectorAll(".carousel-slide[data-loop-clone]")
      .forEach((el) => el.remove());
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

    // Keep the first DOM project group first so LCP preload stays valid.
    const pinnedKey = slides[0]?.dataset.project;
    const pinned = pinnedKey ? byProject.get(pinnedKey) : null;
    if (pinnedKey) byProject.delete(pinnedKey);

    const groups = [...byProject.values()];
    for (let i = groups.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [groups[i], groups[j]] = [groups[j], groups[i]];
    }
    if (pinned?.length) groups.unshift(pinned);

    const frag = document.createDocumentFragment();
    let mediaIndex = 0;
    let origin = 0;
    for (const group of groups) {
      for (const slide of group) {
        slide.removeAttribute("data-loop-clone");
        slide.dataset.originIndex = String(origin++);
        const img = slide.querySelector("img");
        if (img) tuneLoading(img, mediaIndex);
        frag.appendChild(slide);
        mediaIndex++;
      }
    }
    root.appendChild(frag);
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

  const handleBlur = (force = false) => {
    // Mobile hero is fluid (bio + 100svh gallery) — cover only after the whole section.
    if (mobileMq.matches) {
      const hero = root.closest(".stack-section--white");
      const past = hero
        ? window.scrollY >= hero.offsetTop + hero.offsetHeight - 8
        : false;
      setCovered(past);
      if (state.lastBlur !== 0) {
        root.style.filter = "";
        state.lastBlur = 0;
      }
      return;
    }

    const y = window.scrollY;
    const vh = window.innerHeight || 1;

    // Sticky hero stays in the viewport; use scroll depth as the cover signal.
    if (y >= vh) {
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

    const blur = Math.round((y / vh) * BLUR_MAX * 10) / 10;
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
    cacheGeometry();
    updateFooter(true);
    handleBlur(true);
  });

  shuffle();
  initVideos();
  bindInteractions();
  handleBlur(true);

  window.addEventListener("scroll", onPageScroll, { passive: true });
  onMediaChange(mobileMq, () => handleBlur(true));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pauseVideos(root);
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

  return { updateFooter };
}
