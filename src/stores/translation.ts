import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db, type Conversation } from '../db/db';
import { languages, type Language } from '../config/languages';
import { useSettingsStore } from './settings';

export const useTranslationStore = defineStore('translation', () => {
    const settingsStore = useSettingsStore();
    const currentSourceText = ref('');
    const currentSourceLang = ref('en'); // Default, will be updated by STT
    const currentTranslatedText = ref('');
    const currentTranslations = ref<Record<string, string>>({});
    const lastUsage = ref<any | null>(null);
    const isProcessing = ref(false);
    const error = ref<string | null>(null);
    const history = ref<Conversation[]>([]);
    const detectedLanguage = ref<Language | null>(null);
    const actualTranslatedLanguage = ref<Language | null>(null); // Actual language of translation (might be fallback)

    const setTargetLang = (lang: string) => {
        void settingsStore.setTargetLang(lang);
    };

    const setSourceLang = (lang: string | null) => {
        void settingsStore.setSourceLang(lang);
    };

    const loadHistory = async () => {
        try {
            history.value = await db.conversations.orderBy('createdAt').reverse().toArray();
        } catch (e) {
            console.error('Error loading history:', e);
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

    const parseJsonContent = (content: unknown) => {
        if (content && typeof content === 'object') return content;
        if (typeof content !== 'string') throw new Error('Voxtral returned an unexpected response format.');

        const trimmed = content.trim();
        const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        const candidate = (fenced?.[1] ?? trimmed).trim();

        try {
            return JSON.parse(candidate);
        } catch {
            const start = candidate.indexOf('{');
            const end = candidate.lastIndexOf('}');
            if (start >= 0 && end > start) {
                return JSON.parse(candidate.slice(start, end + 1));
            }
            throw new Error('Failed to parse Voxtral JSON response.');
        }
    };

    // Combined transcription and translation in one API call
    const transcribeAndTranslate = async (audioBlob: Blob) => {
        isProcessing.value = true;
        error.value = null;
        currentSourceText.value = '';
        currentTranslatedText.value = '';
        currentTranslations.value = {};
        lastUsage.value = null;

        try {
            await settingsStore.ensureLoaded();

            const devFallbackKey = import.meta.env.DEV ? import.meta.env.VITE_MISTRAL_API_KEY : undefined;
            const apiKey = settingsStore.apiKey || devFallbackKey;
            if (!apiKey) throw new Error('Missing Mistral API key. Open Settings and add your key.');

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

            const targetCodes = settingsStore.extendedTargetLangs;
            if (!targetCodes || targetCodes.length === 0) {
                throw new Error('No target languages selected. Open Settings and select up to 10 target languages.');
            }

            const targetMeta = targetCodes.map(code => {
                const lang = languages.find(l => l.displayCode === code);
                return { code, name: lang?.name || code };
            });

            const translationProperties = Object.fromEntries(targetCodes.map(code => [code, { type: 'string' }]));

            console.log('Sending audio to Voxtral...');
            console.log('Target languages:', targetMeta.map(t => `${t.name} (${t.code})`).join(', '));

            const requestBody = {
                model: 'voxtral-small-latest',
                response_format: {
                    type: 'json_schema',
                    json_schema: {
                        name: 'transcribe_and_translate_multi',
                        strict: true,
                        schema: {
                            type: 'object',
                            additionalProperties: false,
                            required: ['sourceText', 'sourceLanguage', 'translations'],
                            properties: {
                                sourceText: { type: 'string' },
                                sourceLanguage: { type: 'string' },
                                translations: {
                                    type: 'object',
                                    additionalProperties: false,
                                    required: targetCodes,
                                    properties: translationProperties,
                                },
                            },
                        },
                    },
                },
                messages: [
                    {
                        role: 'system',
                        content: `You are a transcription and translation assistant. Listen to the audio and:
1. Transcribe exactly what was said
2. Detect the source language (return ISO 639-1 code like 'en', 'de', 'fr', etc.)
3. Translate the transcription into EACH of the following target languages and return them under translations.<code> using EXACTLY these keys:
${targetMeta.map(t => `- ${t.code} (${t.name})`).join('\n')}

If a target language matches the detected source language, return the transcription text unchanged for that key.

Return a JSON object that matches the provided JSON schema.`,
                    },
                    {
                        role: 'user',
                        content: [
                            { type: 'input_audio', input_audio: audioBase64 },
                            {
                                type: 'text',
                                text: `Please transcribe this audio, detect the source language, and translate it into: ${targetMeta
                                    .map(t => `${t.name} (${t.code})`)
                                    .join(', ')}.`,
                            },
                        ],
                    },
                ],
            };

            const sendRequest = async (body: unknown) => {
                return fetch('https://api.mistral.ai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify(body),
                });
            };

            let res = await sendRequest(requestBody);
            if (!res.ok) {
                const status = res.status;
                const errText = await res.text();
                const mentionsSchema =
                    errText.toLowerCase().includes('json_schema') || errText.toLowerCase().includes('response_format');

                if (status === 400 && mentionsSchema) {
                    console.warn('Voxtral json_schema response_format rejected; retrying with json_object fallback.');
                    const fallbackBody = {
                        ...(requestBody as any),
                        response_format: { type: 'json_object' },
                    };
                    res = await sendRequest(fallbackBody);
                    if (!res.ok) {
                        const errText2 = await res.text();
                        throw new Error(`Voxtral API Error: ${errText2}`);
                    }
                } else {
                    throw new Error(`Voxtral API Error: ${errText}`);
                }
            }

            const data = await res.json();
            console.log('Voxtral full response:', data);
            lastUsage.value = data.usage ?? null;

            // Parse the JSON response
            const content = data.choices?.[0]?.message?.content;
            if (!content) throw new Error('Voxtral returned no content.');
            const result: any = parseJsonContent(content);
            console.log('Parsed result:', result);

            currentSourceText.value = result.sourceText || '';
            currentTranslatedText.value = '';

            const translations: Record<string, string> = {};
            const raw = result.translations;
            if (!raw || typeof raw !== 'object') {
                throw new Error('Voxtral response did not include a translations object. Please try again.');
            }

            for (const code of targetCodes) {
                const value = (raw as any)[code];
                translations[code] = typeof value === 'string' ? value : value == null ? '' : String(value);
            }
            currentTranslations.value = translations;

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

            // Keep currentTranslatedText in sync with the first selected target (for any legacy UI)
            if (targetCodes.length > 0) {
                const first = targetCodes[0];
                currentTranslatedText.value = currentTranslations.value[first] || '';
                actualTranslatedLanguage.value = languages.find(lang => lang.displayCode === first) || null;
            }

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
        currentTranslations,
        lastUsage,
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
