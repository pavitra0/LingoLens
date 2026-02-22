'use client'

import { useSavedPages, useDeletePage } from '@/lib/hooks/useLibrary'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Trash2, ExternalLink, Globe, Clock, BookOpen } from 'lucide-react'
import { getLanguageByCode } from '@/lib/languages'

export default function LibraryPage() {
    const { data: pages = [], isLoading: loading } = useSavedPages()
    const deleteMutation = useDeletePage()
    const router = useRouter()

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (confirm('Are you sure you want to remove this saved page?')) {
            deleteMutation.mutate(id)
        }
    }

    const formatDate = (timestamp: number) => {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric'
        }).format(new Date(timestamp))
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20">

            {/* Header */}
            <header className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-10">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="hover:opacity-70 transition-opacity">
                            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                        </Link>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-primary" />
                            Saved Translations
                        </h1>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 flex-1">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : pages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                        <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center">
                            <BookOpen className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                        <h2 className="text-2xl font-bold">No saved pages yet</h2>
                        <p className="text-muted-foreground max-w-md">
                            Translate any website and click the <span className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded text-xs font-mono"><span className="w-3 h-3 border border-current rounded-sm"></span> Save</span> button in the toolbar to access it here later.
                        </p>
                        <Button onClick={() => router.push('/')} className="mt-4">
                            Start Translating
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pages.map((page) => (
                            <div
                                key={page.id}
                                onClick={() => router.push(`/read/${encodeURIComponent(page.url)}`)}
                                className="group relative bg-card hover:bg-muted/30 border border-border/50 hover:border-primary/50 transition-all duration-300 rounded-xl p-5 cursor-pointer shadow-sm hover:shadow-md flex flex-col gap-4"
                            >
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <h3 className="font-semibold text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                                            {page.title || page.url}
                                        </h3>
                                    </div>

                                    <div className="text-sm text-muted-foreground truncate font-mono opacity-70">
                                        {new URL(page.url).hostname}
                                    </div>

                                    <div className="flex flex-wrap gap-2 pt-2">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                                            <Globe className="w-3 h-3" />
                                            {getLanguageByCode(page.targetLanguage)?.name || page.targetLanguage}
                                        </span>
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                                            <span className="font-bold">{Object.keys(page.translations || {}).length}</span> Translations
                                        </span>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" />
                                        {formatDate(page.lastVisited)}
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mr-2"
                                        onClick={(e) => handleDelete(page.id, e)}
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}
