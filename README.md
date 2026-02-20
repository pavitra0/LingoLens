<div align="center">
  <img src="https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop" height="150" style="border-radius: 10px; object-fit: cover; width: 100%;" alt="LingoLens Banner" />
  
  <br />
  <br />

  <h1>🔍 LingoLens</h1>
  <p><b>Translate the Web. Preserve the Design. Understand the Context.</b></p>
  <p><i>Standard translations break the web. LingoLens proxies websites to deliver layout-preserving translations with AI-powered contextual explanations built right in.</i></p>

  <p>
    <a href="#how-it-works">How it Works</a> •
    <a href="#key-features">Key Features</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#the-hack">The "Hack"</a>
  </p>
</div>

---

## 🏆 The Problem: The Web is "Lost in Translation"

When you use standard browser translation extensions, you get the literal words, but you ruin the experience:
1. **Broken UI:** Text expands or contracts, pushing buttons off-screen and destroying meticulously crafted CSS.
2. **Missing Nuance:** Simple vocabulary swap fails to explain cultural references, idioms, or context.
3. **The Magic is Gone:** You consume raw data instead of experiencing an aesthetic website.

## 🚀 The Solution: LingoLens

LingoLens is a next-generation "Translator Browser." Built as a sophisticated proxy engine, it renders target websites safely in an iframe and injects a real-time, glassmorphic translation overlay powered by a secure `postMessage` bridge.

Instead of translating the whole page blindly, LingoLens preserves the DOM, letting you click to translate blocks organically, or use the **Magic Wand** to batch translate the viewport without shifting a single pixel of the layout.

## ✨ Key Features (Hackathon Highlights)

### 1. 🎨 Layout-Preserving Translation
Powered by [Lingo.dev](https://lingo.dev/), our engine intelligently swaps text nodes in the DOM while retaining the original font weights, spacing, and CSS properties. We use chunked native streams to bypass Next.js caching caps, delivering real-time localized text.

### 2. 🧠 Context-Aware "Explain" Feature (Gemini 2.0)
Literal translation isn't enough. If an article mentions a specific cultural event, translating it directly leaves the reader confused. 
By selecting translated text and clicking **✨ Explain**, LingoLens sends the *surrounding context* of the article to **Google Gemini 2.0 Flash**, which returns a precise, 2-line explanation of the term *in the context of that specific website*.

### 3. 📱 Flawlessly Responsive & Glassmorphic
Judges love a beautiful UI. We built the external controls with advanced Tailwind CSS, featuring heavy backdrop-blurs, dynamic theming based on the proxied website, and perfect mobile-viewport scaling—a massive challenge when dealing with cross-origin proxy iframes.

---

## 🏗️ The Tech Stack

*   **Framework:** Next.js 15 (App Router)
*   **Translation AI:** [Lingo.dev API](https://lingo.dev/) (Native Node.js HTTPS Streams)
*   **Context Explainer AI:** Google Gemini 2.0 Flash
*   **Styling:** Tailwind CSS + Shadcn/UI (Glassmorphism aesthetic)
*   **Proxy Logic:** Custom Node/Next.js dynamic HTML rewriting

## 🔥 The "Hack": Building a Browser within a Browser

The most technically complex part of this project was proxying the modern web. To achieve this, we had to:
1. Build a custom proxy route that fetches external HTML, rewrites relative asset paths (CSS, images) to absolute paths, and strips restrictive `X-Frame-Options` headers.
2. Establish a secure, asynchronous `postMessage` bridge between our React frontend and the sandboxed iframe.
3. Inject a vanilla JavaScript bundle (`translation-script.js`) into the target DOM that isolates translatable nodes, captures user highlights, and listens for command events from the parent (e.g., locking translations or triggering the Gemini Explainer hook).

## 🏃‍♂️ Getting Started Locally

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file with the following keys:
   ```env
   LINGODOTDEV_API_KEY=your_lingo_dev_key
   GEMINI_API_KEY=your_gemini_key
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:3000` and enter a URL to try it out!

---
*Built for the Hackathon with ❤️*
