import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { SavedPage, VocabularyEntry } from './library';

interface LingoLensDB extends DBSchema {
    pages: {
        key: string; // id
        value: SavedPage;
        indexes: { 'by-url-lang': [string, string] };
    };
    vocabulary: {
        key: string; // id
        value: VocabularyEntry;
        indexes: { 'by-timestamp': number };
    };
}

const DB_NAME = 'lingolens-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<LingoLensDB>> | null = null;

export function getDB() {
    if (typeof window === 'undefined') {
        return null;
    }

    if (!dbPromise) {
        dbPromise = openDB<LingoLensDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains('pages')) {
                    const pageStore = db.createObjectStore('pages', { keyPath: 'id' });
                    pageStore.createIndex('by-url-lang', ['url', 'targetLanguage']);
                }
                if (!db.objectStoreNames.contains('vocabulary')) {
                    const vocabStore = db.createObjectStore('vocabulary', { keyPath: 'id' });
                    vocabStore.createIndex('by-timestamp', 'timestamp');
                }
            },
        });
    }
    return dbPromise;
}
