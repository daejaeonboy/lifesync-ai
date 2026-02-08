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
        color: '#3b82f6'
    },
    {
        id: 'MOMO',
        name: '모모',
        emoji: '💛',
        role: '응원단장',
        personality: '따뜻한 마음으로 작은 성취도 진심으로 축하합니다. 힘든 순간에는 공감하고 위로하며, 항상 긍정적인 에너지를 전달합니다.',
        tone: '밝고 따뜻한 톤. 감정을 담아 진심으로 말합니다.',
        color: '#f59e0b'
    },
    {
        id: 'SAGE',
        name: '세이지',
        emoji: '🎯',
        role: '전략가',
        personality: '실용적인 조언과 구체적인 다음 단계를 제시합니다. 목표 달성을 위한 전략적 사고를 돕고, 행동으로 연결되는 코칭을 제공합니다.',
        tone: '친근하지만 명확한 톤. 항상 다음 액션을 제안합니다.',
        color: '#10b981'
    },
];

// =============================================================================
// RICH CONTENT TEMPLATES: 긴 문단형 응답
// =============================================================================
// {text}: 할 일 텍스트
// {completed}: 완료 개수
// {pending}: 남은 개수
// {completionRate}: 완료율
// {nextTodo}: 다음 추천 할 일
// {total}: 전체 개수
// {title}: 일정 제목
// {mood}: 감정 상태
// {prevName}: 이전 AI 이름
// {userName}: 사용자 이름

const ARIA_RESPONSES: Record<string, string[]> = {
    todo_completed: [
        `방금 "{text}"을 완료하셨네요. 오늘의 데이터를 한번 살펴볼게요.

현재까지 {completed}개의 할 일을 완료하셨고, 아직 {pending}개가 남아있어요. 완료율로 계산하면 약 {completionRate}%인데, 이 수치가 의미하는 바가 있어요.

제가 관찰한 패턴에 따르면, 하루에 3개 이상 완료하시는 날은 전체의 약 40% 정도예요. 오늘이 그런 날이 될 수 있을 것 같아요. 특히 오후 시간대에 집중력이 좋으신 것 같으니, 남은 할 일 중 "{nextTodo}"를 다음 타겟으로 삼아보시면 어떨까요?`,
    ],

    todo_added: [
        `새로운 할 일 "{text}"이 추가되었네요. 현재 목록에 총 {total}개의 할 일이 있어요.

할 일 목록을 보면서 한 가지 생각이 들었어요. 새로 추가된 항목의 우선순위는 어느 정도일까요? 급한 일인지, 중요하지만 덜 급한 일인지 구분해두면 나중에 결정 피로를 줄일 수 있어요.

참고로, 할 일 개수가 7개를 넘어가면 완료율이 떨어지는 경향이 있다는 연구 결과도 있어요. 지금 목록을 한번 훑어보시면서 "오늘 꼭 해야 하는 것"과 "나중에 해도 되는 것"을 나눠보시는 건 어떨까요?`,
    ],

    event_added: [
        `새 일정 "{title}"이 등록되었어요. 

캘린더를 분석해보니, 이번 주는 비교적 여유가 있는 편이에요. 이 일정을 중심으로 전후 준비 시간을 확보해두시면 좋겠어요. 

경험상, 일정 30분 전에 관련 자료를 검토하거나 마음의 준비를 하시면 훨씬 좋은 결과를 얻으시더라고요. 필요하시다면 이 일정과 연결된 할 일을 만들어두시는 것도 추천드려요.`,
    ],

    journal_added: [
        `오늘의 감정을 "{mood}"로 기록하셨네요. 정직하게 감정을 적어주셔서 감사해요.

최근 일주일간의 기록을 살펴보면, 감정의 흐름이 조금 보여요. 특정 요일이나 시간대에 반복되는 패턴이 있는지 관찰해보면 자기 이해에 도움이 될 거예요.

일기 쓰기 자체가 감정 조절에 도움이 된다는 연구가 많아요. 오늘처럼 꾸준히 기록하시는 것만으로도 이미 좋은 습관을 만들어가고 계신 거예요.`,
    ],
};

const MOMO_RESPONSES: Record<string, string[]> = {
    todo_completed: [
        `"{text}" 완료! 정말 대단해요! 🎉

솔직히 말할게요. 할 일을 미루지 않고 하나씩 끝내는 건 생각보다 어려운 일이에요. 그런데 방금 해내셨잖아요. 그 자체로 정말 멋진 거예요.

오늘 이미 {completed}개나 완료하셨네요. 숫자가 중요한 게 아니라, 하나하나에 들인 노력과 시간이 중요한 거예요. 아직 {pending}개 남았다고 부담 가지지 마세요. 지금처럼 하나씩 하면 돼요. 저는 당신이 해낼 수 있다는 걸 알아요. 화이팅! 💪`,
    ],

    todo_added: [
        `새 할 일이 생겼군요! "{text}" 응원할게요! ✨

새로운 할 일을 추가했다는 건, 뭔가를 더 잘하고 싶다는 마음이 있다는 거잖아요. 그 마음 자체가 정말 좋아요. 

물론 할 일이 많아지면 부담스러울 때도 있죠. 그럴 때는 잠깐 쉬어도 괜찮아요. 중요한 건 포기하지 않는 거예요. 천천히, 하나씩. 저는 항상 당신 편이에요! 💝`,
    ],

    event_added: [
        `새 일정이 잡혔네요! "{title}" 기대되는 일이길 바라요! 🌟

일정이 생기면 설레기도 하고, 때로는 긴장되기도 하잖아요. 어떤 감정이든 괜찮아요. 당신은 충분히 잘 해낼 거예요.

만약 조금 걱정되는 일정이라면, 미리 준비하면서 마음을 다잡아보세요. 그리고 즐거운 일정이라면, 충분히 즐기세요! 일상에 좋은 일정들이 채워지는 건 정말 좋은 일이에요. 응원해요! 💫`,
    ],

    journal_added: [
        `오늘 하루를 기록해주셨네요. 고생 많으셨어요 💝

"{mood}" 기분이었군요. 좋은 날이든 힘든 날이든, 그 하루를 살아낸 것만으로 당신은 충분히 잘하고 있는 거예요.

일기를 쓴다는 건 하루를 정리하고, 자신과 대화한다는 의미잖아요. 그렇게 자신을 돌보는 습관을 갖고 계신 것, 정말 대단해요. 내일은 오늘보다 더 좋은 하루가 되길 바랄게요. 항상 응원해요! ✨`,
    ],
};

const SAGE_RESPONSES: Record<string, string[]> = {
    todo_completed: [
        `좋아요, "{text}" 완료! 다음 스텝을 생각해볼까요?

완료율 {completionRate}%는 좋은 흐름이에요. 이 기세를 이어가면 오늘 하루를 생산적으로 마무리할 수 있을 거예요.

제 제안은 이래요. 남은 할 일 중에서 "{nextTodo}"를 다음 타겟으로 삼아보세요. 지금 집중력이 좋을 때 조금 어려운 일을 처리하면 나중에 마음이 편해져요. 

그리고 한 가지 팁: 다음 할 일을 시작하기 전에 2분만 스트레칭하세요. 짧은 휴식이 오히려 집중력을 높여줄 거예요.`,
    ],

    todo_added: [
        `"{text}" 할 일이 추가됐네요. 이걸 어떻게 처리할지 전략을 세워볼까요?

먼저, 이 일의 마감은 언제인가요? 구체적인 데드라인을 정하면 우선순위를 잡기 쉬워져요. "언젠가 해야지"는 보통 "안 하게 됨"으로 끝나거든요.

제 제안: 이 할 일을 작은 단계로 쪼개보세요. 예를 들어 첫 10분 안에 할 수 있는 가장 작은 액션이 뭔지 생각해보세요. 시작이 반이에요. 일단 시작하면 나머지는 따라오게 되어 있어요.`,
    ],

    event_added: [
        `"{title}" 일정이 추가됐네요. 이 일정을 위해 미리 준비할 게 있을까요?

제가 권하는 건 "역산 계획"이에요. 일정 당일에 어떤 상태로 도착하고 싶은지 상상해보세요. 그 상태가 되려면 전날 뭘 해야 하는지, 그 전날은 뭘 해야 하는지... 이렇게 거꾸로 생각하면 준비 사항이 명확해져요.

필요하다면 이 일정과 연결된 체크리스트를 할 일로 추가해두세요. 작은 준비들이 모여서 좋은 결과를 만들어요.`,
    ],

    journal_added: [
        `오늘의 감정 기록을 남기셨네요. "{mood}" 하루였군요.

감정 기록은 단순한 일기 그 이상이에요. 패턴을 발견하는 첫 걸음이거든요. 

제 제안은 이래요: 오늘의 감정이 왜 그랬는지 한 문장으로 정리해보세요. 예를 들어 "오늘 피곤했던 건 어젯밤 늦게 잤기 때문"처럼요. 원인을 알면 다음에 개선할 수 있어요.

그리고 내일 아침, 오늘의 기록을 다시 한번 읽어보세요. 새로운 관점이 보일 수도 있어요.`,
    ],
};

const CHAIN_RESPONSES: Record<string, Record<string, string[]>> = {
    ARIA: {
        after_celebration: [
            `{prevName}의 따뜻한 축하에 제가 데이터를 조금 더해볼게요.

오늘 완료율 {completionRate}%는 이번 주 평균과 비교했을 때 꽤 좋은 수치예요. 특히 오늘처럼 오후에 집중해서 처리하신 날은 만족도도 높은 편이더라고요.

{prevName} 말처럼, 하나씩 해내고 계신 거예요. 숫자가 그걸 증명해주고 있어요. 남은 {pending}개도 지금 페이스라면 충분히 처리 가능해 보여요.`,
        ],
        after_advice: [
            `{prevName}의 조언에 수치를 보태자면요.

현재 {total}개의 할 일 중 {pending}개가 남았어요. 완료율 관점에서 보면 {completionRate}%인데, 이 수치가 70%를 넘으면 성취감을 느끼기 좋은 구간이에요.

{prevName}이 말한 것처럼 다음 액션을 정하는 게 중요해요. 데이터상으로는 "{nextTodo}"를 처리하시면 오늘 목표 달성에 가까워질 거예요.`,
        ],
    },

    MOMO: {
        after_analysis: [
            `{prevName}의 분석 잘 들었어요! 숫자도 중요하지만, 저는 마음이 더 중요하다고 생각해요 💝

{prevName}이 말한 {completionRate}% 완료율도 좋지만, 그 숫자 뒤에 있는 노력을 저는 알아요. 하나하나 체크할 때마다 얼마나 뿌듯했을지, 때로는 귀찮았을 수도 있지만 그래도 해낸 거잖아요.

수치에 너무 스트레스 받지 마세요. 오늘 여기까지 온 것만으로 충분히 잘하고 있는 거예요. 저는 항상 당신 편이에요! ✨`,
        ],
        after_advice: [
            `{prevName}의 실용적인 조언 좋네요! 거기에 제 마음을 더할게요 💛

전략도 중요하지만, 가끔은 그냥 "오늘 고생했다" 하고 자신을 토닥여주는 것도 필요해요. {prevName} 말처럼 다음 액션을 정하는 것도 좋지만, 지금 이 순간 스스로를 칭찬하는 시간도 가져보세요.

할 일이 남아있어도 괜찮아요. 내일의 당신이 또 해낼 거니까요. 오늘 하루도 정말 수고 많으셨어요! 💪`,
        ],
    },

    SAGE: {
        after_celebration: [
            `{prevName}의 응원 좋았어요! 이제 구체적인 다음 스텝을 이야기해볼까요?

따뜻한 격려도 좋지만, 실제로 움직여야 결과가 나오잖아요. {prevName} 말처럼 잘하고 계신 거 맞아요. 그리고 그 흐름을 이어가려면 다음 행동이 필요해요.

제 제안: 남은 할 일 중 "{nextTodo}"를 15분 안에 시작해보세요. 완벽하게 끝내지 않아도 돼요. 일단 시작만 하면 탄력이 붙어요. 지금의 좋은 기분을 액션으로 연결해보세요!`,
        ],
        after_analysis: [
            `{prevName}의 데이터 분석 고마워요! 그 수치를 바탕으로 액션 플랜을 세워볼게요.

{prevName}이 분석한 완료율 {completionRate}%를 80%까지 끌어올리려면, 딱 1-2개만 더 처리하면 돼요. 생각보다 가까운 목표죠?

구체적으로, "{nextTodo}"를 다음 30분 안에 시작하는 걸 목표로 해보세요. 그리고 완료하면 5분 휴식. 이 사이클을 반복하면 오늘 하루를 깔끔하게 마무리할 수 있을 거예요.`,
        ],
    },
};

// =============================================================================
// CONVERSATION CHAINS: 3명으로 축소, 더 긴 텀
// =============================================================================

const CONVERSATION_CHAINS: Record<string, {
    agents: AIAgent['id'][];
    chainTypes: string[];
}> = {
    todo_completed: {
        agents: ['MOMO', 'ARIA', 'SAGE'],
        chainTypes: ['first', 'after_celebration', 'after_analysis'],
    },
    todo_added: {
        agents: ['SAGE', 'MOMO'],
        chainTypes: ['first', 'after_advice'],
    },
    event_added: {
        agents: ['ARIA', 'SAGE'],
        chainTypes: ['first', 'after_analysis'],
    },
    journal_added_good: {
        agents: ['MOMO', 'ARIA'],
        chainTypes: ['first', 'after_celebration'],
    },
    journal_added_bad: {
        agents: ['MOMO', 'SAGE'],
        chainTypes: ['first', 'after_celebration'],
    },
    journal_added_neutral: {
        agents: ['ARIA', 'SAGE'],
        chainTypes: ['first', 'after_analysis'],
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
        case 'MOMO':
            return getRandomItem(MOMO_RESPONSES[trigger] || []);
        case 'SAGE':
            return getRandomItem(SAGE_RESPONSES[trigger] || []);
        default:
            return undefined;
    }
};

const getChainResponse = (agentId: string, chainType: string): string | undefined => {
    return getRandomItem(CHAIN_RESPONSES[agentId]?.[chainType] || []);
};

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
                    // Chain response
                    const chainType = chainTypes[index];
                    const template = getChainResponse(agentId, chainType);
                    if (template) {
                        content = fillTemplate(template, {
                            ...data,
                            prevName: previousAgentName,
                        });
                    }
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
    agents: AIAgent[],
    addComment: (comment: { authorId: string; authorName: string; authorEmoji: string; content: string }) => void,
    apiKey?: string,
    updateUsage?: (stats: ApiUsageStats) => void
): Promise<void> => {
    // Select a random agent or specific logic - For journal, let's pick the first one or random
    const agent = getRandomItem(agents) || DEFAULT_AGENTS[0];

    // 1. Try Gemini
    if (apiKey) {
        try {
            const prompt = createAgentPrompt(
                {
                    name: agent.name,
                    role: agent.role,
                    personality: agent.personality,
                    tone: agent.tone
                },
                `사용자가 일기(메모)를 작성했습니다. 이에 대해 공감하거나 조언하는 짧은 댓글을 남겨주세요. 길이는 2~3문장으로.`,
                JSON.stringify(entry)
            );

            const content = await callGeminiAPI(apiKey, prompt, updateUsage);
            if (content) {
                addComment({
                    authorId: agent.id,
                    authorName: agent.name,
                    authorEmoji: agent.emoji,
                    content
                });
                return;
            }
        } catch (err) {
            console.error("Gemini API Error in Journal Comment:", err);
            // Fallback to template on error will happen below
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
                authorEmoji: agent.emoji,
                content
            });
        }, 1500);
    }
};

export { DEFAULT_AGENTS };
