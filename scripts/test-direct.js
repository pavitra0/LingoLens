import 'dotenv/config';

async function testFetch() {
    const apiKey = process.env.LINGODOTDEV_API_KEY;
    const text = "Hello world";
    const sourceLanguage = "en";
    const targetLanguage = "es";

    try {
        const response = await fetch('https://engine.lingo.dev/i18n', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'Connection': 'close'
            },
            body: JSON.stringify({
                params: { fast: false, workflowId: crypto.randomUUID() },
                locale: { source: sourceLanguage, target: targetLanguage },
                data: { text }
            }),
            cache: 'no-store'
        });

        console.log("Status:", response.status);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let loop = true;

        while (loop) {
            const { value, done } = await reader.read();
            if (done) {
                console.log("Stream complete.");
                break;
            }
            const chunk = decoder.decode(value, { stream: true });
            console.log("CHUNK:", chunk);
        }

    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

testFetch();
