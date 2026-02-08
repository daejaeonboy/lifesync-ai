export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  date: string; // ISO date string YYYY-MM-DD
  category?: 'work' | 'personal' | 'shopping' | 'health';
  listId?: string;
  dueDate?: string; // ISO date string YYYY-MM-DD
}

export interface TodoList {
  id: string;
  title: string;
  order: number;
  importance?: 'high' | 'medium' | 'low';
}

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  date: string; // ISO date string
  mood: 'good' | 'neutral' | 'bad';
  category?: string;
  order?: number;
  comments?: Comment[];
}

export interface JournalCategory {
  id: string;
  name: string;
}

export interface CalendarTag {
  id: string;
  name: string;
  color: string; // Hex color
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO date string YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  isAllDay?: boolean;
  description?: string;
  type: string; // CalendarTag id
}

export interface AiPost {
  id: string;
  title: string;
  content: string; // Markdown supported
  date: string; // ISO date string
  tags: string[];
  type: 'analysis' | 'suggestion';
}

export interface Comment {
  id: string;
  authorId: string; // 'USER' or AI agent id
  authorName: string;
  authorEmoji?: string;
  content: string;
  timestamp: string;
}

// AI Community Board Types
export interface AIAgent {
  id: string;
  name: string;
  emoji: string;
  role: string;
  personality: string;
  tone: string;
  color: string;
  avatar?: string;
}

export interface CommunityPost {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  replyTo?: string;
  trigger?: string;
  reactions?: { emoji: string; count: number }[];
  order?: number;
  comments?: Comment[];
}

export interface ActivityItem {
  id: string;
  type:
  | 'event_added'
  | 'event_deleted'
  | 'event_updated'
  | 'todo_added'
  | 'todo_completed'
  | 'todo_uncompleted'
  | 'todo_deleted'
  | 'journal_added'
  | 'journal_deleted';
  label: string;
  timestamp: string;
  meta?: Record<string, any>;
}

export interface ApiConnection {
  id: string;
  provider: 'gemini' | 'openai' | 'anthropic' | 'custom';
  modelName: string; // e.g. "gemini-1.5-flash", "gpt-4"
  apiKey: string;
  isActive: boolean;
}

export interface AppSettings {
  autoAiReactions: boolean;
  chatActionConfirm: boolean;
  geminiApiKey?: string; // @deprecated use apiConnections
  apiConnections: ApiConnection[];
  apiUsage?: ApiUsageStats;
}

export interface User {
  id: string;
  email: string;
  name: string;
  geminiApiKey?: string;
}

export interface ApiUsageStats {
  totalRequests: number;
  totalTokens: number;
  lastRequestDate?: string;
}

export type ViewState = 'dashboard' | 'calendar' | 'todo' | 'journal' | 'board' | 'chat' | 'settings' | 'api-settings';

export interface TriggerContext {
  trigger: 'todo_completed' | 'todo_added' | 'event_added' | 'journal_added' | 'chat_message';
  data: {
    text?: string;
    title?: string;
    date?: string;
    mood?: string;
    completed?: number;
    pending?: number;
    total?: number;
    completionRate?: number;
    nextTodo?: string;
    weekCount?: number;
  };
}
