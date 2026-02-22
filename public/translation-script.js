
(function () {
    console.log('LingoLens Translator Script Loaded');

    let activeTooltip = null;
    let hoveredElement = null;
    const originalTexts = new Map(); // Store original text 
    const originalDimensions = new Map(); // Store original dimensions for layout check
    const translatedTexts = new Map(); // Store translation history

    // Apply basic styles 
    const style = document.createElement('style');
    style.textContent = `
    .lingo-translate-tooltip {
      position: absolute;
      background: rgba(15, 23, 42, 0.9); /* Darker, premium slate */
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      color: #f8fafc;
      padding: 8px 14px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.01em;
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      z-index: 2147483647;
      pointer-events: none;
      transform: translate(-50%, -12px);
      margin-top: -10px;
      box-shadow: 
        0 4px 6px -1px rgba(0, 0, 0, 0.1), 
        0 2px 4px -1px rgba(0, 0, 0, 0.06),
        0 0 0 1px rgba(255, 255, 255, 0.1); /* Subtle border ring */
      white-space: nowrap;
      animation: lingo-scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    @keyframes lingo-scale-in {
      from { opacity: 0; transform: translate(-50%, -4px) scale(0.95); }
      to { opacity: 1; transform: translate(-50%, -12px) scale(1); }
    }

    /* Arrow */
    .lingo-translate-tooltip::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      margin-left: -6px;
      border-width: 6px;
      border-style: solid;
      border-color: rgba(15, 23, 42, 0.9) transparent transparent transparent;
    }

    /* Hover State - Cleaner */
    .lingo-hover-highlight {
      /* Use box-shadow inset to avoid layout shift, specialized color */
      box-shadow: inset 0 0 0 2px rgba(99, 102, 241, 0.6), 0 0 0 1px rgba(99, 102, 241, 0.2) !important;
      border-radius: 4px;
      cursor: pointer !important; 
      background-color: rgba(99, 102, 241, 0.05); /* Indigo tint */
      transition: all 0.15s ease;
    }

    /* Loading State - Shimmer */
    .lingo-translating {
        animation: lingo-shimmer 1.5s infinite linear;
        background: linear-gradient(to right, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%);
        background-size: 200% 100%;
        cursor: wait !important;
        opacity: 0.7;
    }
    @keyframes lingo-shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
    }

    /* Translated State - Subtle */
    .lingo-translated {
      /* No background color, just a subtle indicator */
      text-decoration: underline;
      text-decoration-style: dotted;
      text-decoration-color: #22c55e; /* Green */
      text-decoration-thickness: 2px;
      text-underline-offset: 3px;
      transition: color 0.3s;
    }
    
    .lingo-translated:hover {
        background-color: rgba(34, 197, 94, 0.05);
    }

    /* Layout Warning (Original) */
    .lingo-layout-warning::after {
        content: '!';
        position: absolute;
        top: -8px;
        right: -8px;
        font-size: 10px;
        font-weight: bold;
        color: #713f12;
        background: #facc15;
        border-radius: 50%;
        width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        z-index: 10;
        cursor: help;
        border: 1px solid rgba(255,255,255,0.5);
    }
    .lingo-layout-warning {
        position: relative; 
        outline: 1px dashed #eab308 !important;
    }

    /* Layout Error (Visual Bug Catcher) */
    .lingo-layout-error::after {
        content: '⚠️';
        position: absolute;
        top: -12px;
        right: -12px;
        font-size: 12px;
        background: #ef4444; 
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.5);
        z-index: 20;
        cursor: help;
        border: 2px solid white;
        animation: lingo-pulse-error 2s infinite;
    }
    .lingo-layout-error {
        position: relative !important;
        box-shadow: inset 0 0 0 2px #ef4444, 0 0 0 2px rgba(239,68,68,0.3) !important;
        border-radius: 4px;
        transition: all 0.3s ease;
    }
    @keyframes lingo-pulse-error {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
    }

    /* Health Badges inside Tooltip */
    .lingo-tooltip-health-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.02em;
      margin-left: 6px;
      text-transform: uppercase;
    }
    .lingo-badge-safe {
      background: rgba(34, 197, 94, 0.15); /* Green */
      color: #4ade80;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }
    .lingo-badge-error {
      background: rgba(239, 68, 68, 0.15); /* Red */
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
  `;
    document.head.appendChild(style);

    // Helper to check if an element is valid for translation
    function isValidElement(el) {
        if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;

        // Skip hidden elements
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        if (el.offsetParent === null && style.position !== 'fixed') return false;

        // Skip technical tags
        const tagName = el.tagName.toLowerCase();
        const invalidTags = [
            'script', 'style', 'noscript', 'iframe', 'object', 'embed',
            'input', 'textarea', 'select', 'button', 'img', 'svg', 'canvas',
            'video', 'audio', 'code', 'pre'
        ];
        if (invalidTags.includes(tagName)) return false;

        // Smart Text Detection (Tier 2)
        // 1. Must implement hasText check (not just whitespace)
        let hasText = false;
        let textLength = 0;

        // We only want to translate leaf-ish nodes or nodes where text is the primary content.
        // If a div has 10 paragraphs, we want to hover the paragraphs, not the div.
        // Heuristic: If element has block-level children, prefer the children.
        // Exception: If element has text AND inline children (b, i, span), treat as one unit.

        // Check for block-level children
        // This is expensive to check 'display' for every child. 
        // Instead, look at tag names.
        const blockTags = ['div', 'p', 'section', 'article', 'main', 'header', 'footer', 'ul', 'ol', 'table', 'li'];
        const hasBlockChildren = Array.from(el.children).some(child => blockTags.includes(child.tagName.toLowerCase()));

        if (hasBlockChildren) {
            // If it has block children, generally we don't translate the container itself, 
            // UNLESS the container has significant direct text.
            // Let's keep it simple: if strict block children exist, don't translate parent.
            // Actually, this might prevent translating "<div>Some text <p>More text</p></div>".
            // Let's stick to: Translate if it has direct text nodes of value.
        }

        // Check direct text nodes
        for (let child of el.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) {
                const val = child.textContent.trim();
                if (val.length > 0) {
                    hasText = true;
                    textLength += val.length;
                }
            }
        }

        if (!hasText) return false;

        // 2. Ignore numbers/symbols only
        const text = el.innerText.trim();
        if (textLength < 2) return false; // fast path for single chars
        if (/^[\d\s\p{P}]+$/u.test(text)) return false;

        // 3. Ignore if text is too short (maybe nav items? no, nav items are important)

        return true;
    }

    function createTooltip(x, y) {
        if (activeTooltip) activeTooltip.remove();
        activeTooltip = document.createElement('div');
        activeTooltip.className = 'lingo-translate-tooltip';
        activeTooltip.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/></svg>
            <span>Translate</span>
        `;
        // Ensure tooltip stays within viewport
        document.body.appendChild(activeTooltip);

        // Adjust position if overflowing
        const rect = activeTooltip.getBoundingClientRect();
        if (x - rect.width / 2 < 0) x = rect.width / 2 + 5;
        if (x + rect.width / 2 > window.innerWidth) x = window.innerWidth - rect.width / 2 - 5;
        if (y < 30) y = y + 40; // show below if too close to top

        activeTooltip.style.left = x + 'px';
        activeTooltip.style.top = y + 'px';
    }

    function removeTooltip() {
        if (activeTooltip) {
            activeTooltip.remove();
            activeTooltip = null;
        }
    }

    // Mouse over handler
    document.addEventListener('mouseover', function (e) {
        const target = e.target;

        // Verify target is valid
        if (!isValidElement(target)) return;

        // Don't highlight if we're already hovering
        if (hoveredElement && hoveredElement !== target) {
            hoveredElement.classList.remove('lingo-hover-highlight');
        }

        hoveredElement = target;
        target.classList.add('lingo-hover-highlight');

        const rect = target.getBoundingClientRect();
        const x = rect.left + rect.width / 2 + window.scrollX;
        const y = rect.top + window.scrollY;

        createTooltip(x, y);

        // Update tooltip content based on health metrics
        if (activeTooltip) {
            const span = activeTooltip.querySelector('span');
            if (span) {
                let innerText = "Translate";
                let badgeHtml = "";

                if (target.dataset.lingoState === 'translating') {
                    innerText = "Translating...";
                } else if (target.dataset.lingoState === 'translated') {
                    innerText = "Focus in Panel";

                    if (target.dataset.layoutError) {
                        badgeHtml = `<span class="lingo-tooltip-health-badge lingo-badge-error">⚠️ Broken (${target.dataset.layoutError})</span>`;
                    } else if (target.dataset.layoutSafe === 'true') {
                        badgeHtml = `<span class="lingo-tooltip-health-badge lingo-badge-safe">✅ Layout Safe</span>`;
                    }
                }

                span.innerHTML = `${innerText} ${badgeHtml}`;
            }
        }

        e.stopPropagation();
    });

    // Mouse out handler
    document.addEventListener('mouseout', function (e) {
        if (e.target === hoveredElement) {
            hoveredElement.classList.remove('lingo-hover-highlight');
            hoveredElement = null;
            removeTooltip();
        }
    });

    // Click handler
    document.addEventListener('click', function (e) {
        if (!hoveredElement) return;
        if (e.target === activeTooltip) return; // allow clicking tooltip if we make it interactive later

        // Heuristic: If user is selecting text, probably don't want to trigger click.
        if (window.getSelection().toString().length > 0) return;

        if (e.target !== hoveredElement && !hoveredElement.contains(e.target)) return;

        e.preventDefault();
        e.stopPropagation();

        const target = hoveredElement;
        const uniqueId = getUniqueId(target);
        const currentText = target.innerText;
        console.log('[Lingo] Click detected:', uniqueId, currentText.substring(0, 20));

        // Toggle Check
        if (translatedTexts.has(uniqueId)) {
            const original = originalTexts.get(uniqueId);
            const translated = translatedTexts.get(uniqueId);
            const isTranslated = target.dataset.lingoState === 'translated';

            if (isTranslated) {
                target.innerText = original;
                target.dataset.lingoState = 'original';
                target.classList.remove('lingo-translated');
                target.classList.remove('lingo-layout-warning'); // remove warning on revert
            } else {
                target.innerText = translated;
                target.dataset.lingoState = 'translated';
                target.classList.add('lingo-translated');
                // Re-check layout?
            }
            return;
        }

        // Save state before translation
        originalTexts.set(uniqueId, currentText);
        originalDimensions.set(uniqueId, {
            width: target.offsetWidth,
            height: target.offsetHeight,
            scrollWidth: target.scrollWidth,
            scrollHeight: target.scrollHeight
        });

        target.dataset.lingoState = 'original';

        // UI Loading
        target.classList.add('lingo-translating');

        // Update tooltip if visible to show loading state
        if (activeTooltip) {
            activeTooltip.innerHTML = `
                <svg class="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                <span>Translating...</span>
             `;
            // Add spin animation to tooltip style dynamically or inline
            const spinStyle = document.createElement('style');
            spinStyle.id = 'lingo-spin-style';
            spinStyle.textContent = `@keyframes lingo-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: lingo-spin 1s linear infinite; }`;
            if (!document.getElementById('lingo-spin-style')) document.head.appendChild(spinStyle);
        }

        console.log('[Lingo] Sending TRANSLATE_REQUEST:', uniqueId);
        window.parent.postMessage({
            type: 'TRANSLATE_REQUEST',
            text: currentText,
            id: uniqueId
        }, '*');

        // Restore cursor/opacity after timeout if no response (safety)
        setTimeout(() => {
            if (target.dataset.lingoState === 'original' && !translatedTexts.has(uniqueId)) {
                target.classList.remove('lingo-translating');
            }
        }, 10000);
    });

    function getUniqueId(el) {
        if (el.id) return el.id;
        let path = [];
        let current = el;
        while (current && current !== document.body) {
            let index = 0;
            let sibling = current.previousElementSibling;
            while (sibling) {
                if (sibling.tagName === current.tagName) index++; // only count same-tag siblings for robustness
                sibling = sibling.previousElementSibling;
            }
            path.unshift(`${current.tagName}-${index}`);
            current = current.parentElement;
        }
        return path.join('/');
    }

    function getElementByUniqueId(id) {
        if (document.getElementById(id)) return document.getElementById(id);
        const parts = id.split('/');
        let current = document.body;
        for (const part of parts) {
            const [tag, indexStr] = part.split('-');
            const index = parseInt(indexStr, 10);
            if (!current) return null;

            let child = current.firstElementChild;
            let i = 0;
            while (child) {
                if (child.tagName === tag) {
                    if (i === index) {
                        current = child;
                        break;
                    }
                    i++;
                }
                child = child.nextElementSibling;
            }
            if (child !== current) return null; // Not found
        }
        return current;
    }

    window.addEventListener('message', function (event) {
        if (!event.data) return;

        console.log('[Lingo] Received message:', event.data.type);

        if (event.data.type === 'TOGGLE_MARQUEE') {
            const { isActive } = event.data;
            if (isActive) {
                enableMarqueeMode();
            } else {
                disableMarqueeMode();
            }
            return;
        }

        if (event.data.type === 'TRIGGER_BATCH_TRANSLATE') {
            const visibleElements = [];
            // Broader selection for batch
            const allElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, span, div');

            allElements.forEach(el => {
                if (!isValidElement(el)) return;
                // Check if already translated
                const id = getUniqueId(el);
                if (translatedTexts.has(id)) return;
                if (el.dataset.lingoState === 'translated') return;

                // Check if element intersects viewport strictly
                const rect = el.getBoundingClientRect();
                const windowHeight = window.innerHeight || document.documentElement.clientHeight;
                const windowWidth = window.innerWidth || document.documentElement.clientWidth;

                // Element is visible if it intersects the viewport vertically and horizontally
                const isVisible = (
                    rect.top < windowHeight &&
                    rect.bottom > 0 &&
                    rect.left < windowWidth &&
                    rect.right > 0
                );

                if (isVisible) {
                    visibleElements.push({ id, text: el.innerText.trim(), element: el });
                }
            });

            if (visibleElements.length === 0) {
                window.parent.postMessage({ type: 'BATCH_TRANSLATION_COMPLETE', count: 0 }, '*');
                return;
            }

            // Show loading state
            visibleElements.forEach(item => {
                item.element.classList.add('lingo-translating');
                if (!originalTexts.has(item.id)) {
                    originalTexts.set(item.id, item.text);
                    // omit dimensions for batch to save perf
                }
            });

            window.parent.postMessage({
                type: 'BATCH_TRANSLATE_REQUEST',
                payload: visibleElements.map(item => ({ id: item.id, text: item.text }))
            }, '*');
            return;
        }

        if (event.data.type === 'BATCH_TRANSLATE_RESPONSE') {
            const { results } = event.data;
            let successCount = 0;
            results.forEach(result => {
                const target = getElementByUniqueId(result.id);
                if (target) {
                    target.classList.remove('lingo-translating');
                    if (result.success) {
                        translatedTexts.set(result.id, result.translatedText);
                        target.innerText = result.translatedText;
                        target.dataset.lingoState = 'translated';
                        target.classList.add('lingo-translated');
                        successCount++;
                    }
                }
            });
            window.parent.postMessage({ type: 'BATCH_TRANSLATION_COMPLETE', count: successCount }, '*');
            return;
        }



        if (event.data.type === 'REQUEST_PAGE_STATE') {
            const translations = {};
            translatedTexts.forEach((value, key) => {
                const target = getElementByUniqueId(key);
                translations[key] = {
                    original: originalTexts.get(key) || (target ? target.innerText : ''),
                    translated: value,
                    elementTag: target ? target.tagName.toLowerCase() : 'unknown',
                    isLocked: target ? target.dataset.lingoLocked === 'true' : false,
                    status: target && target.dataset.lingoModified === 'true' ? 'modified' : 'active',
                    timestamp: Date.now()
                };
            });

            window.parent.postMessage({
                type: 'PAGE_STATE_RESPONSE',
                payload: {
                    translations,
                    title: document.title
                }
            }, '*');
            return;
        }

        if (event.data.type === 'REQUEST_JSON_DOWNLOAD') {
            const exportData = {};
            translatedTexts.forEach((value, key) => {
                const original = originalTexts.get(key);
                if (original && value) {
                    exportData[original] = value;
                }
            });
            window.parent.postMessage({
                type: 'JSON_DOWNLOAD_READY',
                payload: exportData,
                language: event.data.language
            }, '*');
            return;
        }

        if (event.data.type === 'RESTORE_PAGE_STATE') {
            const { translations } = event.data;
            if (!translations) return;

            console.log('[Lingo] Restoring page state:', Object.keys(translations).length, 'items');

            Object.entries(translations).forEach(([id, entry]) => {
                // Handle both old (string) and new (object) formats
                const text = typeof entry === 'string' ? entry : entry.translated;
                const isLocked = typeof entry === 'object' ? entry.isLocked : false;

                const target = getElementByUniqueId(id);
                if (target) {
                    // Save original state if not already saved
                    if (!originalTexts.has(id)) {
                        originalTexts.set(id, target.innerText);
                        originalDimensions.set(id, {
                            width: target.offsetWidth,
                            height: target.offsetHeight,
                            scrollWidth: target.scrollWidth,
                            scrollHeight: target.scrollHeight
                        });
                    }

                    translatedTexts.set(id, text);
                    target.innerText = text;
                    target.dataset.lingoState = 'translated';
                    target.classList.add('lingo-translated');

                    if (isLocked) {
                        target.dataset.lingoLocked = 'true';
                        target.style.outline = '2px dashed #f59e0b'; // Visual indicator for locked
                    }
                }
            });
            return;
        }

        if (event.data.type === 'HIGHLIGHT_ELEMENT') {
            const { id } = event.data;
            const target = getElementByUniqueId(id);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Flash effect
                const originalTransition = target.style.transition;
                const originalBg = target.style.backgroundColor;

                target.style.transition = 'background-color 0.5s ease';
                target.style.backgroundColor = 'rgba(255, 255, 0, 0.5)'; // Yellow highlight

                setTimeout(() => {
                    target.style.backgroundColor = originalBg;
                    setTimeout(() => {
                        target.style.transition = originalTransition;
                    }, 500);
                }, 1500);
            }
            return;
        }

        if (event.data.type === 'UPDATE_TRANSLATION') {
            const { id, text, isLocked } = event.data;
            const target = getElementByUniqueId(id);
            if (target) {
                translatedTexts.set(id, text);
                target.innerText = text;

                if (isLocked !== undefined) {
                    target.dataset.lingoLocked = isLocked ? 'true' : 'false';
                    if (isLocked) {
                        target.style.outline = '2px dashed #f59e0b';
                    } else {
                        target.style.outline = '';
                    }
                }

                target.dataset.lingoModified = 'true';
            }
            return;
        }

        if (event.data.type !== 'TRANSLATION_RESULT') return;

        const { id, translatedText, success } = event.data;
        const target = getElementByUniqueId(id);

        if (target) {
            target.classList.remove('lingo-translating');
            if (activeTooltip) removeTooltip(); // Hide tooltip on completion

            if (success) {
                translatedTexts.set(id, translatedText);
                target.innerText = translatedText;
                target.dataset.lingoState = 'translated';
                target.classList.add('lingo-translated');

                // Layout Safety Check (Inspector)
                const originalDims = originalDimensions.get(id);
                if (originalDims) {
                    // Let the browser paint before measuring to get accurate after-translation dimensions
                    setTimeout(() => {
                        const newWidth = target.offsetWidth;
                        const newHeight = target.offsetHeight;
                        const newScrollWidth = target.scrollWidth;

                        // Detection thresholds
                        const isOverflowing = newScrollWidth > newWidth && newWidth > 0;
                        const heightGrowth = (newHeight - originalDims.height) / (originalDims.height || 1);

                        // Strict check: if it wrapped to a new line unexpectedly (height grew by > 50% for inline/inline-block elements)
                        const isWrappingError = heightGrowth > 0.5 && originalDims.height < 50;

                        if (isOverflowing || isWrappingError) {
                            if (window.getComputedStyle(target).position === 'static') {
                                target.style.position = 'relative';
                            }
                            target.classList.add('lingo-layout-error');

                            const errorType = isOverflowing ? 'Overflow' : 'Text Wrapping';
                            target.title = `Layout Break Detected: ${errorType}`;
                            target.dataset.layoutError = isOverflowing ? 'Overflow' : 'Wrapping';

                            // Dispatch error to parent React app
                            window.parent.postMessage({
                                type: 'LAYOUT_ERROR_DETECTED',
                                id: id,
                                errorType: errorType,
                                text: translatedText
                            }, '*');

                            console.warn(`[Lingo] Layout Error (${errorType}) on:`, target);

                        } else {
                            target.classList.remove('lingo-layout-error');
                            target.dataset.layoutSafe = 'true';
                        }
                    }, 50); // slight delay for DOM reflow
                }

            } else {
                // Error feedback
                target.style.outline = '2px solid red';
                setTimeout(() => { target.style.outline = ''; }, 1000);
            }
        }
    });



    // Explanation Logic
    let explainButton = null;
    let selectionTimeout = null;

    function createExplainButton() {
        if (explainButton) return;
        explainButton = document.createElement('div');
        explainButton.className = 'lingo-explain-btn';
        explainButton.innerHTML = `
            <div class="lingo-explain-content" style="display:flex;align-items:center;gap:4px;">
                <button data-action="explain" class="lingo-ai-btn" title="Explain">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10H12V2z"></path><path d="M12 2a10 10 0 0 1 10 10"></path><path d="M12 12 2.1 12"></path></svg>
                    <span>Explain</span>
                </button>
                <div style="width:1px;height:16px;background:rgba(255,255,255,0.2);margin:0 2px;"></div>
                <button data-action="summarize" class="lingo-ai-btn" title="Summarize">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16"></path><path d="M4 12h16"></path><path d="M4 18h8"></path></svg>
                    <span>Summarize</span>
                </button>
                <div style="width:1px;height:16px;background:rgba(255,255,255,0.2);margin:0 2px;"></div>
                <button data-action="simplify" class="lingo-ai-btn" title="Simplify">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                    <span>Simplify</span>
                </button>
                <div style="width:1px;height:16px;background:rgba(255,255,255,0.2);margin:0 2px;"></div>
                <button data-action="meaning" class="lingo-ai-btn" title="Meaning">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                    <span>Meaning</span>
                </button>
            </div>
            <div class="lingo-explain-spinner" style="display:none;align-items:center;gap:6px;padding:4px 8px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:lingo-spin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
                <span>Thinking...</span>
            </div>
        `;
        explainButton.style.cssText = `
            position: fixed;
            z-index: 2147483647;
            background: #4f46e5;
            color: white;
            padding: 4px;
            border-radius: 99px;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 13px;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
            display: none;
            align-items: center;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            pointer-events: auto;
            transform-origin: center bottom;
        `;

        // Add styles for the buttons
        if (!document.getElementById('lingo-toolbar-style')) {
            const style = document.createElement('style');
            style.id = 'lingo-toolbar-style';
            style.textContent = `
                .lingo-ai-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    background: transparent;
                    border: none;
                    color: white;
                    padding: 6px 12px;
                    border-radius: 99px;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: inherit;
                    font-weight: inherit;
                    transition: background 0.2s;
                }
                .lingo-ai-btn:hover {
                    background: rgba(255, 255, 255, 0.15);
                }
                @keyframes lingo-spin {
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }

        explainButton.onmousedown = (e) => {
            e.preventDefault(); // Prevent clearing selection
            e.stopPropagation();
        };

        const handleAction = (actionType) => {
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();

            if (selectedText) {
                console.log('[Lingo] ' + actionType + ' requested for:', selectedText.substring(0, 20));

                const anchorNode = selection.anchorNode;
                let context = "";
                if (anchorNode) {
                    const parentBlock = anchorNode.parentElement?.closest('p, div, h1, h2, h3, h4, h5, h6, li, article, section');
                    context = parentBlock ? parentBlock.innerText.substring(0, 800) : (anchorNode.parentElement?.innerText || "");
                }

                // Show Spinner State
                const contentDiv = explainButton.querySelector('.lingo-explain-content');
                const spinnerDiv = explainButton.querySelector('.lingo-explain-spinner');
                if (contentDiv && spinnerDiv) {
                    contentDiv.style.display = 'none';
                    spinnerDiv.style.display = 'flex';
                }

                let messageType = 'EXPLAIN_REQUEST';
                if (actionType === 'summarize') messageType = 'SUMMARIZE_REQUEST';
                if (actionType === 'simplify') messageType = 'SIMPLIFY_REQUEST';
                if (actionType === 'meaning') messageType = 'MEANING_REQUEST';

                window.parent.postMessage({
                    type: messageType,
                    selectedText,
                    surroundingText: context,
                    pageTitle: document.title
                }, '*');

                setTimeout(() => {
                    hideExplainButton();
                    window.getSelection().removeAllRanges();

                    if (contentDiv && spinnerDiv) {
                        contentDiv.style.display = 'flex';
                        spinnerDiv.style.display = 'none';
                    }
                }, 1500);
            } else {
                hideExplainButton();
                window.getSelection().removeAllRanges();
            }
        };

        explainButton.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();

            const btn = e.target.closest('.lingo-ai-btn');
            if (btn) {
                handleAction(btn.dataset.action);
            }
        };

        document.body.appendChild(explainButton);
    }

    function showExplainButton(rect) {
        if (!explainButton) createExplainButton();

        // Calculate position (centered above selection)
        const buttonWidth = 90; // Approx
        const buttonHeight = 36;

        let top = rect.top - buttonHeight - 10;
        let left = rect.left + (rect.width / 2) - (buttonWidth / 2);

        // Viewport checks
        if (top < 10) top = rect.bottom + 10; // Show below if too close to top
        if (left < 10) left = 10;
        if (left + buttonWidth > window.innerWidth) left = window.innerWidth - buttonWidth - 10;

        explainButton.style.top = `${top} px`;
        explainButton.style.left = `${left} px`;
        explainButton.style.display = 'flex';

        // Animate in
        explainButton.style.opacity = '0';
        explainButton.style.transform = 'translateY(5px) scale(0.9)';

        requestAnimationFrame(() => {
            explainButton.style.opacity = '1';
            explainButton.style.transform = 'translateY(0) scale(1)';
        });
    }

    function hideExplainButton() {
        if (explainButton) {
            explainButton.style.opacity = '0';
            explainButton.style.transform = 'translateY(5px) scale(0.9)';
            setTimeout(() => {
                if (explainButton.style.opacity === '0') {
                    explainButton.style.display = 'none';
                    // Reset spinner state
                    const contentDiv = explainButton.querySelector('.lingo-explain-content');
                    const spinnerDiv = explainButton.querySelector('.lingo-explain-spinner');
                    if (contentDiv && spinnerDiv) {
                        contentDiv.style.display = 'flex';
                        spinnerDiv.style.display = 'none';
                    }
                }
            }, 200);
        }
    }

    // Trigger on mouseup (end of selection) or keyup (shift+arrow)
    function checkSelection(e) {
        // Short timeout to let selection settle
        setTimeout(() => {
            const selection = window.getSelection();
            const text = selection.toString().trim();

            if (text.length > 0 && !selection.isCollapsed) {
                try {
                    const range = selection.getRangeAt(0);
                    const rect = range.getBoundingClientRect();

                    // Only show if visible and valid size
                    if (rect.width > 0 && rect.height > 0) {
                        showExplainButton(rect);
                    } else {
                        hideExplainButton();
                    }
                } catch (e) {
                    console.error('Selection rect error:', e);
                    hideExplainButton();
                }
            } else {
                hideExplainButton();
            }
        }, 10);
    }

    document.addEventListener('mouseup', checkSelection);
    document.addEventListener('keyup', (e) => {
        if (e.key === 'Shift' || e.key.startsWith('Arrow')) {
            checkSelection(e);
        }
    });

    // Hide on scroll to prevent floating weirdness
    document.addEventListener('scroll', hideExplainButton, { capture: true, passive: true });

    document.addEventListener('mousedown', (e) => {
        if (explainButton && e.target !== explainButton && !explainButton.contains(e.target)) {
            hideExplainButton();
        }
    });

    // Ensure button is created on load
    // Ensure button is created on load
    createExplainButton();

    // Theme Color Detection
    function detectThemeColor() {
        // 1. Check meta tag
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) return metaTheme.content;

        // 2. Check strict header/nav background
        const header = document.querySelector('header, nav, .header, .nav, [role="banner"]');
        if (header) {
            const bg = window.getComputedStyle(header).backgroundColor;
            if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
        }

        // 3. Check body background
        const bodyBg = window.getComputedStyle(document.body).backgroundColor;
        if (bodyBg !== 'rgba(0, 0, 0, 0)' && bodyBg !== 'transparent') return bodyBg;

        return null;
    }

    // Send theme color on load
    setTimeout(() => {
        const themeColor = detectThemeColor();
        if (themeColor) {
            console.log('[Lingo] Detected theme color:', themeColor);
            window.parent.postMessage({
                type: 'THEME_COLOR_DETECTED',
                color: themeColor
            }, '*');
        }
    }, 1000);

    // Area Selection (Marquee) Tool
    let marqueeActive = false;
    let isDrawing = false;
    let selectionBox = null;
    let startX = 0;
    let startY = 0;

    function enableMarqueeMode() {
        marqueeActive = true;
        document.body.style.cursor = 'crosshair';
        document.body.style.userSelect = 'none';

        // Remove existing tooltip/explain stuff just in case
        removeTooltip();
        hideExplainButton();
    }

    function disableMarqueeMode() {
        marqueeActive = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        if (selectionBox) {
            selectionBox.remove();
            selectionBox = null;
        }
    }

    // Capture events in capture phase so we overrule clicks
    document.addEventListener('mousedown', (e) => {
        if (!marqueeActive) return;
        if (e.button !== 0) return; // Only left click

        e.preventDefault();
        e.stopPropagation();

        isDrawing = true;
        startX = e.clientX;
        startY = e.clientY;

        selectionBox = document.createElement('div');
        selectionBox.style.cssText = `
            position: fixed;
            border: 2px dashed rgba(79, 70, 229, 0.8);
            background: rgba(79, 70, 229, 0.15);
            backdrop - filter: blur(2px);
            border - radius: 8px;
            box - shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
            z - index: 2147483647;
            pointer - events: none;
            left: ${startX} px;
            top: ${startY} px;
            width: 0px;
            height: 0px;
            `;
        document.body.appendChild(selectionBox);
    }, { capture: true });

    document.addEventListener('mousemove', (e) => {
        if (!marqueeActive || !isDrawing || !selectionBox) return;

        const currentX = e.clientX;
        const currentY = e.clientY;

        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);
        const left = Math.min(currentX, startX);
        const top = Math.min(currentY, startY);

        selectionBox.style.width = width + 'px';
        selectionBox.style.height = height + 'px';
        selectionBox.style.left = left + 'px';
        selectionBox.style.top = top + 'px';
    }, { capture: true });

    document.addEventListener('mouseup', (e) => {
        if (!marqueeActive || !isDrawing) return;
        isDrawing = false;

        // Perform Intersection Check
        if (selectionBox) {
            const boxRect = selectionBox.getBoundingClientRect();
            selectionBox.remove();
            selectionBox = null;

            // If box is too small, treat it as a click or cancel
            if (boxRect.width < 10 || boxRect.height < 10) {
                // Ignore small clicks
                return;
            }

            const visibleElements = [];
            const allElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, span, div, a, button, label');

            allElements.forEach(el => {
                if (!isValidElement(el)) return;

                const id = getUniqueId(el);
                if (translatedTexts.has(id)) return;
                if (el.dataset.lingoState === 'translated') return;

                const rect = el.getBoundingClientRect();

                // Check Intersection
                const intersectX = Math.max(0, Math.min(rect.right, boxRect.right) - Math.max(rect.left, boxRect.left));
                const intersectY = Math.max(0, Math.min(rect.bottom, boxRect.bottom) - Math.max(rect.top, boxRect.top));

                if (intersectX > 0 && intersectY > 0) {
                    visibleElements.push({ id, text: el.innerText.trim(), element: el });
                }
            });

            if (visibleElements.length > 0) {
                // Show loading state
                visibleElements.forEach(item => {
                    item.element.classList.add('lingo-translating');
                    if (!originalTexts.has(item.id)) {
                        originalTexts.set(item.id, item.text);
                    }
                });

                window.parent.postMessage({
                    type: 'BATCH_TRANSLATE_REQUEST',
                    payload: visibleElements.map(item => ({ id: item.id, text: item.text }))
                }, '*');

                console.log(`[Lingo] Area Translate triggered on ${visibleElements.length} elements.`);
            }

            // Optional: Auto-disable tool after drawing once
            // disableMarqueeMode();
            // window.parent.postMessage({ type: 'TOGGLE_MARQUEE', isActive: false }, '*');
        }
    }, { capture: true });

})();
