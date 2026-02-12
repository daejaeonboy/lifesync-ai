import React, { useState, useRef, useEffect } from 'react';
import { CalendarEvent, Todo, JournalEntry, AiPost, TodoList, AppSettings, AIAgent, ChatMessage, ChatMode } from '../types';
import { generateLifeInsight, generateChatResponse, detectChatAction, analyzePersonaUpdate, ChatActionResult } from '../services/geminiService';
import { Sparkles, ChevronRight, Plus } from '../components/Icons';
import { format, parseISO, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { getActiveGeminiConfig } from '../utils/aiConfig';

interface ChatViewProps {
    events: CalendarEvent[];
    todos: Todo[];
    entries: JournalEntry[];
    posts: AiPost[];
    todoLists: TodoList[];
    onAddEvent: (event: CalendarEvent) => void;
    onDeleteEvent: (id: string) => void;
    onAddTodo: (text: string, listId?: string, dueDate?: string, category?: Todo['category']) => void;
    onAddEntry: (title: string, content: string, category?: string, mood?: JournalEntry['mood']) => void;
    onAddPost: (post: AiPost) => void;
    requireConfirm?: boolean;
    settings: AppSettings;
    onUpdateSettings?: (settings: AppSettings) => void;
    agent?: AIAgent;
    agents?: AIAgent[];
    onSelectAgent?: (id: string) => void;
    onUpdateAgent?: (agentId: string, updates: Partial<AIAgent>) => void;
    onUserMessage?: (text: string) => void;
    initialMessages?: ChatMessage[];
    onUpdateMessages?: (sessionId: string, messages: ChatMessage[]) => void;
    currentSessionId?: string | null;
}

// Helper: Get time-based greeting
const getTimeBasedGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 6) return '새벽에도 깨어계시네요!';
    if (hour < 12) return '좋은 아침이에요! ☀️';
    if (hour < 14) return '점심시간이네요! 🍚';
    if (hour < 18) return '좋은 오후예요! 🌤️';
    if (hour < 22) return '오늘 하루 어떠셨나요? 🌙';
    return '늦은 밤이네요. 오늘도 수고하셨어요 🌃';
};

// Helper: Get today's summary
const getTodaySummary = (events: CalendarEvent[], todos: Todo[]): string => {
    const pendingTodos = todos.filter(t => !t.completed).length;
    const today = new Date();
    const todayEvents = events.filter(e => {
        if (!e.date) return false;
        try {
            return isSameDay(parseISO(e.date), today);
        } catch {
            return false;
        }
    }).length;

    if (todayEvents === 0 && pendingTodos === 0) {
        return '오늘은 예정된 일정이나 할 일이 없어요. 여유로운 하루를 보내세요!';
    }

    let summary = '';
    if (todayEvents > 0) summary += `오늘 **${todayEvents}개의 일정**이 있고, `;
    if (pendingTodos > 0) summary += `**${pendingTodos}개의 할 일**이 남아있어요.`;
    return summary.replace(/, $/, '.');
};

const ChatView: React.FC<ChatViewProps> = ({
    events,
    todos,
    entries,
    posts,
    todoLists,
    onAddEvent,
    onDeleteEvent,
    onAddTodo,
    onAddEntry,
    onAddPost,
    requireConfirm = true,
    settings,
    onUpdateSettings,
    agent,
    agents = [],
    onSelectAgent,
    onUpdateAgent,
    onUserMessage,
    initialMessages,
    onUpdateMessages,
    currentSessionId,
}) => {
    const activeGeminiConfig = getActiveGeminiConfig(settings);

    // Check if this is first visit (onboarding flow)
    const [userName, setUserName] = useState<string>(() => localStorage.getItem('ls_userName') || '');
    const [onboardingStep, setOnboardingStep] = useState<number>(() => userName ? -1 : 0);

    const getWelcomeMessage = (): ChatMessage => {
        if (onboardingStep === 0 && !userName) {
            // First time user - start onboarding
            return {
                id: 'onboarding-1',
                role: 'assistant',
                content: `${getTimeBasedGreeting()}\n\n처음 오셨네요! 저는 ${agent?.name || 'LifeSync AI'}예요. ${agent?.emoji || '💬'}\n당신의 일상을 함께 정리하고 더 나은 하루를 만들어 드릴게요.\n\n먼저, 뭐라고 불러드리면 될까요?`,
                timestamp: new Date().toISOString(),
                action: { type: 'onboarding' },
            };
        }

        // Returning user - personalized greeting
        return {
            id: 'welcome',
            role: 'assistant',
            content: `주인님, ${getTimeBasedGreeting()}\n\n${getTodaySummary(events, todos)}\n\n무엇을 도와드릴까요?`,
            timestamp: new Date().toISOString(),
            quickReplies: ['오늘 일정 알려줘', '할 일 추가', '오늘 기분 기록', '주간 분석해줘'],
        };
    };

    const [messages, setMessages] = useState<ChatMessage[]>(() => {
        if (initialMessages && initialMessages.length > 0) return initialMessages;
        return [getWelcomeMessage()];
    });
    const [inputValue, setInputValue] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [chatMode, setChatMode] = useState<ChatMode>('basic');
    const [showToolbar, setShowToolbar] = useState(false);
    const [conversationContext, setConversationContext] = useState<string[]>([]); // For context awareness
    const [pendingAction, setPendingAction] = useState<ChatMessage['action'] | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const availableAgents = agents.length > 0 ? agents : (agent ? [agent] : []);
    const chatModeLabels: Record<ChatMode, string> = {
        basic: '기본',
        roleplay: '롤플레잉',
        learning: '학습',
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Update messages when switching sessions
    useEffect(() => {
        if (currentSessionId) {
            if (initialMessages && initialMessages.length > 0) {
                setMessages(initialMessages);
            } else {
                // New empty session should start from a fresh welcome message.
                setMessages([getWelcomeMessage()]);
            }
        } else {
            // No session - reset to welcome
            setMessages([getWelcomeMessage()]);
        }
    }, [currentSessionId]);

    // Notify parent of message updates
    useEffect(() => {
        if (currentSessionId && onUpdateMessages && messages.length > 1) {
            onUpdateMessages(currentSessionId, messages);
        }
    }, [messages, currentSessionId]);

    // Save username to localStorage
    useEffect(() => {
        if (userName) {
            localStorage.setItem('ls_userName', userName);
        }
    }, [userName]);

    const parseOnboardingIntent = (text: string): ChatMessage['action'] | null => {
        if (onboardingStep === 0 && !userName) {
            const cleaned = text
                .trim()
                .replace(/^(hi|hello|hey|안녕|안녕하세요)\s*/i, '')
                .trim();
            return { type: 'onboarding', data: { step: 1, name: (cleaned || text.trim()).slice(0, 20) } };
        }
        if (onboardingStep === 1) {
            return { type: 'onboarding', data: { step: 2, preference: text } };
        }

        return null;
    };

    const mapGeminiActionToChatAction = (action: ChatActionResult['action'] | null | undefined): ChatMessage['action'] | null => {
        if (!action || action.type === 'none') return null;

        const normalizeText = (value?: string) => (value || '').toLowerCase().replace(/\s+/g, '').trim();
        const resolveDeleteTarget = (payload: ChatActionResult['action']['deleteEvent']) => {
            if (!payload) return null;

            if (payload.id) {
                const targetById = events.find(event => event.id === payload.id);
                if (targetById) return targetById;
            }

            let candidates = [...events];
            if (payload.date) {
                candidates = candidates.filter(event => event.date === payload.date);
            }
            if (payload.startTime) {
                candidates = candidates.filter(event => event.startTime === payload.startTime);
            }
            if (payload.title) {
                const targetTitle = normalizeText(payload.title);
                candidates = candidates.filter(event => {
                    const eventTitle = normalizeText(event.title);
                    return eventTitle.includes(targetTitle) || targetTitle.includes(eventTitle);
                });
            }

            if (candidates.length === 0) return null;
            if (candidates.length === 1) return candidates[0];

            const sorted = candidates.sort((a, b) => {
                const aTs = new Date(`${a.date}T${a.startTime || '00:00'}:00`).getTime();
                const bTs = new Date(`${b.date}T${b.startTime || '00:00'}:00`).getTime();
                return aTs - bTs;
            });
            return sorted[0];
        };

        if (action.type === 'add_event' && action.event) {
            return {
                type: 'add_event',
                data: {
                    id: crypto.randomUUID(),
                    title: action.event.title,
                    date: action.event.date,
                    startTime: action.event.startTime,
                    endTime: action.event.endTime,
                    type: action.event.type || 'tag_1',
                } as CalendarEvent,
            };
        }

        if (action.type === 'add_todo' && action.todo) {
            const allowedCategories: Todo['category'][] = ['personal', 'work', 'health', 'shopping'];
            const category = allowedCategories.includes(action.todo.category as Todo['category'])
                ? (action.todo.category as Todo['category'])
                : 'personal';

            return {
                type: 'add_todo',
                data: {
                    text: action.todo.text,
                    dueDate: action.todo.dueDate,
                    category,
                },
            };
        }

        if (action.type === 'add_journal' && action.journal) {
            const mood = (['good', 'neutral', 'bad'] as const).includes(action.journal.mood as JournalEntry['mood'])
                ? (action.journal.mood as JournalEntry['mood'])
                : 'neutral';

            return {
                type: 'add_journal',
                data: {
                    title: action.journal.title,
                    content: action.journal.content,
                    category: '메모장',
                    mood,
                },
            };
        }

        if (action.type === 'generate_insight') {
            return { type: 'generate_insight' };
        }

        if (action.type === 'delete_event' && action.deleteEvent) {
            const target = resolveDeleteTarget(action.deleteEvent);
            if (!target) return null;

            return {
                type: 'delete_event',
                data: {
                    id: target.id,
                    title: target.title,
                    date: target.date,
                    startTime: target.startTime,
                },
            };
        }

        return null;
    };

    const requestBackgroundPersonaUpdate = (history: { role: 'user' | 'assistant'; content: string }[]) => {
        if (!activeGeminiConfig?.apiKey || !agent || !onUpdateAgent) return;

        analyzePersonaUpdate(
            activeGeminiConfig.apiKey,
            history,
            agent,
            activeGeminiConfig.modelName
        )
            .then((updates) => {
                if (updates) {
                    onUpdateAgent(agent.id, updates);
                }
            })
            .catch((error) => {
                console.error('Background persona update failed:', error);
            });
    };

    const executeAction = async (action: ChatMessage['action']) => {
        if (!action) return;

        switch (action.type) {
            case 'onboarding':
                if (action.data?.step === 1) {
                    setUserName(action.data.name);
                    setOnboardingStep(1);
                } else if (action.data?.step === 2) {
                    setOnboardingStep(-1); // Onboarding complete
                }
                break;
            case 'add_event':
                onAddEvent(action.data);
                break;
            case 'delete_event':
                if (action.data?.id) {
                    onDeleteEvent(action.data.id);
                }
                break;
            case 'add_todo':
                {
                    const todoData = typeof action.data === 'string'
                        ? { text: action.data, category: 'personal' }
                        : action.data;
                    onAddTodo(todoData.text, todoData.listId, todoData.dueDate, todoData.category);
                }
                break;
            case 'add_journal':
                onAddEntry(
                    action.data?.title || '채팅 메모',
                    action.data?.content || '',
                    action.data?.category || '메모장',
                    action.data?.mood || 'neutral'
                );
                break;
            case 'generate_insight':
                try {
                    if (!activeGeminiConfig?.apiKey) {
                        throw new Error('API Key가 필요해요.');
                    }
                    const newPost = await generateLifeInsight(
                        activeGeminiConfig.apiKey,
                        events,
                        todos,
                        entries,
                        activeGeminiConfig.modelName
                    );
                    onAddPost(newPost);

                    // Update Usage Stats (Approximate token count based on input/output length)
                    if (onUpdateSettings) {
                        const estimatedTokens = (JSON.stringify({ events, todos, entries }).length / 4) + (newPost.content.length / 4);
                        onUpdateSettings({
                            ...settings,
                            apiUsage: {
                                totalRequests: (settings.apiUsage?.totalRequests || 0) + 1,
                                totalTokens: (settings.apiUsage?.totalTokens || 0) + Math.ceil(estimatedTokens),
                                lastRequestDate: new Date().toISOString(),
                            }
                        });
                    }
                } catch (error) {
                    // console.error(error); // Error handling is done in getResponseForAction via executed flag or message content
                    // But here we need to inform the user if it failed.
                    // For now, let the error propagate to the response handler or handle it here by adding a system message
                    const errorMessage: ChatMessage = {
                        id: crypto.randomUUID(),
                        role: 'assistant',
                        content: activeGeminiConfig?.apiKey ? 'AI 분석 중 오류가 발생했어요. 잠시 후 다시 시도해주세요. 😢' : 'AI 분석을 하려면 먼저 **설정 > API 연결 설정**에서 Gemini API와 모델을 선택해주세요! 🔑',
                        timestamp: new Date().toISOString(),
                        quickReplies: ['설정하러 갈래', '괜찮아']
                    };
                    setMessages(prev => [...prev, errorMessage]);
                    return; // Stop further processing
                }
                break;
        }
    };

    const getResponseForAction = (action: ChatMessage['action'] | null, userText: string): { content: string; quickReplies?: string[] } => {
        // Onboarding responses
        if (action?.type === 'onboarding') {
            if (action.data?.step === 1) {
                return {
                    content: `주인님, 반가워요! 🎉\n\n저와 어떤 이야기를 나누고 싶으세요?\n\n편하게 선택해주시거나, 자유롭게 말씀해주세요!`,
                    quickReplies: ['일정 관리가 필요해', '할 일을 정리하고 싶어', '오늘 기분을 기록하고 싶어', '그냥 이야기하고 싶어'],
                };
            }
            if (action.data?.step === 2) {
                return {
                    content: `좋아요! 이제 준비가 됐어요. ✨\n\n주인님의 하루를 더 나은 방향으로 이끌어 드릴게요.\n\n그럼 바로 시작해볼까요? 무엇이든 편하게 말씀해주세요!`,
                    quickReplies: ['오늘 일정 알려줘', '할 일 추가', '오늘 기분 기록'],
                };
            }
        }

        if (!action) {
            // Context-aware fallback - check recent conversation
            const recentContext = conversationContext.slice(-3).join(' ');

            // Check if user is just chatting
            if (userText.length < 10 && !userText.includes('?')) {
                return {
                    content: `네, 주인님! 더 말씀해주세요. 듣고 있어요. 😊`,
                    quickReplies: ['일정 추가하고 싶어', '할 일 정리해줘', '오늘 하루 어땠는지 기록할래'],
                };
            }

            return {
                content: `음, 요청을 정확히 이해하지 못했어요. 😅\n\n혹시 이런 걸 원하셨나요?`,
                quickReplies: ['일정 추가', '할 일 추가', '오늘 기분 기록', '분석해줘'],
            };
        }

        switch (action.type) {
            case 'add_event':
                return {
                    content: `✅ 캘린더에 일정을 등록했어요!\n\n📅 **${action.data.title}**\n📆 ${format(parseISO(action.data.date), 'M월 d일 (EEEE)', { locale: ko })}${action.data.startTime ? `\n⏰ ${action.data.startTime}` : ''}\n\n캘린더에서 확인해보세요!`,
                    quickReplies: ['다른 일정 추가', '오늘 할 일 보여줘', '고마워'],
                };
            case 'add_todo':
                return {
                    content: `✅ 할 일 목록에 추가했어요!\n\n☑️ **${action.data.text ?? action.data}**\n🏷️ ${getListLabel(action.data.listId)}\n\n완료하면 체크해주세요! 화이팅! 💪`,
                    quickReplies: ['다른 할 일 추가', '지금 할 일 뭐야?', '고마워'],
                };
            case 'delete_event':
                return {
                    content: `🗑️ 일정을 삭제했어요.\n\n📅 **${action.data.title || '선택한 일정'}**${action.data.date ? `\n📆 ${format(parseISO(action.data.date), 'M월 d일 (EEEE)', { locale: ko })}` : ''}${action.data.startTime ? `\n⏰ ${action.data.startTime}` : ''}`,
                    quickReplies: ['다른 일정도 삭제', '오늘 일정 알려줘', '고마워'],
                };
            case 'add_journal': {
                const moodEmoji = action.data.mood === 'good' ? '😊' : action.data.mood === 'bad' ? '😔' : '😐';

                // Emotional Dialogue Flow - Enhanced empathetic response
                if (action.data.mood === 'bad') {
                    return {
                        content: `${moodEmoji} 그랬군요... 정말 힘드셨겠어요.\n\n일기장에 오늘의 이야기를 기록해뒀어요.\n\n혹시 조금 더 이야기하고 싶으시면, 무슨 일이 있었는지 말씀해주세요. 함께 정리해볼게요. 🌿`,
                        quickReplies: ['조금 더 이야기하고 싶어', '괜찮아, 그냥 기록만', '오늘은 일찍 쉴래'],
                    };
                } else if (action.data.mood === 'good') {
                    return {
                        content: `${moodEmoji} 오, 좋은 하루였나봐요! 저도 기분이 좋아지네요.\n\n일기장에 오늘의 기분을 기록해뒀어요.\n\n무슨 좋은 일이 있었는지 더 들려주실래요?`,
                        quickReplies: ['응, 좋은 일 있었어!', '그냥 기분이 좋아', '내일도 이랬으면'],
                    };
                }
                return {
                    content: `${moodEmoji} 오늘의 이야기를 일기장에 기록했어요.\n\n내일은 더 좋은 하루가 되길 바래요!`,
                    quickReplies: ['고마워', '내일 할 일 알려줘', '이제 쉴래'],
                };
            }
            case 'generate_insight':
                return {
                    content: `✅ AI 인사이트를 생성했어요!\n\n**AI 보드** 탭에서 주인님의 라이프 분석 리포트를 확인해보세요. 📊\n\n더 많은 데이터가 쌓일수록 더 정확한 분석이 가능해요!`,
                    quickReplies: ['분석 더 해줘', '오늘 할 일 뭐야?', '고마워'],
                };
            default:
                return { content: '처리 완료!' };
        }
    };

    const getMoodLabel = (mood: JournalEntry['mood']) => {
        if (mood === 'good') return '좋음';
        if (mood === 'bad') return '안좋음';
        return '보통';
    };

    const getListLabel = (listId?: string) => {
        if (!listId) return '기본 목록';
        return todoLists.find(l => l.id === listId)?.title ?? '기본 목록';
    };

    const requiresConfirmation = (action: ChatMessage['action'] | null) => {
        if (!requireConfirm) return false;
        return action?.type === 'delete_event' || action?.type === 'add_todo' || action?.type === 'add_journal';
    };

    const buildConfirmationPrompt = (action: ChatMessage['action']): { content: string; quickReplies: string[] } => {
        let summary = '';
        if (action.type === 'add_event') {
            const eventDate = format(parseISO(action.data.date), 'M월 d일 (EEEE)', { locale: ko });
            summary = `📅 일정: **${action.data.title}**\n📆 ${eventDate}${action.data.startTime ? `\n⏰ ${action.data.startTime}` : ''}`;
        } else if (action.type === 'delete_event') {
            summary = `🗑️ 삭제 일정: **${action.data.title || '선택한 일정'}**${action.data.date ? `\n📆 ${format(parseISO(action.data.date), 'M월 d일 (EEEE)', { locale: ko })}` : ''}${action.data.startTime ? `\n⏰ ${action.data.startTime}` : ''}`;
        } else if (action.type === 'add_todo') {
            const text = action.data.text ?? action.data;
            summary = `☑️ 할 일: **${text}**\n🏷️ 목록: ${getListLabel(action.data.listId)}`;
        } else if (action.type === 'add_journal') {
            const snippet = (action.data.content || '').slice(0, 60);
            summary = `📝 일기: "${snippet}${action.data.content?.length > 60 ? '…' : ''}"\n🙂 기분: ${getMoodLabel(action.data.mood)}`;
        }

        return {
            content: `요청을 이렇게 이해했어요.\n\n${summary}\n\n이대로 실행할까요?`,
            quickReplies: ['실행', '취소'],
        };
    };

    const handleSend = async (text?: string) => {
        const messageText = text || inputValue;
        if (!messageText.trim() || isProcessing) return;

        const trimmedMessage = messageText.trim();
        const normalizedMessage = trimmedMessage.toLowerCase().replace(/[.!?]/g, '');
        const confirmKeywords = ['실행', '확인', '네', '응', '좋아', '그래', 'ㅇㅋ', 'ok', '오케이'];
        const cancelKeywords = ['취소', '아니', '그만', '나중에', 'no'];
        const isConfirm = Boolean(pendingAction) && confirmKeywords.includes(normalizedMessage);
        const isCancel = Boolean(pendingAction) && cancelKeywords.includes(normalizedMessage);

        if (!isConfirm && !isCancel) {
            try {
                onUserMessage?.(trimmedMessage);
            } catch (error) {
                console.error('onUserMessage callback failed:', error);
            }
        }

        const userMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: messageText,
            timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputValue('');
        setIsProcessing(true);

        // Update conversation context for awareness
        setConversationContext(prev => [...prev.slice(-4), messageText]);
        const historyForPersona = [...messages, userMessage].map(m => ({ role: m.role, content: m.content }));
        if (trimmedMessage.length >= 8) {
            requestBackgroundPersonaUpdate(historyForPersona);
        }

        // Keep artificial delay minimal when API is available.
        const delayMs = activeGeminiConfig?.apiKey ? 80 : 350;
        await new Promise((resolve) => setTimeout(resolve, delayMs));

        if (pendingAction && (isConfirm || isCancel)) {
            if (isCancel) {
                setPendingAction(null);
                const assistantMessage: ChatMessage = {
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    content: '알겠어요. 요청은 취소했어요.',
                    timestamp: new Date().toISOString(),
                    quickReplies: ['다른 요청 하기', '오늘 일정 알려줘', '할 일 추가'],
                };
                setMessages((prev) => [...prev, assistantMessage]);
                setIsProcessing(false);
                return;
            }

            await executeAction(pendingAction);
            const confirmedResponse = getResponseForAction(pendingAction, messageText);
            const assistantMessage: ChatMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: confirmedResponse.content,
                timestamp: new Date().toISOString(),
                action: { ...pendingAction, executed: true },
                quickReplies: confirmedResponse.quickReplies,
            };
            setMessages((prev) => [...prev, assistantMessage]);
            setPendingAction(null);
            setIsProcessing(false);
            return;
        }

        if (pendingAction && !isConfirm && !isCancel) {
            const assistantMessage: ChatMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: '확인을 기다리고 있어요. `실행` 또는 `취소` 중 하나로 답해주세요.',
                timestamp: new Date().toISOString(),
                quickReplies: ['실행', '취소'],
            };
            setMessages((prev) => [...prev, assistantMessage]);
            setIsProcessing(false);
            return;
        }

        const onboardingAction = parseOnboardingIntent(messageText);
        if (onboardingAction) {
            await executeAction(onboardingAction);
            const response = getResponseForAction(onboardingAction, messageText);
            const assistantMessage: ChatMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: response.content,
                timestamp: new Date().toISOString(),
                action: { ...onboardingAction, executed: true },
                quickReplies: response.quickReplies,
            };
            setMessages((prev) => [...prev, assistantMessage]);
            setIsProcessing(false);
            return;
        }

        if (activeGeminiConfig?.apiKey) {
            try {
                const history = historyForPersona;
                const detectedAction = await detectChatAction(
                    activeGeminiConfig.apiKey,
                    history,
                    events,
                    userName,
                    activeGeminiConfig.modelName
                );
                const mappedAction = mapGeminiActionToChatAction(detectedAction);
                if (!mappedAction && detectedAction?.type === 'delete_event') {
                    const assistantMessage: ChatMessage = {
                        id: crypto.randomUUID(),
                        role: 'assistant',
                        content: '삭제할 일정을 찾지 못했어요. 일정 제목이나 날짜를 조금 더 구체적으로 말해 주세요.',
                        timestamp: new Date().toISOString(),
                        quickReplies: ['오늘 일정 보여줘', '내일 일정 보여줘'],
                    };
                    setMessages((prev) => [...prev, assistantMessage]);
                    setIsProcessing(false);
                    return;
                }

                if (mappedAction) {
                    if (requiresConfirmation(mappedAction)) {
                        setPendingAction(mappedAction);
                        const prompt = buildConfirmationPrompt(mappedAction);
                        const assistantMessage: ChatMessage = {
                            id: crypto.randomUUID(),
                            role: 'assistant',
                            content: prompt.content,
                            timestamp: new Date().toISOString(),
                            action: mappedAction,
                            quickReplies: prompt.quickReplies,
                        };
                        setMessages((prev) => [...prev, assistantMessage]);
                    } else {
                        await executeAction(mappedAction);
                        const response = getResponseForAction(mappedAction, messageText);
                        const assistantMessage: ChatMessage = {
                            id: crypto.randomUUID(),
                            role: 'assistant',
                            content: response.content,
                            timestamp: new Date().toISOString(),
                            action: { ...mappedAction, executed: true },
                            quickReplies: response.quickReplies,
                        };
                        setMessages((prev) => [...prev, assistantMessage]);
                    }
                    setIsProcessing(false);
                    return;
                }

                const result = await generateChatResponse(
                    activeGeminiConfig.apiKey,
                    history,
                    events,
                    todos,
                    entries,
                    userName,
                    activeGeminiConfig.modelName,
                    agent,
                    chatMode
                );

                const fallbackAction = mapGeminiActionToChatAction(result.action);
                if (!fallbackAction && result.action?.type === 'delete_event') {
                    const assistantMessage: ChatMessage = {
                        id: crypto.randomUUID(),
                        role: 'assistant',
                        content: '삭제할 일정을 찾지 못했어요. 일정 제목이나 날짜를 조금 더 구체적으로 말해 주세요.',
                        timestamp: new Date().toISOString(),
                        quickReplies: ['오늘 일정 보여줘', '내일 일정 보여줘'],
                    };
                    setMessages((prev) => [...prev, assistantMessage]);
                    setIsProcessing(false);
                    return;
                }
                if (fallbackAction) {
                    if (requiresConfirmation(fallbackAction)) {
                        setPendingAction(fallbackAction);
                        const prompt = buildConfirmationPrompt(fallbackAction);
                        const assistantMessage: ChatMessage = {
                            id: crypto.randomUUID(),
                            role: 'assistant',
                            content: prompt.content,
                            timestamp: new Date().toISOString(),
                            action: fallbackAction,
                            quickReplies: prompt.quickReplies,
                        };
                        setMessages((prev) => [...prev, assistantMessage]);
                    } else {
                        await executeAction(fallbackAction);
                        const response = getResponseForAction(fallbackAction, messageText);
                        const assistantMessage: ChatMessage = {
                            id: crypto.randomUUID(),
                            role: 'assistant',
                            content: response.content,
                            timestamp: new Date().toISOString(),
                            action: { ...fallbackAction, executed: true },
                            quickReplies: response.quickReplies,
                        };
                        setMessages((prev) => [...prev, assistantMessage]);
                    }
                } else {
                    const assistantMessage: ChatMessage = {
                        id: crypto.randomUUID(),
                        role: 'assistant',
                        content: result.reply,
                        timestamp: new Date().toISOString(),
                    };
                    setMessages((prev) => [...prev, assistantMessage]);
                }
            } catch (error) {
                console.error(error);
                const assistantMessage: ChatMessage = {
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    content: "죄송해요, 대화 중 오류가 발생했어요. 다시 말씀해 주시겠어요?",
                    timestamp: new Date().toISOString(),
                };
                setMessages((prev) => [...prev, assistantMessage]);
            }
        } else {
            const response = getResponseForAction(null, messageText);
            const assistantMessage: ChatMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: response.content,
                timestamp: new Date().toISOString(),
                quickReplies: response.quickReplies,
            };
            setMessages((prev) => [...prev, assistantMessage]);
        }

        setIsProcessing(false);
    };

    const handleQuickReply = (reply: string) => {
        handleSend(reply);
    };

    return (
        <div className="max-w-[800px] mx-auto text-[#37352f] h-full flex flex-col font-sans">
            <div className="flex-1 overflow-y-auto px-2 py-6 space-y-6 scrollbar-hide">
                {messages.map((msg, index) => (
                    <div key={msg.id} className={`flex w-full mb-6 ${msg.role === 'user' ? 'justify-end' : 'justify-start items-start gap-3'}`}>
                        {msg.role === 'assistant' && (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-sm flex-shrink-0 overflow-hidden mt-1">
                                {agent?.avatar ? (
                                    <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-sm">{agent?.emoji || <Sparkles size={14} />}</span>
                                )}
                            </div>
                        )}

                        <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            {msg.role === 'assistant' && (
                                <span className="text-xs text-[#9b9a97] mb-1.5 ml-1">{agent?.name || 'LifeSync AI'}</span>
                            )}

                            <div
                                className={`
                                    p-3.5 rounded-2xl whitespace-pre-line leading-relaxed shadow-sm text-[15px]
                                    ${msg.role === 'user'
                                        ? 'bg-[#37352f] text-white rounded-br-sm'
                                        : 'bg-white border border-[#e9e9e8] text-[#37352f] rounded-bl-sm'}
                                `}
                            >
                                {msg.content.split('**').map((part, i) =>
                                    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                                )}
                            </div>

                            {/* Quick Replies - Only for the first message */}
                            {msg.role === 'assistant' && index === 0 && msg.quickReplies && msg.quickReplies.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3 ml-1">
                                    {msg.quickReplies.map((reply, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleQuickReply(reply)}
                                            className="px-3 py-1.5 text-xs font-medium bg-white border border-[#e9e9e8] text-[#787774] rounded-lg hover:bg-[#f7f7f5] hover:text-[#37352f] transition-all"
                                        >
                                            {reply}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {isProcessing && (
                    <div className="flex w-full mb-6 justify-start items-start gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-sm flex-shrink-0 overflow-hidden mt-1">
                            {agent?.avatar ? (
                                <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-sm">{agent?.emoji || <Sparkles size={14} />}</span>
                            )}
                        </div>
                        <div className="flex flex-col items-start">
                            <span className="text-xs text-[#9b9a97] mb-1.5 ml-1">{agent?.name || 'LifeSync AI'}</span>
                            <div className="bg-white text-[#9b9a97] p-4 rounded-2xl rounded-bl-sm border border-[#e9e9e8] flex items-center gap-2 shadow-sm">
                                <div className="flex gap-1">
                                    <span className="w-1.5 h-1.5 bg-[#d3d1cb] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                    <span className="w-1.5 h-1.5 bg-[#d3d1cb] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                    <span className="w-1.5 h-1.5 bg-[#d3d1cb] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white">
                <div className="space-y-3">
                    {showToolbar && (
                        <div className="p-3 rounded-xl border border-[#e9e9e8] bg-[#fbfbfa] space-y-3">
                            <div className="flex flex-wrap gap-2">
                                {availableAgents.map((availableAgent) => (
                                    <button
                                        key={availableAgent.id}
                                        type="button"
                                        onClick={() => {
                                            onSelectAgent?.(availableAgent.id);
                                            setShowToolbar(false);
                                        }}
                                        className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${agent?.id === availableAgent.id
                                            ? 'border-[#37352f] bg-[#37352f] text-white'
                                            : 'border-[#e9e9e8] bg-white text-[#787774] hover:bg-[#f7f7f5] hover:text-[#37352f]'}`}
                                    >
                                        {availableAgent.emoji} {availableAgent.name}
                                    </button>
                                ))}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {(['basic', 'roleplay', 'learning'] as ChatMode[]).map((mode) => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => setChatMode(mode)}
                                        className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${chatMode === mode
                                            ? 'border-[#37352f] bg-[#37352f] text-white'
                                            : 'border-[#e9e9e8] bg-white text-[#787774] hover:bg-[#f7f7f5] hover:text-[#37352f]'}`}
                                    >
                                        {chatModeLabels[mode]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="flex gap-3 items-stretch">
                        <button
                            type="button"
                            onClick={() => setShowToolbar(prev => !prev)}
                            className="shrink-0 w-12 h-12 rounded-xl border border-[#e9e9e8] bg-white flex items-center justify-center text-[#787774] hover:text-[#37352f] hover:bg-[#f7f7f5] transition-colors"
                            aria-label="대화 도구 열기"
                            title={`${agent?.name || 'LifeSync AI'} · ${chatModeLabels[chatMode]}`}
                        >
                            <Plus size={16} />
                        </button>
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder={onboardingStep === 0 ? "이름을 입력해주세요..." : "무엇이든 말씀해주세요..."}
                        className="flex-1 h-12 px-4 bg-[#f7f7f5] border border-[#e9e9e8] rounded-xl text-base placeholder-[#d3d1cb] focus:outline-none focus:border-[#37352f] focus:bg-white transition-all"
                        disabled={isProcessing}
                    />
                        <button
                            onClick={() => handleSend()}
                            disabled={!inputValue.trim() || isProcessing}
                            className="shrink-0 w-12 h-12 bg-[#37352f] text-white rounded-xl hover:bg-[#2f2d28] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatView;
