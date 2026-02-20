import { LingoDotDevEngine } from 'lingo.dev/sdk';
import 'dotenv/config';

async function test() {
    let usedCustomFetch = false;
    const customFetch = async (url, options) => {
        usedCustomFetch = true;
        console.log("Custom fetch called!");
        return fetch(url, { ...options, cache: 'no-store' });
    };

    const engine = new LingoDotDevEngine({
        apiKey: process.env.LINGODOTDEV_API_KEY,
        fetch: customFetch
    });

    try {
        await engine.localizeText("Hello", { sourceLocale: "en", targetLocale: "es" });
        console.log("Used custom fetch?", usedCustomFetch);
    } catch (e) {
        console.error("Error", e);
    }
}
test();
