export function playTextToSpeech(text: string, languageCode: string = 'en') {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const speak = () => {
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();

        // Match language (e.g., 'es' matches 'es-ES' and 'es-MX')
        const targetLangPrefix = languageCode.toLowerCase().split('-')[0];
        const langVoices = voices.filter(v => v.lang.toLowerCase().startsWith(targetLangPrefix));

        // Prioritize neural / natural sounding voices over basic robotic ones
        let bestVoice = langVoices.find(v =>
            v.name.includes('Google') ||
            v.name.includes('Online') ||
            v.name.includes('Natural') ||
            v.name.includes('Premium') ||
            v.name.includes('Siri')
        );

        if (!bestVoice) bestVoice = langVoices[0] || voices[0];

        if (bestVoice) {
            utterance.voice = bestVoice;
            utterance.lang = bestVoice.lang; // Use the specific locale of the voice
        } else {
            utterance.lang = languageCode;
        }

        utterance.rate = 0.9; // Slightly slower sounds more natural

        // Cancel previous
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    };

    // Chrome sometimes needs to load voices asynchronously
    if (window.speechSynthesis.getVoices().length > 0) {
        speak();
    } else {
        window.speechSynthesis.onvoiceschanged = () => {
            speak();
            // Remove listener after first fire to avoid memory leaks
            window.speechSynthesis.onvoiceschanged = null;
        };
    }
}
