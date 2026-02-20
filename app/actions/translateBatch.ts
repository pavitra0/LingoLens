'use server'

import https from 'node:https';
import { unstable_noStore as noStore } from 'next/cache';

export async function translateBatch(
    texts: string[],
    sourceLanguage: string | null,
    targetLanguage: string
): Promise<{ success: boolean; data?: string[]; error?: string }> {
    noStore(); // accurate-timing is important, do not cache
    try {
        const apiKey = process.env.LINGODOTDEV_API_KEY
        if (!apiKey) {
            return { success: false, error: 'Lingo.dev API key is not configured' }
        }

        // Validate payload
        if (!texts || texts.length === 0) {
            console.warn('[TranslateBatch] Empty payload received.');
            return { success: true, data: [] };
        }

        const totalChars = texts.reduce((acc, t) => acc + t.length, 0);
        console.log(`[TranslateBatch] Processing ${texts.length} items. Total chars: ${totalChars}`);

        // Concurrency Control
        const CONCURRENT_LIMIT = 1;
        const results: string[] = new Array(texts.length).fill('');

        // Helper to translate with retry
        const translateWithRetry = async (text: string, retries = 3): Promise<string> => {
            try {
                const result = await new Promise<string>((resolve, reject) => {
                    const postData = JSON.stringify({
                        params: { fast: false, workflowId: crypto.randomUUID() },
                        locale: {
                            source: sourceLanguage || "auto",
                            target: targetLanguage
                        },
                        data: { text }
                    });

                    const req = https.request('https://engine.lingo.dev/i18n', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Length': Buffer.byteLength(postData)
                        }
                    }, (res) => {
                        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
                            return reject(new Error(`Lingo API Error ${res.statusCode}`));
                        }

                        let rawData = '';
                        res.on('data', (chunk) => { rawData += chunk; });
                        res.on('end', () => {
                            try {
                                const json = JSON.parse(rawData);
                                if (json.error) return reject(new Error(json.error));
                                if (!json.data || typeof json.data.text !== 'string') {
                                    return reject(new Error("Invalid response format from Lingo API"));
                                }
                                resolve(json.data.text);
                            } catch (e) {
                                reject(new Error("Failed to parse Lingo API response"));
                            }
                        });
                    });

                    req.on('error', (e) => reject(e));
                    req.write(postData);
                    req.end();
                });

                return result;
            } catch (err: any) {
                if (retries > 0) {
                    console.warn(`Translation attempt failed, retrying... (${retries} left)`, err?.message || err);
                    const delay = 300 * (4 - retries);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return translateWithRetry(text, retries - 1);
                }
                throw err;
            }
        };

        // Process in chunks or queue
        for (let i = 0; i < texts.length; i += CONCURRENT_LIMIT) {
            const chunk = texts.slice(i, i + CONCURRENT_LIMIT);
            const chunkPromises = chunk.map(async (text, idx) => {
                const overallIndex = i + idx;
                try {
                    results[overallIndex] = await translateWithRetry(text);
                } catch (e) {
                    console.error(`Failed to translate segment [${overallIndex}]: "${text.substring(0, 20)}..."`, e);
                    results[overallIndex] = text; // Fallback to original
                }
            });
            await Promise.all(chunkPromises);
        }

        return {
            success: true,
            data: results
        }
    } catch (error) {
        console.error('Batch translation error:', error)
        return {
            success: false,
            error: 'Failed to translate batch'
        }
    }
}
