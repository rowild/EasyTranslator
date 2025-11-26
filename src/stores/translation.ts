import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db, type Conversation } from '../db/db';

export const useTranslationStore = defineStore('translation', () => {
    const currentSourceText = ref('');
    const currentSourceLang = ref('en'); // Default, will be updated by STT
    const currentTranslatedText = ref('');
    const targetLang = ref(localStorage.getItem('targetLang') || 'it'); // Default Italian
    const isProcessing = ref(false);
    const error = ref<string | null>(null);
    const history = ref<Conversation[]>([]);

    const setTargetLang = (lang: string) => {
        targetLang.value = lang;
        localStorage.setItem('targetLang', lang);
    };

    const loadHistory = async () => {
        try {
            history.value = await db.conversations.orderBy('createdAt').reverse().toArray();
        } catch (e) {
            console.error('Error loading history:', e);
        }
    };

    const addConversation = async (conv: Omit<Conversation, 'id'>) => {
        try {
            const id = await db.conversations.add(conv);
            // Refresh history or unshift
            history.value.unshift({ ...conv, id: Number(id) });
        } catch (e) {
            console.error('Error saving conversation:', e);
        }
    };

    const transcribeAudio = async (audioBlob: Blob, languageCode?: string) => {
        isProcessing.value = true;
        error.value = null;
        currentSourceText.value = '';

        try {
            const apiKey = import.meta.env.VITE_MISTRAL_API_KEY;
            if (!apiKey) throw new Error('Missing VITE_MISTRAL_API_KEY');

            const formData = new FormData();
            formData.append('file', audioBlob, 'audio.webm');
            formData.append('model', 'voxtral-mini-latest');

            // Add language if provided (improves accuracy)
            if (languageCode) {
                // Extract 2-letter code from full code (e.g., "de-DE" -> "de")
                const langCode = languageCode.split('-')[0];
                formData.append('language', langCode);
                console.log('Transcribing with language:', langCode);
            }

            console.log('Sending audio to Voxtral API...');
            const res = await fetch('https://api.mistral.ai/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: formData,
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Voxtral API Error: ${errText}`);
            }

            const data = await res.json();
            currentSourceText.value = data.text;
            console.log('Voxtral transcription:', data.text);
            console.log('Usage:', data.usage);

            // Set source language from input
            if (languageCode) {
                currentSourceLang.value = languageCode.split('-')[0];
            }

            return data;
        } catch (e: any) {
            console.error('Transcription error:', e);
            error.value = e.message;
            throw e;
        } finally {
            isProcessing.value = false;
        }
    };

    const translateText = async () => {
        if (!currentSourceText.value) return;

        isProcessing.value = true;
        error.value = null;
        currentTranslatedText.value = ''; // Clear previous

        try {
            const apiKey = import.meta.env.VITE_MISTRAL_API_KEY;
            if (!apiKey) throw new Error('Missing VITE_MISTRAL_API_KEY');

            const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: 'mistral-small-latest',
                    messages: [
                        {
                            role: 'system',
                            content: `You are a translation engine. Translate from ${currentSourceLang.value || 'auto'} to ${targetLang.value}. Output only the translated text.`
                        },
                        {
                            role: 'user',
                            content: currentSourceText.value
                        }
                    ]
                }),
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Mistral Translate Error: ${errText}`);
            }

            const data = await res.json();
            const translated = data.choices[0]?.message?.content || '';
            currentTranslatedText.value = translated;

            // Save to DB
            await addConversation({
                createdAt: Date.now(),
                sourceText: currentSourceText.value,
                sourceLang: currentSourceLang.value,
                translatedText: translated,
                targetLang: targetLang.value,
            });

        } catch (e: any) {
            console.error(e);
            error.value = e.message;
            throw e;
        } finally {
            isProcessing.value = false;
        }
    };

    return {
        currentSourceText,
        currentSourceLang,
        currentTranslatedText,
        targetLang,
        isProcessing,
        error,
        history,
        setTargetLang,
        loadHistory,
        transcribeAudio,
        translateText,
    };
});
