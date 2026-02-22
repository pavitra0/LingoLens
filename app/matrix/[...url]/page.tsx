'use client'

import { translateBatch } from '@/app/actions/translateBatch'
import { translateMarkdown } from '@/app/actions/translate'
import LanguageSelector from '@/components/LanguageSelector'
import { Button } from '@/components/ui/button'
import { reconstructUrl } from '@/lib/utils'
import { ArrowLeft, ArrowRight, RotateCw, X, Wand2, LayoutTemplate, MousePointerSquareDashed, ExternalLink, Download } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Lock as LockIcon } from 'lucide-react'
import Squares from '@/components/react-bits/Squares'

export default function MatrixPage() {
    const params = useParams()
    const router = useRouter()
    const iframeRefs = useRef<(HTMLIFrameElement | null)[]>([null, null, null, null])

    const [matrixLanguages, setMatrixLanguages] = useState<string[]>(['es', 'de', 'ar', 'ja']);
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [translating, setTranslating] = useState(false)
    const [isMarqueeActive, setIsMarqueeActive] = useState(false)
    const [proxyUrl, setProxyUrl] = useState<string | null>(null)
    const [iframesLoaded, setIframesLoaded] = useState(0)

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

    // Handle messages from iframes
    useEffect(() => {
        const handleMessage = async (event: MessageEvent) => {
            if (!event.data) return;
            const type = event.data.type;

            // Identify which iframe sent the message
            const activeIframeIndex = iframeRefs.current.findIndex(ref => ref?.contentWindow === event.source);
            if (activeIframeIndex === -1 && type.includes('TRANSLATE')) return;

            const activeLang = matrixLanguages[activeIframeIndex];

            // Single Translation
            if (type === 'TRANSLATE_REQUEST') {
                const { text, id } = event.data;
                if (!text || !id || !activeLang) return;

                try {
                    setTranslating(true);
                    const result = await translateMarkdown(text, null, activeLang);

                    if (result.success && result.data) {
                        iframeRefs.current[activeIframeIndex]?.contentWindow?.postMessage({
                            type: 'TRANSLATION_RESULT',
                            id,
                            translatedText: result.data,
                            originalText: text,
                            success: true
                        }, '*');
                    } else {
                        iframeRefs.current[activeIframeIndex]?.contentWindow?.postMessage({ type: 'TRANSLATION_RESULT', id, success: false }, '*');
                    }
                } catch (err) {
                    console.error("Transmission error", err);
                } finally {
                    setTranslating(false);
                }
            }

            // Batch Translation
            if (type === 'BATCH_TRANSLATE_REQUEST') {
                const { payload } = event.data;
                if (!payload || !Array.isArray(payload) || payload.length === 0 || !activeLang) return;

                try {
                    setTranslating(true);
                    const texts = payload.map((p: any) => p.text);
                    const result = await translateBatch(texts, null, activeLang);

                    if (result.success && result.data) {
                        const results = payload.map((p: any, index: number) => ({
                            id: p.id,
                            translatedText: result.data![index],
                            success: true
                        }));

                        iframeRefs.current[activeIframeIndex]?.contentWindow?.postMessage({
                            type: 'BATCH_TRANSLATE_RESPONSE',
                            results
                        }, '*');
                    }
                } catch (err) {
                    console.error("Batch error", err);
                } finally {
                    setTranslating(false);
                }
            }

            if (type === 'JSON_DOWNLOAD_READY') {
                const { payload, language } = event.data;
                if (!payload || Object.keys(payload).length === 0) {
                    alert('No translations to download yet!');
                    return;
                }
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
                const downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.setAttribute("href", dataStr);
                downloadAnchorNode.setAttribute("download", `${language}-translations.json`);
                document.body.appendChild(downloadAnchorNode);
                downloadAnchorNode.click();
                downloadAnchorNode.remove();
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [params, matrixLanguages]);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (error || !proxyUrl) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <p className="text-destructive font-semibold">{error || "Something went wrong"}</p>
                <Button onClick={() => router.push('/')}>Go Home</Button>
            </div>
        )
    }

    return (
        <div className="h-screen flex flex-col overflow-hidden relative bg-[#0a0a0a]">
            {/* Animated Background Mesh (React Bits) */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-50">
                <Squares
                    speed={0.5}
                    squareSize={40}
                    direction="diagonal"
                    borderColor="rgba(255,255,255,0.03)"
                    hoverFillColor="rgba(255,255,255,0.06)"
                />
            </div>

            {/* Floating Browser Island */}
            <div className="w-full flex justify-center pt-4 pb-2 px-4 z-50">
                <div className="w-full max-w-6xl bg-black/40 backdrop-blur-3xl border border-white/10 rounded-full p-2 flex flex-wrap md:flex-nowrap items-center gap-2 md:gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all duration-1000">

                    {/* Controls */}
                    <div className="flex items-center gap-1 md:gap-2 text-muted-foreground order-1 pl-2">
                        {/* Area Selection Tool (Marquee) */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${isMarqueeActive ? 'text-primary bg-primary/10 animate-pulse' : 'hover:bg-primary/10 hover:text-primary'}`}
                            onClick={() => {
                                const newState = !isMarqueeActive;
                                setIsMarqueeActive(newState);
                                iframeRefs.current.forEach(ref => {
                                    if (ref && ref.contentWindow) {
                                        ref.contentWindow.postMessage({ type: 'TOGGLE_MARQUEE', isActive: newState }, '*');
                                    }
                                });
                            }}
                            title="Drag to Translate Area"
                        >
                            <MousePointerSquareDashed className="w-4 h-4" />
                        </Button>

                        <Button
                            variant="default"
                            size="icon"
                            className={`h-8 w-8 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${translating ? 'animate-pulse' : ''}`}
                            onClick={() => {
                                iframeRefs.current.forEach(ref => {
                                    if (ref && ref.contentWindow) {
                                        ref.contentWindow.postMessage({ type: 'TRIGGER_BATCH_TRANSLATE' }, '*');
                                    }
                                });
                            }}
                            title="Matrix Batch Translate"
                        >
                            <Wand2 className="w-4 h-4" />
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-all duration-200 hover:scale-110 active:scale-95"
                            onClick={() => {
                                const urlToLoad = reconstructUrl(params.url as string | string[]) || '';
                                router.push(`/read/${encodeURIComponent(urlToLoad)}`);
                            }}
                            title="Return to Single View"
                        >
                            <LayoutTemplate className="w-4 h-4" />
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
                                    router.push(`/matrix/${encodeURIComponent(urlToLoad)}`);
                                }
                            }}
                            className="flex items-center gap-2 md:gap-3 w-full max-w-2xl bg-background/50 border border-border/40 hover:border-border/80 rounded-xl px-3 py-1.5 md:px-4 md:py-2"
                        >
                            <LockIcon className="w-3 h-3 text-green-500/80 shrink-0" />
                            <input
                                name="urlInput"
                                defaultValue={reconstructUrl(params.url as string | string[]) || ''}
                                key={params.url as string}
                                className="w-full bg-transparent border-none focus:outline-none text-xs md:text-sm font-medium text-foreground placeholder:text-muted-foreground/50 truncate focus:ring-0"
                                placeholder="Enter website URL..."
                                autoComplete="off"
                            />
                        </form>
                    </div>

                    <div className="flex items-center gap-1 md:gap-2 order-2 md:order-3">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-white/10" onClick={() => router.push('/')}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Grid Viewport */}
            <main className="flex-1 relative w-full h-full p-2">
                <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 grid-rows-2 gap-2">
                    {[0, 1, 2, 3].map((index) => (
                        <MatrixCell
                            key={index}
                            index={index}
                            proxyUrl={proxyUrl}
                            originalUrl={params.url}
                            matrixLanguages={matrixLanguages}
                            setMatrixLanguages={setMatrixLanguages}
                            iframeRefs={iframeRefs}
                            iframesLoaded={iframesLoaded}
                            setIframesLoaded={setIframesLoaded}
                            router={router}
                        />
                    ))}
                </div>
            </main>
        </div>
    )
}

function MatrixCell({ index, proxyUrl, originalUrl, matrixLanguages, setMatrixLanguages, iframeRefs, iframesLoaded, setIframesLoaded, router }: any) {
    const lang = matrixLanguages[index];
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    const VIRTUAL_WIDTH = 1440; // Desktop width

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                setDimensions({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height,
                });
            }
        });

        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    const scale = dimensions.width > 0 ? dimensions.width / VIRTUAL_WIDTH : 1;
    const virtualHeight = dimensions.width > 0 ? dimensions.height / scale : 1080;

    return (
        <div
            className="relative h-full w-full bg-card md:rounded-xl md:border border-border/40 shadow-xl overflow-hidden ring-1 ring-border/10 group flex items-center justify-center"
        >
            {/* Language Overlay & Actions */}
            <div className="absolute top-2 right-4 z-40 shadow-lg border border-border/50 rounded-full bg-background/80 backdrop-blur-md opacity-50 group-hover:opacity-100 transition-opacity flex items-center pr-1 overflow-hidden">
                <LanguageSelector
                    selectedLanguage={lang}
                    onLanguageChange={(newLang) => {
                        if (newLang) {
                            const newMatrix = [...matrixLanguages];
                            newMatrix[index] = newLang;
                            setMatrixLanguages(newMatrix);
                            iframeRefs.current[index]?.contentWindow?.postMessage({ type: 'LANGUAGE_UPDATE' }, '*');
                        }
                    }}
                />

                <div className="flex items-center gap-1 border-l border-border/50 pl-1 mx-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 rounded-full hover:bg-primary/20 hover:text-primary transition-colors text-muted-foreground"
                        title="Download Translations JSON"
                        onClick={() => {
                            iframeRefs.current[index]?.contentWindow?.postMessage({
                                type: 'REQUEST_JSON_DOWNLOAD',
                                language: lang
                            }, '*');
                        }}
                    >
                        <Download className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 rounded-full hover:bg-primary/20 hover:text-primary transition-colors text-muted-foreground"
                        title="Open in Single Read Mode"
                        onClick={() => {
                            const urlToLoad = reconstructUrl(originalUrl as string | string[]) || '';
                            router.push(`/read/${encodeURIComponent(urlToLoad)}?lang=${lang}`);
                        }}
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>

            {/* Responsive Virtual Viewport via React Bounds */}
            <div
                ref={containerRef}
                className="w-full h-full relative bg-[#0a0a0a]/50 shrink-0 overflow-hidden"
            >
                {dimensions.width > 0 && (
                    <div
                        className="absolute bg-white shadow-xl ring-1 ring-border/10 overflow-hidden origin-top-left"
                        style={{
                            width: `${VIRTUAL_WIDTH}px`,
                            height: `${virtualHeight}px`,
                            transform: `scale(${scale})`
                        }}
                    >
                        <iframe
                            ref={(el) => { iframeRefs.current[index] = el; }}
                            src={proxyUrl}
                            className="w-full h-full border-0 select-none pb-12 md:pb-0 bg-white"
                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                            title={`Matrix Proxy ${index}`}
                            onLoad={() => setIframesLoaded((prev: number) => prev + 1)}
                        />
                    </div>
                )}
            </div>

            {iframesLoaded <= index && (
                <div className="absolute inset-0 flex items-center justify-center bg-card/50 backdrop-blur-sm z-10 rounded-xl">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            )}
        </div>
    );
}
