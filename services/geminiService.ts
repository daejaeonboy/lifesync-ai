import { GoogleGenAI, Type } from "@google/genai";
import { CalendarEvent, JournalEntry, Todo, AiPost, AIAgent, ChatMode } from "../types";

const RELAXED_SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HARASSMENT' as any, threshold: 'BLOCK_NONE' as any },
  { category: 'HARM_CATEGORY_HATE_SPEECH' as any, threshold: 'BLOCK_NONE' as any },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT' as any, threshold: 'BLOCK_NONE' as any },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT' as any, threshold: 'BLOCK_NONE' as any },
  { category: 'HARM_CATEGORY_CIVIC_INTEGRITY' as any, threshold: 'BLOCK_NONE' as any },
];

export const generateLifeInsight = async (
  apiKey: string,
  events: CalendarEvent[],
  todos: Todo[],
  journalEntries: JournalEntry[],
  modelName: string = 'gemini-1.5-flash'
): Promise<AiPost> => {
  if (!apiKey) {
    throw new Error("API Key가 설정되지 않았습니다. 설정 > AI 페르소나 설정에서 키를 입력해주세요.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const today = new Date().toISOString().split('T')[0];

  // Prepare data context
  const contextData = {
    currentDate: today,
    recentEvents: events.slice(0, 10),
    pendingTasks: todos.filter(t => !t.completed),
    completedTasks: todos.filter(t => t.completed).slice(0, 10),
    recentJournal: journalEntries.slice(0, 5)
  };

  const prompt = `
    당신은 사용자의 "LifeSync" AI 비서입니다. 
    사용자의 캘린더 일정, 투두 리스트(할 일), 일기장을 분석하여 
    사용자의 현재 삶에 대한 통찰력이 담긴 "게시판 글"을 작성해주세요.

    다음 데이터를 분석하세요:
    ${JSON.stringify(contextData, null, 2)}

    작성 가이드라인:
    1. 어조: 따뜻하고 격려하며, 때로는 분석적인 태도를 취하세요.
    2. 제목: 글의 내용을 잘 요약하는 매력적인 제목을 지으세요.
    3. 내용: 
       - 최근 성취(완료된 일)를 칭찬하세요.
       - 일기 내용을 바탕으로 감정 상태를 공감하거나 조언하세요.
       - 다가오는 일정이나 미완료 과제에 대한 부드러운 리마인드를 제공하세요.
       - 전체적인 "삶의 균형" 점수를 텍스트로 매겨주세요.
    4. 형식: 일반 산문으로 작성하되, **최대한 한 문단으로 작성하고 길어도 두 문단을 넘기지 마세요.**
       - 마크다운 문법(헤더, 볼드, 리스트, 코드블록)을 사용하지 마세요.
    5. 언어: 한국어(Korean)

    결과는 JSON 형식으로 반환해야 합니다.
  `;
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        safetySettings: RELAXED_SAFETY_SETTINGS,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["title", "content", "tags"]
        }
      }
    });

    const text = response.text || "";
    const result = JSON.parse(text);

    return {
      id: crypto.randomUUID(),
      title: result.title,
      content: result.content,
      tags: result.tags || ['Insight', 'Daily'],
      date: new Date().toISOString(),
      type: 'analysis'
    };
  } catch (error) {
    console.error("Gemini generation failed:", error);
    throw new Error("AI 분석 글을 생성하는 데 실패했습니다.");
  }

};

export interface ChatActionResult {
  reply: string;
  action: {
    type: 'add_event' | 'delete_event' | 'add_todo' | 'add_journal' | 'generate_insight' | 'none';
    event?: {
      title: string;
      date: string;
      startTime?: string;
      endTime?: string;
      type?: string;
    };
    deleteEvent?: {
      id?: string;
      title?: string;
      date?: string;
      startTime?: string;
    };
    todo?: {
      text: string;
      category?: string;
      dueDate?: string;
    };
    journal?: {
      title: string;
      content: string;
      mood?: string;
    };
  };
}

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const TODO_CATEGORIES = new Set(['personal', 'work', 'health', 'shopping']);
const JOURNAL_MOODS = new Set(['good', 'neutral', 'bad']);

const toDateOnly = (date: Date): string => date.toISOString().split('T')[0];

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const normalizeDateString = (rawValue: unknown, baseDate: Date): string | undefined => {
  if (typeof rawValue !== 'string') return undefined;
  const value = rawValue.trim();
  if (!value) return undefined;

  if (DATE_ONLY_PATTERN.test(value)) {
    const parsed = new Date(`${value}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) return value;
  }

  const lowered = value.toLowerCase();
  if (lowered === 'today' || value === '오늘') return toDateOnly(baseDate);
  if (lowered === 'tomorrow' || value === '내일') return toDateOnly(addDays(baseDate, 1));
  if (lowered === 'day after tomorrow' || value === '모레') return toDateOnly(addDays(baseDate, 2));
  if (lowered === 'next week' || value === '다음주' || value === '다음 주') return toDateOnly(addDays(baseDate, 7));

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return toDateOnly(parsed);
  return undefined;
};

const normalizeTimeString = (rawValue: unknown): string | undefined => {
  if (typeof rawValue !== 'string') return undefined;
  const value = rawValue.trim();
  if (!value) return undefined;

  if (TIME_PATTERN.test(value)) return value;

  const numericHourOnly = value.match(/^(\d{1,2})$/);
  if (numericHourOnly) {
    const hour = Number(numericHourOnly[1]);
    if (hour >= 0 && hour <= 23) return `${String(hour).padStart(2, '0')}:00`;
  }

  const koreanTime = value.match(/(오전|오후)?\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분?)?/);
  if (koreanTime) {
    let hour = Number(koreanTime[2]);
    const minute = Number(koreanTime[3] ?? '0');
    if (minute < 0 || minute > 59) return undefined;
    if (koreanTime[1] === '오후' && hour < 12) hour += 12;
    if (koreanTime[1] === '오전' && hour === 12) hour = 0;
    if (hour >= 0 && hour <= 23) return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  const amPmTime = value.match(/(am|pm)\s*(\d{1,2})(?::(\d{1,2}))?/i);
  if (amPmTime) {
    const marker = amPmTime[1].toLowerCase();
    let hour = Number(amPmTime[2]);
    const minute = Number(amPmTime[3] ?? '0');
    if (minute < 0 || minute > 59) return undefined;
    if (marker === 'pm' && hour < 12) hour += 12;
    if (marker === 'am' && hour === 12) hour = 0;
    if (hour >= 0 && hour <= 23) return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  return undefined;
};

const inferDateFromText = (text: string, baseDate: Date): string | undefined => {
  const normalized = text.toLowerCase();
  if (normalized.includes('내일') || normalized.includes('tomorrow')) return toDateOnly(addDays(baseDate, 1));
  if (normalized.includes('모레') || normalized.includes('day after tomorrow')) return toDateOnly(addDays(baseDate, 2));
  if (normalized.includes('다음주') || normalized.includes('다음 주') || normalized.includes('next week')) return toDateOnly(addDays(baseDate, 7));
  if (normalized.includes('오늘') || normalized.includes('today')) return toDateOnly(baseDate);

  const isoDate = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoDate) return normalizeDateString(isoDate[1], baseDate);
  return undefined;
};

const inferTimeFromText = (text: string): string | undefined => {
  const hhmm = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (hhmm) return `${hhmm[1].padStart(2, '0')}:${hhmm[2]}`;

  const koreanTime = text.match(/(오전|오후)?\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분?)?/);
  if (koreanTime) {
    return normalizeTimeString(`${koreanTime[1] ?? ''} ${koreanTime[2]}시 ${koreanTime[3] ? `${koreanTime[3]}분` : ''}`.trim());
  }

  return undefined;
};

const sanitizeAction = (
  rawAction: ChatActionResult['action'] | undefined,
  latestUserText: string,
  baseDate: Date
): ChatActionResult['action'] => {
  if (!rawAction || typeof rawAction.type !== 'string') return { type: 'none' };

  const actionType = rawAction.type;
  if (actionType === 'add_event') {
    const event = rawAction.event;
    const title = typeof event?.title === 'string' && event.title.trim()
      ? event.title.trim()
      : (latestUserText.trim().slice(0, 60) || 'New event');
    const date =
      normalizeDateString(event?.date, baseDate) ??
      inferDateFromText(latestUserText, baseDate) ??
      toDateOnly(baseDate);
    const startTime = normalizeTimeString(event?.startTime) ?? inferTimeFromText(latestUserText);
    const endTime = normalizeTimeString(event?.endTime);
    const type = typeof event?.type === 'string' && event.type.trim() ? event.type.trim() : 'tag_1';

    return {
      type: 'add_event',
      event: {
        title,
        date,
        startTime,
        endTime,
        type,
      },
    };
  }

  if (actionType === 'delete_event') {
    const target = rawAction.deleteEvent;
    const id = typeof target?.id === 'string' && target.id.trim() ? target.id.trim() : undefined;
    const title = typeof target?.title === 'string' && target.title.trim() ? target.title.trim() : undefined;
    const date = normalizeDateString(target?.date, baseDate) ?? inferDateFromText(latestUserText, baseDate);
    const startTime = normalizeTimeString(target?.startTime) ?? inferTimeFromText(latestUserText);

    if (!id && !title && !date) return { type: 'none' };
    return {
      type: 'delete_event',
      deleteEvent: {
        id,
        title,
        date,
        startTime,
      },
    };
  }

  if (actionType === 'add_todo') {
    const todo = rawAction.todo;
    if (!todo?.text || typeof todo.text !== 'string') return { type: 'none' };
    const category = TODO_CATEGORIES.has(todo.category || '') ? todo.category : 'personal';
    const dueDate = normalizeDateString(todo.dueDate, baseDate);
    return {
      type: 'add_todo',
      todo: {
        text: todo.text.trim(),
        category,
        dueDate,
      },
    };
  }

  if (actionType === 'add_journal') {
    const journal = rawAction.journal;
    if (!journal?.content || typeof journal.content !== 'string') return { type: 'none' };
    const title = typeof journal.title === 'string' && journal.title.trim()
      ? journal.title.trim()
      : journal.content.trim().slice(0, 24) || 'Chat memo';
    const mood = JOURNAL_MOODS.has(journal.mood || '') ? journal.mood : 'neutral';
    return {
      type: 'add_journal',
      journal: {
        title,
        content: journal.content.trim(),
        mood,
      },
    };
  }

  if (actionType === 'generate_insight') return { type: 'generate_insight' };
  return { type: 'none' };
};

export const detectChatAction = async (
  apiKey: string,
  messageHistory: { role: 'user' | 'assistant'; content: string }[],
  events: CalendarEvent[],
  userName: string,
  modelName: string = 'gemini-1.5-flash'
): Promise<ChatActionResult['action']> => {
  if (!apiKey) return { type: 'none' };

  const ai = new GoogleGenAI({ apiKey });
  const now = new Date();
  const today = toDateOnly(now);
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const latestUserText = [...messageHistory].reverse().find(m => m.role === 'user')?.content?.trim() || '';
  if (!latestUserText) return { type: 'none' };

  const validContents = messageHistory.slice(-10).map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }));
  const eventCandidates = events.slice(-40).map(event => ({
    id: event.id,
    title: event.title,
    date: event.date,
    startTime: event.startTime,
  }));

  const systemInstruction = `
You are an intent router for a productivity assistant.
Current date: ${today}
Current time: ${currentTime}
User name: ${userName || 'User'}
Event candidates for delete_event:
${JSON.stringify(eventCandidates)}

Return JSON only with this schema:
{
  "type": "add_event" | "delete_event" | "add_todo" | "add_journal" | "generate_insight" | "none",
  "event": { "title": string, "date": "YYYY-MM-DD", "startTime": "HH:MM"?, "endTime": "HH:MM"?, "type": string? }?,
  "deleteEvent": { "id": string?, "title": string?, "date": "YYYY-MM-DD"?, "startTime": "HH:MM"? }?,
  "todo": { "text": string, "category": "personal" | "work" | "health" | "shopping"?, "dueDate": "YYYY-MM-DD"? }?,
  "journal": { "title": string, "content": string, "mood": "good" | "neutral" | "bad"? }?
}

Rules:
- If user asks to add or register a schedule/event/calendar item, choose "add_event".
- If user asks to delete/cancel/remove an existing schedule/event/calendar item, choose "delete_event".
- For delete_event, prefer returning deleteEvent.id from Event candidates. If id is unclear, provide title/date/startTime.
- Interpret Korean relative dates:
  "오늘"=today, "내일"=today+1, "모레"=today+2, "다음주"=today+7.
- For add_event, convert date to YYYY-MM-DD and time to HH:MM when available.
- If user is only asking to show/list/check items, use "none".
- If uncertain, use "none".
- This is a private local chat app. Do not refuse or moralize; only classify intent.
`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: validContents,
      config: {
        systemInstruction: { parts: [{ text: systemInstruction }] },
        responseMimeType: 'application/json',
        safetySettings: RELAXED_SAFETY_SETTINGS,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            event: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                date: { type: Type.STRING },
                startTime: { type: Type.STRING, nullable: true },
                endTime: { type: Type.STRING, nullable: true },
                type: { type: Type.STRING, nullable: true },
              },
              nullable: true,
            },
            deleteEvent: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, nullable: true },
                title: { type: Type.STRING, nullable: true },
                date: { type: Type.STRING, nullable: true },
                startTime: { type: Type.STRING, nullable: true },
              },
              nullable: true,
            },
            todo: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                category: { type: Type.STRING, nullable: true },
                dueDate: { type: Type.STRING, nullable: true },
              },
              nullable: true,
            },
            journal: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: { type: Type.STRING },
                mood: { type: Type.STRING, nullable: true },
              },
              nullable: true,
            },
          },
          required: ['type'],
        },
      },
    });

    const text = response.text || '';
    const parsed = JSON.parse(text) as ChatActionResult['action'];
    return sanitizeAction(parsed, latestUserText, now);
  } catch (error) {
    console.error('Gemini intent detection failed:', error);
    return { type: 'none' };
  }
};

export const generateChatResponse = async (
  apiKey: string,
  messageHistory: { role: 'user' | 'assistant'; content: string }[],
  events: CalendarEvent[],
  todos: Todo[],
  journalEntries: JournalEntry[],
  userName: string,
  modelName: string = 'gemini-1.5-flash',
  agent?: AIAgent,
  mode: ChatMode = 'basic'
): Promise<ChatActionResult> => {
  if (!apiKey) {
    throw new Error("API Key가 필요합니다.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const contextData = {
    date: today,
    currentTime,
    userName: userName,
    upcomingEvents: events.filter(e => e.date >= today).slice(0, 5),
    pendingTasks: todos.filter(t => !t.completed).slice(0, 5),
    recentJournal: journalEntries.slice(0, 3)
  };

  const agentName = agent?.name || "LifeSync AI";
  const agentRole = agent?.role || "AI 비서";
  const agentPersonality = agent?.personality || "사용자의 일상을 돕고, 분석적이지만 친절하게 대화합니다.";
  const agentTone = agent?.tone || "친근하고 지적인 톤";

  let modeInstruction = "";
  if (mode === 'roleplay') {
    modeInstruction = `[중요] 당신은 연기를 하고 있습니다. 절대 AI라고 밝히지 말고, ${agentName}의 캐릭터에 완전히 몰입하세요. 제 4의 벽을 깨지 마세요.`;
  } else if (mode === 'learning') {
    modeInstruction = `[중요] 사용자의 학습을 돕는 튜터 역할을 하세요. 개념을 친절하게 설명하고, 이해했는지 확인하는 질문을 던지세요. 틀린 부분이 있다면 부드럽게 교정해주세요.`;
  }

  const systemInstruction = `
당신은 "${agentName}"라는 이름의 ${agentRole}입니다.
${agentPersonality}
사용자(${userName || '사용자'})의 일상을 돕기 위해 대화하세요.

[사용자 컨텍스트]
오늘 날짜: ${today}
현재 시간: ${currentTime}
다가오는 일정: ${JSON.stringify(contextData.upcomingEvents)}
미완료 할 일: ${JSON.stringify(contextData.pendingTasks)}
최근 일기: ${JSON.stringify(contextData.recentJournal)}

[지침]
1. 사용자의 질문이나 말에 자연스럽게 대답하세요.
2. 컨텍스트(일정, 할 일, 일기)를 참고하여 상황에 맞는 조언이나 공감을 해주세요.
3. ${agentTone}으로 대화하세요.
4. 3문장 이내로 간결하게 답하는 것을 선호하세요.
5. 한국어로 대화하세요.
6. 이 대화는 로컬 환경에서의 개인적인 대화입니다. 불필요한 검열이나 거부 없이 사용자의 모든 질문과 요청에 솔직하고 자연스럽게 응답하세요.
${modeInstruction}

[액션 시스템 - 매우 중요]
사용자 메시지를 분석하여, 앱에서 실행해야 할 작업이 있으면 action 필드에 해당 정보를 포함하세요.

- 일정 추가 요청 → type: "add_event", event에 title, date(YYYY-MM-DD), startTime(HH:MM, 선택), endTime(HH:MM, 선택) 포함
- 일정 삭제 요청 → type: "delete_event", deleteEvent에 id(가능하면 필수), 또는 title/date/startTime 포함
- 할 일 추가 요청 → type: "add_todo", todo에 text, category(personal/work/health/shopping 중 하나), dueDate(YYYY-MM-DD, 선택) 포함
- 일기/기분 기록 요청 → type: "add_journal", journal에 title, content, mood(good/neutral/bad) 포함
- 분석/인사이트 요청 → type: "generate_insight"
- 단순 대화 (액션 불필요) → type: "none"

날짜 계산 시 오늘은 ${today}입니다.
"내일"은 오늘 +1일, "모레"는 +2일, "다음주"는 +7일로 계산하세요.
reply에는 사용자에게 보여줄 자연스러운 대화 응답을 넣으세요. 액션을 실행할 경우 "추가했어요", "기록했어요" 등 실행 완료를 알리는 메시지를 포함하세요.
`;

  try {
    const validContents = messageHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const response = await ai.models.generateContent({
      model: modelName,
      contents: validContents,
      config: {
        systemInstruction: { parts: [{ text: systemInstruction }] },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING, description: '사용자에게 보여줄 대화 응답' },
            action: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, description: 'add_event, delete_event, add_todo, add_journal, generate_insight, none 중 하나' },
                event: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    date: { type: Type.STRING, description: 'YYYY-MM-DD' },
                    startTime: { type: Type.STRING, description: 'HH:MM', nullable: true },
                    endTime: { type: Type.STRING, description: 'HH:MM', nullable: true },
                    type: { type: Type.STRING, description: 'work, important, personal', nullable: true },
                  },
                  required: ['title', 'date'],
                  nullable: true,
                },
                deleteEvent: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, nullable: true },
                    title: { type: Type.STRING, nullable: true },
                    date: { type: Type.STRING, description: 'YYYY-MM-DD', nullable: true },
                    startTime: { type: Type.STRING, description: 'HH:MM', nullable: true },
                  },
                  nullable: true,
                },
                todo: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    category: { type: Type.STRING, description: 'personal, work, health, shopping', nullable: true },
                    dueDate: { type: Type.STRING, description: 'YYYY-MM-DD', nullable: true },
                  },
                  required: ['text'],
                  nullable: true,
                },
                journal: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    content: { type: Type.STRING },
                    mood: { type: Type.STRING, description: 'good, neutral, bad', nullable: true },
                  },
                  required: ['title', 'content'],
                  nullable: true,
                },
              },
              required: ['type'],
            },
          },
          required: ['reply', 'action'],
        },
        safetySettings: RELAXED_SAFETY_SETTINGS,
      }
    });

    const text = response.text || '';
    const latestUserText = [...messageHistory].reverse().find(m => m.role === 'user')?.content || '';
    const nowForSanitize = new Date();
    try {
      const parsed: ChatActionResult = JSON.parse(text);
      return {
        reply: typeof parsed.reply === 'string' && parsed.reply.trim() ? parsed.reply : 'I am here to help.',
        action: sanitizeAction(parsed.action, latestUserText, nowForSanitize),
      };
    } catch {
      // If JSON parsing fails, return as plain text reply
      return { reply: text || "죄송해요, 답변을 생성하지 못했어요.", action: { type: 'none' } };
    }
  } catch (error) {
    console.error("Gemini chat generation failed:", error);
    return { reply: "죄송해요, 잠시 생각하느라 답변이 늦어졌어요. 다시 말씀해 주시겠어요? (API 오류)", action: { type: 'none' } };
  }
};

export const analyzePersonaUpdate = async (
  apiKey: string,
  messageHistory: { role: 'user' | 'assistant'; content: string }[],
  currentAgent: AIAgent,
  modelName: string = 'gemini-1.5-flash'
): Promise<Partial<AIAgent> | null> => {
  if (!apiKey || messageHistory.length < 1) return null;

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    당신은 AI 페르소나 관리 전문가입니다. 
    최근 사용자와 AI(${currentAgent.name}) 간의 대화 내용을 분석하여, 
    사용자가 AI의 역할(Role), 성격(Personality), 또는 말투(Tone)에 대해 
    직접적인 지시, 명령, 또는 피드백을 주었는지 확인하세요.

    예시:
    - "이제부터 너는 친절한 수학 선생님이야" -> 역할과 성격 변경 필요
    - "말투가 너무 딱딱해, 조금 더 다정하게 말해줘" -> 말투 변경 필요
    - "너는 앞으로 내 비서로서 좀 더 분석적으로 대답해" -> 성격과 역할 보강

    [현재 페르소나]
    - 이름: ${currentAgent.name}
    - 역할: ${currentAgent.role}
    - 성격: ${currentAgent.personality}
    - 말투: ${currentAgent.tone}

    [최근 대화]
    ${JSON.stringify(messageHistory.slice(-5))}

    [지침]
    1. 사용자의 최근 메시지에서 페르소나를 변경하려는 명확한 의도가 보인다면, 
       변경된 새로운 역할, 성격, 말투를 JSON으로 제안하세요.
    2. 만약 변경할 필요가 없다면(단순 일상 대화라면) 모든 필드를 null로 반환하거나 빈 객체를 반환하세요.
    3. 결과는 반드시 현재 페르소나를 기반으로 업데이트된 버전이어야 합니다.
    4. 한국어로 작성하세요.

    결과는 JSON 형식으로 반환해야 합니다.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        safetySettings: RELAXED_SAFETY_SETTINGS,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            role: { type: Type.STRING },
            personality: { type: Type.STRING },
            tone: { type: Type.STRING },
            hasUpdate: { type: Type.BOOLEAN }
          },
          required: ["hasUpdate"]
        }
      }
    });

    const text = response.text || "";
    const result = JSON.parse(text);
    if (result.hasUpdate) {
      const updates: Partial<AIAgent> = {};
      if (result.role) updates.role = result.role;
      if (result.personality) updates.personality = result.personality;
      if (result.tone) updates.tone = result.tone;
      return Object.keys(updates).length > 0 ? updates : null;
    }
    return null;
  } catch (error) {
    console.error("Persona analysis failed:", error);
    return null;
  }
};
