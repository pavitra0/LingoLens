<div align="center">

# 🏗️ LingoLens — System Architecture

**A deep dive into the engineering behind layout-preserving web translation.**

</div>

---

## 📐 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        LingoLens Client (Browser)                   │
│                                                                     │
│  ┌──────────────────────┐       ┌────────────────────────────────┐  │
│  │   Next.js App (React)│       │   Proxied Website (iframe)     │  │
│  │                      │◄─────►│                                │  │
│  │  • Read Mode         │  post │  • translation-script.js       │  │
│  │  • Matrix Mode       │ Msg   │  • DOM manipulation            │  │
│  │  • Library           │ Bridge│  • Layout safety detection     │  │
│  │  • Translation Panel │       │  • Selection toolbar           │  │
│  └──────────┬───────────┘       └────────────────────────────────┘  │
│             │                                                       │
│  ┌──────────▼───────────┐                                           │
│  │  IndexedDB (idb)     │  Client-side persistence                  │
│  │  + React Query Cache │  for saved pages & vocabulary             │
│  └──────────────────────┘                                           │
└─────────────────────────────┬───────────────────────────────────────┘
                              │ Server Actions / API Routes
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Next.js Server (Node.js)                        │
│                                                                     │
│  ┌─────────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │  Proxy Engine   │  │  Translation │  │   AI Context Engine    │  │
│  │  /api/proxy     │  │  Actions     │  │                        │  │
│  │                 │  │              │  │  • Explain (Gemini)    │  │
│  │  • HTML fetch   │  │  • Single    │  │  • Summarize (Gemini)  │  │
│  │  • URL rewrite  │  │  • Batch     │  │  • Simplify (Gemini)   │  │
│  │  • CSS rewrite  │  │              │  │  • Meaning (Gemini)    │  │
│  │  • Script inject│  │              │  │  • Content fetch       │  │
│  └─────────────────┘  └──────┬───────┘  └───────────┬────────────┘  │
│                              │                      │               │
└──────────────────────────────┼──────────────────────┼───────────────┘
                               │                      │
                    ┌──────────▼──────┐    ┌──────────▼──────────┐
                    │  Lingo.dev API  │    │  Google Gemini 1.5  │
                    │  Translation    │    │  Flash              │
                    │  Engine         │    │                     │
                    └─────────────────┘    └─────────────────────┘
```

---

## 🧩 Core Modules

### 1. 🌐 Proxy Engine — `app/api/proxy/route.ts`

The heart of LingoLens. This custom reverse proxy enables rendering **any website** inside a sandboxed iframe while maintaining full visual fidelity.

```
External Website
       │
       ▼
┌──────────────────────────────────────────┐
│            Proxy Pipeline                │
│                                          │
│  1. Fetch HTML with spoofed User-Agent   │
│  2. Parse DOM with Cheerio               │
│  3. Rewrite all asset URLs:              │
│     • <link> stylesheets → proxied       │
│     • <script src> → proxied             │
│     • <img src/srcset> → proxied         │
│     • <source> tags → proxied            │
│     • Inline style url() → proxied       │
│     • CSS @import / url() → proxied      │
│  4. Strip Content-Security-Policy        │
│  5. Inject <base href> for links         │
│  6. Inject translation-script.js         │
│  7. Serve rewritten HTML                 │
└──────────────────────────────────────────┘
```

**Key challenge:** CSS files can contain nested `@import` and `url()` references. The proxy recursively rewrites these to maintain the visual chain. Without this, fonts, background images, and imported stylesheets would break.

---

### 2. 🔌 PostMessage Bridge — The Communication Protocol

The React app and the proxied iframe live in separate security contexts. All communication flows through a structured `window.postMessage` protocol:

| Direction | Message Type | Purpose |
|-----------|-------------|---------|
| Parent → iframe | `TRIGGER_BATCH_TRANSLATE` | Magic Wand: translate all visible text |
| Parent → iframe | `LANGUAGE_UPDATE` | Notify language change |
| Parent → iframe | `RESTORE_PAGE_STATE` | Restore saved translations on load |
| Parent → iframe | `HIGHLIGHT_ELEMENT` | Scroll to and flash a translation |
| Parent → iframe | `UPDATE_TRANSLATION` | Push edited/locked translation |
| Parent → iframe | `TOGGLE_MARQUEE` | Enable area-selection tool |
| Parent → iframe | `REQUEST_PAGE_STATE` | Request current translation map |
| Parent → iframe | `REQUEST_JSON_DOWNLOAD` | Request i18n JSON export |
| iframe → Parent | `TRANSLATE_REQUEST` | Single element click-to-translate |
| iframe → Parent | `BATCH_TRANSLATE_REQUEST` | Batch of visible elements |
| iframe → Parent | `BATCH_TRANSLATE_RESPONSE` | Batch results returned |
| iframe → Parent | `PAGE_STATE_RESPONSE` | Full translation state snapshot |
| iframe → Parent | `JSON_DOWNLOAD_READY` | Export payload ready |
| iframe → Parent | `LAYOUT_ERROR_DETECTED` | Translation caused overflow/wrapping |
| iframe → Parent | `THEME_COLOR_DETECTED` | Proxied site's theme for UI sync |
| iframe → Parent | `EXPLAIN_REQUEST` | User selected text → AI explain |
| iframe → Parent | `SUMMARIZE_REQUEST` | User selected text → AI summarize |
| iframe → Parent | `SIMPLIFY_REQUEST` | User selected text → AI simplify |
| iframe → Parent | `MEANING_REQUEST` | User selected text → AI meaning |

---

### 3. 💉 Injected Translation Script — `public/translation-script.js`

A self-contained vanilla JS bundle injected into every proxied page. It operates entirely within the iframe's DOM:

```
┌─────────────────────────────────────────────────────┐
│              translation-script.js                   │
│                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  Hover       │  │  Click-to-   │  │  Batch      │ │
│  │  Detection   │  │  Translate   │  │  Translate  │ │
│  │  + Tooltip   │  │  + Toggle    │  │  (Viewport) │ │
│  └─────────────┘  └──────────────┘  └─────────────┘ │
│                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  Layout      │  │  Marquee     │  │  AI Toolbar │ │
│  │  Safety      │  │  Area Select │  │  (Explain,  │ │
│  │  Inspector   │  │  Tool        │  │  Summarize) │ │
│  └─────────────┘  └──────────────┘  └─────────────┘ │
│                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  State       │  │  Theme Color │  │  Unique ID  │ │
│  │  Restore     │  │  Detection   │  │  Generator  │ │
│  └─────────────┘  └──────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────┘
```

**Smart Element Detection** — Not all DOM nodes should be translatable. The script filters by:
- Visibility (display, opacity, offsetParent)
- Tag exclusion (script, style, input, svg, code, etc.)
- Text content validation (ignores numbers-only, single chars)
- Block-child heuristic (prefers leaf text nodes over containers)

**Layout Safety Inspector** — After each translation, the script measures:
- **Overflow detection:** `scrollWidth > offsetWidth`
- **Text wrapping errors:** Height grew >50% on inline elements
- Visual indicators (`⚠️` badges) and error reporting to parent

---

### 4. 🤖 AI Actions Layer — `app/actions/`

All AI calls are Next.js Server Actions (`'use server'`), keeping API keys secure:

```
┌──────────────────────────────────────────────────────────┐
│                   Server Actions                          │
│                                                           │
│  translate.ts ─────► Lingo.dev API (native HTTPS stream)  │
│  translateBatch.ts ► Lingo.dev API (sequential chunked)   │
│  explain.ts ───────► Gemini 1.5 Flash (context-aware)     │
│  summarize.ts ─────► Gemini 1.5 Flash                     │
│  simplify.ts ──────► Gemini 1.5 Flash                     │
│  meaning.ts ───────► Gemini 1.5 Flash                     │
│  fetchContent.ts ──► Firecrawl API (markdown extraction)  │
│  cleanMarkdown.ts ─► Gemini (structured JSON output)      │
└──────────────────────────────────────────────────────────┘
```

**Why native `https.request` instead of the SDK?**
We bypass the Lingo.dev SDK and use raw Node.js HTTPS streams to avoid Next.js caching layers (`unstable_noStore`) and maintain full control over retry logic with exponential backoff (3 retries, 300ms/600ms/900ms delays).

**Gemini fallback:** If the primary Gemini call fails, `explain.ts` falls back to an alternative endpoint for resilience.

---

### 5. 💾 Persistence Layer

```
┌──────────────────────────────────────────────────┐
│              Client-Side Storage                  │
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │          IndexedDB (via idb library)        │  │
│  │                                             │  │
│  │  Store: pages                               │  │
│  │    Key: id (string)                         │  │
│  │    Index: [url, targetLanguage]             │  │
│  │    Value: SavedPage {                       │  │
│  │      url, title, targetLanguage,            │  │
│  │      translations: Record<id, {             │  │
│  │        original, translated, elementTag,    │  │
│  │        isLocked, status, layoutError        │  │
│  │      }>                                     │  │
│  │    }                                        │  │
│  │                                             │  │
│  │  Store: vocabulary                          │  │
│  │    Key: id (string)                         │  │
│  │    Index: timestamp                         │  │
│  │    Value: VocabularyEntry {                  │  │
│  │      original, translated, explanation,     │  │
│  │      url, targetLanguage                    │  │
│  │    }                                        │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │        TanStack React Query Cache           │  │
│  │                                             │  │
│  │  Query Keys:                                │  │
│  │    ['savedPages']        → all pages list   │  │
│  │    ['savedPage', url, lang] → single page   │  │
│  │    ['vocabulary']        → all vocab entries │  │
│  │                                             │  │
│  │  Mutations auto-invalidate related queries  │  │
│  │  staleTime: 60s                             │  │
│  └─────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

---

## 🖥️ View Modes

### Single Read Mode — `/read/[...url]`

```
┌─────────────────────────────────────────────────┐
│  Floating Control Bar                            │
│  [◄] [URL] [Language ▼] [🪄 Wand] [📐] [💾]    │
├─────────────────────────────────────────────────┤
│                                                  │
│    Proxied Website in iframe                     │
│    (with injected translation-script.js)         │
│                                                  │
│    • Hover → tooltip "Translate"                 │
│    • Click → translate single element            │
│    • Select text → AI toolbar (Explain,          │
│      Summarize, Simplify, Meaning)               │
│                                                  │
├──────────────────────────┬──────────────────────┤
│                          │  Translation Panel   │
│                          │  • Search/Filter     │
│                          │  • Edit translations │
│                          │  • Lock/Unlock       │
│                          │  • TTS playback      │
│                          │  • Export JSON        │
│                          │  • Vocabulary tab     │
└──────────────────────────┴──────────────────────┘
```

### Matrix Mode — `/matrix/[...url]`

```
┌─────────────────────────────────────────────────┐
│  Floating Control Bar                            │
│  [◄] [URL] [🪄 Translate All] [📐 Marquee]     │
├────────────────────────┬────────────────────────┤
│  [Spanish ▼]  [⬇ JSON] │  [French ▼]   [⬇ JSON]│
│                        │                        │
│   Proxied iframe #1    │   Proxied iframe #2    │
│   (scaled to fit)      │   (scaled to fit)      │
│                        │                        │
├────────────────────────┼────────────────────────┤
│  [German ▼]   [⬇ JSON]│  [Japanese ▼] [⬇ JSON] │
│                        │                        │
│   Proxied iframe #3    │   Proxied iframe #4    │
│   (scaled to fit)      │   (scaled to fit)      │
│                        │                        │
└────────────────────────┴────────────────────────┘

Virtual viewport: 1440px width, CSS transform scale()
to fit each quadrant responsively.
```

---

## 🌍 Language Support

**80+ languages** across 7 regions: Europe, Asia, Middle East, Africa, Americas, Oceania — including regional variants (e.g., `pt-BR`, `zh-TW`, `fr-CA`, `es-419`).

---

## 🛠️ Tech Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | **Next.js 16** (App Router) | SSR, Server Actions, API routes |
| Language | **TypeScript 5** | Type safety across the stack |
| Translation AI | **Lingo.dev API** | High-quality machine translation |
| Context AI | **Google Gemini 1.5 Flash** | Explain, summarize, simplify, meaning |
| Content Extraction | **Firecrawl** | Clean markdown from any URL |
| HTML Parsing | **Cheerio** | Server-side DOM manipulation for proxy |
| Styling | **Tailwind CSS 4** + **shadcn/ui** | Glassmorphic, responsive UI |
| State Management | **TanStack React Query** | Async state, caching, mutations |
| Client DB | **IndexedDB** (via `idb`) | Offline-capable page/vocab storage |
| Text-to-Speech | **Web Speech API** | Native browser TTS with voice matching |
| Validation | **Zod** | Runtime type validation |
| Icons | **Lucide React** | Consistent icon system |
| Background FX | **React Bits** (Squares) | Animated grid background |

---

## 🔒 Security Model

- **API keys** are never exposed to the client — all AI calls go through Server Actions
- **Iframe sandboxing:** `allow-scripts allow-same-origin allow-forms allow-popups`
- **CSP headers** are stripped from proxied content to allow script injection
- **User-Agent spoofing** prevents 403s from target websites
- **No cookies/auth forwarding** — proxy is read-only

---

## ⚡ Performance Optimizations

1. **`unstable_noStore`** on translation actions to bypass Next.js data cache
2. **Exponential backoff** with 3 retries on Lingo.dev API calls
3. **Batch translation** sends all visible elements in a single request
4. **React Query staleTime (60s)** prevents redundant IndexedDB reads
5. **ResizeObserver** for responsive Matrix cell scaling (no polling)
6. **CSS `transform: scale()`** for Matrix viewport instead of re-rendering
7. **Lazy voice loading** for TTS with `onvoiceschanged` callback

---

<div align="center">

*Built for the [Lingo.dev](https://lingo.dev) Hackathon with ❤️*

**LingoLens** — *Translate the Web. Preserve the Design. Understand the Context.*

</div>
