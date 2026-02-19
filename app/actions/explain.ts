'use server'

import { google } from '@ai-sdk/google'
import { generateText } from 'ai'

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
            model: google('gemini-flash-latest'), // Available in user's model list
            prompt: prompt,
        })

        return {
            success: true,
            explanation: text
        }

    } catch (error: any) {
        console.error('Explanation error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        return {
            success: false,
            error: error.message || 'Failed to generate explanation.'
        }
    }
}
