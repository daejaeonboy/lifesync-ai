import { GoogleGenAI, Type } from "@google/genai";
import { CalendarEvent, JournalEntry, Todo, AiPost } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateLifeInsight = async (
  events: CalendarEvent[],
  todos: Todo[],
  journalEntries: JournalEntry[]
): Promise<AiPost> => {
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
      model: 'gemini-3-flash-preview',
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
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Gemini generation failed:", error);
    throw new Error("AI 분석 글을 생성하는 데 실패했습니다.");
  }
};