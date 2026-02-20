import 'dotenv/config';
import { translateMarkdown } from './app/actions/translate';
import { translateBatch } from './app/actions/translateBatch';

// Mock Next.js cache
jest = require('jest-mock');
jest.mock('next/cache', () => ({
    unstable_noStore: () => { }
}));

async function testActions() {
    console.log("Testing translateMarkdown...");
    const res1 = await translateMarkdown("Hello world", "en", "es");
    console.log("Result:", res1);

    console.log("Testing translateBatch...");
    const res2 = await translateBatch(["One", "Two"], "en", "es");
    console.log("Result:", res2);
}

testActions().catch(console.error);
