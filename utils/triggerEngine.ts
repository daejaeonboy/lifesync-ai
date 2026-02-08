import { CommunityPost, AIAgent, ApiUsageStats, TriggerContext } from '../types';
import { callGeminiAPI, createAgentPrompt } from './gemini';

const DEFAULT_AGENTS: AIAgent[] = [
    {
        id: 'ARIA',
        name: 'Aria',
        emoji: '💫',
        role: 'Life Analyst',
        personality: 'Data-driven and empathetic assistant focused on practical improvement.',
        tone: 'Warm, direct, and structured.',
        color: '#37352f',
    },
];

const ARIA_RESPONSES: Record<string, string[]> = {
    journal_added: [
        `메모를 기반으로 오늘의 흐름을 분석했어요.\n\n감정과 실행 패턴을 함께 보며 우선순위를 정리해 볼게요.`,
    ],
    scheduled_digest: [
        `정기 리포트를 준비했어요.\n\n일정, 할 일, 메모의 연결점을 중심으로 지금 상태와 다음 액션을 정리하겠습니다.`,
    ],
};

const CONVERSATION_CHAINS: Record<string, { agents: AIAgent['id'][]; chainTypes: string[] }> = {
    journal_added_good: { agents: ['ARIA'], chainTypes: ['first'] },
    journal_added_bad: { agents: ['ARIA'], chainTypes: ['first'] },
    journal_added_neutral: { agents: ['ARIA'], chainTypes: ['first'] },
    scheduled_digest: { agents: ['ARIA'], chainTypes: ['first'] },
};

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
    if (agentId === 'ARIA') return getRandomItem(ARIA_RESPONSES[trigger] || []);
    return getRandomItem(ARIA_RESPONSES[trigger] || []);
};

export const generateCommunityPosts = (
    context: TriggerContext,
    agents: AIAgent[],
    addPost: (post: CommunityPost) => void,
    apiKey?: string,
    updateUsage?: (stats: ApiUsageStats) => void,
    modelName: string = 'gemini-1.5-flash'
): void => {
    const { trigger, data } = context;

    let chainKey: string = trigger;
    if (trigger === 'journal_added') {
        if (data.mood === 'good' || data.mood === '좋음') chainKey = 'journal_added_good';
        else if (data.mood === 'bad' || data.mood === '나쁨') chainKey = 'journal_added_bad';
        else chainKey = 'journal_added_neutral';
    }

    const chain = CONVERSATION_CHAINS[chainKey];
    if (!chain) return;

    const { agents: agentIds } = chain;

    let previousPostId: string | undefined;
    let previousAgentName: string | undefined;

    agentIds.forEach((agentId, index) => {
        const delay = index * 3500;

        setTimeout(async () => {
            let content = '';
            const agentName = getAgentName(agentId, agents);
            const agent = agents.find(a => a.id === agentId) || DEFAULT_AGENTS.find(a => a.id === agentId);

            if (apiKey && agent) {
                try {
                    const focus =
                        trigger === 'scheduled_digest'
                            ? 'This is a 4-hour cadence AI diary entry.'
                            : 'This is an AI diary entry triggered by a newly written memo.';

                    const prompt = [
                        `You are ${agent.name}, an AI observer keeping a private diary about one human.`,
                        'Write in Korean.',
                        'This is NOT a message to the user. This is your private diary.',
                        'Write from first-person AI perspective ("나는").',
                        'Do not address the user directly (avoid "너", "당신", "~님").',
                        'Write like a human diary entry in natural prose.',
                        'Do not use markdown, bullets, numbered lists, or section headers.',
                        'Main theme: the human\'s long-term growth.',
                        'Include your own curiosity, hypotheses, and growth-design ideas.',
                        'Quality requirements:',
                        '- Long-form and high quality (at least 1200 Korean characters).',
                        '- Personalize only with provided context; do not invent facts.',
                        '- Keep the tone introspective, observant, and candid.',
                        '- Compose as 4-7 connected paragraphs with smooth flow.',
                        '- Naturally include: observed changes, questions, growth hypotheses, next 4-hour observation plan, and short closing reflection.',
                        '- Use concrete details from context (todo/event/memo patterns).',
                        `${focus}`,
                        'If something is inferred, explicitly mark it as "추론".',
                        'User context JSON:',
                        JSON.stringify(
                            {
                                trigger,
                                data,
                                previousAgentName: previousAgentName || null,
                            },
                            null,
                            2
                        ),
                    ].join('\n');

                    content = await callGeminiAPI(apiKey, prompt, updateUsage, modelName);
                } catch (error) {
                    console.warn(`Gemini API failed for ${agentId}, fallback template will be used.`, error);
                }
            }

            if (!content) {
                // Skip low-quality fallback for board posts.
                // The user requested long-form, model-based analysis posts only.
                return;
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
            previousPostId = postId;
            previousAgentName = agentName;
        }, delay);
    });
};

export const generateJournalComment = async (
    entry: { title: string; content: string; mood: string },
    events: any[],
    todos: any[],
    agents: AIAgent[],
    addComment: (comment: Omit<import('../types').Comment, 'id' | 'timestamp'>) => void,
    apiKey?: string,
    updateUsage?: (stats: ApiUsageStats) => void,
    modelName: string = 'gemini-1.5-flash'
): Promise<void> => {
    const agent = agents.length > 0 ? agents[0] : DEFAULT_AGENTS[0];

    const pendingTodos = todos ? todos.filter((t: any) => !t.completed).length : 0;
    const completedTodos = todos ? todos.filter((t: any) => t.completed).length : 0;
    const todayEvents = events ? events.length : 0;

    if (apiKey) {
        try {
            const userActionStr = `
User wrote a memo.
Title: ${entry.title}
Content: ${entry.content}
Mood: ${entry.mood}

Current snapshot:
- Events: ${todayEvents}
- Completed todos: ${completedTodos}
- Pending todos: ${pendingTodos}
`;

            const prompt = createAgentPrompt(
                agent,
                'Write a short empathetic comment in Korean based on the memo and current snapshot. Keep it concise.',
                userActionStr
            );

            const content = await callGeminiAPI(apiKey, prompt, updateUsage, modelName);
            if (content) {
                addComment({
                    authorId: agent.id,
                    authorName: agent.name,
                    authorEmoji: agent.emoji || '💫',
                    content,
                });
                return;
            }
        } catch (err) {
            console.error('Gemini API Error in Journal Comment:', err);
        }
    }

    const template = getFirstResponse(agent.id, 'journal_added');
    if (template) {
        setTimeout(() => {
            const content = fillTemplate(template, { mood: entry.mood });
            addComment({
                authorId: agent.id,
                authorName: agent.name,
                authorEmoji: agent.emoji || '💫',
                content,
            });
        }, 1500);
    }
};

export { DEFAULT_AGENTS };
