'use client'

import { translateBatch } from '@/app/actions/translateBatch'
import { translateMarkdown } from '@/app/actions/translate'
import LanguageSelector from '@/components/LanguageSelector'
import ThemeToggle from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import { reconstructUrl } from '@/lib/utils'
import { ArrowLeft, ArrowRight, Lock, RotateCw, X, Wand2 } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export default function ReadPage() {
  const params = useParams()
  const router = useRouter()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [targetLanguage, setTargetLanguage] = useState<string>('es') // Default to Spanish
  const [translating, setTranslating] = useState(false)
  const [proxyUrl, setProxyUrl] = useState<string | null>(null)
  const [iframeLoaded, setIframeLoaded] = useState(false)

  // Initialization
  useEffect(() => {
    async function init() {
      try {
        // params from useParams() is available immediately in Client Components
        if (!params || !params.url) {
          // Wait for params if needed (unlikely in this setup but safe)
          return;
        }

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

  // Handle messages from iframe
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (!event.data) return;
      console.log('[Lingo Parent] Received message:', event.data.type);

      // Single Translation
      if (event.data.type === 'TRANSLATE_REQUEST') {
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
      }

      // Batch Translation
      if (event.data.type === 'BATCH_TRANSLATE_REQUEST') {
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

      // Batch Complete Notification
      if (event.data.type === 'BATCH_TRANSLATION_COMPLETE') {
        // Could show a toast or notification here
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [targetLanguage]);

  const handleLanguageChange = (lang: string | null) => {
    if (lang) {
      setTargetLanguage(lang);
      // Notify iframe to re-translate currently translated items
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage({
          type: 'LANGUAGE_UPDATE'
        }, '*');
      }
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
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Browser Toolbar */}
      <div className="flex-none bg-secondary/80 backdrop-blur-xl border-b border-border/50 p-3 flex items-center gap-4 transition-all z-50">

        {/* Navigation Controls */}
        <div className="flex items-center gap-2 text-muted-foreground">
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

          <div className="w-px h-4 bg-border mx-1" />

          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background/50 rounded-full" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background/50 rounded-full" disabled>
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background/50 rounded-full" onClick={() => window.location.reload()}>
            <RotateCw className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Address Bar */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 w-full max-w-2xl bg-background/50 border border-border/40 hover:border-border/80 transition-colors rounded-xl px-4 py-2 cursor-text shadow-sm relative group">
            <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
              {/* LingoLens Logo Icon */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 5H11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 5V19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M15 9L21 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M18 9L18 19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <div className="flex-1 flex items-center gap-2 overflow-hidden">
              <Lock className="w-3 h-3 text-green-500/80 shrink-0" />
              <span className="text-sm font-medium text-foreground truncate selection:bg-primary/20">
                {reconstructUrl(params.url as string | string[]) || 'Loading...'}
              </span>
            </div>

            {/* Action Buttons in Address Bar */}
            <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
              <LanguageSelector
                selectedLanguage={targetLanguage}
                onLanguageChange={handleLanguageChange}
              />
            </div>
          </div>
        </div>

        {/* Window Controls / Extras */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => router.push('/')}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Browser Viewport */}
      <main className="flex-1 relative w-full h-full bg-muted/20 overflow-hidden p-0 md:p-2">
        <div className="w-full h-full relative bg-card md:rounded-xl md:border border-border/40 shadow-2xl overflow-hidden isolation-auto ring-1 ring-border/10">
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
      </main>
    </div>
  )
}
