'use client'

import { translateBatch } from '@/app/actions/translateBatch'
import { translateMarkdown } from '@/app/actions/translate'
import LanguageSelector from '@/components/LanguageSelector'
import { Button } from '@/components/ui/button'
import { reconstructUrl } from '@/lib/utils'
import TranslationPanel from '@/components/TranslationPanel' // Import component
import { type SavedPage, type TranslationEntry } from '@/lib/library' // Import legacy library types
import { useSavePage, useSavedPage, useAddVocabulary } from '@/lib/hooks/useLibrary'
import { explainText } from '@/app/actions/explain' // Import explanation action
import { ArrowLeft, ArrowRight, Lock as LockIcon, RotateCw, X, Wand2, Save, Bookmark, BookOpen, LayoutTemplate, LayoutGrid, PanelsTopLeft, MousePointerSquareDashed, Volume2 } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState, Suspense } from 'react'

function ReadPageContent() {
  const [params, setParams] = useState<any>(useParams())
  const searchParams = useSearchParams()
  const router = useRouter()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initialize target language from query parameter ?lang=es or default to 'es'
  const initialLang = searchParams?.get('lang') || 'es'
  const [targetLanguage, setTargetLanguage] = useState<string>(initialLang)

  const [translating, setTranslating] = useState(false)
  const [isMarqueeActive, setIsMarqueeActive] = useState(false)
  const [proxyUrl, setProxyUrl] = useState<string | null>(null)
  const [iframeLoaded, setIframeLoaded] = useState(false)

  const decodedUrlMemo = reconstructUrl(params.url as string | string[]) || "";
  const { data: savedData } = useSavedPage(decodedUrlMemo, targetLanguage);
  const saveMutation = useSavePage();
  const addVocabMutation = useAddVocabulary();
  const isSaved = !!savedData; // Track saved state from react query

  // New State for Panel
  const [showPanel, setShowPanel] = useState(false) // Toggle panel
  const [currentTranslations, setCurrentTranslations] = useState<Record<string, TranslationEntry>>({}) // Track translations in real-time

  // Explanation State
  const [explanationData, setExplanationData] = useState<{ selectedText: string, surroundingText: string, type?: string } | null>(null);
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
  }, [params])

  // Restore state when iframe loads if saved, or natively auto translate if initially specified by lang
  useEffect(() => {
    if (iframeLoaded && proxyUrl && params?.url) {
      if (savedData && savedData.translations && iframeRef.current && iframeRef.current.contentWindow) {
        console.log("Restoring saved translations...");
        setTimeout(() => {
          iframeRef.current?.contentWindow?.postMessage({
            type: 'RESTORE_PAGE_STATE',
            translations: savedData.translations
          }, '*');
        }, 1000); // Small delay to ensure script initialization
      } else if (searchParams?.get('lang') && !savedData) {
        // If passing a lang query parameter dynamically and it isn't saved, auto-translate immediately
        setTimeout(() => {
          iframeRef.current?.contentWindow?.postMessage({
            type: 'TRIGGER_BATCH_TRANSLATE'
          }, '*');
        }, 1000);
      }
    }
  }, [iframeLoaded, proxyUrl, params, targetLanguage, savedData, searchParams]);


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

        const decodedUrl = reconstructUrl(params.url as string | string[]);

        if (decodedUrl && translations && Object.keys(translations).length > 0) {
          const newPage: SavedPage = {
            id: savedData?.id || Date.now().toString(), // Use existing ID if already saved
            url: decodedUrl,
            title: title || decodedUrl,
            targetLanguage,
            createdAt: savedData?.createdAt || Date.now(),
            lastVisited: Date.now(),
            translations
          };
          saveMutation.mutate(newPage);
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

          } else {
            if (iframeRef.current && iframeRef.current.contentWindow) {
              iframeRef.current.contentWindow.postMessage({ type: 'TRANSLATION_RESULT', id, success: false }, '*');
            }
          }
        } catch (err) {
          console.error("Transmission error", err);
        } finally {
          setTranslating(false);
        }
        refreshPanelState();
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
        refreshPanelState();
      }


      // Batch Complete Notification
      if (type === 'BATCH_TRANSLATION_COMPLETE') {
        // Could show a toast or notification here
      }

      // Explain, Summarize, Simplify, Meaning Requests
      if (type === 'EXPLAIN_REQUEST' || type === 'SUMMARIZE_REQUEST' || type === 'SIMPLIFY_REQUEST' || type === 'MEANING_REQUEST') {
        const { selectedText, surroundingText } = event.data;
        if (selectedText) {
          setExplanationData({ selectedText, surroundingText, type });
          setExplanationLoading(true);
          setExplanationResult(""); // Clear previous

          const pageTitle = event.data.pageTitle || savedData?.title || decodedUrlMemo || "";
          const pageUrl = reconstructUrl(params.url as string | string[]) || "";

          try {
            let response;
            if (type === 'EXPLAIN_REQUEST') {
              response = await explainText({ selectedText, surroundingText, pageUrl, pageTitle });
              if (response.success && response.explanation) {
                setExplanationResult(response.explanation);
                addVocabMutation.mutate({
                  original: selectedText,
                  translated: selectedText,
                  explanation: response.explanation,
                  url: pageUrl,
                  targetLanguage
                });
              } else {
                setExplanationResult(response.error || "Could not generate explanation.");
              }
            } else if (type === 'SUMMARIZE_REQUEST') {
              const { summarizeText } = await import('@/app/actions/summarize');
              response = await summarizeText({ selectedText, surroundingText, pageUrl, pageTitle });
              if (response.success && response.summary) {
                setExplanationResult(response.summary);
              } else {
                setExplanationResult(response.error || "Could not generate summary.");
              }
            } else if (type === 'SIMPLIFY_REQUEST') {
              const { simplifyText } = await import('@/app/actions/simplify');
              response = await simplifyText({ selectedText, surroundingText, pageUrl, pageTitle });
              if (response.success && response.simplification) {
                setExplanationResult(response.simplification);
              } else {
                setExplanationResult(response.error || "Could not generate simplification.");
              }
            } else if (type === 'MEANING_REQUEST') {
              const { meaningText } = await import('@/app/actions/meaning');
              response = await meaningText({ selectedText, surroundingText, pageUrl, pageTitle });
              if (response.success && response.meaning) {
                setExplanationResult(response.meaning);
              } else {
                setExplanationResult(response.error || "Could not generate meaning.");
              }
            }
          } catch (e) {
            setExplanationResult("Error generating result.");
          } finally {
            setExplanationLoading(false);
          }
        }
      }

      // Layout Error (Developer Mode)
      if (type === 'LAYOUT_ERROR_DETECTED') {
        const { id, errorType } = event.data;
        setCurrentTranslations(prev => {
          const entry = prev[id];
          if (!entry) return prev;
          return {
            ...prev,
            [id]: {
              ...entry,
              layoutError: true,
              errorType: errorType
            }
          };
        });
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
  }, [targetLanguage, params, showPanel, savedData]);

  const refreshPanelState = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'REQUEST_PAGE_STATE' }, '*');
    }
  }

  const handleLanguageChange = (lang: string | null) => {
    if (lang && lang !== targetLanguage) {
      setTargetLanguage(lang);
      if (iframeRef.current && iframeRef.current.contentWindow) {
        // Clear locally stored translations visually if desired, though batch response will overwrite them anyway
        iframeRef.current.contentWindow.postMessage({
          type: 'RETRANSLATE_ACTIVE'
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

  const handlePanelExplain = async (id: string, text: string, originalText: string) => {
    setExplanationData({ selectedText: text, surroundingText: text, type: 'EXPLAIN_REQUEST' });
    setExplanationLoading(true);
    setExplanationResult("");

    const pageTitle = savedData?.title || decodedUrlMemo || "";
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
        addVocabMutation.mutate({
          original: originalText,
          translated: text,
          explanation: response.explanation,
          url: pageUrl,
          targetLanguage
        });
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

  // Construct a dynamic global string for inline styling the background
  const dynamicBackgroundStyle = dynamicThemeColor
    ? { backgroundImage: `radial-gradient(ellipse at 50% -20%, ${dynamicThemeColor}40 0%, transparent 70%), linear-gradient(to bottom, #0a0a0a, #0a0a0a)` }
    : { backgroundColor: '#0a0a0a' };

  return (
    <div className="h-screen flex flex-col overflow-hidden relative" style={dynamicBackgroundStyle}>

      {/* Animated Background Mesh (matches homepage style) */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-50">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      </div>

      {/* Floating Browser Island */}
      <div className="w-full flex justify-center pt-4 pb-2 px-4 z-50">
        <div
          className="w-full max-w-6xl bg-black/40 backdrop-blur-3xl border border-white/10 rounded-full p-2 flex flex-wrap md:flex-nowrap items-center justify-between gap-2 md:gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all duration-1000"
          style={{
            boxShadow: dynamicThemeColor ? `0 8px 32px 0 ${dynamicThemeColor}20, inset 0 0 0 1px ${dynamicThemeColor}40` : undefined
          }}
        >

          {/* Navigation Controls */}
          <div className="flex items-center gap-1 md:gap-2 text-muted-foreground order-1 pl-2">
            {/* Area Selection Tool (Marquee) */}
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${isMarqueeActive ? 'text-primary bg-primary/10 animate-pulse' : 'hover:bg-primary/10 hover:text-primary'}`}
              onClick={() => {
                const newState = !isMarqueeActive;
                setIsMarqueeActive(newState);
                if (iframeRef.current && iframeRef.current.contentWindow) {
                  iframeRef.current.contentWindow.postMessage({ type: 'TOGGLE_MARQUEE', isActive: newState }, '*');
                }
              }}
              title="Drag to Translate Area"
            >
              <MousePointerSquareDashed className="w-4 h-4" />
            </Button>

            {/* Magic Wand Batch Translate */}
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 hover:bg-primary/10 hover:text-primary rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${translating ? 'animate-pulse text-primary' : ''}`}
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
              className={`h-8 w-8 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${showPanel ? 'text-primary bg-primary/10' : 'hover:bg-primary/10 hover:text-primary'}`}
              onClick={togglePanel}
              title="Translation Control Panel"
            >
              <PanelsTopLeft className="w-4 h-4" />
            </Button>

            {/* Matrix View Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-all duration-200 hover:scale-110 active:scale-95"
              onClick={() => {
                const urlToLoad = reconstructUrl(params.url as string | string[]) || '';
                router.push(`/matrix/${encodeURIComponent(urlToLoad)}`);
              }}
              title="Open Matrix View (4-Pane)"
            >
              <LayoutGrid className="w-4 h-4" />
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
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-white/10" onClick={() => router.push('/')}>
              <X className="w-4 h-4" />
            </Button>
          </div>
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


        {/* Sliding Panel */}
        {showPanel && (
          <TranslationPanel
            currentUrl={reconstructUrl(params.url as string | string[]) || ''}
            translations={currentTranslations}
            targetLanguage={targetLanguage}
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
                <span className="text-sm">
                  {explanationData.type === 'SUMMARIZE_REQUEST' ? 'AI Summary' :
                    explanationData.type === 'SIMPLIFY_REQUEST' ? 'AI Simplify' :
                      explanationData.type === 'MEANING_REQUEST' ? 'AI Meaning' :
                        'AI Explanation'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {explanationResult && !explanationLoading && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 -mt-1 rounded-full text-muted-foreground hover:bg-muted hover:text-primary transition-colors"
                    onClick={() => {
                      import('@/lib/tts').then(({ playTextToSpeech }) => {
                        playTextToSpeech(explanationResult, 'en-US');
                      });
                    }}
                    title="Listen"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 -mt-1 -mr-1 rounded-full text-muted-foreground hover:bg-muted"
                  onClick={() => setExplanationData(null)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
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

export default function ReadPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ReadPageContent />
    </Suspense>
  )
}
