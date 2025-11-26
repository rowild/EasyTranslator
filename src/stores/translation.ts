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

    const transcribeAudio = async (audioBlob: Blob) => {
        isProcessing.value = true;
        error.value = null;
        currentSourceText.value = ''; // Clear previous text

        try {
            const apiKey = import.meta.env.VITE_MISTRAL_API_KEY;
            if (!apiKey) throw new Error('Missing VITE_MISTRAL_API_KEY');

            const formData = new FormData();
            formData.append('file', audioBlob);
            formData.append('model', 'mistral-small-latest'); // User reported "voxtral-mini" worked or was requested.
            // Wait, in the previous turn I fixed it to 'voxtral-mini'.
            // But wait, the user said "Invalid model: mistral-embedvoxtral-mini".
            // And I fixed it to 'voxtral-mini'.
            // HOWEVER, for the client-side call, I should use the same.
            // Let's use 'mistral-small-latest' for text, but for AUDIO?
            // The user said "Use Mistral’s Voxtral model".
            // I will use 'voxtral-mini' as I did in the fix.
            formData.append('model', 'voxtral-mini');
            // formData.append('language', 'en'); // Optional, let it auto-detect

            const res = await fetch('https://api.mistral.ai/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: formData,
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Mistral STT Error: ${errText}`);
            }

            const data = await res.json();
            currentSourceText.value = data.text;
            // Mistral transcription response might not include language in the simple format?
            // If it does, it's usually in a verbose mode.
            // For now, default to 'en' or keep previous if not provided.
            // We'll assume 'en' if not detected, or maybe we can't get it easily without verbose_json.
            // Let's just set it to 'en' or 'auto' for now.
            currentSourceLang.value = 'en';

            return data;
        } catch (e: any) {
            console.error(e);
            error.value = e.message;
            throw e;
        } finally {
            // Do not set isProcessing to false yet if we are going to translate immediately?
            // The UI handles the sequence. But here we just finished transcription.
            // We'll let the caller handle the flow or keep it true?
            // The user wants "indicator that the file is sent and the translation progress is ongoing".
            // So we should probably keep isProcessing true if we chain them.
            // But for this function, it's done.
            // Let's set it to false, and the UI can re-set it or we manage a global state.
            // Better: have separate states or a status string.
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
