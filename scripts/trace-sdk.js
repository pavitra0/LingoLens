import { LingoDotDevEngine } from 'lingo.dev/sdk';
import 'dotenv/config';

const apiKey = process.env.LINGODOTDEV_API_KEY;

// Instrument global fetch to see exactly what we are sending
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
    console.log("URL:", url);
    console.log("METHOD:", options.method);
    console.log("HEADERS:", JSON.stringify(options.headers, null, 2));
    console.log("BODY:", options.body);

    // We don't even need to execute it, we just want to see the request format
    return new Response(JSON.stringify({ data: { text: "Success" } }), { status: 200 });
};

const lingoDotDev = new LingoDotDevEngine({ apiKey });

lingoDotDev.localizeText("Hello", { sourceLocale: "en", targetLocale: "es" })
    .then(res => {
        console.log("Result:", res);
    })
    .catch(err => {
        console.error("Error:", err);
    });
