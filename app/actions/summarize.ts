'use server'

import { google } from '@ai-sdk/google'
import { generateText } from 'ai'

export interface SummarizeRequest {
    selectedText: string
    surroundingText: string
    pageUrl: string
    pageTitle: string
}

export interface SummarizeResponse {
    success: boolean
    summary?: string
    error?: string
}

export async function summarizeText(request: SummarizeRequest): Promise<SummarizeResponse> {
    try {
        const { selectedText, surroundingText, pageUrl, pageTitle } = request

        if (!selectedText) {
            return { success: false, error: 'No text selected' }
        }

        const prompt = `
You are an AI assistant helping a user understand a website while browsing.

Your task is to summarize the selected text.
STRICTLY in the context of the current website and page.

IMPORTANT RULES:
- Keep the summary short, clear, and practical (2–4 lines).
- Make it easy to read.

Website information:
- URL: ${pageUrl}
- Page title: ${pageTitle}

Selected text:
"${selectedText}"

Surrounding context:
"${surroundingText}"

Summarize the selected text in THIS context.
Tone: simple, friendly, non-technical unless necessary.
`

        const { text } = await generateText({
            model: google('gemini-1.5-flash'),
            prompt: prompt,
        })

        return {
            success: true,
            summary: text
        }

    } catch (error: any) {
        console.error('Summarize error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        return {
            success: false,
            error: error.message || 'Failed to generate summary.'
        }
    }
}
