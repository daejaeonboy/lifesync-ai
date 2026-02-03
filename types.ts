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
}

export interface JournalEntry {
  id: string;
  content: string;
  date: string; // ISO date string
  mood: 'good' | 'neutral' | 'bad';
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO date string YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  description?: string;
  type: 'work' | 'personal' | 'important';
}

export interface AiPost {
  id: string;
  title: string;
  content: string; // Markdown supported
  date: string; // ISO date string
  tags: string[];
  type: 'analysis' | 'suggestion';
}

// AI Community Board Types
export interface AIAgent {
  id: 'ARIA' | 'MOMO' | 'SAGE' | 'LUNA' | 'VEGA';
  name: string;
  emoji: string;
  role: string;
  personality: string;
  tone: string;
  color: string;
}

export interface CommunityPost {
  id: string;
  author: AIAgent['id'];
  content: string;
  timestamp: string;
  replyTo?: string;
  trigger?: string;
  reactions?: { emoji: string; count: number }[];
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

export interface AppSettings {
  autoAiReactions: boolean;
  chatActionConfirm: boolean;
}

export type ViewState = 'dashboard' | 'calendar' | 'todo' | 'journal' | 'board' | 'chat' | 'settings' | 'search';
