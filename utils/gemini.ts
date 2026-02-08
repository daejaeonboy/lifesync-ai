import { ApiUsageStats } from '../types';

/**
 * Interface for Gemini API Response
 */
interface GeminiResponse {
    candidates: {
        finishReason?: string;
        content: {
            parts: {
                text: string;
            }[];
        };
    }[];
}

/**
 * Call the Google Gemini API to generate content.
 * Note: In a production app, this should ideally go through a backend to protect the API Key.
 */
export const callGeminiAPI = async (
    apiKey: string,
    prompt: string,
    updateUsage?: (stats: ApiUsageStats) => void,
    modelName: string = 'gemini-1.5-flash'
): Promise<string> => {
    if (!apiKey) {
        throw new Error('API Key가 필요합니다.');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [{ text: prompt }],
                    },
                ],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 4096,
                }
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'API 호출 중 오류가 발생했습니다.');
        }

        const data: GeminiResponse = await response.json();
        const parts = data.candidates?.[0]?.content?.parts || [];
        const text = parts
            .map(part => part?.text || '')
            .join('')
            .trim();

        if (!text) {
            throw new Error('응답 데이터를 파싱할 수 없습니다.');
        }

        // Update usage stats if callback provided
        if (updateUsage) {
            // Basic simulation of token count (approximation)
            const estimatedTokens = Math.ceil((prompt.length + text.length) / 4);
            updateUsage({
                totalRequests: 1, // This will be added to the current total
                totalTokens: estimatedTokens,
                lastRequestDate: new Date().toISOString(),
            });
        }

        return text.trim();
    } catch (error) {
        console.error('Gemini API Error:', error);
        throw error;
    }
};

/**
 * Create a specialized prompt for an AI agent persona.
 */
export const createAgentPrompt = (
    persona: { name: string; role: string; personality: string; tone: string },
    context: string,
    userAction: string
): string => {
    return `
당신은 "${persona.name}"라는 이름의 AI 동료입니다.
나의 역할: ${persona.role}
나의 성격: ${persona.personality}
말투 및 톤: ${persona.tone}

현재 상황(문맥):
${context}

사용자의 행동:
${userAction}

위 정보를 바탕으로 사용자에게 줄 짧은 코멘트나 반응을 작성해 주세요. 
반드시 당신의 성격과 페르소나를 유지해야 하며, 한국어로 자연스럽게 말해야 합니다. 
마크다운 형식을 사용할 수 있습니다.
답변은 너무 길지 않게 2~4문장 정도로 작성해 주세요.
`;
};
