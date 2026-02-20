require('dotenv').config({ path: '.env' });
const { LingoDotDevEngine } = require('lingo.dev/sdk');

async function testConnection() {
    const apiKey = process.env.LINGODOTDEV_API_KEY;
    console.log('Testing Lingo.dev API Connection...');
    console.log('API Key Present:', !!apiKey);

    if (!apiKey) {
        console.error('ERROR: No API Key found in .env');
        process.exit(1);
    }

    try {
        const lingo = new LingoDotDevEngine({ apiKey });
        console.log('Engine initialized.');

        const testText = "Hello world, this is a test translation.";
        console.log(`Translating: "${testText}" -> es`);

        const start = Date.now();
        const result = await lingo.localizeText(testText, {
            sourceLocale: 'en',
            targetLocale: 'es'
        });
        const duration = Date.now() - start;

        console.log('Result:', result);
        console.log(`Success! took ${duration}ms`);

    } catch (error) {
        console.error('CONNECTION FAILED:', error);
        if (error.cause) {
            console.error('Cause:', error.cause);
        }
    }
}

testConnection();
