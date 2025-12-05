import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db, type Conversation } from '../db/db';
import { languages, type Language } from '../config/languages';

export const useTranslationStore = defineStore('translation', () => {
    const currentSourceText = ref('');
    const currentSourceLang = ref('en'); // Default, will be updated by STT
    const currentTranslatedText = ref('');
    const targetLang = ref(localStorage.getItem('targetLang') || 'it'); // Default Italian
    const sourceLang = ref<string | null>(localStorage.getItem('sourceLang') || null); // Source language (required for fallback)
    const isProcessing = ref(false);
    const error = ref<string | null>(null);
    const history = ref<Conversation[]>([]);
    const detectedLanguage = ref<Language | null>(null);
    const actualTranslatedLanguage = ref<Language | null>(null); // Actual language of translation (might be fallback)

    const setTargetLang = (lang: string) => {
        targetLang.value = lang;
        localStorage.setItem('targetLang', lang);
    };

    const setSourceLang = (lang: string | null) => {
        sourceLang.value = lang;
        if (lang) {
            localStorage.setItem('sourceLang', lang);
        } else {
            localStorage.removeItem('sourceLang');
        }
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

    // Helper function to convert Blob to base64
    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                // Remove the data URL prefix (e.g., "data:audio/webm;base64,")
                const base64Data = base64String.split(',')[1];
                resolve(base64Data);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    // Helper function to encode AudioBuffer to WAV format
    const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
        const length = buffer.length * buffer.numberOfChannels * 2;
        const arrayBuffer = new ArrayBuffer(44 + length);
        const view = new DataView(arrayBuffer);
        const channels: Float32Array[] = [];
        let offset = 0;
        let pos = 0;

        // Write WAV header
        const setUint16 = (data: number) => {
            view.setUint16(pos, data, true);
            pos += 2;
        };
        const setUint32 = (data: number) => {
            view.setUint32(pos, data, true);
            pos += 4;
        };

        // "RIFF" chunk descriptor
        setUint32(0x46464952); // "RIFF"
        setUint32(36 + length); // file length - 8
        setUint32(0x45564157); // "WAVE"

        // "fmt " sub-chunk
        setUint32(0x20746d66); // "fmt "
        setUint32(16); // length = 16
        setUint16(1); // PCM
        setUint16(buffer.numberOfChannels);
        setUint32(buffer.sampleRate);
        setUint32(buffer.sampleRate * buffer.numberOfChannels * 2); // byte rate
        setUint16(buffer.numberOfChannels * 2); // block align
        setUint16(16); // bits per sample

        // "data" sub-chunk
        setUint32(0x61746164); // "data"
        setUint32(length);

        // Write interleaved PCM samples
        for (let i = 0; i < buffer.numberOfChannels; i++) {
            channels.push(buffer.getChannelData(i));
        }

        while (pos < arrayBuffer.byteLength) {
            for (let i = 0; i < buffer.numberOfChannels; i++) {
                let sample = Math.max(-1, Math.min(1, channels[i][offset]));
                sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
                view.setInt16(pos, sample, true);
                pos += 2;
            }
            offset++;
        }

        return arrayBuffer;
    };

    // Helper function to convert audio blob to WAV format
    const convertToWav = async (blob: Blob): Promise<Blob> => {
        const audioContext = new AudioContext();
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Convert to WAV
        const wavBuffer = audioBufferToWav(audioBuffer);
        await audioContext.close();

        return new Blob([wavBuffer], { type: 'audio/wav' });
    };

    // Combined transcription and translation in one API call
    const transcribeAndTranslate = async (audioBlob: Blob) => {
        isProcessing.value = true;
        error.value = null;
        currentSourceText.value = '';
        currentTranslatedText.value = '';

        try {
            const apiKey = import.meta.env.VITE_MISTRAL_API_KEY;
            if (!apiKey) throw new Error('Missing VITE_MISTRAL_API_KEY');

            // Convert audio blob to WAV format if needed
            let wavBlob: Blob;
            if (audioBlob.type === 'audio/wav') {
                console.log('Audio already in WAV format, skipping conversion');
                wavBlob = audioBlob;
            } else {
                console.log('Converting audio from', audioBlob.type, 'to WAV format...');
                wavBlob = await convertToWav(audioBlob);
                console.log('WAV conversion complete:', wavBlob.size, 'bytes');
            }

            // Convert WAV blob to base64
            console.log('Converting audio to base64...');
            const audioBase64 = await blobToBase64(wavBlob);

            // Get target language info
            const targetLanguage = languages.find(lang => lang.displayCode === targetLang.value);
            const targetLangCode = targetLanguage?.displayCode || targetLang.value;
            const targetLangName = targetLanguage?.name || targetLang.value;

            // Get source language hint (if set) - this will be the fallback language
            const sourceLangHint = sourceLang.value
                ? languages.find(l => l.displayCode === sourceLang.value)
                : null;

            console.log('Sending audio to Voxtral for transcription and translation...');
            console.log('Target language:', targetLangName, '(' + targetLangCode + ')');
            if (sourceLangHint) {
                console.log('Source/fallback language:', sourceLangHint.name, '(' + sourceLangHint.displayCode + ')');
            }

            // Build the system prompt with fallback logic
            // Source language is now required, but handle edge case where it might not be set
            const fallbackInstruction = sourceLangHint
                ? `\n4. IMPORTANT: If the detected source language matches the target language (${targetLangCode}), translate to ${sourceLangHint.name} (${sourceLangHint.displayCode}) instead as the fallback language.`
                : `\n4. IMPORTANT: If the detected source language matches the target language (${targetLangCode}), return the transcribed text as-is (no translation possible).`;

            const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: 'voxtral-small-latest',
                    response_format: { type: 'json_object' },
                    messages: [
                        {
                            role: 'system',
                            content: `You are a transcription and translation assistant. Listen to the audio and:
1. Transcribe exactly what was said
2. Detect the source language (return ISO 639-1 code like 'en', 'de', 'fr', etc.)
3. Translate the transcription to ${targetLangName} (language code: ${targetLangCode})${fallbackInstruction}

Return a JSON object with this exact structure:
{
  "sourceText": "the transcribed text",
  "sourceLanguage": "ISO 639-1 language code of the detected speech",
  "translatedText": "the translation in the appropriate target language",
  "targetLanguage": "ISO 639-1 language code of the actual translation (${targetLangCode} or fallback)"
}`
                        },
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'input_audio',
                                    input_audio: audioBase64
                                },
                                {
                                    type: 'text',
                                    text: `Please transcribe this audio, detect the source language, and translate it to ${targetLangName} (${targetLangCode}).`
                                }
                            ]
                        }
                    ]
                }),
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Voxtral API Error: ${errText}`);
            }

            const data = await res.json();
            console.log('Voxtral full response:', data);

            // Parse the JSON response
            const result = JSON.parse(data.choices[0]?.message?.content || '{}');
            console.log('Parsed result:', result);

            currentSourceText.value = result.sourceText || '';
            currentTranslatedText.value = result.translatedText || '';

            // Match the detected source language code to our language list
            if (result.sourceLanguage) {
                console.log('Detected source language code:', result.sourceLanguage);

                const detected = languages.find(lang => {
                    const match = lang.displayCode === result.sourceLanguage ||
                                  lang.displayCode.toLowerCase() === result.sourceLanguage.toLowerCase() ||
                                  lang.code.toLowerCase().startsWith(result.sourceLanguage.toLowerCase() + '-');
                    if (match) {
                        console.log('Matched source language:', lang.nativeName, lang.code);
                    }
                    return match;
                });

                if (detected) {
                    console.log('Setting detectedLanguage to:', detected.nativeName, detected.flag);
                    detectedLanguage.value = detected;
                    currentSourceLang.value = detected.displayCode;
                } else {
                    console.warn('Could not find language for code:', result.sourceLanguage);
                    detectedLanguage.value = null;
                    currentSourceLang.value = result.sourceLanguage;
                }
            }

            // Match the actual target language code (might be fallback)
            if (result.targetLanguage) {
                console.log('Actual target language code:', result.targetLanguage);

                const actualTarget = languages.find(lang => {
                    const match = lang.displayCode === result.targetLanguage ||
                                  lang.displayCode.toLowerCase() === result.targetLanguage.toLowerCase() ||
                                  lang.code.toLowerCase().startsWith(result.targetLanguage.toLowerCase() + '-');
                    if (match) {
                        console.log('Matched target language:', lang.nativeName, lang.code);
                    }
                    return match;
                });

                if (actualTarget) {
                    console.log('Setting actualTranslatedLanguage to:', actualTarget.nativeName, actualTarget.flag);
                    actualTranslatedLanguage.value = actualTarget;
                } else {
                    console.warn('Could not find language for code:', result.targetLanguage);
                    // Fallback to the requested target language
                    actualTranslatedLanguage.value = targetLanguage || null;
                }
            } else {
                // No targetLanguage in response, assume it's the requested target
                actualTranslatedLanguage.value = targetLanguage || null;
            }

            // Save to DB
            await addConversation({
                createdAt: Date.now(),
                sourceText: currentSourceText.value,
                sourceLang: currentSourceLang.value,
                translatedText: currentTranslatedText.value,
                targetLang: targetLang.value,
            });

            return result;
        } catch (e: any) {
            console.error('Transcription and translation error:', e);
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
        sourceLang,
        isProcessing,
        error,
        history,
        detectedLanguage,
        actualTranslatedLanguage,
        setTargetLang,
        setSourceLang,
        loadHistory,
        transcribeAndTranslate,
    };
});
