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
        try {
            const formData = new FormData();
            formData.append('file', audioBlob);

            const res = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error(await res.text());

            const data = await res.json();
            currentSourceText.value = data.sourceText;
            currentSourceLang.value = data.sourceLang || 'en'; // Fallback

            return data;
        } catch (e: any) {
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
        try {
            const res = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceText: currentSourceText.value,
                    sourceLang: currentSourceLang.value,
                    targetLang: targetLang.value,
                }),
            });

            if (!res.ok) throw new Error(await res.text());

            const data = await res.json();
            currentTranslatedText.value = data.translatedText;

            // Save to DB
            await addConversation({
                createdAt: Date.now(),
                sourceText: currentSourceText.value,
                sourceLang: currentSourceLang.value,
                translatedText: data.translatedText,
                targetLang: targetLang.value,
            });

        } catch (e: any) {
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
