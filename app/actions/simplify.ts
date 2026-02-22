'use server'

import { google } from '@ai-sdk/google'
import { generateText } from 'ai'

export interface SimplifyRequest {
    selectedText: string
    surroundingText: string
    pageUrl: string
    pageTitle: string
}

export interface SimplifyResponse {
    success: boolean
    simplification?: string
    error?: string
}

export async function simplifyText(request: SimplifyRequest): Promise<SimplifyResponse> {
    try {
        const { selectedText, surroundingText, pageUrl, pageTitle } = request

        if (!selectedText) {
            return { success: false, error: 'No text selected' }
        }

        const prompt = `
You are an AI assistant helping a user understand a website while browsing.

Your task is to simplify the selected text so a beginner or a child could understand it.
STRICTLY in the context of the current website and page.

IMPORTANT RULES:
- Explain it like I'm 5 (ELI5).
- Keep the explanation short, clear, and practical (2–4 lines).
- Use simple analogies if helpful.

Website information:
- URL: ${pageUrl}
- Page title: ${pageTitle}

Selected text:
"${selectedText}"

Surrounding context:
"${surroundingText}"

Simplify what the selected text means in THIS context.
Tone: simple, friendly, highly non-technical.
`

        const { text } = await generateText({
            model: google('gemini-1.5-flash'),
            prompt: prompt,
        })

        return {
            success: true,
            simplification: text
        }

    } catch (error: any) {
        console.error('Simplify error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        return {
            success: false,
            error: error.message || 'Failed to simplify.'
        }
    }
}
