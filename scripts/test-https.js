import https from 'node:https';
import 'dotenv/config';

async function testHttps() {
    const apiKey = process.env.LINGODOTDEV_API_KEY;
    const postData = JSON.stringify({
        params: { fast: false, workflowId: crypto.randomUUID() },
        locale: { source: "en", target: "es" },
        data: { text: "Hello world via HTTPS" }
    });

    return new Promise((resolve, reject) => {
        const req = https.request('https://engine.lingo.dev/i18n', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'Content-Length': Buffer.byteLength(postData)
            }
        }, (res) => {
            console.log("Status:", res.statusCode);
            let rawData = '';

            res.on('data', (chunk) => {
                rawData += chunk;
            });

            res.on('end', () => {
                try {
                    const parsed = JSON.parse(rawData);
                    console.log("Parsed result:", parsed.data.text);
                    resolve(parsed);
                } catch (e) {
                    console.error("JSON Parse Error:", e);
                    console.log("Raw Data was:", rawData);
                    reject(e);
                }
            });
        });

        req.on('error', (e) => {
            console.error("Request Error:", e);
            reject(e);
        });

        req.write(postData);
        req.end();
    });
}

testHttps();
