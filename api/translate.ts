export const config = {
    runtime: 'edge',
};

interface TranslateRequest {
    sourceText: string;
    sourceLang: string;
    targetLang: string;
}

export default async function handler(request: Request) {
    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const body: TranslateRequest = await request.json();
        const { sourceText, sourceLang, targetLang } = body;

        if (!sourceText || !targetLang) {
            return new Response('Missing required fields', { status: 400 });
        }

        const apiKey = process.env.MISTRAL_API_KEY;
        if (!apiKey) {
            return new Response('Server configuration error', { status: 500 });
        }

        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
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
                        content: `You are a translation engine. Translate from ${sourceLang || 'auto'} to ${targetLang}. Output only the translated text.`
                    },
                    {
                        role: 'user',
                        content: sourceText
                    }
                ]
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return new Response(`Mistral API error: ${errorText}`, { status: response.status });
        }

        const data = await response.json();
        const translatedText = data.choices[0]?.message?.content || '';

        return new Response(JSON.stringify({
            translatedText
        }), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        return new Response(`Server error: ${error}`, { status: 500 });
    }
}
