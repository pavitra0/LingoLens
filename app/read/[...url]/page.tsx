'use client'

import { translateBatch } from '@/app/actions/translateBatch'
import { translateMarkdown } from '@/app/actions/translate'
import LanguageSelector from '@/components/LanguageSelector'
import ThemeToggle from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import { reconstructUrl } from '@/lib/utils'
import TranslationPanel from '@/components/TranslationPanel' // Import component
import { getSavedPage, savePage, addVocabulary, type SavedPage, type TranslationEntry } from '@/lib/library' // Import library types
import { explainText } from '@/app/actions/explain' // Import explanation action
import { ArrowLeft, ArrowRight, Lock as LockIcon, RotateCw, X, Wand2, Save, Bookmark, List, PanelsTopLeft, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export default function ReadPage() {
  const [params, setParams] = useState<any>(useParams())
  const router = useRouter()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [targetLanguage, setTargetLanguage] = useState<string>('es') // Default to Spanish
  const [translating, setTranslating] = useState(false)
  const [proxyUrl, setProxyUrl] = useState<string | null>(null)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [isSaved, setIsSaved] = useState(false) // Track saved state

  // New State for Panel
  const [showPanel, setShowPanel] = useState(false) // Toggle panel
  const [currentTranslations, setCurrentTranslations] = useState<Record<string, TranslationEntry>>({}) // Track translations in real-time

  // Explanation State
  const [explanationData, setExplanationData] = useState<{ selectedText: string, surroundingText: string } | null>(null);
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [explanationResult, setExplanationResult] = useState("");

  // Dynamic Theming
  const [dynamicThemeColor, setDynamicThemeColor] = useState<string | null>(null);

  // Initialization
  useEffect(() => {
    async function init() {
      try {
        if (!params || !params.url) return;

        const decodedUrl = reconstructUrl(params.url as string | string[])

        if (!decodedUrl) {
          setError("Invalid URL");
          setLoading(false);
          return;
        }

        // Check if page is saved in library
        const saved = getSavedPage(decodedUrl, targetLanguage);
        if (saved) setIsSaved(true);

        // Construct proxy URL
        const pUrl = `/api/proxy?url=${encodeURIComponent(decodedUrl)}`
        setProxyUrl(pUrl)
        setLoading(false)

      } catch (err) {
        setError('Failed to initialize')
        setLoading(false)
      }
    }
    init()
  }, [params, targetLanguage])

  // Restore state when iframe loads if saved
  useEffect(() => {
    if (iframeLoaded && proxyUrl && params?.url) {
      const decodedUrl = reconstructUrl(params.url as string | string[]);
      if (decodedUrl) {
        const saved = getSavedPage(decodedUrl, targetLanguage);
        if (saved && saved.translations && iframeRef.current && iframeRef.current.contentWindow) {
          console.log("Restoring saved translations...");
          setTimeout(() => {
            iframeRef.current?.contentWindow?.postMessage({
              type: 'RESTORE_PAGE_STATE',
              translations: saved.translations
            }, '*');
          }, 1000); // Small delay to ensure script initialization
        }
      }
    }
  }, [iframeLoaded, proxyUrl, params, targetLanguage]);


  // Handle messages from iframe (Extended)
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (!event.data) return;
      console.log('[Lingo Parent] Received message:', event.data.type);

      const type = event.data.type;

      // Save State Response
      if (type === 'PAGE_STATE_RESPONSE') {
        const { translations, title } = event.data.payload;

        // Update local state for panel
        setCurrentTranslations(translations);

        // ... existing logic to save to local storage if user requested save ...
        const decodedUrl = reconstructUrl(params.url as string | string[]);

        if (decodedUrl && translations && Object.keys(translations).length > 0) {
          const newPage: SavedPage = {
            id: Date.now().toString(), // Simple ID
            url: decodedUrl,
            title: title || decodedUrl,
            targetLanguage,
            createdAt: Date.now(),
            lastVisited: Date.now(),
            translations
          };
          savePage(newPage);
          setIsSaved(true);
          // Optional: Show toast
        }
      }

      // Single Translation
      if (type === 'TRANSLATE_REQUEST') {
        const { text, id } = event.data;
        if (!text || !id) return;

        try {
          setTranslating(true);
          const result = await translateMarkdown(text, null, targetLanguage);

          if (result.success && result.data) {
            if (iframeRef.current && iframeRef.current.contentWindow) {
              iframeRef.current.contentWindow.postMessage({
                type: 'TRANSLATION_RESULT',
                id,
                translatedText: result.data,
                originalText: text,
                success: true
              }, '*');
            }

            // --- Auto-Fetch Explanation ---
            const pageUrl = reconstructUrl(params.url as string | string[]) || "";
            // Run asynchronously without blocking the main thread
            explainText({
              selectedText: result.data, // Explaining the translated text
              surroundingText: result.data,
              pageUrl,
              pageTitle: document.title
            }).then(explainResult => {
              if (explainResult.success && explainResult.explanation) {
                addVocabulary({
                  original: text,
                  translated: result.data!,
                  explanation: explainResult.explanation,
                  url: pageUrl,
                  targetLanguage
                });
              }
            }).catch(e => console.error("Auto-explain failed", e));
            // -----------------------------

          } else {
            // ... error handling
            if (iframeRef.current && iframeRef.current.contentWindow) {
              iframeRef.current.contentWindow.postMessage({ type: 'TRANSLATION_RESULT', id, success: false }, '*');
            }
          }
        } catch (err) {
          console.error("Transmission error", err);
        } finally {
          setTranslating(false);
        }
        if (event.data.success && showPanel) refreshPanelState();
      }

      // Batch Translation
      if (type === 'BATCH_TRANSLATE_REQUEST') {
        const { payload } = event.data; // Array of {id, text}
        if (!payload || !Array.isArray(payload) || payload.length === 0) return;

        try {
          setTranslating(true);
          const texts = payload.map((p: any) => p.text);
          const result = await translateBatch(texts, null, targetLanguage);

          if (result.success && result.data) {
            const results = payload.map((p: any, index: number) => ({
              id: p.id,
              translatedText: result.data![index],
              success: true
            }));

            if (iframeRef.current && iframeRef.current.contentWindow) {
              iframeRef.current.contentWindow.postMessage({
                type: 'BATCH_TRANSLATE_RESPONSE',
                results
              }, '*');
            }
          }
        } catch (err) {
          console.error("Batch error", err);
        } finally {
          setTranslating(false);
        }
      }

      if (type === 'BATCH_TRANSLATE_RESPONSE') {
        if (showPanel) refreshPanelState();
      }


      // Batch Complete Notification
      if (type === 'BATCH_TRANSLATION_COMPLETE') {
        // Could show a toast or notification here
      }

      // Explain Request
      if (type === 'EXPLAIN_REQUEST') {
        const { selectedText, surroundingText } = event.data;
        if (selectedText) {
          setExplanationData({ selectedText, surroundingText });
          setExplanationLoading(true);
          setExplanationResult(""); // Clear previous

          const pageTitle = document.title;
          const pageUrl = reconstructUrl(params.url as string | string[]) || "";

          try {
            const response = await explainText({
              selectedText,
              surroundingText,
              pageUrl,
              pageTitle
            });

            if (response.success && response.explanation) {
              setExplanationResult(response.explanation);
            } else {
              setExplanationResult(response.error || "Could not generate explanation.");
            }
          } catch (e) {
            setExplanationResult("Error generating explanation.");
          } finally {
            setExplanationLoading(false);
          }
        }
      }

      // Theme Color
      if (type === 'THEME_COLOR_DETECTED') {
        const { color } = event.data;
        if (color) {
          setDynamicThemeColor(color);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [targetLanguage, params, showPanel]); // Added showPanel to dependency

  const refreshPanelState = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'REQUEST_PAGE_STATE' }, '*');
    }
  }

  const handleLanguageChange = (lang: string | null) => {
    if (lang) {
      setTargetLanguage(lang);
      setIsSaved(false); // Reset saved state on language change
      // Notify iframe to re-translate currently translated items
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage({
          type: 'LANGUAGE_UPDATE'
        }, '*');
      }
    }
  }

  const handleSavePage = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'REQUEST_PAGE_STATE'
      }, '*');
    }
  }

  // Toggle Panel
  const togglePanel = () => {
    if (!showPanel) {
      refreshPanelState(); // Fetch data when opening
    }
    setShowPanel(!showPanel);
  }

  // Panel Actions
  const handlePanelUpdate = (id: string, text: string) => {
    // Update locally
    const updated = { ...currentTranslations };
    if (updated[id]) {
      updated[id] = { ...updated[id], translated: text, status: 'modified' };
      setCurrentTranslations(updated);

      // Send to iframe
      iframeRef.current?.contentWindow?.postMessage({
        type: 'UPDATE_TRANSLATION',
        id,
        text,
        isLocked: updated[id].isLocked
      }, '*');
    }
  }

  const handlePanelLock = (id: string, locked: boolean) => {
    const updated = { ...currentTranslations };
    if (updated[id]) {
      updated[id] = { ...updated[id], isLocked: locked };
      setCurrentTranslations(updated);

      // Send to iframe
      iframeRef.current?.contentWindow?.postMessage({
        type: 'UPDATE_TRANSLATION',
        id,
        text: updated[id].translated,
        isLocked: locked
      }, '*');
    }
  }

  const handlePanelHighlight = (id: string) => {
    iframeRef.current?.contentWindow?.postMessage({
      type: 'HIGHLIGHT_ELEMENT',
      id
    }, '*');
  }

  const handlePanelRevert = (id: string) => {
    const updated = { ...currentTranslations };
    if (updated[id]) {
      const original = updated[id].original;
      updated[id] = { ...updated[id], translated: original, status: 'active' }; // status active?? or maybe just revert text
      setCurrentTranslations(updated);

      // Send to iframe
      iframeRef.current?.contentWindow?.postMessage({
        type: 'UPDATE_TRANSLATION',
        id,
        text: original,
        isLocked: updated[id].isLocked
      }, '*');
    }
  }

  const handlePanelExplain = async (id: string, text: string) => {
    setExplanationData({ selectedText: text, surroundingText: text });
    setExplanationLoading(true);
    setExplanationResult("");

    const pageTitle = document.title;
    const pageUrl = reconstructUrl(params.url as string | string[]) || "";

    try {
      const response = await explainText({
        selectedText: text,
        surroundingText: text,
        pageUrl,
        pageTitle
      });

      if (response.success && response.explanation) {
        setExplanationResult(response.explanation);
      } else {
        setExplanationResult(response.error || "Could not generate explanation.");
      }
    } catch (e) {
      setExplanationResult("Error generating explanation.");
    } finally {
      setExplanationLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Link href="/" className="font-bold text-xl hover:opacity-80 transition-opacity">LingoLens</Link>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </main>
      </div>
    )
  }

  if (error || !proxyUrl) {
    return (
      <div className="min-h-screen flex flex-col text-center justify-center items-center gap-4">
        <p className="text-destructive font-semibold">{error || "Something went wrong"}</p>
        <Button onClick={() => router.push('/')}>Go Home</Button>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background bg-[url('https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center">
      {/* Browser Toolbar */}
      <div
        className="flex-none bg-background/50 dark:bg-background/40 backdrop-blur-2xl border-b border-white/20 dark:border-white/10 p-2 flex flex-wrap md:flex-nowrap items-center justify-between gap-2 md:gap-4 transition-all duration-1000 z-50"
        style={{
          backgroundColor: dynamicThemeColor ? `${dynamicThemeColor}80` : undefined, // Add transparency
          borderColor: dynamicThemeColor ? `${dynamicThemeColor}` : undefined
        }}
      >

        {/* Navigation Controls */}
        <div className="flex items-center gap-1 md:gap-2 text-muted-foreground order-1">
          {/* Magic Wand Batch Translate */}
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 hover:bg-primary/10 hover:text-primary rounded-full transition-colors ${translating ? 'animate-pulse text-primary' : ''}`}
            onClick={() => {
              if (iframeRef.current && iframeRef.current.contentWindow) {
                iframeRef.current.contentWindow.postMessage({ type: 'TRIGGER_BATCH_TRANSLATE' }, '*');
              }
            }}
            title="Translate Visible Content"
          >
            <Wand2 className="w-4 h-4" />
          </Button>

          {/* Control Panel Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 rounded-full transition-colors ${showPanel ? 'text-primary bg-primary/10' : 'hover:bg-primary/10 hover:text-primary'}`}
            onClick={togglePanel}
            title="Translation Control Panel"
          >
            <PanelsTopLeft className="w-4 h-4" />
          </Button>

          {/* Bookmark / Save Button */}
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 rounded-full transition-colors ${isSaved ? 'text-primary bg-primary/10' : 'hover:bg-primary/10 hover:text-primary'}`}
            onClick={handleSavePage}
            title={isSaved ? "Translation Saved" : "Save Translation"}
          >
            {isSaved ? <Bookmark className="w-4 h-4 fill-current" /> : <Save className="w-4 h-4" />}
          </Button>

          {/* Vocabulary / Flashcards */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-primary/10 hover:text-primary rounded-full transition-colors"
            onClick={() => router.push('/vocabulary')}
            title="Vocabulary List"
          >
            <BookOpen className="w-4 h-4" />
          </Button>

          <div className="hidden md:block w-px h-4 bg-border mx-1" />

          <Button variant="ghost" size="icon" className="hidden md:inline-flex h-8 w-8 hover:bg-background/50 rounded-full" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden md:inline-flex h-8 w-8 hover:bg-background/50 rounded-full" disabled>
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden md:inline-flex h-8 w-8 hover:bg-background/50 rounded-full" onClick={() => window.location.reload()}>
            <RotateCw className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Address Bar */}
        <div className="w-full md:flex-1 flex items-center justify-center order-3 md:order-2 mt-1 md:mt-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              let urlToLoad = (e.currentTarget.elements.namedItem('urlInput') as HTMLInputElement).value;
              if (urlToLoad) {
                router.push(`/read/${encodeURIComponent(urlToLoad)}`);
              }
            }}
            className="flex items-center gap-2 md:gap-3 w-full max-w-2xl bg-background/50 border border-border/40 hover:border-border/80 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all rounded-xl px-3 py-1.5 md:px-4 md:py-2 shadow-sm relative group"
          >
            <div className="p-1 md:p-1.5 bg-primary/10 rounded-lg text-primary shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 5H11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 5V19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M15 9L21 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M18 9L18 19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <div className="flex-1 flex items-center gap-2 overflow-hidden">
              <LockIcon className="w-3 h-3 text-green-500/80 shrink-0" />
              <input
                name="urlInput"
                defaultValue={reconstructUrl(params.url as string | string[]) || ''}
                key={params.url as string}
                className="w-full bg-transparent border-none focus:outline-none text-xs md:text-sm font-medium text-foreground placeholder:text-muted-foreground/50 truncate selection:bg-primary/20"
                placeholder="Enter website URL..."
                autoComplete="off"
              />
            </div>

            <div className="flex items-center shrink-0">
              <LanguageSelector
                selectedLanguage={targetLanguage}
                onLanguageChange={handleLanguageChange}
              />
            </div>
          </form>
        </div>

        {/* Window Controls / Extras */}
        <div className="flex items-center gap-1 md:gap-2 order-2 md:order-3">
          <ThemeToggle />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => router.push('/')}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Browser Viewport */}
      <main className="flex-1 relative w-full h-full bg-muted/20 overflow-hidden p-0 md:p-2 flex">
        <div className="flex-1 relative h-full bg-card md:rounded-xl md:border border-border/40 shadow-2xl overflow-hidden isolation-auto ring-1 ring-border/10 transition-all duration-300">
          {!iframeLoaded && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-card">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-muted-foreground text-sm font-medium animate-pulse">Establishing secure connection...</p>
              </div>
            </div>
          )}
          <iframe
            ref={iframeRef}
            src={proxyUrl}
            className="w-full h-full border-0 select-none"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            onLoad={() => setIframeLoaded(true)}
            title="Website Proxy"
          />
        </div>


        {/* ... Sliding Panel ... */}
        {showPanel && (
          <TranslationPanel
            translations={currentTranslations}
            onClose={() => setShowPanel(false)}
            onUpdate={handlePanelUpdate}
            onLock={handlePanelLock}
            onHighlight={handlePanelHighlight}
            onRevert={handlePanelRevert}
            onExplain={handlePanelExplain}
          />
        )}

        {/* Explanation Dialog */}
        {explanationData && (
          <div className="absolute bottom-4 right-4 sm:bottom-8 sm:right-8 w-[90vw] sm:w-80 max-w-[400px] bg-background/50 dark:bg-background/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] p-5 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2 text-primary font-semibold">
                <span className="text-xl">✨</span>
                <span className="text-sm">AI Explanation</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 -mt-1 -mr-1 rounded-full text-muted-foreground hover:bg-muted"
                onClick={() => setExplanationData(null)}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="bg-muted/50 rounded-lg p-2.5 mb-3 border border-border/50">
              <p className="text-xs font-mono text-muted-foreground mb-1 uppercase tracking-wider">Selected</p>
              <p className="text-sm font-medium text-foreground line-clamp-2">"{explanationData.selectedText}"</p>
            </div>

            {explanationLoading ? (
              <div className="space-y-2 py-2">
                <div className="h-3 w-3/4 bg-primary/20 rounded animate-pulse" />
                <div className="h-3 w-full bg-primary/10 rounded animate-pulse" />
                <div className="h-3 w-5/6 bg-primary/10 rounded animate-pulse" />
              </div>
            ) : (
              <div className="text-sm leading-relaxed text-foreground/90 animate-in fade-in">
                {explanationResult}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
