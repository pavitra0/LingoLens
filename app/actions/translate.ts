'use server'

import https from 'node:https';
import { unstable_noStore as noStore } from 'next/cache';

export async function translateMarkdown(
  markdown: string,
  sourceLanguage: string | null,
  targetLanguage: string
): Promise<{ success: boolean; data?: string; error?: string }> {
  noStore();
  try {
    const apiKey = process.env.LINGODOTDEV_API_KEY
    if (!apiKey) {
      return { success: false, error: 'Lingo.dev API key is not configured' }
    }

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

    const translated = await translateWithRetry(markdown);

    return {
      success: true,
      data: translated as string
    }
  } catch (error) {
    console.error('Translation error:', error)
    return {
      success: false,
      error: 'Failed to translate content'
    }
  }
}
