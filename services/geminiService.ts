import { GoogleGenAI, Type } from "@google/genai";
import { CalendarEvent, JournalEntry, Todo, AiPost } from "../types";

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
    4. 형식: Markdown 형식을 사용하세요. (헤더, 볼드체, 리스트 등 활용)
    5. 언어: 한국어(Korean)

    결과는 JSON 형식으로 반환해야 합니다.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
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

    const result = JSON.parse(response.text);

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

export const generateChatResponse = async (
  apiKey: string,
  messageHistory: { role: 'user' | 'assistant'; content: string }[],
  events: CalendarEvent[],
  todos: Todo[],
  journalEntries: JournalEntry[],
  userName: string,
  modelName: string = 'gemini-1.5-flash'
): Promise<string> => {
  if (!apiKey) {
    throw new Error("API Key가 필요합니다.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const today = new Date().toISOString().split('T')[0];

  const contextData = {
    date: today,
    userName: userName,
    upcomingEvents: events.filter(e => e.date >= today).slice(0, 5),
    pendingTasks: todos.filter(t => !t.completed).slice(0, 5),
    recentJournal: journalEntries.slice(0, 3)
  };

  const systemInstruction = `
    당신은 "Aria(아리아)"라는 이름의 AI 비서입니다.
    사용자(${userName})의 일상을 돕고, 분석적이지만 친절하게 대화합니다.
    
    [사용자 컨텍스트]
    ${JSON.stringify(contextData)}
    
    [지침]
    1. 사용자의 질문이나 말에 자연스럽게 대답하세요.
    2. 컨텍스트(일정, 할 일, 일기)를 참고하여 상황에 맞는 조언이나 공감을 해주세요.
    3. 너무 기계적이거나 딱딱하지 않게, 친근하고 지적인 톤을 유지하세요.
    4. 3문장 이내로 간결하게 답하는 것을 선호하세요.
    5. 한국어로 대화하세요.
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
      }
    });

    return response.text || "죄송해요, 답변을 생성하지 못했어요.";
  } catch (error) {
    console.error("Gemini chat generation failed:", error);
    return "죄송해요, 잠시 생각하느라 답변이 늦어졌어요. 다시 말씀해 주시겠어요? (API 오류)";
  }
};
