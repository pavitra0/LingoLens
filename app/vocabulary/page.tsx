'use client'

import { useState, useEffect } from 'react'
import { getVocabularyList, deleteVocabulary, clearVocabulary, type VocabularyEntry } from '@/lib/library'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Trash2, Library, ExternalLink, Sparkles, Volume2 } from 'lucide-react'
import { playTextToSpeech } from '@/lib/tts'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function VocabularyPage() {
    const [vocabList, setVocabList] = useState<VocabularyEntry[]>([])
    const router = useRouter()

    useEffect(() => {
        setVocabList(getVocabularyList())
    }, [])

    const handleDelete = (id: string) => {
        deleteVocabulary(id)
        setVocabList(getVocabularyList())
    }

    const handleClearAll = () => {
        if (confirm('Are you sure you want to clear all vocabulary?')) {
            clearVocabulary()
            setVocabList([])
        }
    }

    return (
        <div className="min-h-screen bg-background bg-[url('https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center bg-fixed before:absolute before:inset-0 before:bg-background/80 dark:before:bg-background/80">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background/50 dark:bg-background/40 backdrop-blur-2xl border-b border-white/20 dark:border-white/10 px-6 py-4">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-white/10 rounded-full" onClick={() => router.back()}>
                            <ArrowLeft className="w-4 h-4 text-foreground" />
                        </Button>
                        <h1 className="font-bold text-2xl flex items-center gap-2 text-foreground">
                            <Library className="w-6 h-6 text-primary" />
                            Vocabulary
                        </h1>
                    </div>
                    {vocabList.length > 0 && (
                        <Button
                            variant="destructive"
                            className="bg-destructive/90 hover:bg-destructive shadow-lg transition-transform hover:scale-105 active:scale-95"
                            onClick={handleClearAll}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Clear All
                        </Button>
                    )}
                </div>
            </header>

            {/* List Content */}
            <main className="max-w-5xl mx-auto p-6 relative z-10">
                {vocabList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center mt-32 text-center animate-in fade-in slide-in-from-bottom-8">
                        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 ring-8 ring-primary/5">
                            <BookOpenIcon className="w-12 h-12 text-primary/50" />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground mb-2">No Vocabulary Yet</h2>
                        <p className="text-muted-foreground max-w-sm mb-8">
                            Translate paragraphs while browsing websites, or click "Explain" in the Translation Panel to save entries here.
                        </p>
                        <Button onClick={() => router.push('/')} className="rounded-xl px-8 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-lg transition-all hover:scale-105 active:scale-95">
                            Start Browsing
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                        {vocabList.map((entry, index) => (
                            <div
                                key={entry.id}
                                className="group bg-background/60 dark:bg-background/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] p-6 transition-all duration-300 hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] flex flex-col justify-between"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-3 py-1 font-medium capitalize">
                                            {entry.targetLanguage}
                                        </Badge>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                            onClick={() => handleDelete(entry.id)}
                                            title="Delete Entry"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    <div className="space-y-4 mb-6">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold">Translated</p>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
                                                    onClick={() => playTextToSpeech(entry.translated, entry.targetLanguage)}
                                                    title="Listen"
                                                >
                                                    <Volume2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                            <p className="text-xl font-medium text-foreground">{entry.translated}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold mb-1">Original</p>
                                            <p className="text-sm font-medium text-muted-foreground">{entry.original}</p>
                                        </div>
                                    </div>

                                    <div className="bg-muted/30 rounded-xl p-4 border border-border/50 shadow-inner">
                                        <div className="flex items-center gap-2 text-primary font-semibold mb-2">
                                            <Sparkles className="w-4 h-4 text-purple-500" />
                                            <span className="text-sm">Context Explanation</span>
                                        </div>
                                        <p className="text-sm text-foreground/90 leading-relaxed">
                                            {entry.explanation}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-6 pt-4 border-t border-white/10 dark:border-white/5 flex items-center justify-between text-xs text-muted-foreground">
                                    <span>{new Date(entry.timestamp).toLocaleDateString()}</span>
                                    <Link href={`/read/${encodeURIComponent(entry.url)}`} className="flex items-center gap-1 hover:text-primary transition-colors bg-white/5 px-2 py-1 rounded-md">
                                        <span className="truncate max-w-[150px]">{new URL(entry.url).hostname}</span>
                                        <ExternalLink className="w-3 h-3" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}

function BookOpenIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
    )
}
