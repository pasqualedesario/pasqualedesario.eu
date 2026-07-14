/**
 * Design and development by Pasquale de Sario, 2026
 */
(function () {
    'use strict';

    // ========================================================================
    // CONFIGURATION & STATE
    // ========================================================================

    const CONFIG = {
        weatherApiUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:'
            ? 'https://api.open-meteo.com/v1/forecast?latitude=41.1171&longitude=16.8719&current_weather=true'
            : '/api/weather',
        updateIntervals: {
            time: 1000,
            weather: 600000 // 10 minutes
        },
        videoExtensions: ['mp4', 'webm', 'mov', 'ogg'],
        carousel: {
            transitionMs: 450,
            touchSwipeThreshold: 40,
            touchDirectionThreshold: 20
        },
        mobileBreakpoint: 768,
        preloadFirstImageCount: 2
    };

    const state = {
        currentTemperature: null,
        currentLang: 'it',
        isChangingLanguage: false,
        hasBoundLanguageLinks: false,
        hasBoundGlobalHandlers: false,
        lenis: null,
        resizeRafId: null,
        carouselTransitionTimer: null,
        pendingSlideToken: 0,
        gallery: {
            slides: [],
            shuffledProjects: [],
            currentSlide: 0,
            isTransitioning: false,
            hasInitialized: false
        }
    };

    // ========================================================================
    // DATA: TRANSLATIONS & METADATA
    // ========================================================================

    const translations = {
        en: {
            'about': 'Designer and independent researcher based in <a href="https://en.wikipedia.org/wiki/Bari" target="_blank" rel="noopener noreferrer">Bari</a>, Italy. His practice explores typography in its form and structure, information and editorial design and all the ways they interpolate each other within and without visual systems. His research is oriented also towards design histories, open tools and learning collective ecosystems outside the institutional walls.',
            'education': 'education',
            'communication-design': 'Communication Design',
            'industrial-design': 'Industrial Design',
            'iuav': 'Iuav University of Venice',
            'poliba': 'Polytechnic of Bari',
            'experience': 'experience',
            'research-publications': 'Research and publications',
            'services': 'services',
            'art-direction': 'Art Direction',
            'book-design': 'Book Design',
            'graphic-design': 'Graphic Design',
            'information-design': 'Information Design',
            'type-design': 'Type Design',
            'visual-identity': 'Visual Identity',
            'web-design': 'Web Design\u2009+\u2009Development',
            'contact': 'mail',
            'platforms': 'platforms',
            'typeset-in': '🧰 Typeset in',
            'cookies': 'This website doesn\u0026rsquo;t use third party cookies 🍪',
            'footer-cv': 'Full cv and portfolio<br>available upon request',
            'meme-things-first-title': 'Meme Things First — Design between politics, education and memetics',
            'cta': 'Open for projects<br>and collaborations'
        },
        it: {
            'about': 'Designer e ricercatore indipendente di base a <a href="https://it.wikipedia.org/wiki/Bari" target="_blank" rel="noopener noreferrer">Bari</a>. La sua pratica esplora la tipografia nella sua forma e struttura, l\u0026rsquo;information design e l\u0026rsquo;editoria e tutte le modalità con le quali queste si interpolano all\u0026rsquo;interno e all\u0026rsquo;esterno dei sistemi visivi. La sua ricerca è orientata anche alle storie del design, agli strumenti aperti e agli ecosistemi collettivi di apprendimento al di fuori delle mura istituzionali.',
            'education': 'formazione',
            'communication-design': 'Design della comunicazione',
            'industrial-design': 'Disegno industriale',
            'iuav': 'Università Iuav di Venezia',
            'poliba': 'Politecnico di Bari',
            'experience': 'esperienza',
            'research-publications': 'Ricerche e pubblicazioni',
            'services': 'servizi',
            'art-direction': 'Art Direction',
            'book-design': 'Editoria',
            'graphic-design': 'Graphic Design',
            'information-design': 'Information Design',
            'type-design': 'Type Design',
            'visual-identity': 'Identità visiva',
            'web-design': 'Web Design\u2009+\u2009Development',
            'contact': 'mail',
            'platforms': 'piattaforme',
            'typeset-in': '🧰 Composto in',
            'cookies': 'Questo sito non utilizza cookie di terze parti 🍪',
            'footer-cv': 'cv e portfolio completi<br>disponibili su richiesta',
            'meme-things-first-title': 'Meme Things First — Design tra politica, educazione e memetica',
            'cta': 'Disponibile per progetti<br>e collaborazioni'
        }
    };

    const projectMetadata = {
        en: {
            'mimmo-castellano': { extra: '@Iuav', year: '2025' },
            'singolarita-multiple': { extra: '@Iuav, With: Jolanda Baudino, Chiara Lorenzo, Irene Mazzoleni', year: '2024', title: 'Singolarità multiple. Esoeditoria in Italia 1920–1980' },
            'modernizzare-stanca': { extra: '@Spazio Alelaie', year: '2024' },
            '4visions': { extra: '@MAT', year: '2023' },
            'meme-things-first': { extra: '@Iuav, With: Rebecca Bertero, Serena De Mola', year: '2024–2026', title: 'Meme Things First — Design between politics, education and memetics' },
            'biennale-parola': { extra: '@Iuav, With: Giulia Gatta, Tommaso Antonelli', year: '2024' },
            'la-dimora-del-minotauro': { extra: '@Apparati Radicali', year: '2025', title: "The Minotaur's abode" },
            'forma': { extra: '@MAT', year: '2023', title: 'Forma' },
            'ermes': { extra: '@PoliBa', year: '2022', title: 'Ermes' }
        },
        it: {
            'mimmo-castellano': { extra: '@Iuav', year: '2025' },
            'singolarita-multiple': { extra: '@Iuav, Con: Jolanda Baudino, Chiara Lorenzo, Irene Mazzoleni', year: '2024', title: 'Singolarità multiple. Esoeditoria in Italia 1920–1980' },
            'modernizzare-stanca': { extra: '@Spazio Alelaie', year: '2024' },
            '4visions': { extra: '@MAT', year: '2023' },
            'meme-things-first': { extra: '@Iuav, Con: Rebecca Bertero, Serena De Mola', year: '2024–2026', title: 'Meme Things First — Design tra politica, educazione e memetica' },
            'biennale-parola': { extra: '@Iuav, Con: Giulia Gatta, Tommaso Antonelli', year: '2024' },
            'la-dimora-del-minotauro': { extra: '@Apparati Radicali', year: '2025' },
            'forma': { extra: '@MAT', year: '2023', title: 'Forma' },
            'ermes': { extra: '@PoliBa', year: '2022', title: 'Ermes' }
        }
    };

    // ========================================================================
    // UTILS
    // ========================================================================

    const formatTime = (unit) => String(unit).padStart(2, '0');

    const cachedTimezone = Intl.DateTimeFormat('en', { timeZoneName: 'short' })
        .formatToParts(new Date())
        .find(part => part.type === 'timeZoneName')?.value.toLowerCase() || 'utc';

    const stripHtml = (html) => {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        return temp.textContent ?? '';
    };

    /** Parses extra string into @ part and collaborators. Format: "@X, (Con:|With:|\+) Name1, Name2" */
    const parseExtra = (extra) => {
        if (!extra || typeof extra !== 'string') return { atPart: '', collaborators: '' };
        // Support splitting on ", + ", ", Con: ", or ", With: "
        const match = extra.match(/,\s*(?:\+|Con:|With:)\s*/i);
        if (!match) return { atPart: extra.trim(), collaborators: '' };
        const idx = match.index;
        return {
            atPart: extra.slice(0, idx).trim(),
            collaborators: extra.slice(idx + match[0].length).trim()
        };
    };

    const getMediaSources = (imagesAttr) => (imagesAttr || '')
        .split('|')
        .map((source) => source.trim())
        .filter(Boolean);

    const getFileExtension = (src) => {
        if (!src || typeof src !== 'string') return '';
        const clean = src.split('?')[0].split('#')[0];
        const parts = clean.split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : '';
    };

    /** Given an image path (e.g. assets/images/MC_1.png), returns base path without extension. */
    const getImageBasePath = (src) => {
        if (!src || typeof src !== 'string') return '';
        const clean = src.split('?')[0].split('#')[0];
        const lastDot = clean.lastIndexOf('.');
        return lastDot > 0 ? clean.slice(0, lastDot) : clean;
    };

    const isVideoSource = (src) => CONFIG.videoExtensions.includes(getFileExtension(src));

    // ========================================================================
    // FOOTER LOGIC
    // ========================================================================

    function buildFooterDateTimeHtml(now) {
        const dateParts = {
            day: formatTime(now.getDate()),
            month: formatTime(now.getMonth() + 1),
            year: now.getFullYear(),
            hours: formatTime(now.getHours()),
            minutes: formatTime(now.getMinutes()),
            seconds: formatTime(now.getSeconds()),
            timezone: cachedTimezone
        };

        let html = `bari, <span class="num">${dateParts.day}</span>.<span class="num">${dateParts.month}</span>.<span class="num">${dateParts.year}</span><br>`;
        html += `<span class="num">${dateParts.hours}</span>:<span class="num">${dateParts.minutes}</span>:<span class="num">${dateParts.seconds}</span> ${dateParts.timezone}`;

        if (state.currentTemperature !== null) {
            html += ` / <span class="num">${state.currentTemperature}</span><span class="grado-basso">°</span>c`;
        } else {
            html += ` / <span class="num">--</span><span class="grado-basso">°</span>c`;
        }
        return html;
    }

    async function fetchTemperature() {
        try {
            let response = await fetch(CONFIG.weatherApiUrl);
            if (!response.ok && CONFIG.weatherApiUrl === '/api/weather') {
                // Fallback to client-side direct API if proxy is not found
                response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=41.1171&longitude=16.8719&current_weather=true');
            }
            if (!response.ok) return;
            const data = await response.json();
            if (data.current_weather?.temperature !== undefined) {
                state.currentTemperature = Math.round(data.current_weather.temperature);
                updateFooterDateTimeCached();
            }
        } catch {
            // Safe fallback if primary fetch fails (e.g. offline or fetch of '/api/weather' fails)
            try {
                const fallbackResponse = await fetch('https://api.open-meteo.com/v1/forecast?latitude=41.1171&longitude=16.8719&current_weather=true');
                if (fallbackResponse.ok) {
                    const data = await fallbackResponse.json();
                    if (data.current_weather?.temperature !== undefined) {
                        state.currentTemperature = Math.round(data.current_weather.temperature);
                        updateFooterDateTimeCached();
                    }
                }
            } catch {
                // Keep UI responsive even if weather endpoint fails temporarily.
            }
        }
    }

    let dateTimeElements = null;
    function updateFooterDateTimeCached() {
        if (!dateTimeElements) {
            dateTimeElements = document.querySelectorAll('.footer-datetime');
        }
        const now = new Date();
        const dateTimeString = buildFooterDateTimeHtml(now);
        dateTimeElements.forEach((el) => {
            el.innerHTML = dateTimeString;
        });
    }

    // ========================================================================
    // LANGUAGE LOGIC
    // ========================================================================

    function setLanguage(lang) {
        if (!translations[lang]) return;
        if (state.currentLang === lang) return;
        if (state.isChangingLanguage) return;

        state.isChangingLanguage = true;
        try {
            state.currentLang = lang;

            const newHash = lang === 'it' ? '#it' : '#en';
            if (window.location.hash !== newHash) {
                history.replaceState(null, '', newHash);
            }

            const htmlRoot = document.getElementById('html-root');
            if (htmlRoot) htmlRoot.setAttribute('lang', lang);

            document.querySelectorAll('[data-lang]').forEach(element => {
                const key = element.getAttribute('data-lang');
                if (translations[lang]?.[key]) {
                    element.innerHTML = translations[lang][key];
                }
            });

            updateLanguageSwitcherState();
            if (state.gallery.slides.length > 0) updateProjectMetadata(lang);
            window.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
        } finally {
            state.isChangingLanguage = false;
        }
    }

    function updateProjectMetadata(lang) {
        document.querySelectorAll('#project-data .project-entry').forEach(entry => {
            const projectId = entry.getAttribute('data-project-id');
            if (!projectId) return;

            const metadata = projectMetadata[lang]?.[projectId];
            entry.setAttribute('data-extra', metadata?.extra || '');
            entry.setAttribute('data-year', metadata?.year || '');
            entry.setAttribute('data-title', metadata?.title || '');
        });

        // Update runtime gallery slides
        let slideIdx = 0;
        state.gallery.shuffledProjects.forEach(entry => {
            const extra = entry.getAttribute('data-extra') || '';
            const year = entry.getAttribute('data-year') || '';
            const title = entry.getAttribute('data-title') || '';
            const { atPart, collaborators } = parseExtra(extra);
            const imagesAttr = entry.getAttribute('data-images') || '';
            const count = getMediaSources(imagesAttr).length;

            for (let i = 0; i < count; i++) {
                if (slideIdx < state.gallery.slides.length) {
                    state.gallery.slides[slideIdx].extra = atPart;
                    state.gallery.slides[slideIdx].collaborators = collaborators;
                    state.gallery.slides[slideIdx].year = year;
                    if (title) state.gallery.slides[slideIdx].title = title;
                }
                slideIdx++;
            }
        });

        if (document.getElementById('info-carousel')) {
            updateInfoCarouselCaption();
        }
    }

    function initializeLanguage() {
        const hash = window.location.hash.substring(1);
        if (hash === 'en') {
            state.currentLang = 'it';
            setLanguage('en');
        } else {
            state.currentLang = 'en';
            setLanguage('it');
        }
        updateLanguageSwitcherState();
    }

    function updateLanguageSwitcherState() {
        document.querySelectorAll('.lang-link').forEach((btn) => {
            const code = btn.getAttribute('data-lang-code');
            const isActive = code === state.currentLang;
            btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
    }

    function bindLanguageLinks() {
        if (state.hasBoundLanguageLinks) return;
        document.querySelectorAll('.lang-link').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const lang = btn.getAttribute('data-lang-code');
                if (lang) setLanguage(lang);
            });
        });
        state.hasBoundLanguageLinks = true;
    }

    function bindGlobalHandlers(scrollWrapper) {
        if (state.hasBoundGlobalHandlers) return;

        document.body.addEventListener('click', (e) => {
            const siteTitle = e.target.closest?.('.site-title');
            if (siteTitle && ['/', '/index.html', ''].includes(window.location.pathname)) {
                e.preventDefault();
                if (state.lenis) {
                    state.lenis.scrollTo(0, { duration: 1.2 });
                } else if (scrollWrapper) {
                    scrollWrapper.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }
        });

        window.addEventListener('hashchange', () => {
            const targetLang = window.location.hash.slice(1) === 'en' ? 'en' : 'it';
            if (state.currentLang !== targetLang) setLanguage(targetLang);
        });

        state.hasBoundGlobalHandlers = true;
    }

    // ========================================================================
    // INFO CAROUSEL
    // ========================================================================

    function createInfoSlideElement(container, src, title, projectIndex, globalIndex) {
        const slideEl = document.createElement('div');
        slideEl.className = 'info-gallery-slide';
        const isVideo = isVideoSource(src);

        if (isVideo) {
            const ext = getFileExtension(src);
            const video = document.createElement('video');
            Object.assign(video, {
                autoplay: true, muted: true, playsInline: true, loop: true,
                preload: globalIndex < 3 ? 'auto' : 'metadata',
                draggable: false
            });
            video.setAttribute('webkit-playsinline', '');

            const source = document.createElement('source');
            source.src = src;
            source.type = `video/${ext === 'mov' ? 'quicktime' : ext}`;
            video.appendChild(source);

            ['contextmenu', 'dragstart', 'click'].forEach(evt => video.addEventListener(evt, e => e.preventDefault()));
            Object.assign(video.style, { userSelect: 'none', pointerEvents: 'none' });

            const tryPlay = () => { if (video.paused) video.play().catch(() => { }); };
            ['loadedmetadata', 'canplay'].forEach(evt => video.addEventListener(evt, tryPlay));

            slideEl.appendChild(video);
        } else {
            const base = getImageBasePath(src);
            const picture = document.createElement('picture');

            const sourceWebp = document.createElement('source');
            sourceWebp.type = 'image/webp';
            sourceWebp.srcset = `${base}.webp`;
            picture.appendChild(sourceWebp);

            const img = document.createElement('img');
            // Fallback per casi in cui il browser non seleziona le <source>.
            // Usiamo sempre WebP così la galleria resta funzionante anche se i PNG non ci sono.
            img.src = `${base}.webp`;
            const plainTitle = stripHtml(title).trim();
            img.alt = plainTitle ? `${plainTitle} — image ${projectIndex + 1}` : `project image ${projectIndex + 1}`;
            img.decoding = 'async';
            img.loading = globalIndex < 3 ? 'eager' : 'lazy';
            if (globalIndex === 0) {
                img.fetchPriority = 'high';
                img.setAttribute('fetchpriority', 'high');
            } else if (globalIndex >= 3) {
                img.fetchPriority = 'low';
                img.setAttribute('fetchpriority', 'low');
            }
            img.draggable = false;

            ['contextmenu', 'dragstart'].forEach(evt => img.addEventListener(evt, e => e.preventDefault()));
            Object.assign(img.style, { userSelect: 'none', pointerEvents: 'none' });

            picture.appendChild(img);
            slideEl.appendChild(picture);
        }
        container.appendChild(slideEl);
    }

    function initInfoCarousel() {
        if (state.gallery.hasInitialized) return;
        const track = document.getElementById('info-gallery-track');
        const carousel = document.getElementById('info-carousel');
        if (!track || !carousel) return;

        const projectEntries = Array.from(document.querySelectorAll('#project-data .project-entry'));
        state.gallery.shuffledProjects = (function shuffle(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        })([...projectEntries]);

        preloadFirstCarouselImages(state.gallery.shuffledProjects);

        let globalIndex = 0;
        state.gallery.slides = [];
        state.gallery.shuffledProjects.forEach(entry => {
            const projectId = entry.getAttribute('data-project-id');
            const title = entry.getAttribute('data-title') || '';
            const extra = entry.getAttribute('data-extra') || '';
            const year = entry.getAttribute('data-year') || '';
            const sources = getMediaSources(entry.getAttribute('data-images'));
            const { atPart, collaborators } = parseExtra(extra);

            sources.forEach((src, index) => {
                state.gallery.slides.push({ src, projectId, title, extra: atPart, collaborators, year });
                createInfoSlideElement(track, src, title, index, globalIndex);
                globalIndex++;
            });
        });

        state.gallery.currentSlide = 0;
        track.children[0]?.classList.add('info-gallery-slide--active');
        const initDims = () => {
            setInfoCarouselDimensions();
            goToInfoSlide(0, false);
        };
        requestAnimationFrame(() => requestAnimationFrame(initDims));
        setTimeout(initDims, 100);
        setupInfoCarouselInteraction();

        const handleResize = () => {
            if (state.resizeRafId) cancelAnimationFrame(state.resizeRafId);
            state.resizeRafId = requestAnimationFrame(() => {
                state.resizeRafId = null;
                setInfoCarouselDimensions();
                goToInfoSlide(state.gallery.currentSlide, false);
            });
        };
        window.addEventListener('resize', handleResize);

        if (typeof ResizeObserver !== 'undefined') {
            const ro = new ResizeObserver(handleResize);
            ro.observe(carousel);
        }
        state.gallery.hasInitialized = true;

        // When the first visible image loads, set the initial viewport height
        const firstSlide = track.children[0];
        if (firstSlide) {
            const firstMedia = firstSlide.querySelector('img, video');
            if (firstMedia) {
                const setInitialHeight = () => updateViewportHeight(false);
                if (firstMedia.tagName === 'VIDEO') {
                    firstMedia.addEventListener('loadedmetadata', setInitialHeight, { once: true });
                } else if (firstMedia.naturalWidth > 0) {
                    // Already loaded (cached)
                    setInitialHeight();
                } else {
                    firstMedia.addEventListener('load', setInitialHeight, { once: true });
                }
            }
        }
    }

    /** Preload first N carousel images (no videos). Uses WebP when available. */
    function preloadFirstCarouselImages(projectEntries) {
        const max = CONFIG.preloadFirstImageCount;
        const urls = [];
        for (const entry of projectEntries) {
            const sources = getMediaSources(entry.getAttribute('data-images'));
            for (const src of sources) {
                if (isVideoSource(src)) continue;
                urls.push(src);
                if (urls.length >= max) break;
            }
            if (urls.length >= max) break;
        }
        urls.forEach((src) => {
            const base = getImageBasePath(src);
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = `${base}.webp`;
            link.type = 'image/webp';
            document.head.appendChild(link);
        });
    }

    /** Returns the natural height of the active slide's media, scaled to fit the viewport width. */
    function getActiveSlideHeight() {
        const track = document.getElementById('info-gallery-track');
        if (!track) return 0;
        const activeSlide = track.children[state.gallery.currentSlide];
        if (!activeSlide) return 0;
        const media = activeSlide.querySelector('img, video');
        if (!media) return 0;

        const viewport = document.querySelector('.info-carousel-viewport');
        const viewportWidth = viewport ? viewport.clientWidth : 0;
        if (viewportWidth <= 0) return 0;

        if (media.tagName === 'VIDEO') {
            const vw = media.videoWidth || 16;
            const vh = media.videoHeight || 9;
            return viewportWidth / (vw / vh);
        } else {
            const nw = media.naturalWidth;
            const nh = media.naturalHeight;
            if (!nw || !nh) return 0; // Image not loaded yet
            return viewportWidth / (nw / nh);
        }
    }

    /**
     * Sets the viewport height to match the active slide.
     * When animate=false, the transition is skipped (used for init / resize).
     */
    function updateViewportHeight(animate = true) {
        const isMobile = window.matchMedia(`(max-width: ${CONFIG.mobileBreakpoint}px)`).matches;
        const viewport = document.querySelector('.info-carousel-viewport');
        if (!viewport) return;

        if (!isMobile) {
            // Desktop: restore default CSS height, remove inline styles
            viewport.style.height = '';
            viewport.style.transition = '';
            viewport.classList.add('info-carousel-viewport--ready');
            return;
        }

        const newHeight = getActiveSlideHeight();
        if (newHeight > 0) {
            if (!animate) {
                // Skip transition for initialization and resize
                viewport.style.transition = 'none';
                viewport.style.height = newHeight + 'px';
                // Force reflow then restore transition
                void viewport.offsetHeight;
                viewport.style.transition = '';
            } else {
                viewport.style.height = newHeight + 'px';
            }
            viewport.classList.add('info-carousel-viewport--ready');
        }
    }

    function setInfoCarouselDimensions() {
        const track = document.getElementById('info-gallery-track');
        if (!track || state.gallery.slides.length === 0) return;
        updateViewportHeight(false);
    }

    function goToInfoSlide(index, animate = true) {
        const { slides, isTransitioning } = state.gallery;
        if (slides.length === 0) return;
        index = Math.max(0, Math.min(index, slides.length - 1));
        if (isTransitioning && animate) return;

        const track = document.getElementById('info-gallery-track');
        if (!track) return;

        const prevIndex = state.gallery.currentSlide;
        const transitionToken = ++state.pendingSlideToken;
        if (state.carouselTransitionTimer) {
            clearTimeout(state.carouselTransitionTimer);
            state.carouselTransitionTimer = null;
        }

        state.gallery.isTransitioning = true;
        state.gallery.currentSlide = index;

        // Update viewport height for the new slide (mobile autoHeight)
        updateViewportHeight(animate);

        const prevSlide = track.children[prevIndex];
        const nextSlide = track.children[index];
        const useGsap = animate && typeof gsap !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (useGsap && prevSlide && nextSlide && prevIndex !== index) {
            nextSlide.style.opacity = '0';
            track.querySelectorAll('.info-gallery-slide').forEach((slide, i) => {
                slide.classList.toggle('info-gallery-slide--active', i === index);
            });
            updateInfoCarouselCaption();
            updateInfoCarouselCounter();
            gsap.to(prevSlide, { opacity: 0, duration: 0.25, ease: 'power2.in' });
            gsap.to(nextSlide, {
                opacity: 1,
                duration: 0.3,
                delay: 0.02,
                ease: 'power2.out',
                onComplete: () => {
                    if (transitionToken !== state.pendingSlideToken) return;
                    prevSlide.style.opacity = '';
                    nextSlide.style.opacity = '';
                    const video = nextSlide.querySelector('video');
                    if (video?.paused) video.play().catch(() => { });
                    state.gallery.isTransitioning = false;
                }
            });
        } else {
            track.querySelectorAll('.info-gallery-slide').forEach((slide, i) => {
                slide.classList.toggle('info-gallery-slide--active', i === index);
            });
            updateInfoCarouselCaption();
            updateInfoCarouselCounter();
            state.carouselTransitionTimer = setTimeout(() => {
                if (transitionToken !== state.pendingSlideToken) return;
                const activeSlide = track.children[index];
                const video = activeSlide?.querySelector('video');
                if (video?.paused) video.play().catch(() => { });
                state.gallery.isTransitioning = false;
                state.carouselTransitionTimer = null;
            }, animate ? CONFIG.carousel.transitionMs : 50);
        }
    }

    function updateInfoCarouselCounter() {
        const counterEl = document.getElementById('info-carousel-counter');
        if (!counterEl) return;
        const n = state.gallery.slides.length;
        const current = state.gallery.currentSlide + 1;
        counterEl.textContent = n ? `(${current}/${n})` : '';
    }

    function updateInfoCarouselCaption() {
        const slide = state.gallery.slides[state.gallery.currentSlide];
        const titleEl = document.getElementById('info-project-title');
        const yearEl = document.getElementById('info-project-year');
        if (!titleEl || !yearEl) return;
        if (slide) {
            titleEl.innerHTML = slide.title || '';
            let extraPart = slide.extra || '';
            if (extraPart.startsWith('@')) {
                extraPart = '<span class="at-majuscule">@</span>' + extraPart.slice(1);
            }
            const parts = [
                extraPart,
                slide.year || '',
                slide.collaborators ? (state.currentLang === 'it' ? 'Con: ' : 'With: ') + slide.collaborators : ''
            ].filter(Boolean);
            yearEl.innerHTML = parts.join('\u2009/\u2009');
        } else {
            titleEl.innerHTML = '';
            yearEl.innerHTML = '';
        }
    }

    function setupInfoCarouselInteraction() {
        const carousel = document.getElementById('info-carousel');
        if (!carousel) return;

        const updateCursor = (e) => {
            const n = state.gallery.slides.length;
            if (n <= 1 || !e) {
                carousel.style.cursor = 'default';
                return;
            }
            const rect = carousel.getBoundingClientRect();
            const x = e.clientX - rect.left;
            carousel.style.cursor = x < rect.width / 2 ? 'w-resize' : 'e-resize';
        };

        carousel.addEventListener('mousemove', updateCursor);
        carousel.addEventListener('mouseleave', () => { carousel.style.cursor = 'default'; });

        carousel.addEventListener('click', (e) => {
            if (state.gallery.slides.length <= 1) return;
            const rect = carousel.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const direction = x < rect.width / 2 ? -1 : 1;
            goToInfoSlide(state.gallery.currentSlide + direction);
        });

        window.addEventListener('keydown', (e) => {
            if (e.defaultPrevented) return;
            if (/^(input|textarea|select)$/i.test(document.activeElement?.tagName)) return;
            if (!document.getElementById('info-carousel')) return;
            if (e.key === 'ArrowRight') { e.preventDefault(); goToInfoSlide(state.gallery.currentSlide + 1); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); goToInfoSlide(state.gallery.currentSlide - 1); }
        });

        let touchStartX = 0;
        let isHorizontalSwipe = false;

        carousel.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            isHorizontalSwipe = false;
        }, { passive: true });

        carousel.addEventListener('touchmove', (e) => {
            const deltaX = Math.abs(e.touches[0].clientX - touchStartX);
            if (!isHorizontalSwipe && deltaX > CONFIG.carousel.touchDirectionThreshold) isHorizontalSwipe = true;
            if (isHorizontalSwipe) e.preventDefault();
        }, { passive: false });

        carousel.addEventListener('touchend', (e) => {
            const deltaX = e.changedTouches[0].clientX - touchStartX;
            if (isHorizontalSwipe && Math.abs(deltaX) > CONFIG.carousel.touchSwipeThreshold) {
                goToInfoSlide(deltaX < 0 ? state.gallery.currentSlide + 1 : state.gallery.currentSlide - 1);
            }
        }, { passive: true });
    }

    // ========================================================================
    // VIDEO OBSERVER
    // ========================================================================

    function initVideoObserver() {
        if (!('IntersectionObserver' in window)) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const video = entry.target;
                if (entry.isIntersecting && video.paused) video.play().catch(() => { });
                else if (!entry.isIntersecting && !video.paused) video.pause();
            });
        }, { threshold: 0.1 });

        const infoTrack = document.getElementById('info-gallery-track');
        if (infoTrack) {
            setTimeout(() => {
                infoTrack.querySelectorAll('video').forEach(v => {
                    if (!v.dataset.observed) {
                        observer.observe(v);
                        v.dataset.observed = 'true';
                    }
                });
            }, 500);
        }
    }

    // ========================================================================
    // LENIS SMOOTH SCROLL
    // ========================================================================

    function initLenis() {
        const wrapper = document.querySelector('.info-body');
        if (!wrapper || typeof Lenis === 'undefined') return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        state.lenis = new Lenis({
            wrapper: wrapper,
            duration: 1.2,
            easing: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
            direction: 'vertical',
            gestureDirection: 'vertical',
            smooth: true,
            smoothTouch: false,
            touchMultiplier: 2
        });

        function raf(time) {
            state.lenis?.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
    }

    // ========================================================================
    // BOUNCING BOXES (DVD SCREENSAVER WITH INTER-BOX COLLISION)
    // ========================================================================

    function initBouncingBoxes() {
        const els = Array.from(document.querySelectorAll('.floating-box'));
        if (els.length === 0) return;

        // Respect reduced-motion: show stacked statically at the bottom center
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            els.forEach((el, index) => {
                el.style.opacity = '1';
                el.style.position = 'absolute';
                el.style.bottom = `${20 + index * 50}px`;
                el.style.left = '50%';
                el.style.transform = 'translateX(-50%)';
                el.classList.add('is-bouncing');
            });
            return;
        }

        const baseSpeed = 1.375; // px per frame (~82.5px/s at 60fps, increased by 25%)

        const boxes = els.map(el => {
            const angle = Math.random() * 2 * Math.PI;
            let vx = Math.cos(angle) * baseSpeed;
            let vy = Math.sin(angle) * baseSpeed;

            // Ensure neither axis is too flat
            const minComponent = baseSpeed * 0.45;
            if (Math.abs(vx) < minComponent) vx = (vx >= 0 ? 1 : -1) * minComponent;
            if (Math.abs(vy) < minComponent) vy = (vy >= 0 ? 1 : -1) * minComponent;

            // Normalise velocity to baseSpeed
            const len = Math.sqrt(vx * vx + vy * vy);
            vx = (vx / len) * baseSpeed;
            vy = (vy / len) * baseSpeed;

            return {
                el,
                vx,
                vy,
                x: 0,
                y: 0,
                w: 0,
                h: 0,
                initialized: false
            };
        });

        let cachedHeaderH = 0;
        function updateHeaderHeight() {
            const headerEl = document.querySelector('.top-bar');
            cachedHeaderH = headerEl ? headerEl.offsetHeight : 0;
        }
        updateHeaderHeight();
        window.addEventListener('resize', updateHeaderHeight);

        function getBounds(boxW, boxH) {
            return {
                minX: 0,
                minY: cachedHeaderH,
                maxX: window.innerWidth - boxW,
                maxY: window.innerHeight - boxH
            };
        }

        function resolveCollision(b1, b2) {
            // Calculate overlap on X and Y axes
            const overlapX = Math.min(b1.x + b1.w, b2.x + b2.w) - Math.max(b1.x, b2.x);
            const overlapY = Math.min(b1.y + b1.h, b2.y + b2.h) - Math.max(b1.y, b2.y);

            if (overlapX > 0 && overlapY > 0) {
                // Collision detected!
                if (overlapX < overlapY) {
                    // Push apart to prevent sticking
                    const push = overlapX / 2;
                    if (b1.x < b2.x) {
                        b1.x -= push;
                        b2.x += push;
                    } else {
                        b1.x += push;
                        b2.x -= push;
                    }
                    // Reverse/Swap X velocity
                    const tempVx = b1.vx;
                    b1.vx = b2.vx;
                    b2.vx = tempVx;
                } else {
                    // Push apart to prevent sticking
                    const push = overlapY / 2;
                    if (b1.y < b2.y) {
                        b1.y -= push;
                        b2.y += push;
                    } else {
                        b1.y += push;
                        b2.y -= push;
                    }
                    // Reverse/Swap Y velocity
                    const tempVy = b1.vy;
                    b1.vy = b2.vy;
                    b2.vy = tempVy;
                }
            }
        }

        function updateBoxDimensions() {
            boxes.forEach(box => {
                box.w = box.el.offsetWidth;
                box.h = box.el.offsetHeight;
            });
        }

        window.addEventListener('resize', updateBoxDimensions);
        window.addEventListener('langchange', updateBoxDimensions);

        function tick() {
            // Lazy load box dimensions and initialize starting positions
            boxes.forEach(box => {
                if (box.w === 0) {
                    box.w = box.el.offsetWidth;
                    box.h = box.el.offsetHeight;
                }

                if (!box.initialized && box.w > 0 && box.h > 0) {
                    const bounds = getBounds(box.w, box.h);
                    let placed = false;
                    let attempts = 0;
                    while (!placed && attempts < 50) {
                        box.x = bounds.minX + Math.random() * Math.max(0, bounds.maxX - bounds.minX);
                        box.y = bounds.minY + Math.random() * Math.max(0, bounds.maxY - bounds.minY);

                        // Check overlap with other initialized boxes
                        let overlap = false;
                        for (const other of boxes) {
                            if (other !== box && other.initialized) {
                                const overlapX = Math.min(box.x + box.w, other.x + other.w) - Math.max(box.x, other.x);
                                const overlapY = Math.min(box.y + box.h, other.y + other.h) - Math.max(box.y, other.y);
                                if (overlapX > 0 && overlapY > 0) {
                                    overlap = true;
                                    break;
                                }
                            }
                        }
                        if (!overlap) {
                            placed = true;
                        }
                        attempts++;
                    }
                    box.el.classList.add('is-bouncing');
                    box.initialized = true;
                }
            });

            // Update positions
            boxes.forEach(box => {
                if (!box.initialized) return;

                box.x += box.vx;
                box.y += box.vy;

                // Wall collision
                const bounds = getBounds(box.w, box.h);
                if (box.x <= bounds.minX) { box.x = bounds.minX; box.vx = Math.abs(box.vx); }
                if (box.x >= bounds.maxX) { box.x = bounds.maxX; box.vx = -Math.abs(box.vx); }
                if (box.y <= bounds.minY) { box.y = bounds.minY; box.vy = Math.abs(box.vy); }
                if (box.y >= bounds.maxY) { box.y = bounds.maxY; box.vy = -Math.abs(box.vy); }
            });

            // Handle box-to-box collisions
            for (let i = 0; i < boxes.length; i++) {
                for (let j = i + 1; j < boxes.length; j++) {
                    if (boxes[i].initialized && boxes[j].initialized) {
                        resolveCollision(boxes[i], boxes[j]);
                    }
                }
            }

            // Render positions
            boxes.forEach(box => {
                if (!box.initialized) return;
                box.el.style.transform = `translate(${box.x}px, ${box.y}px)`;
            });

            requestAnimationFrame(tick);
        }

        requestAnimationFrame(tick);
    }

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    document.addEventListener('DOMContentLoaded', () => {
        const scrollWrapper = document.querySelector('.info-body');
        if (scrollWrapper) {
            if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
            scrollWrapper.scrollTop = 0;
        }

        updateFooterDateTimeCached();
        setInterval(updateFooterDateTimeCached, CONFIG.updateIntervals.time);
        fetchTemperature();
        setInterval(fetchTemperature, CONFIG.updateIntervals.weather);
        initializeLanguage();

        bindLanguageLinks();

        initLenis();
        initInfoCarousel();
        initVideoObserver();
        initBouncingBoxes();
        bindGlobalHandlers(scrollWrapper);
    });

})();
