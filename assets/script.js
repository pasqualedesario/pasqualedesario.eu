/**
 * Design and development by Pasquale de Sario, 2026
 */
(function () {
    'use strict';

    // ========================================================================
    // CONFIGURATION & STATE
    // ========================================================================

    const CONFIG = {
        weatherApiUrl: 'https://api.open-meteo.com/v1/forecast?latitude=41.1171&longitude=16.8719&current_weather=true',
        updateIntervals: {
            time: 1000,
            weather: 600000 // 10 minutes
        },
        videoExtensions: ['mp4', 'webm', 'mov', 'ogg'],
        carousel: {
            transitionMs: 600,
            transitionCss: 'transform 0.55s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease-out',
            touchSwipeThreshold: 40,
            touchDirectionThreshold: 20
        },
        mobileBreakpoint: 768
    };

    const state = {
        currentTemperature: null,
        currentLang: 'it',
        isChangingLanguage: false,
        gallery: {
            slides: [],
            shuffledProjects: [],
            currentSlide: 0,
            isTransitioning: false
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
            'information-design': 'Information Design',
            'type-design': 'Type Design',
            'visual-identity': 'Visual Identity',
            'web-design': 'Web Design',
            'contact': 'mail',
            'platforms': 'platforms',
            'typeset-in': '🧰 Typeset in',
            'cookies': 'This website doesn\u0026rsquo;t use third party cookies 🍪',
            'footer-cv': 'full cv and portfolio available upon request',
            'meme-things-first-title': 'Meme Things First — Design between politics, education and memetics'
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
            'information-design': 'Information Design',
            'type-design': 'Type Design',
            'visual-identity': 'Identità visiva',
            'web-design': 'Web Design',
            'contact': 'mail',
            'platforms': 'piattaforme',
            'typeset-in': '🧰 Composto in',
            'cookies': 'Questo sito non utilizza cookie di terze parti 🍪',
            'footer-cv': 'cv e portfolio completi disponibili su richiesta',
            'meme-things-first-title': 'Meme Things First — Design tra politica, educazione e memetica'
        }
    };

    const projectMetadata = {
        en: {
            'mimmo-castellano': { extra: '@Iuav', year: '2025' },
            'singolarita-multiple': { extra: '@Iuav, + Jolanda Baudino, Chiara Lorenzo, Irene Mazzoleni', year: '2024', title: 'Singolarità multiple. Esoeditoria in Italia 1920–1980' },
            'modernizzare-stanca': { extra: '@Spazio Alelaie', year: '2024' },
            '4visions': { extra: '@MAT', year: '2023' },
            'meme-things-first': { extra: '@Iuav, + Rebecca Bertero, Serena de Mola', year: '2024', title: 'Meme Things First — Design between politics, education and memetics' },
            'biennale-parola': { extra: '@Iuav, + Giulia Gatta, Tommaso Antonelli', year: '2024' },
            'la-dimora-del-minotauro': { extra: '@Apparati Radicali', year: '2025', title: "The Minotaur's abode" }
        },
        it: {
            'mimmo-castellano': { extra: '@Iuav', year: '2025' },
            'singolarita-multiple': { extra: '@Iuav, + Jolanda Baudino, Chiara Lorenzo, Irene Mazzoleni', year: '2024', title: 'Singolarità multiple. Esoeditoria in Italia 1920–1980' },
            'modernizzare-stanca': { extra: '@Spazio Alelaie', year: '2024' },
            '4visions': { extra: '@MAT', year: '2023' },
            'meme-things-first': { extra: '@Iuav, + Rebecca Bertero, Serena de Mola', year: '2024', title: 'Meme Things First — Design tra politica, educazione e memetica' },
            'biennale-parola': { extra: '@Iuav, + Giulia Gatta, Tommaso Antonelli', year: '2024' },
            'la-dimora-del-minotauro': { extra: '@Apparati Radicali', year: '2025' }
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
        return temp.textContent || temp.innerText || '';
    };

    /** Parses extra string into @ part and collaborators. Format: "@X, + Name1, Name2" */
    const parseExtra = (extra) => {
        if (!extra || typeof extra !== 'string') return { atPart: '', collaborators: '' };
        const idx = extra.indexOf(', + ');
        if (idx === -1) return { atPart: extra.trim(), collaborators: '' };
        return {
            atPart: extra.slice(0, idx).trim(),
            collaborators: extra.slice(idx + 4).trim()
        };
    };

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

        let html = `bari, <span class="num">${dateParts.day}</span>.<span class="num">${dateParts.month}</span>.<span class="num">${dateParts.year}</span>, <span class="num">${dateParts.hours}</span>:<span class="num">${dateParts.minutes}</span>:<span class="num">${dateParts.seconds}</span> ${dateParts.timezone}`;

        if (state.currentTemperature !== null) {
            html += `, <span class="num">${state.currentTemperature}</span><span class="grado-basso">°</span>c`;
        } else {
            html += `, <span class="num">--</span><span class="grado-basso">°</span>c`;
        }
        return html;
    }

    async function fetchTemperature() {
        try {
            const response = await fetch(CONFIG.weatherApiUrl);
            const data = await response.json();
            if (data.current_weather?.temperature !== undefined) {
                state.currentTemperature = Math.round(data.current_weather.temperature);
                updateFooterDateTimeCached();
            }
        } catch (error) {
            console.error('Error fetching temperature:', error);
        }
    }

    function updateFooterDateTimeCached() {
        const footerDateTimeElements = document.querySelectorAll('.footer-datetime');
        if (footerDateTimeElements.length > 0) {
            const now = new Date();
            const dateTimeString = buildFooterDateTimeHtml(now);
            footerDateTimeElements.forEach(el => el.innerHTML = dateTimeString);
        }
    }

    function wrapFooterDashes() {
        document.querySelectorAll('.footer-marquee-text').forEach((el) => {
            if (!el.innerHTML.includes('<span class="emdash">')) {
                el.innerHTML = el.innerHTML.replace(/—/g, '<span class="emdash">—</span>');
            }
        });
    }

    // ========================================================================
    // LANGUAGE LOGIC
    // ========================================================================

    function setLanguage(lang) {
        if (state.currentLang === lang) return;
        if (state.isChangingLanguage) return;

        state.isChangingLanguage = true;
        state.currentLang = lang;

        // Update URL hash without scrolling
        const newHash = lang === 'it' ? '#it' : '#en';
        if (window.location.hash !== newHash) {
            history.replaceState(null, '', newHash);
        }

        // Update HTML lang attribute
        const htmlRoot = document.getElementById('html-root');
        if (htmlRoot) htmlRoot.setAttribute('lang', lang);

        // Update Text Content
        document.querySelectorAll('[data-lang]').forEach(element => {
            const key = element.getAttribute('data-lang');
            if (translations[lang]?.[key]) {
                element.innerHTML = translations[lang][key];
            }
        });

        // Update Gallery Metadata if active
        if (state.gallery.slides.length > 0) {
            updateProjectMetadata(lang);
        }

        state.isChangingLanguage = false;
    }

    function updateProjectMetadata(lang) {
        // Update DOM metadata
        document.querySelectorAll('#project-data .project-entry').forEach(entry => {
            const projectId = entry.getAttribute('data-project-id');
            if (!projectId) return;

            const metadata = projectMetadata[lang]?.[projectId];
            if (metadata) {
                if (metadata.extra) entry.setAttribute('data-extra', metadata.extra);
                if (metadata.year) entry.setAttribute('data-year', metadata.year);
                if (metadata.title) entry.setAttribute('data-title', metadata.title);
            }
        });

        // Update runtime gallery slides
        let slideIdx = 0;
        state.gallery.shuffledProjects.forEach(entry => {
            const extra = entry.getAttribute('data-extra') || '';
            const year = entry.getAttribute('data-year') || '';
            const title = entry.getAttribute('data-title') || '';
            const { atPart, collaborators } = parseExtra(extra);
            const imagesAttr = entry.getAttribute('data-images') || '';
            // Determine how many slides this project generated
            const count = imagesAttr.split('|').map(s => s.trim()).filter(Boolean).length;

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

        if (document.getElementById('info-carousel')) updateInfoCarouselCaption();
    }

    function initializeLanguage() {
        const hash = window.location.hash.substring(1);
        if (hash === 'en') {
            state.currentLang = 'it'; // force update
            setLanguage('en');
        } else {
            state.currentLang = 'en'; // force update
            setLanguage('it');
        }
    }

    // ========================================================================
    // INFO CAROUSEL
    // ========================================================================

    function createInfoSlideElement(container, src, title, projectIndex, globalIndex) {
        const slideEl = document.createElement('div');
        slideEl.className = 'info-gallery-slide';
        const ext = src.split('.').pop().toLowerCase();
        const isVideo = CONFIG.videoExtensions.includes(ext);

        if (isVideo) {
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
            const img = document.createElement('img');
            img.src = src;
            const plainTitle = stripHtml(title).trim();
            img.alt = plainTitle ? `${plainTitle} — image ${projectIndex + 1}` : `project image ${projectIndex + 1}`;
            img.decoding = 'async';
            img.loading = globalIndex < 3 ? 'eager' : 'lazy';
            img.draggable = false;

            ['contextmenu', 'dragstart'].forEach(evt => img.addEventListener(evt, e => e.preventDefault()));
            Object.assign(img.style, { userSelect: 'none', pointerEvents: 'none' });

            slideEl.appendChild(img);
        }
        container.appendChild(slideEl);
    }

    function initInfoCarousel() {
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

        let globalIndex = 0;
        state.gallery.slides = [];
        state.gallery.shuffledProjects.forEach(entry => {
            const projectId = entry.getAttribute('data-project-id');
            const title = entry.getAttribute('data-title') || '';
            const extra = entry.getAttribute('data-extra') || '';
            const year = entry.getAttribute('data-year') || '';
            const sources = (entry.getAttribute('data-images') || '').split('|').map(s => s.trim()).filter(Boolean);
            const { atPart, collaborators } = parseExtra(extra);

            sources.forEach((src, index) => {
                state.gallery.slides.push({ src, projectId, title, extra: atPart, collaborators, year });
                createInfoSlideElement(track, src, title, index, globalIndex);
                globalIndex++;
            });
        });

        state.gallery.currentSlide = 0;
        const initDims = () => {
            setInfoCarouselDimensions();
            goToInfoSlide(0, false);
        };
        requestAnimationFrame(() => requestAnimationFrame(initDims));
        setTimeout(initDims, 100);
        setupInfoCarouselInteraction();

        window.addEventListener('resize', () => {
            setInfoCarouselDimensions();
            goToInfoSlide(state.gallery.currentSlide, false);
        });
        if (typeof ResizeObserver !== 'undefined') {
            const ro = new ResizeObserver(() => {
                setInfoCarouselDimensions();
                goToInfoSlide(state.gallery.currentSlide, false);
            });
            if (carousel) ro.observe(carousel);
        }
    }

    function getMaxAspectRatio() {
        return new Promise((resolve) => {
            const slides = state.gallery.slides;
            if (!slides.length) {
                resolve(16 / 9);
                return;
            }
            let remaining = slides.length;
            let maxRatio = 1;
            const check = (w, h) => {
                if (w > 0 && h > 0) maxRatio = Math.max(maxRatio, w / h);
                if (--remaining <= 0) resolve(maxRatio);
            };
            slides.forEach(({ src }) => {
                const ext = src.split('.').pop().toLowerCase();
                if (CONFIG.videoExtensions.includes(ext)) {
                    const video = document.createElement('video');
                    video.preload = 'metadata';
                    video.onloadedmetadata = () => {
                        check(video.videoWidth, video.videoHeight);
                        video.src = '';
                    };
                    video.onerror = () => { check(1, 1); };
                    video.src = src;
                } else {
                    const img = new Image();
                    img.onload = () => check(img.naturalWidth, img.naturalHeight);
                    img.onerror = () => { check(1, 1); };
                    img.src = src;
                }
            });
        });
    }

    function setMobileCarouselHeight() {
        const carousel = document.getElementById('info-carousel');
        const viewport = carousel?.querySelector('.info-carousel-viewport');
        if (!carousel || !viewport) return;
        const isMobile = window.matchMedia(`(max-width: ${CONFIG.mobileBreakpoint}px)`).matches;
        if (!isMobile) {
            viewport.style.height = '';
            viewport.classList.add('info-carousel-viewport--ready');
            return;
        }
        viewport.classList.remove('info-carousel-viewport--ready');
        const style = getComputedStyle(carousel);
        const paddingLeft = parseFloat(style.paddingLeft) || 0;
        const paddingRight = parseFloat(style.paddingRight) || 0;
        const viewportWidth = carousel.clientWidth - paddingLeft - paddingRight;
        getMaxAspectRatio().then((maxRatio) => {
            if (!window.matchMedia(`(max-width: ${CONFIG.mobileBreakpoint}px)`).matches) return;
            viewport.style.height = (viewportWidth / maxRatio) + 'px';
            viewport.classList.add('info-carousel-viewport--ready');
        });
    }

    function setInfoCarouselDimensions() {
        const carousel = document.getElementById('info-carousel');
        const viewport = carousel?.querySelector('.info-carousel-viewport');
        const track = document.getElementById('info-gallery-track');
        if (!carousel || !track) return;
        const n = state.gallery.slides.length;
        if (n === 0) return;
        const measureEl = viewport || carousel;
        const style = getComputedStyle(carousel);
        const w = measureEl.offsetWidth || (carousel.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0));
        track.style.width = (w * n) + 'px';
        track.querySelectorAll('.info-gallery-slide').forEach(slide => {
            slide.style.flex = `0 0 ${w}px`;
            slide.style.minWidth = w + 'px';
        });
        setMobileCarouselHeight();
    }

    function goToInfoSlide(index, animate = true) {
        const { slides, isTransitioning } = state.gallery;
        if (slides.length === 0) return;
        index = Math.max(0, Math.min(index, slides.length - 1));
        if (isTransitioning && animate) return;

        state.gallery.isTransitioning = true;
        state.gallery.currentSlide = index;

        const carousel = document.getElementById('info-carousel');
        const viewport = carousel?.querySelector('.info-carousel-viewport');
        const track = document.getElementById('info-gallery-track');
        if (!track || !carousel) return;

        const measureEl = viewport || carousel;
        const slideWidth = measureEl.offsetWidth || 0;
        const offset = -index * slideWidth;

        if (!animate) {
            track.style.transition = 'none';
            track.style.opacity = '1';
            track.style.transform = `translateX(${offset}px)`;
            void track.offsetWidth;
            track.style.transition = CONFIG.carousel.transitionCss;
        } else {
            track.style.transition = CONFIG.carousel.transitionCss;
            track.style.opacity = '0.88';
            track.style.transform = `translateX(${offset}px)`;
            requestAnimationFrame(() => { track.style.opacity = '1'; });
        }

        updateInfoCarouselCaption();

        setTimeout(() => {
            const activeSlide = track.children[index];
            const video = activeSlide?.querySelector('video');
            if (video && video.paused) video.play().catch(() => {});
            state.gallery.isTransitioning = false;
        }, animate ? CONFIG.carousel.transitionMs : 50);
    }

    function updateInfoCarouselCaption() {
        const slide = state.gallery.slides[state.gallery.currentSlide];
        const titleEl = document.getElementById('info-project-title');
        const yearEl = document.getElementById('info-project-year');
        if (!titleEl || !yearEl) return;
        if (slide) {
            titleEl.innerHTML = slide.title || '';
            const atPart = slide.extra ? slide.extra + ', ' : '';
            const yearPart = slide.year || '';
            const collabPrefix = state.currentLang === 'it' ? ', con: ' : ', with: ';
            const collabPart = slide.collaborators ? collabPrefix + slide.collaborators : '';
            yearEl.textContent = atPart + yearPart + collabPart;
        } else {
            titleEl.innerHTML = '';
            yearEl.textContent = '';
        }
    }

    function setupInfoCarouselInteraction() {
        const carousel = document.getElementById('info-carousel');
        if (!carousel) return;

        const updateCursor = () => {
            const n = state.gallery.slides.length;
            carousel.style.cursor = n > 1 ? 'crosshair' : 'default';
        };
        updateCursor();

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
    // INITIALIZATION
    // ========================================================================

    document.addEventListener('DOMContentLoaded', () => {
        // Footer init
        updateFooterDateTimeCached();
        setInterval(updateFooterDateTimeCached, CONFIG.updateIntervals.time);

        fetchTemperature();
        setInterval(fetchTemperature, CONFIG.updateIntervals.weather);

        wrapFooterDashes();

        document.body.addEventListener('click', (e) => {
            const langLink = e.target.closest('.lang-link');
            if (langLink) {
                e.preventDefault();
                const lang = langLink.getAttribute('data-lang-code');
                if (lang) setLanguage(lang);
                return;
            }
            const siteTitle = e.target.closest('.site-title');
            if (siteTitle && ['/', '/index.html', ''].includes(window.location.pathname)) {
                e.preventDefault();
                document.querySelector('.info-body')?.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });

        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.slice(1);
            const targetLang = hash === 'en' ? 'en' : 'it';
            if (state.currentLang !== targetLang) setLanguage(targetLang);
        });

        initializeLanguage();

        // Info carousel (single-page layout)
        initInfoCarousel();
        initVideoObserver();
    });

})();
