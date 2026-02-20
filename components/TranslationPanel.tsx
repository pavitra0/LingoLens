'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Search,
    X,
    RotateCcw,
    Lock,
    Unlock,
    Eye,
    Edit2,
    Check,
    Filter,
    AlertTriangle,
    Sparkles,
    Volume2,
    Download
} from 'lucide-react'
import { TranslationEntry } from '@/lib/library'
import { playTextToSpeech } from '@/lib/tts'

interface TranslationPanelProps {
    translations: Record<string, TranslationEntry>;
    targetLanguage: string;
    onClose: () => void;
    onUpdate: (id: string, text: string) => void;
    onLock: (id: string, locked: boolean) => void;
    onHighlight: (id: string) => void;
    onRevert: (id: string) => void;
    onExplain: (id: string, text: string) => void;
}

export default function TranslationPanel({
    translations,
    targetLanguage,
    onClose,
    onUpdate,
    onLock,
    onHighlight,
    onRevert,
    onExplain
}: TranslationPanelProps) {
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState<'all' | 'locked' | 'modified' | 'errors'>('all')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editText, setEditText] = useState('')

    const entries = useMemo(() => Object.entries(translations), [translations])

    const filteredEntries = useMemo(() => {
        return entries.filter(([_, entry]) => {
            const matchesSearch =
                entry.original.toLowerCase().includes(search.toLowerCase()) ||
                entry.translated.toLowerCase().includes(search.toLowerCase());

            const matchesFilter =
                filter === 'all' ? true :
                    filter === 'locked' ? entry.isLocked :
                        filter === 'modified' ? entry.status === 'modified' :
                            filter === 'errors' ? entry.layoutError === true : true;

            return matchesSearch && matchesFilter;
        });
    }, [entries, search, filter]);

    const stats = useMemo(() => {
        return {
            total: entries.length,
            locked: entries.filter(([_, e]) => e.isLocked).length,
            modified: entries.filter(([_, e]) => e.status === 'modified').length,
            errors: entries.filter(([_, e]) => e.layoutError).length
        }
    }, [entries])

    const startEditing = (id: string, text: string) => {
        setEditingId(id)
        setEditText(text)
    }

    const saveEdit = (id: string) => {
        if (editText.trim()) {
            onUpdate(id, editText)
        }
        setEditingId(null)
    }

    const handleExportJSON = () => {
        const localeData: Record<string, string> = {};

        Object.values(translations).forEach(entry => {
            if (entry.original && entry.translated) {
                // If it's locked or modified, prioritize those strings
                localeData[entry.original] = entry.translated;
            }
        });

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(localeData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `${targetLanguage}-lingo-export.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    return (
        <div className={`absolute top-0 right-0 h-full w-[85vw] sm:w-[400px] bg-background/50 dark:bg-background/40 backdrop-blur-3xl border-l border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] z-50 flex flex-col transition-all duration-500 transform translate-x-0`}>

            {/* Header */}
            <div className="p-5 border-b border-white/10 flex flex-col gap-4 bg-white/5">
                <div className="flex items-center justify-between">
                    <h2 className="font-bold text-lg flex items-center gap-2">
                        Translation Control
                        <Badge variant="secondary" className="text-xs font-mono">{stats.total}</Badge>
                    </h2>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="default"
                            size="sm"
                            className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 hover:border-primary/30 h-8 gap-1.5 transition-all w-full sm:w-auto px-3"
                            onClick={handleExportJSON}
                            title="Download translations as i18n JSON"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline font-semibold">Export JSON</span>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded">
                        <Lock className="w-3 h-3" />
                        <span>{stats.locked} Locked</span>
                    </div>
                    <div className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded">
                        <Edit2 className="w-3 h-3" />
                        <span>{stats.modified} Modified</span>
                    </div>
                    {stats.errors > 0 && (
                        <div className="flex items-center gap-1 bg-red-500/10 text-red-500 px-2 py-1 rounded">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{stats.errors} Errors</span>
                        </div>
                    )}
                </div>

                {/* Search & Filter */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search text..."
                            className="pl-9 h-9 bg-background/50"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button
                        variant={filter !== 'all' ? 'default' : 'outline'}
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => setFilter(prev => {
                            if (prev === 'all') return 'locked';
                            if (prev === 'locked') return 'modified';
                            if (prev === 'modified') return 'errors';
                            return 'all';
                        })}
                        title={`Filter: ${filter}`}
                    >
                        <Filter className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {filteredEntries.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                        <p>No translations found</p>
                    </div>
                ) : (
                    filteredEntries.map(([id, entry]) => (
                        <div
                            key={id}
                            className={`
                group relative border rounded-lg p-3 transition-all hover:shadow-md
                ${entry.isLocked ? 'border-amber-500/30 bg-amber-500/5' : 'border-border bg-card'}
              `}
                        >
                            <div className="flex justify-between items-start gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-mono uppercase text-muted-foreground">
                                        {entry.elementTag}
                                    </Badge>
                                    {entry.layoutError && (
                                        <Badge variant="destructive" className="text-[10px] h-5 px-1.5 flex gap-1 items-center animate-in fade-in zoom-in">
                                            <AlertTriangle className="w-3 h-3" />
                                            {entry.errorType || 'Layout Break'}
                                        </Badge>
                                    )}
                                </div>

                                <div className="flex items-center gap-1 opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 hover:text-primary"
                                        onClick={() => onHighlight(id)}
                                        title="Highlight on page"
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={`h-6 w-6 ${entry.isLocked ? 'text-amber-500' : 'text-muted-foreground hover:text-amber-500'}`}
                                        onClick={() => onLock(id, !entry.isLocked)}
                                        title={entry.isLocked ? "Unlock" : "Lock"}
                                    >
                                        {entry.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                    </Button>
                                </div>
                            </div>

                            {/* Original */}
                            <div className="text-xs text-muted-foreground mb-1.5 line-clamp-2" title={entry.original}>
                                {entry.original}
                            </div>

                            {/* Translated (Editable) */}
                            {editingId === id ? (
                                <div className="flex gap-2 items-center">
                                    <Input
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        className="h-8 text-sm"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') saveEdit(id);
                                            if (e.key === 'Escape') setEditingId(null);
                                        }}
                                    />
                                    <Button size="icon" className="h-8 w-8 shrink-0" onClick={() => saveEdit(id)}>
                                        <Check className="w-4 h-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex justify-between items-start gap-2 group/text">
                                    <p
                                        className={`text-sm font-medium leading-relaxed ${entry.status === 'modified' ? 'text-blue-500' : 'text-foreground'}`}
                                    >
                                        {entry.translated}
                                    </p>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 shrink-0 opacity-0 group-hover/text:opacity-100 -mt-1"
                                        onClick={() => startEditing(id, entry.translated)}
                                    >
                                        <Edit2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            )}

                            {/* Footer Actions */}
                            <div className="mt-2 pt-2 border-t border-dashed border-border/50 flex justify-end gap-2 text-muted-foreground">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[10px] hover:text-primary gap-1 px-2"
                                    onClick={() => playTextToSpeech(entry.translated, targetLanguage)}
                                >
                                    <Volume2 className="w-3 h-3 text-blue-500" /> Listen
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[10px] hover:text-primary gap-1 px-2"
                                    onClick={() => onExplain(id, entry.translated)}
                                >
                                    <Sparkles className="w-3 h-3 text-purple-500" /> Explain
                                </Button>
                                {(entry.status === 'modified' || entry.original !== entry.translated) && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-[10px] hover:text-destructive gap-1 px-2"
                                        onClick={() => onRevert(id)}
                                    >
                                        <RotateCcw className="w-3 h-3" /> Revert
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
