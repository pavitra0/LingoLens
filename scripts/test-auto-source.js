import https from 'node:https';
import 'dotenv/config';

async function testHttps() {
    const apiKey = process.env.LINGODOTDEV_API_KEY;
    const postData = JSON.stringify({
        params: { fast: false, workflowId: crypto.randomUUID() },
        locale: { source: "auto", target: "es" },
        data: { text: "The largest collection of free stuff on the internet!" }
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
                if (res.statusCode >= 400) {
                    console.error("API ERROR:", rawData);
                } else {
                    console.log("API SUCCESS:", rawData);
                }
                resolve();
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
