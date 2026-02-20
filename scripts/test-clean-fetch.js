import 'dotenv/config';

async function testFetch() {
    const apiKey = process.env.LINGODOTDEV_API_KEY;
    const text = "Hello world";

    try {
        const response = await fetch('https://engine.lingo.dev/i18n', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                params: { fast: false, workflowId: crypto.randomUUID() },
                locale: { source: "en", target: "es" },
                data: { text }
            }),
            cache: 'no-store'
        });

        console.log("Status:", response.status);
        const textData = await response.text();
        console.log("Raw JSON:", textData);

        const data = JSON.parse(textData);
        console.log("Parsed result:", data.data.text);

    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

testFetch();
