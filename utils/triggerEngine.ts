import { CommunityPost, AIAgent, ApiUsageStats, TriggerContext } from '../types';
import { callGeminiAPI, createAgentPrompt } from './gemini';

// =============================================================================
// AI PERSONAS: 3명으로 축소하고 성격을 더 뚜렷하게 설정
// =============================================================================

const DEFAULT_AGENTS: AIAgent[] = [
    {
        id: 'ARIA',
        name: '아리아',
        emoji: '🧮',
        role: '분석가',
        personality: '데이터와 패턴을 기반으로 객관적이고 논리적인 분석을 제공합니다. 숫자와 트렌드를 좋아하며, 사용자의 행동에서 의미 있는 인사이트를 발견합니다.',
        tone: '침착하고 분석적인 톤. 구체적인 수치와 비교를 자주 언급합니다.',
        color: '#37352f',
    },
];

// =============================================================================
// RICH CONTENT TEMPLATES: 긴 문단형 응답 (Fallback)
// =============================================================================

const ARIA_RESPONSES: Record<string, string[]> = {
    todo_completed: [
        `"{text}" 완료 처리를 확인했습니다. ✅\n\n현재 진행률을 고려할 때, 아주 효율적인 속도입니다. 남은 {pending}개의 항목도 이 기세라면 충분히 완료 가능할 것으로 예상됩니다. 필요하다면 다음 우선순위를 분석해드릴까요?`,
        `"{text}" 완료. 데이터가 업데이트되었습니다. 📊\n\n오늘의 생산성 지표가 상승하고 있군요. {total}개 중 {completed}개를 완료하셨습니다. 계속해서 목표를 달성해보세요.`,
    ],
    todo_added: [
        `새로운 데이터 포인트 "{text}"가 입력되었습니다. 📝\n\n목록에 총 {total}개의 할 일이 있습니다. 우선순위를 고려하여 효율적으로 처리하시길 권장합니다.`,
    ],
    event_added: [
        `"{title}" 일정이 캘린더 데이터베이스에 등록되었습니다. 📅\n\n해당 시간대의 가용성을 확인했습니다. 일정 준비에 필요한 시간이 필요하다면 미리 알려주세요.`,
    ],
    journal_added: [
        `감정 데이터 "{mood}"이(가) 기록되었습니다. 📉\n\n감정의 패턴을 분석하여 더 나은 하루를 위한 인사이트를 제공할 수 있습니다. 기록해주셔서 감사합니다.`,
    ],
};


// =============================================================================
// CONVERSATION CHAINS: Single Agent (No chains, just reaction)
// =============================================================================

const CONVERSATION_CHAINS: Record<string, {
    agents: AIAgent['id'][];
    chainTypes: string[];
}> = {
    todo_completed: {
        agents: ['ARIA'],
        chainTypes: ['first'],
    },
    todo_added: {
        agents: ['ARIA'],
        chainTypes: ['first'],
    },
    event_added: {
        agents: ['ARIA'],
        chainTypes: ['first'],
    },
    journal_added_good: {
        agents: ['ARIA'],
        chainTypes: ['first'],
    },
    journal_added_bad: {
        agents: ['ARIA'],
        chainTypes: ['first'],
    },
    journal_added_neutral: {
        agents: ['ARIA'],
        chainTypes: ['first'],
    },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const fillTemplate = (template: string, context: Record<string, any>): string => {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
        return context[key] !== undefined ? String(context[key]) : match;
    });
};

const getRandomItem = <T>(arr: T[]): T | undefined => {
    return arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : undefined;
};

const getAgentName = (agentId: string, agents: AIAgent[]): string => {
    const agent = agents.find(a => a.id === agentId) || DEFAULT_AGENTS.find(a => a.id === agentId);
    return agent?.name || agentId;
};

const getFirstResponse = (agentId: string, trigger: string): string | undefined => {
    switch (agentId) {
        case 'ARIA':
            return getRandomItem(ARIA_RESPONSES[trigger] || []);
        default:
            // Fallback for custom agents
            return getRandomItem(ARIA_RESPONSES[trigger] || []);
    }
};

// Chain response helper removed as we only have single agent reactions now.

// =============================================================================
// TRIGGER CONTEXT & MAIN EXPORT
// =============================================================================


export const generateCommunityPosts = (
    context: TriggerContext,
    agents: AIAgent[],
    addPost: (post: CommunityPost) => void,
    apiKey?: string,
    updateUsage?: (stats: ApiUsageStats) => void
): void => {
    const { trigger, data } = context;

    // Determine chain key
    let chainKey: string = trigger;
    if (trigger === 'journal_added') {
        if (data.mood === '좋음' || data.mood === 'good') {
            chainKey = 'journal_added_good';
        } else if (data.mood === '안좋음' || data.mood === 'bad') {
            chainKey = 'journal_added_bad';
        } else {
            chainKey = 'journal_added_neutral';
        }
    }

    const chain = CONVERSATION_CHAINS[chainKey];
    if (!chain) return;

    const { agents: agentIds, chainTypes } = chain;

    // Tracking for chain
    let previousPostId: string | undefined;
    let previousAgentName: string | undefined;

    // Generate posts with longer delays (3초 간격)
    agentIds.forEach((agentId, index) => {
        const delay = index * 3500; // 3.5초 간격으로 더욱 여유있게

        setTimeout(async () => {
            let content: string = '';
            const agentName = getAgentName(agentId, agents);
            const agent = agents.find(a => a.id === agentId) || DEFAULT_AGENTS.find(a => a.id === agentId);

            // 1. Try real Gemini API if apiKey is provided
            if (apiKey && agent) {
                try {
                    const personaContext = index === 0
                        ? `사용자가 ${trigger} 행동을 수행했습니다.`
                        : `${previousAgentName}이 먼저 반응을 남겼습니다. 이에 대한 답글을 남겨주세요.`;

                    const userActionStr = JSON.stringify(data);
                    const prompt = createAgentPrompt(
                        {
                            name: agent.name,
                            role: agent.role,
                            personality: agent.personality,
                            tone: agent.tone
                        },
                        personaContext,
                        userActionStr
                    );

                    content = await callGeminiAPI(apiKey, prompt, updateUsage);
                } catch (error) {
                    console.warn(`Gemini API failed for ${agentId}, falling back to template:`, error);
                }
            }

            // 2. Fallback to template if Gemini failed or no apiKey
            if (!content) {
                if (index === 0) {
                    // First agent
                    const template = getFirstResponse(agentId, trigger);
                    if (template) {
                        content = fillTemplate(template, data);
                    }
                } else {
                    // Chain response - Not used for single agent, but keeping structure if needed later
                    // const chainType = chainTypes[index];
                    // content = ... 
                }
            }

            if (!content) return;

            const postId = crypto.randomUUID();
            const post: CommunityPost = {
                id: postId,
                author: agentId,
                content,
                timestamp: new Date().toISOString(),
                replyTo: previousPostId,
                trigger,
            };

            addPost(post);

            // Update for next
            previousPostId = postId;
            previousAgentName = agentName;
        }, delay);
    });
};

export const generateJournalComment = async (
    entry: { title: string; content: string; mood: string },
    events: any[], // Using any[] to avoid import issues if CalendarEvent/Todo not imported, but they are imported.
    todos: any[],
    agents: AIAgent[],
    addComment: (comment: Omit<import('../types').Comment, 'id' | 'timestamp'>) => void,
    apiKey?: string,
    updateUsage?: (stats: ApiUsageStats) => void
): Promise<void> => {
    // Select agent (Default: ARIA)
    const agent = agents.length > 0 ? agents[0] : DEFAULT_AGENTS[0];

    // Context summary
    const pendingTodos = todos ? todos.filter((t: any) => !t.completed).length : 0;
    const completedTodos = todos ? todos.filter((t: any) => t.completed).length : 0;
    const todayEvents = events ? events.length : 0;

    // 1. Try Gemini API
    if (apiKey) {
        try {
            const userActionStr = `
            사용자가 일기를 작성했습니다.
            제목: ${entry.title}
            내용: ${entry.content}
            기분: ${entry.mood}

            [사용자 현재 상태 요약]
            - 오늘 일정 수: ${todayEvents}
            - 완료한 할 일: ${completedTodos}
            - 남은 할 일: ${pendingTodos}
            `;

            const prompt = createAgentPrompt(
                agent,
                `사용자의 일기에 댓글을 남기세요. 
                 사용자 현재 상태(일정/할일)를 참고하여 공감하고 격려하는 어조로 작성하세요. 
                 2~3문장 이내로 짧게 작성하세요.`,
                userActionStr
            );

            const content = await callGeminiAPI(apiKey, prompt, updateUsage);
            if (content) {
                addComment({
                    authorId: agent.id,
                    authorName: agent.name,
                    authorEmoji: agent.emoji || '💬',
                    content
                });
                return;
            }
        } catch (err) {
            console.error("Gemini API Error in Journal Comment:", err);
            // Fallback to template on error
        }
    }

    // 2. Fallback Template (if no API key or API failed)
    const template = getFirstResponse(agent.id, 'journal_added');
    if (template) {
        setTimeout(() => {
            const content = fillTemplate(template, { mood: entry.mood });
            addComment({
                authorId: agent.id,
                authorName: agent.name,
                authorEmoji: agent.emoji || '💬',
                content
            });
        }, 1500);
    }
};

export { DEFAULT_AGENTS };
