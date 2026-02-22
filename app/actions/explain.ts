'use server'

import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import https from 'node:https'

export interface ExplanationRequest {
    selectedText: string
    surroundingText: string
    pageUrl: string
    pageTitle: string
}

export interface ExplanationResponse {
    success: boolean
    explanation?: string
    error?: string
}

export async function explainText(request: ExplanationRequest): Promise<ExplanationResponse> {
    try {
        const { selectedText, surroundingText, pageUrl, pageTitle } = request

        if (!selectedText) {
            return { success: false, error: 'No text selected' }
        }

        const prompt = `
You are an AI assistant helping a user understand a website while browsing.

Your task is to explain the meaning of a selected word or sentence
STRICTLY in the context of the current website and page.

IMPORTANT RULES:
- Do NOT give a generic dictionary definition.
- Do NOT explain unrelated meanings.
- Assume the user is a beginner.
- Keep the explanation short, clear, and practical (2–4 lines).
- Explain what it means *on this website*, not in general.

Website information:
- URL: ${pageUrl}
- Page title: ${pageTitle}

Selected text:
"${selectedText}"

Surrounding context:
"${surroundingText}"

Explain what the selected text means in THIS context.
If it refers to a tool, feature, or concept on this website,
explain what it does and why it matters here.

Tone: simple, friendly, non-technical unless necessary.
`

        const { text } = await generateText({
            model: google('gemini-1.5-flash'), // Available in user's model list
            prompt: prompt,
        })

        return {
            success: true,
            explanation: text
        }

    } catch (error: any) {
        console.warn('Gemini Explanation failed, falling back to ch.at:', error.message || error);

        try {
            const fallbackPrompt = `Explain this text strictly in context of the page titled "${request.pageTitle}". Text: "${request.selectedText}". Context: "${request.surroundingText.substring(0, 300)}"`;
            const payload = JSON.stringify({ q: fallbackPrompt, h: [] });

            const options = {
                hostname: 'ch.at',
                port: 443,
                path: '/',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload)
                }
            };

            const responseData = await new Promise<string>((resolve, reject) => {
                const req = https.request(options, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => resolve(data));
                });

                req.on('error', reject);
                req.write(payload);
                req.end();
            });

            let explanation = responseData;
            const answerToken = '\nA: ';
            const answerIndex = responseData.indexOf(answerToken);

            if (answerIndex !== -1) {
                explanation = responseData.slice(answerIndex + answerToken.length).trim();
            }

            return {
                success: true,
                explanation: explanation
            };
        } catch (fallbackError: any) {
            console.error('Fallback explanation error details:', fallbackError);
            return {
                success: false,
                error: 'Failed to generate explanation using both Gemini and fallback.'
            };
        }
    }
}
