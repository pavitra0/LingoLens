import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDB } from '../db';
import { SavedPage, VocabularyEntry } from '../library';

// --- Page Hooks ---
export function useSavedPages() {
    return useQuery({
        queryKey: ['savedPages'],
        queryFn: async () => {
            const db = await getDB();
            if (!db) return [];
            const pages = await db.getAll('pages');
            return pages.sort((a, b) => b.lastVisited - a.lastVisited);
        }
    });
}

export function useSavedPage(url: string, language: string) {
    return useQuery({
        queryKey: ['savedPage', url, language],
        queryFn: async () => {
            const db = await getDB();
            if (!db) return null;
            const pages = await db.getAllFromIndex('pages', 'by-url-lang');
            const found = pages.find((p) => p.url === url && p.targetLanguage === language);
            return found || null;
        },
        enabled: !!url && !!language,
    });
}

export function useSavePage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (page: SavedPage) => {
            const db = await getDB();
            if (!db) throw new Error("Database not available");

            const tx = db.transaction('pages', 'readwrite');
            const store = tx.objectStore('pages');
            const existing = await store.get(page.id);

            if (existing) {
                await store.put({ ...existing, ...page, lastVisited: Date.now() });
            } else {
                await store.put(page);
            }
            await tx.done;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['savedPages'] });
            queryClient.invalidateQueries({ queryKey: ['savedPage', variables.url, variables.targetLanguage] });
        }
    });
}

export function useDeletePage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const db = await getDB();
            if (!db) throw new Error("Database not available");
            await db.delete('pages', id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['savedPages'] });
        }
    });
}

// --- Vocabulary Hooks ---
export function useVocabularyList() {
    return useQuery({
        queryKey: ['vocabulary'],
        queryFn: async () => {
            const db = await getDB();
            if (!db) return [];
            const vocab = await db.getAll('vocabulary');
            return vocab.sort((a, b) => b.timestamp - a.timestamp);
        }
    });
}

export function useAddVocabulary() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (entry: Omit<VocabularyEntry, 'id' | 'timestamp'>) => {
            const db = await getDB();
            if (!db) throw new Error("Database not available");

            const newEntry: VocabularyEntry = {
                ...entry,
                id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
                timestamp: Date.now()
            };

            await db.add('vocabulary', newEntry);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vocabulary'] });
        }
    });
}

export function useDeleteVocabulary() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const db = await getDB();
            if (!db) throw new Error("Database not available");
            await db.delete('vocabulary', id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vocabulary'] });
        }
    });
}

export function useClearVocabulary() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            const db = await getDB();
            if (!db) throw new Error("Database not available");
            await db.clear('vocabulary');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vocabulary'] });
        }
    });
}
