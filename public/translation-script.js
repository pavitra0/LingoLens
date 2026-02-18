
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

    /* Layout Warning */
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

                // Check visibility
                const rect = el.getBoundingClientRect();
                const isVisible = (
                    rect.top >= 0 &&
                    rect.left >= 0 &&
                    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
                );

                // Allow some buffer (e.g. 1 screen height)
                const buffer = window.innerHeight;
                const isNearViewport = (
                    rect.top >= -buffer &&
                    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) + buffer
                );

                if (isNearViewport) {
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

        if (event.data.type === 'LANGUAGE_UPDATE') {
            document.querySelectorAll('.lingo-translated').forEach(el => {
                const id = getUniqueId(el);
                const original = originalTexts.get(id);
                if (original) {
                    el.style.opacity = '0.6';
                    el.style.cursor = 'wait';

                    window.parent.postMessage({
                        type: 'TRANSLATE_REQUEST',
                        text: original,
                        id: id
                    }, '*');
                }
            });
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

                // Layout Safety Check (Tier 2)
                const originalDims = originalDimensions.get(id);
                if (originalDims) {
                    const newWidth = target.offsetWidth;
                    const newHeight = target.offsetHeight;
                    const newScrollWidth = target.scrollWidth;

                    // If width grew significantly (> 20%) or height changed significantly, warn
                    // Or if scrollWidth > clientWidth (overflow)
                    const isOverflowing = newScrollWidth > newWidth;
                    const widthGrowth = (newWidth - originalDims.width) / originalDims.width;
                    const heightGrowth = (newHeight - originalDims.height) / originalDims.height;

                    if (isOverflowing || Math.abs(widthGrowth) > 0.2 || Math.abs(heightGrowth) > 0.3) {
                        // Apply warning
                        if (window.getComputedStyle(target).position === 'static') {
                            target.style.position = 'relative'; // Need relative for pseudo-element
                        }
                        target.classList.add('lingo-layout-warning');
                        target.title = 'Translation caused significant layout shift.';
                    } else {
                        target.classList.remove('lingo-layout-warning');
                    }
                }

            } else {
                // Error feedback
                target.style.outline = '2px solid red';
                setTimeout(() => { target.style.outline = ''; }, 1000);
            }
        }
    });

})();
