'use server'

import { LingoDotDevEngine } from 'lingo.dev/sdk'

export async function translateBatch(
    texts: string[],
    sourceLanguage: string | null,
    targetLanguage: string
): Promise<{ success: boolean; data?: string[]; error?: string }> {
    try {
        const apiKey = process.env.LINGODOTDEV_API_KEY
        if (!apiKey) {
            return { success: false, error: 'Lingo.dev API key is not configured' }
        }

        const lingoDotDev = new LingoDotDevEngine({ apiKey })

        // Parallel execution with Promise.all
        // In production, we might want to limit concurrency, but for < 50 items it's fine.
        const translations = await Promise.all(
            texts.map(async (text) => {
                try {
                    return await lingoDotDev.localizeText(text, {
                        sourceLocale: sourceLanguage ?? null,
                        targetLocale: targetLanguage
                    })
                } catch (e) {
                    console.error(`Failed to translate segment: "${text.substring(0, 20)}..."`, e);
                    return text; // Fallback to original on error
                }
            })
        )

        return {
            success: true,
            data: translations as string[]
        }
    } catch (error) {
        console.error('Batch translation error:', error)
        return {
            success: false,
            error: 'Failed to translate batch'
        }
    }
}
