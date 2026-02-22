'use server'

import https from 'node:https'

export interface MeaningRequest {
    selectedText: string
    surroundingText: string
    pageUrl: string
    pageTitle: string
}

export interface MeaningResponse {
    success: boolean
    meaning?: string
    error?: string
}

export async function meaningText(request: MeaningRequest): Promise<MeaningResponse> {
    try {
        const { selectedText, surroundingText } = request

        if (!selectedText) {
            return { success: false, error: 'No text selected' }
        }

        const prompt = `What is the meaning of "${selectedText}"? Context: ${surroundingText.substring(0, 300)}`
        const payload = JSON.stringify({ q: prompt, h: [] })

        const options = {
            hostname: 'ch.at',
            port: 443,
            path: '/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }

        const responseData = await new Promise<string>((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = ''
                res.on('data', chunk => data += chunk)
                res.on('end', () => resolve(data))
            })

            req.on('error', reject)
            req.write(payload)
            req.end()
        })

        // The response format is "Q: {JSON}\nA: <answer>"
        // Let's elegantly extract just the answer part.
        let meaning = responseData;
        const answerToken = '\nA: ';
        const answerIndex = responseData.indexOf(answerToken);

        if (answerIndex !== -1) {
            meaning = responseData.slice(answerIndex + answerToken.length).trim();
        }

        return {
            success: true,
            meaning: meaning
        }

    } catch (error: any) {
        console.error('Meaning error details:', error);
        return {
            success: false,
            error: error.message || 'Failed to fetch meaning from ch.at'
        }
    }
}
