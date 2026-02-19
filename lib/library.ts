export interface TranslationEntry {
    original: string;
    translated: string;
    elementTag: string;
    isLocked: boolean;
    status: 'active' | 'modified';
    timestamp: number;
}

export interface SavedPage {
    id: string;
    url: string;
    title: string;
    targetLanguage: string;
    createdAt: number;
    lastVisited: number;
    translations: Record<string, TranslationEntry>;
}

const STORAGE_KEY = 'lingolens_library';

export function getSavedPages(): SavedPage[] {
    if (typeof window === 'undefined') return [];
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error("Failed to load library", e);
        return [];
    }
}

export function savePage(page: SavedPage): void {
    const pages = getSavedPages();
    const existingIndex = pages.findIndex(p => p.url === page.url && p.targetLanguage === page.targetLanguage);

    if (existingIndex >= 0) {
        // Update existing
        pages[existingIndex] = { ...pages[existingIndex], ...page, lastVisited: Date.now() };
    } else {
        // Add new
        pages.push(page);
    }

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
    } catch (e) {
        console.error("Failed to save page", e);
    }
}

export function getSavedPage(url: string, language: string): SavedPage | undefined {
    const pages = getSavedPages();
    return pages.find(p => p.url === url && p.targetLanguage === language);
}

export function deleteSavedPage(id: string): void {
    const pages = getSavedPages().filter(p => p.id !== id);
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
    } catch (e) {
        console.error("Failed to delete page", e);
    }
}

export function generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
