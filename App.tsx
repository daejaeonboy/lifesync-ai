import React, { useState, useEffect, useRef } from 'react'; // Refreshed for Calendar fix
import { ViewState, CalendarEvent, Todo, JournalEntry, AiPost, CommunityPost, AIAgent, ActivityItem, AppSettings, TodoList, CalendarTag, JournalCategory, Comment, User, ApiUsageStats, TriggerContext } from './types';
import { Calendar as CalendarIcon, CheckSquare, BookOpen, MessageCircle, Sparkles, ChevronDown, Plus, Trash2, Settings2, Hash, Search, Layout, MoreVertical, Edit3, LogOut, User as UserIcon, X, Loader2, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale/ko';
import { supabase } from './utils/supabase';
import CalendarView from './views/CalendarView';
import TodoView from './views/TodoView';
import JournalView from './views/JournalView';
import CommunityBoardView from './views/CommunityBoardView';
import PersonaSettingsView, { DEFAULT_AGENTS } from './views/PersonaSettingsView';
import ApiSettingsView from './views/ApiSettingsView';
import ChatView from './views/ChatView';
import AuthView from './views/AuthView';
import LandingView from './views/LandingView';
import { generateCommunityPosts } from './utils/triggerEngine';

// Mock Data Loaders (In a real app, this would be an API or more robust local storage)
const loadFromStorage = <T,>(key: string, defaultVal: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultVal;
  } catch (e) {
    console.error(`Error loading ${key} from storage`, e);
    return defaultVal;
  }
};

const saveToStorage = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

const DEFAULT_TAGS: CalendarTag[] = [
  { id: 'tag_1', name: '일정', color: '#4c2889' },
  { id: 'tag_2', name: 'Tasks', color: '#DEB13B' },
  { id: 'tag_3', name: '생일', color: '#35B37E' },
];

const DEFAULT_TODO_LISTS: TodoList[] = [
  { id: 'default', title: '할 일', order: 1 },
];

const mapCategoryToListId = (category?: Todo['category']): string => {
  return 'default';
};

// Settings icon component
const SettingsIcon = ({ size = 18 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => loadFromStorage('lifesync_user', null));
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [currentView, setCurrentView] = useState<ViewState>(() => loadFromStorage('ls_current_view', 'chat'));

  // App Data State
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    const stored = loadFromStorage('ls_events', []);
    return Array.isArray(stored) ? stored : [];
  });
  const [todoLists, setTodoLists] = useState<TodoList[]>(() => {
    const stored = loadFromStorage<TodoList[]>('ls_todo_lists', []);
    // Migration: Force reset to default single list if we detect multiple lists (old default was 5, user might have added more)
    // heuristic: if length > 1, it's likely old data or user custom data that needs migration to "default state" as requested.
    // To play it safe for "all users", we usually wouldn't wipe, but the USER requested "make the modified content the default state" implying a reset.
    // Let's being slightly safer: if it looks like the OLD default structure (has 'must_do' or length >= 4), reset it.
    if (stored && (stored.some(l => l.id === 'must_do') || stored.length >= 4)) {
      return DEFAULT_TODO_LISTS;
    }
    if (stored && Array.isArray(stored) && stored.length > 0) return stored;
    return DEFAULT_TODO_LISTS;
  });
  const [todos, setTodos] = useState<Todo[]>(() => {
    const stored = loadFromStorage('ls_todos', []);
    return (stored as Todo[]).map(t => ({
      ...t,
      category: t.category ?? 'personal',
      listId: t.listId ?? mapCategoryToListId(t.category),
    }));
  });
  const [entries, setEntries] = useState<JournalEntry[]>(() => loadFromStorage('ls_entries', []));
  const [posts, setPosts] = useState<AiPost[]>(() => loadFromStorage('ls_posts', []));

  // Community Board State
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>(() => loadFromStorage('ls_community', []));
  const [aiAgents, setAiAgents] = useState<AIAgent[]>(() => loadFromStorage('ls_agents', DEFAULT_AGENTS));

  // Activity Log & Settings
  const [activityLog, setActivityLog] = useState<ActivityItem[]>(() => loadFromStorage('ls_activity', []));
  const [settings, setSettings] = useState<AppSettings>(() => {
    const storedSettings = loadFromStorage<any>('ls_settings', { autoAiReactions: true, chatActionConfirm: true, apiConnections: [] });
    // Backward compatibility migration: If geminiApiKey exists but no connections, create one
    if (storedSettings.geminiApiKey && (!storedSettings.apiConnections || storedSettings.apiConnections.length === 0)) {
      storedSettings.apiConnections = [{
        id: 'legacy_gemini',
        provider: 'gemini',
        modelName: 'Gemini Pro',
        apiKey: storedSettings.geminiApiKey,
        isActive: true
      }];
    }
    return storedSettings;
  });

  const [calendarTags, setCalendarTags] = useState<CalendarTag[]>(() => {
    const stored = loadFromStorage('ls_calendar_tags', []);
    if (stored && Array.isArray(stored) && stored.length > 0) return stored;
    return DEFAULT_TAGS;
  });

  const [journalCategories, setJournalCategories] = useState<JournalCategory[]>(() => {
    const stored = loadFromStorage<JournalCategory[]>('ls_journal_categories', []);
    if (stored && Array.isArray(stored) && stored.length > 0) {
      // Migration: Rename AI to 메모장 if present
      const migrated = stored.map(c => c.name === 'AI' ? { ...c, name: '메모장' } : c);
      return migrated;
    }
    return [{ id: 'ai', name: '메모장' }];
  });

  const [selectedJournalId, setSelectedJournalId] = useState<string | null>(null);
  const [selectedJournalCategory, setSelectedJournalCategory] = useState<string>(() => {
    const stored = loadFromStorage<JournalCategory[]>('ls_journal_categories', []);
    if (stored && Array.isArray(stored) && stored.length > 0) {
      const first = stored[0];
      return first.name === 'AI' ? '메모장' : first.name;
    }
    return '메모장';
  });
  const [journalSearchQuery, setJournalSearchQuery] = useState('');
  const [isAddingJournalCategory, setIsAddingJournalCategory] = useState(false);
  const [journalCategoryInput, setJournalCategoryInput] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [activeCategoryMenu, setActiveCategoryMenu] = useState<string | null>(null);

  // AI Diary Selection States
  const [selectedAiPostId, setSelectedAiPostId] = useState<string | null>(null);
  const [selectedAiAgentId, setSelectedAiAgentId] = useState<string>(aiAgents[0]?.id || 'ARIA');
  const [isAddingAiAgent, setIsAddingAiAgent] = useState(false);
  const [aiAgentInput, setAiAgentInput] = useState('');
  const [editingAiAgentId, setEditingAiAgentId] = useState<string | null>(null);
  const [editingAiAgentName, setEditingAiAgentName] = useState('');
  const [activeAiAgentMenu, setActiveAiAgentMenu] = useState<string | null>(null);


  // Undo Toast
  const undoRef = useRef<null | (() => void)>(null);
  const [undoToast, setUndoToast] = useState<{ id: string; label: string } | null>(null);

  // Persistence Effects
  useEffect(() => saveToStorage('ls_events', events), [events]);
  useEffect(() => saveToStorage('ls_todos', todos), [todos]);
  useEffect(() => saveToStorage('ls_entries', entries), [entries]);
  useEffect(() => saveToStorage('ls_posts', posts), [posts]);
  useEffect(() => saveToStorage('ls_community', communityPosts), [communityPosts]);
  useEffect(() => saveToStorage('ls_agents', aiAgents), [aiAgents]);
  useEffect(() => saveToStorage('ls_todo_lists', todoLists), [todoLists]);
  useEffect(() => saveToStorage('ls_activity', activityLog), [activityLog]);
  useEffect(() => {
    saveToStorage('ls_settings', settings);
    if (currentUser && settings.geminiApiKey) {
      supabase.from('profiles').update({ gemini_api_key: settings.geminiApiKey }).eq('id', currentUser.id);
    }
  }, [settings, currentUser]);
  useEffect(() => saveToStorage('ls_current_view', currentView), [currentView]);
  useEffect(() => saveToStorage('ls_calendar_tags', calendarTags), [calendarTags]);
  useEffect(() => saveToStorage('ls_journal_categories', journalCategories), [journalCategories]);
  // Supabase Auth Listener & Initial Sync
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Fetch existing profile or sync
        let { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (!profile) {
          // Auto-create profile for OAuth / Social login users
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert([{
              id: session.user.id,
              name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
              gemini_api_key: ''
            }])
            .select()
            .single();

          if (!insertError) profile = newProfile;
        }

        setCurrentUser({
          id: session.user.id,
          email: session.user.email || '',
          name: profile?.name || session.user.email?.split('@')[0],
          geminiApiKey: profile?.gemini_api_key || ''
        });

        // Initial data fetch from Supabase
        fetchUserData(session.user.id);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        let { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();

        if (!profile) {
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert([{
              id: session.user.id,
              name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
              gemini_api_key: ''
            }])
            .select()
            .single();
          if (!insertError) profile = newProfile;
        }

        setCurrentUser({
          id: session.user.id,
          email: session.user.email || '',
          name: profile?.name || session.user.email?.split('@')[0],
          geminiApiKey: profile?.gemini_api_key || ''
        });
        fetchUserData(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        // Reset local data or handled by page reload
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    // Fetch all relevant data from Supabase in parallel
    const [
      { data: dbTodoLists },
      { data: dbTodos },
      { data: dbJournalCategories },
      { data: dbJournalEntries },
      { data: dbEvents },
      { data: dbPosts }
    ] = await Promise.all([
      supabase.from('todo_lists').select('*').eq('user_id', userId).order('order'),
      supabase.from('todos').select('*').eq('user_id', userId).order('order'),
      supabase.from('journal_categories').select('*').eq('user_id', userId),
      supabase.from('journal_entries').select('*').eq('user_id', userId).order('date', { ascending: false }),
      supabase.from('calendar_events').select('*').eq('user_id', userId),
      supabase.from('community_posts').select('*').eq('user_id', userId).order('timestamp', { ascending: false })
    ]);

    // Migration Logic: If Supabase is empty but local state has data, migrate local data to Supabase
    const isSupabaseEmpty = (!dbTodoLists || dbTodoLists.length === 0) && (!dbEvents || dbEvents.length === 0) && (!dbTodos || dbTodos.length === 0);

    if (isSupabaseEmpty) {
      console.log('Supabase is empty. Migrating local data...');

      // Migrate Todo Lists
      if (todoLists.length > 0) {
        await supabase.from('todo_lists').insert(
          todoLists.map(l => ({ id: l.id, user_id: userId, title: l.title, order: l.order }))
        );
      }

      // Migrate Todos
      if (todos.length > 0) {
        await supabase.from('todos').insert(
          todos.map(t => ({ id: t.id, user_id: userId, list_id: t.listId, text: t.text, completed: t.completed, order: 0 }))
        );
      }

      // Migrate Events
      if (events.length > 0) {
        await supabase.from('calendar_events').insert(
          events.map(e => ({
            id: e.id,
            user_id: userId,
            title: e.title,
            start_time: e.date + (e.startTime ? `T${e.startTime}:00` : 'T00:00:00'),
            end_time: e.date + (e.endTime ? `T${e.endTime}:00` : 'T23:59:59'),
            description: e.description,
            tags: [e.type]
          }))
        );
      }

      // Migrate Entries
      if (entries.length > 0) {
        await supabase.from('journal_entries').insert(
          entries.map(e => ({
            id: e.id,
            user_id: userId,
            title: e.title,
            content: e.content,
            mood: e.mood,
            date: e.date,
            order: e.order
          }))
        );
      }

      // No need to fetch again, just keep current local state
      return;
    }

    if (dbTodoLists) setTodoLists(dbTodoLists);
    if (dbTodos) setTodos(dbTodos);
    if (dbJournalCategories) setJournalCategories(dbJournalCategories);
    if (dbJournalEntries) setEntries(dbJournalEntries);
    if (dbEvents) setEvents(dbEvents);
    if (dbPosts) setCommunityPosts(dbPosts);
  };

  const handleLogout = async () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      await supabase.auth.signOut();
      setCurrentUser(null);
      localStorage.removeItem('lifesync_user');
      window.location.reload(); // Reset state
    }
  };

  useEffect(() => {
    const listIds = new Set(todoLists.map(l => l.id));
    const fallbackId = todoLists[0]?.id ?? 'routine';
    setTodos(prev => prev.map(t => (t.listId && listIds.has(t.listId)) ? t : { ...t, listId: fallbackId }));
  }, [todoLists]);

  // Community post handler
  // Community post handler
  const addCommunityPost = async (post: CommunityPost) => {
    const newOrder = communityPosts.length > 0 ? Math.min(...communityPosts.map(p => p.order || 0)) - 1 : 0;
    const postWithOrder = { ...post, order: newOrder };
    setCommunityPosts(prev => [postWithOrder, ...prev]);

    if (currentUser) {
      await supabase.from('community_posts').insert([{
        id: post.id,
        user_id: currentUser.id,
        author: post.author,
        content: post.content,
        timestamp: post.timestamp,
        reply_to: post.replyTo,
        trigger: post.trigger,
        "order": newOrder
      }]);
    }
  };

  const updateCommunityPost = (id: string, updates: Partial<CommunityPost>) => {
    setCommunityPosts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deleteCommunityPost = (id: string) => {
    if (window.confirm('정말로 이 AI 게시글을 삭제하시겠습니까?')) {
      setCommunityPosts(prev => prev.filter(p => p.id !== id));
      if (selectedAiPostId === id) setSelectedAiPostId(null);
    }
  };

  const addJournalComment = (entryId: string, comment: Omit<Comment, 'id' | 'timestamp'>) => {
    const newComment: Comment = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...comment,
    };
    setEntries(prev => prev.map(e =>
      e.id === entryId ? { ...e, comments: [...(e.comments || []), newComment] } : e
    ));
  };

  const addCommunityComment = (postId: string, comment: Omit<Comment, 'id' | 'timestamp'>) => {
    const newComment: Comment = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...comment,
    };
    setCommunityPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, comments: [...(p.comments || []), newComment] } : p
    ));
  };

  // Trigger helper
  const triggerAI = (context: TriggerContext) => {
    if (!settings.autoAiReactions) return;

    const updateUsage = (stats: ApiUsageStats) => {
      setSettings(prev => ({
        ...prev,
        apiUsage: {
          totalRequests: (prev.apiUsage?.totalRequests || 0) + stats.totalRequests,
          totalTokens: (prev.apiUsage?.totalTokens || 0) + stats.totalTokens,
          lastRequestDate: stats.lastRequestDate,
        }
      }));
    };

    generateCommunityPosts(context, aiAgents, addCommunityPost, settings.geminiApiKey, updateUsage);
  };

  const addTodoList = async (title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const nextOrder = Math.max(0, ...todoLists.map(l => l.order)) + 1;
    const newList: TodoList = {
      id: crypto.randomUUID(),
      title: trimmed,
      order: nextOrder,
    };
    setTodoLists(prev => [...prev, newList]);

    if (currentUser) {
      await supabase.from('todo_lists').insert([{
        id: newList.id,
        user_id: currentUser.id,
        title: newList.title,
        "order": newList.order
      }]);
    }
  };

  const addJournalCategory = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (journalCategories.some(c => c.name === trimmed)) return;
    const newCategory: JournalCategory = {
      id: crypto.randomUUID(),
      name: trimmed,
    };
    setJournalCategories(prev => [...prev, newCategory]);

    if (currentUser) {
      await supabase.from('journal_categories').insert([{
        id: newCategory.id,
        user_id: currentUser.id,
        name: newCategory.name
      }]);
    }
  };

  const addAiAgent = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (aiAgents.some(a => a.name === trimmed)) return;
    const newAgent: AIAgent = {
      id: crypto.randomUUID(),
      name: trimmed,
      emoji: '👤',
      role: '새로운 페르소나',
      personality: '사용자가 직접 생성한 AI 페르소나입니다.',
      tone: '친절하고 공손한 스타일',
      color: '#37352f',
    };
    setAiAgents(prev => [...prev, newAgent]);
  };

  const updateAiAgent = (id: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setAiAgents(prev => prev.map(a => a.id === id ? { ...a, name: trimmed } : a));

    // Update all posts using this agent (though author is ID, names might be used elsewhere)
  };

  const deleteAiAgent = (id: string) => {
    const agent = aiAgents.find(a => a.id === id);
    if (!agent) return;

    if (window.confirm(`'${agent.name}' 페르소나를 삭제하시겠습니까? 관련 게시글은 삭제되지 않습니다.`)) {
      setAiAgents(prev => prev.filter(a => a.id !== id));
      if (selectedAiAgentId === id) {
        setSelectedAiAgentId(aiAgents.find(a => a.id !== id)?.id || '');
      }
    }
  };

  const updateJournalCategory = async (id: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const oldCategory = journalCategories.find(c => c.id === id);
    if (!oldCategory) return;

    // Update category name
    setJournalCategories(prev => prev.map(c => c.id === id ? { ...c, name: trimmed } : c));

    if (currentUser) {
      await supabase.from('journal_categories').update({ name: trimmed }).eq('id', id);
    }

    // Update all entries using this category
    setEntries(prev => prev.map(entry =>
      entry.category === oldCategory.name ? { ...entry, category: trimmed } : entry
    ));

    if (selectedJournalCategory === oldCategory.name) {
      setSelectedJournalCategory(trimmed);
    }
  };


  const deleteJournalCategory = async (id: string) => {
    const category = journalCategories.find(c => c.id === id);
    if (!category) return;

    if (window.confirm(`'${category.name}' 카테고리를 삭제하시겠습니까? 해당 카테고리의 메모들은 삭제되지 않습니다.`)) {
      setJournalCategories(prev => prev.filter(c => c.id !== id));

      if (currentUser) {
        await supabase.from('journal_categories').delete().eq('id', id);
      }

      if (selectedJournalCategory === category.name) {
        setSelectedJournalCategory(journalCategories.find(c => c.id !== id)?.name || '메모장');
      }
    }
  };

  const updateTodoList = (id: string, updates: Partial<TodoList>) => {
    setTodoLists(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const updateTodoListOrder = (newLists: TodoList[]) => {
    setTodoLists(newLists);
  };

  const deleteTodoList = async (id: string) => {
    const list = todoLists.find(l => l.id === id);
    if (!list) return;

    if (window.confirm(`'${list.title}' 목록을 삭제하시겠습니까? 포함된 할 일도 모두 삭제됩니다.`)) {
      setTodoLists(prev => prev.filter(l => l.id !== id));
      setTodos(prev => prev.filter(t => t.listId !== id));

      if (currentUser) {
        await supabase.from('todos').delete().eq('list_id', id);
        await supabase.from('todo_lists').delete().eq('id', id);
      }
    }
  };

  const logActivity = (item: Omit<ActivityItem, 'id' | 'timestamp'>) => {
    const entry: ActivityItem = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...item,
    };
    setActivityLog(prev => [entry, ...prev].slice(0, 200));
  };

  const showUndo = (label: string, undoFn: () => void) => {
    const id = crypto.randomUUID();
    undoRef.current = undoFn;
    setUndoToast({ id, label });

    setTimeout(() => {
      setUndoToast(prev => (prev?.id === id ? null : prev));
    }, 6000);
  };

  const handleUndo = () => {
    undoRef.current?.();
    setUndoToast(null);
  };

  const handleExportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      events,
      todos,
      entries,
      posts,
      communityPosts,
      agents: aiAgents,
      settings,
      activityLog,
      userName: localStorage.getItem('ls_userName') || '',
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifesync-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearAllData = () => {
    const confirmed = window.confirm('모든 기록을 삭제할까요? (일정/할 일/일기/AI 보드/활동 기록)\n이 작업은 되돌릴 수 없습니다.');
    if (!confirmed) return;

    setEvents([]);
    setTodos([]);
    setTodoLists(DEFAULT_TODO_LISTS);
    setEntries([]);
    setPosts([]);
    setCommunityPosts([]);
    setActivityLog([]);

    ['ls_events', 'ls_todos', 'ls_entries', 'ls_posts', 'ls_community', 'ls_activity', 'ls_userName', 'ls_todo_lists'].forEach(key => {
      localStorage.removeItem(key);
    });
  };

  const handleClearActivity = () => {
    setActivityLog([]);
    localStorage.removeItem('ls_activity');
  };

  // Handlers with AI triggers
  const addEvent = async (event: CalendarEvent) => {
    setEvents(prev => [...prev, event]);

    if (currentUser) {
      await supabase.from('calendar_events').insert([{
        id: event.id,
        user_id: currentUser.id,
        title: event.title,
        start_time: event.date + (event.startTime ? `T${event.startTime}:00` : 'T00:00:00'),
        end_time: event.date + (event.endTime ? `T${event.endTime}:00` : 'T23:59:59'),
        description: event.description,
        color: calendarTags.find(t => t.id === event.type)?.color || '#4c2889',
        tags: [event.type]
      }]);
    }

    logActivity({
      type: 'event_added',
      label: `일정 추가: ${event.title}`,
      meta: { id: event.id, date: event.date },
    });
    showUndo('일정이 추가됨', async () => {
      setEvents(prev => prev.filter(e => e.id !== event.id));
      if (currentUser) {
        await supabase.from('calendar_events').delete().eq('id', event.id);
      }
      logActivity({
        type: 'event_deleted',
        label: `일정 취소(Undo): ${event.title}`,
        meta: { id: event.id },
      });
    });
    // Trigger AI community posts
    triggerAI({
      trigger: 'event_added',
      data: {
        title: event.title,
        date: event.date,
        weekCount: events.filter(e => {
          const d = new Date(e.date);
          const now = new Date();
          return d >= now && d <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        }).length + 1,
      },
    });
  };

  const updateEvent = async (event: CalendarEvent, previous: CalendarEvent) => {
    setEvents(prev => prev.map(e => e.id === event.id ? event : e));

    if (currentUser) {
      await supabase.from('calendar_events').update({
        title: event.title,
        start_time: event.date + (event.startTime ? `T${event.startTime}:00` : 'T00:00:00'),
        end_time: event.date + (event.endTime ? `T${event.endTime}:00` : 'T23:59:59'),
        description: event.description,
        color: calendarTags.find(t => t.id === event.type)?.color || '#4c2889',
        tags: [event.type]
      }).eq('id', event.id);
    }

    logActivity({
      type: 'event_updated',
      label: `일정 수정: ${event.title}`,
      meta: { id: event.id, date: event.date },
    });
    showUndo('일정이 수정됨', async () => {
      setEvents(prev => prev.map(e => e.id === previous.id ? previous : e));
      if (currentUser) {
        await supabase.from('calendar_events').update({
          title: previous.title,
          start_time: previous.date + (previous.startTime ? `T${previous.startTime}:00` : 'T00:00:00'),
          end_time: previous.date + (previous.endTime ? `T${previous.endTime}:00` : 'T23:59:59'),
          description: previous.description,
          tags: [previous.type]
        }).eq('id', previous.id);
      }
      logActivity({
        type: 'event_updated',
        label: `일정 복원(Undo): ${previous.title}`,
        meta: { id: previous.id, date: previous.date },
      });
    });
  };

  const deleteEvent = async (id: string) => {
    const removed = events.find(e => e.id === id);
    if (!removed) return;

    setEvents(prev => prev.filter(e => e.id !== id));

    if (currentUser) {
      await supabase.from('calendar_events').delete().eq('id', id);
    }

    logActivity({
      type: 'event_deleted',
      label: `일정 삭제: ${removed.title}`,
      meta: { id },
    });
    showUndo('일정이 삭제됨', async () => {
      setEvents(prev => [removed, ...prev]);
      if (currentUser) {
        await supabase.from('calendar_events').insert([{
          id: removed.id,
          user_id: currentUser.id,
          title: removed.title,
          start_time: removed.date + (removed.startTime ? `T${removed.startTime}:00` : 'T00:00:00'),
          end_time: removed.date + (removed.endTime ? `T${removed.endTime}:00` : 'T23:59:59'),
          description: removed.description,
          tags: [removed.type]
        }]);
      }
      logActivity({
        type: 'event_added',
        label: `일정 복원(Undo): ${removed.title}`,
        meta: { id: removed.id, date: removed.date },
      });
    });
  };

  const addTodo = async (text: string, listId?: string, dueDate?: string, category: Todo['category'] = 'personal') => {
    const targetListId = listId || todoLists[0]?.id || 'routine';
    const listLabel = todoLists.find(l => l.id === targetListId)?.title || '목록';
    const newTodo = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      date: new Date().toISOString(),
      category,
      listId: targetListId,
      dueDate,
    };

    setTodos(prev => [...prev, newTodo]);

    if (currentUser) {
      await supabase.from('todos').insert([{
        id: newTodo.id,
        user_id: currentUser.id,
        list_id: targetListId,
        text: newTodo.text,
        completed: newTodo.completed,
        "order": todos.length
      }]);
    }

    logActivity({
      type: 'todo_added',
      label: `할 일 추가: ${text} (${listLabel})`,
      meta: { id: newTodo.id, listId: targetListId },
    });
    showUndo('할 일이 추가됨', async () => {
      setTodos(prev => prev.filter(t => t.id !== newTodo.id));
      if (currentUser) {
        await supabase.from('todos').delete().eq('id', newTodo.id);
      }
      logActivity({
        type: 'todo_deleted',
        label: `할 일 취소(Undo): ${text}`,
        meta: { id: newTodo.id },
      });
    });

    // Trigger AI
    triggerAI({
      trigger: 'todo_added',
      data: {
        text,
        total: todos.length + 1,
        pending: todos.filter(t => !t.completed).length + 1,
      },
    });
  };

  const updateTodo = async (id: string, updates: Partial<Todo>) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    if (currentUser) {
      const dbUpdates: any = {};
      if (updates.text !== undefined) dbUpdates.text = updates.text;
      if (updates.completed !== undefined) dbUpdates.completed = updates.completed;
      if (updates.listId !== undefined) dbUpdates.list_id = updates.listId;

      if (Object.keys(dbUpdates).length > 0) {
        await supabase.from('todos').update(dbUpdates).eq('id', id);
      }
    }
  };

  const toggleTodo = async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    const wasCompleted = todo.completed;
    const newCompleted = !wasCompleted;

    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: newCompleted } : t));

    if (currentUser) {
      await supabase.from('todos').update({ completed: newCompleted }).eq('id', id);
    }

    if (newCompleted) {
      logActivity({
        type: 'todo_completed',
        label: `할 일 완료: ${todo.text}`,
        meta: { id: todo.id },
      });
      showUndo('완료 처리됨', async () => {
        setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: false } : t));
        if (currentUser) {
          await supabase.from('todos').update({ completed: false }).eq('id', id);
        }
        logActivity({
          type: 'todo_uncompleted',
          label: `완료 취소(Undo): ${todo.text}`,
          meta: { id: todo.id },
        });
      });

      triggerAI({
        trigger: 'todo_completed',
        data: {
          text: todo.text,
          completed: todos.filter(t => t.completed).length + 1,
          pending: todos.filter(t => !t.completed).length - 1,
          completionRate: Math.round(((todos.filter(t => t.completed).length + 1) / todos.length) * 100),
          nextTodo: todos.find(t => !t.completed && t.id !== id)?.text || '없음',
        },
      });
    }
  };

  const deleteTodo = async (id: string) => {
    const removed = todos.find(t => t.id === id);
    if (!removed) return;

    setTodos(prev => prev.filter(t => t.id !== id));

    if (currentUser) {
      await supabase.from('todos').delete().eq('id', id);
    }

    logActivity({
      type: 'todo_deleted',
      label: `할 일 삭제: ${removed.text}`,
      meta: { id },
    });
    showUndo('할 일이 삭제됨', async () => {
      setTodos(prev => [removed, ...prev]);
      if (currentUser) {
        await supabase.from('todos').insert([{
          id: removed.id,
          user_id: currentUser.id,
          list_id: removed.listId,
          text: removed.text,
          completed: removed.completed,
          "order": todos.length
        }]);
      }
      logActivity({
        type: 'todo_added',
        label: `할 일 복원(Undo): ${removed.text}`,
        meta: { id: removed.id },
      });
    });
  };

  const addEntry = async (title: string, content: string, category: string = '메모장', mood: string = 'neutral') => {
    const categoryObj = journalCategories.find(c => c.name === category);
    const newEntry: JournalEntry = {
      id: crypto.randomUUID(),
      title,
      content,
      category,
      mood: mood as JournalEntry['mood'],
      date: new Date().toISOString(),
      order: 0,
    };

    const newOrder = entries.length > 0 ? Math.min(...entries.map(e => e.order || 0)) - 1 : 0;
    const entryWithOrder = { ...newEntry, order: newOrder };

    setEntries(prev => [entryWithOrder, ...prev]);

    if (currentUser) {
      await supabase.from('journal_entries').insert([{
        id: newEntry.id,
        user_id: currentUser.id,
        title,
        content,
        category_id: categoryObj?.id,
        mood: newEntry.mood,
        date: newEntry.date,
        "order": newOrder
      }]);
    }

    logActivity({
      type: 'journal_added',
      label: `일기 기록: ${title}`,
      meta: { id: newEntry.id, mood, title },
    });
    showUndo('일기가 기록됨', async () => {
      setEntries(prev => prev.filter(e => e.id !== newEntry.id));
      if (currentUser) {
        await supabase.from('journal_entries').delete().eq('id', newEntry.id);
      }
      logActivity({
        type: 'journal_deleted',
        label: `일기 취소(Undo)`,
        meta: { id: newEntry.id },
      });
    });

    triggerAI({
      trigger: 'journal_added',
      data: {
        mood: mood === 'good' ? '좋음' : mood === 'bad' ? '나쁨' : '보통',
      },
    });

    // Auto-request AI comment
    handleRequestAiComment(newEntry.id);
  };

  const deleteEntry = async (id: string) => {
    const removed = entries.find(e => e.id === id);
    if (!removed) return;

    setEntries(prev => prev.filter(e => e.id !== id));

    if (currentUser) {
      await supabase.from('journal_entries').delete().eq('id', id);
    }

    logActivity({
      type: 'journal_deleted',
      label: `일기 삭제: ${removed.content.slice(0, 20)}${removed.content.length > 20 ? '…' : ''}`,
      meta: { id },
    });
    showUndo('일기가 삭제됨', async () => {
      setEntries(prev => [removed, ...prev]);
      if (currentUser) {
        const categoryObj = journalCategories.find(c => c.name === removed.category);
        await supabase.from('journal_entries').insert([{
          id: removed.id,
          user_id: currentUser.id,
          title: removed.title,
          content: removed.content,
          category_id: categoryObj?.id,
          mood: removed.mood,
          date: removed.date,
          "order": removed.order
        }]);
      }
      logActivity({
        type: 'journal_added',
        label: `일기 복원(Undo)`,
        meta: { id: removed.id },
      });
    });
  };

  const updateEntry = async (id: string, updates: Partial<JournalEntry>) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    if (currentUser) {
      const dbUpdates: any = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.content !== undefined) dbUpdates.content = updates.content;
      if (updates.mood !== undefined) dbUpdates.mood = updates.mood;
      if (updates.category !== undefined) {
        const cat = journalCategories.find(c => c.name === updates.category);
        dbUpdates.category_id = cat?.id;
      }

      if (Object.keys(dbUpdates).length > 0) {
        await supabase.from('journal_entries').update(dbUpdates).eq('id', id);
      }
    }
  }

  const handleRequestAiComment = (entryId: string) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;

    import('./utils/triggerEngine').then(({ generateJournalComment }) => {
      generateJournalComment(
        { title: entry.title, content: entry.content, mood: entry.mood },
        events,
        todos,
        aiAgents,
        (comment) => addJournalComment(entryId, comment),
        settings.geminiApiKey,
        (stats) => setSettings(prev => ({
          ...prev,
          apiUsage: {
            totalRequests: (prev.apiUsage?.totalRequests || 0) + stats.totalRequests,
            totalTokens: (prev.apiUsage?.totalTokens || 0) + stats.totalTokens,
            lastRequestDate: stats.lastRequestDate,
          }
        }))
      );
    });
  };

  const addPost = (post: AiPost) => setPosts(prev => [post, ...prev]);
  const deletePost = (id: string) => setPosts(prev => prev.filter(p => p.id !== id));

  const addCalendarTag = () => {
    const newTag: CalendarTag = {
      id: crypto.randomUUID(),
      name: '새 태그',
      color: '#37352f'
    };
    setCalendarTags(prev => [...prev, newTag]);
  };

  const updateCalendarTag = (id: string, updates: Partial<CalendarTag>) => {
    setCalendarTags(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteCalendarTag = (id: string) => {
    if (calendarTags.length <= 1) return;
    setCalendarTags(prev => prev.filter(t => t.id !== id));
  };

  const updateAgents = (agents: AIAgent[]) => setAiAgents(agents);

  const navItems: { id: ViewState; label: string; icon: React.ElementType }[] = [
    { id: 'chat', label: 'AI 채팅', icon: MessageCircle },
    { id: 'board', label: 'AI 일기장', icon: Sparkles },
    { id: 'calendar', label: '캘린더', icon: CalendarIcon },
    { id: 'todo', label: '할 일', icon: CheckSquare },
    { id: 'journal', label: '메모장', icon: BookOpen },
  ];

  const renderView = () => {
    switch (currentView) {
      case 'calendar':
        return (
          <CalendarView
            events={events}
            tags={calendarTags}
            onAddEvent={addEvent}
            onDeleteEvent={deleteEvent}
            onUpdateEvent={updateEvent}
          />
        );
      case 'todo':
        return <TodoView todos={todos} lists={todoLists} onAddList={addTodoList} onUpdateList={updateTodoList} onUpdateListOrder={updateTodoListOrder} onAddTodo={addTodo} onUpdateTodo={updateTodo} onToggleTodo={toggleTodo} onDeleteTodo={deleteTodo} onDeleteList={deleteTodoList} />;
      case 'journal':
        return (
          <JournalView
            entries={entries}
            categories={journalCategories}
            selectedId={selectedJournalId}
            selectedCategory={selectedJournalCategory}
            searchQuery={journalSearchQuery}
            onSelectId={setSelectedJournalId}
            onSelectCategory={setSelectedJournalCategory}
            onSearchQuery={setJournalSearchQuery}
            onAddEntry={addEntry}
            onUpdateEntry={updateEntry}
            onDeleteEntry={deleteEntry}
            onAddCategory={addJournalCategory}
            onAddComment={addJournalComment}
            onRequestAiComment={handleRequestAiComment}
            agents={aiAgents}
          />
        );
      case 'chat':
        return <ChatView events={events} todos={todos} entries={entries} posts={posts} todoLists={todoLists} onAddEvent={addEvent} onAddTodo={addTodo} onAddEntry={addEntry} onAddPost={addPost} requireConfirm={settings.chatActionConfirm} settings={settings} agent={aiAgents[0]} />;
      case 'board':
        return (
          <CommunityBoardView
            agents={aiAgents}
            posts={communityPosts}
            selectedId={selectedAiPostId}
            onSelectId={setSelectedAiPostId}
            selectedAgentId={selectedAiAgentId}
            onUpdatePost={updateCommunityPost}
            onDeletePost={deleteCommunityPost}
            onAddComment={addCommunityComment}
            onUpdateOrder={(newPosts) => setCommunityPosts(newPosts)}
          />
        );
      case 'settings':
        return (
          <PersonaSettingsView
            agents={aiAgents}
            onUpdateAgents={updateAgents}
            settings={settings}
            onUpdateSettings={setSettings}
            onExportData={handleExportData}
            onClearAllData={handleClearAllData}
            onClearActivity={handleClearActivity}
          />
        );
      case 'api-settings':
        return (
          <ApiSettingsView
            settings={settings}
            onUpdateSettings={setSettings}
          />
        );
      default:
        return <ChatView events={events} todos={todos} entries={entries} posts={posts} todoLists={todoLists} onAddEvent={addEvent} onAddTodo={addTodo} onAddEntry={addEntry} onAddPost={addPost} requireConfirm={settings.chatActionConfirm} />;
    }
  };

  const headerLabel = navItems.find(i => i.id === currentView)?.label || 'Dashboard';

  if (showAuth && !currentUser) {
    return (
      <div className="min-h-screen bg-white relative animate-in fade-in duration-300">
        <button
          onClick={() => setShowAuth(false)}
          className="absolute top-8 right-8 z-[110] p-2 text-[#787774] hover:text-[#37352f] hover:bg-[#efefef] rounded-full transition-all"
          aria-label="닫기"
        >
          <X size={24} />
        </button>
        <AuthView initialMode={authMode} onLogin={(user) => {
          setCurrentUser(user);
          setShowAuth(false);
        }} />
      </div>
    );
  }



  return (
    <div className="flex h-screen bg-[#fbfbfa] font-sans selection:bg-[#2ecc71]/20 relative">
      {/* Sidebar Navigation */}
      <aside className="w-16 lg:w-[240px] bg-[#f7f7f5] border-r border-[#e9e9e8] flex flex-col justify-between transition-all duration-300 z-50 flex-shrink-0">
        <div>
          {/* Logo Section */}
          <div className="p-4 lg:p-5 flex items-center gap-3 group cursor-pointer" onClick={() => setCurrentView('chat')}>
            <div className="w-8 h-8 bg-[#37352f] text-white rounded-[10px] flex items-center justify-center transition-transform group-hover:rotate-6">
              <Sparkles size={16} />
            </div>
            <span className="hidden lg:block text-lg font-bold tracking-tight text-[#37352f]">LifeSync AI</span>
          </div>

          <nav className="px-2 space-y-0.5">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`
                  w-full flex items-center px-3 py-1.5 rounded-[4px] transition-colors group
                  ${currentView === item.id
                    ? 'bg-[#efefef] text-[#37352f] font-medium'
                    : 'text-[#787774] hover:bg-[#efefef] hover:text-[#37352f]'}
                `}
              >
                <item.icon size={18} className={currentView === item.id ? 'text-[#37352f]' : 'text-[#9b9a97] group-hover:text-[#37352f]'} />
                <span className="hidden lg:block ml-2.5 text-sm">
                  {item.label}
                </span>
              </button>
            ))}
          </nav>

          {
            currentView === 'board' && (
              <div className="hidden lg:block mt-4 pt-4 border-t border-[#e9e9e8] px-2 space-y-6">
                {/* AI Agents (Categories) */}
                <div className="space-y-0.5">
                  <div className="px-3 flex items-center justify-between mb-1.5 group">
                    <span className="text-[11px] font-medium text-[#787774] uppercase tracking-wider">AI 페르소나</span>
                    <button
                      onClick={() => setIsAddingAiAgent(!isAddingAiAgent)}
                      className={`p-0.5 hover:bg-[#efefef] rounded transition-all ${isAddingAiAgent ? 'bg-[#efefef]' : ''}`}
                    >
                      <Plus size={14} className="text-[#787774]" />
                    </button>
                  </div>

                  {isAddingAiAgent && (
                    <div className="px-2 mb-2">
                      <input
                        type="text"
                        placeholder="새 페르소나..."
                        value={aiAgentInput}
                        onChange={e => setAiAgentInput(e.target.value)}
                        className="w-full bg-white border border-[#e9e9e8] rounded-[4px] py-1.5 px-3 text-sm outline-none shadow-sm"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            addAiAgent(aiAgentInput);
                            setAiAgentInput('');
                            setIsAddingAiAgent(false);
                          }
                          if (e.key === 'Escape') setIsAddingAiAgent(false);
                        }}
                      />
                    </div>
                  )}

                  {aiAgents.map(agent => (
                    <div key={agent.id} className="relative group/agent">
                      {editingAiAgentId === agent.id ? (
                        <div className="px-2 py-1">
                          <input
                            type="text"
                            value={editingAiAgentName}
                            onChange={e => setEditingAiAgentName(e.target.value)}
                            className="w-full bg-white border border-[#37352f] rounded-[4px] py-1 px-2 text-sm outline-none shadow-sm"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                updateAiAgent(agent.id, editingAiAgentName);
                                setEditingAiAgentId(null);
                              }
                              if (e.key === 'Escape') setEditingAiAgentId(null);
                            }}
                            onBlur={() => {
                              updateAiAgent(agent.id, editingAiAgentName);
                              setEditingAiAgentId(null);
                            }}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <button
                            onClick={() => setSelectedAiAgentId(agent.id)}
                            className={`flex-1 flex items-center px-3 py-1.5 rounded-[4px] transition-colors group ${selectedAiAgentId === agent.id
                              ? 'bg-[#efefef] text-[#37352f] font-medium'
                              : 'text-[#9b9a97] hover:bg-[#efefef] hover:text-[#37352f]'
                              }`}
                          >
                            <span className="mr-2 text-sm">{agent.emoji}</span>
                            <span className="text-sm truncate">{agent.name}</span>
                            <span className="ml-2 text-[11px] opacity-40 font-medium">
                              {communityPosts.filter(p => p.author === agent.id).length}
                            </span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveAiAgentMenu(activeAiAgentMenu === agent.id ? null : agent.id);
                            }}
                            className={`p-1 hover:bg-[#e9e9e8] rounded opacity-0 group-hover/agent:opacity-100 transition-opacity mr-1 ${activeAiAgentMenu === agent.id ? 'opacity-100 bg-[#e9e9e8]' : ''}`}
                          >
                            <MoreVertical size={14} className="text-[#9b9a97]" />
                          </button>
                        </div>
                      )}

                      {activeAiAgentMenu === agent.id && (
                        <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-[#e9e9e8] rounded-[4px] shadow-lg z-[100] py-1 animate-in fade-in zoom-in-95 duration-100">
                          <button
                            onClick={() => {
                              setEditingAiAgentId(agent.id);
                              setEditingAiAgentName(agent.name);
                              setActiveAiAgentMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#37352f] hover:bg-[#efefef] transition-colors text-left"
                          >
                            <Edit3 size={12} className="text-[#9b9a97]" /> 이름 변경
                          </button>
                          <button
                            onClick={() => {
                              deleteAiAgent(agent.id);
                              setActiveAiAgentMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#eb5757] hover:bg-[#fff0f0] transition-colors text-left"
                          >
                            <Trash2 size={12} /> 삭제
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* AI Post List */}
                <div className="space-y-0.5 overflow-hidden">
                  <div className="px-3 mb-1.5">
                    <span className="text-[11px] font-medium text-[#787774] uppercase tracking-wider">AI 게시글</span>
                  </div>
                  <div className="max-h-[350px] overflow-y-auto custom-scrollbar space-y-0.5">
                    {communityPosts
                      .filter(p => !selectedAiAgentId || p.author === selectedAiAgentId)
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .slice(0, 5)
                      .map(post => (
                        <button
                          key={post.id}
                          onClick={() => setSelectedAiPostId(post.id)}
                          className={`w-full text-left px-3 py-2 rounded-[4px] transition-colors group ${selectedAiPostId === post.id
                            ? 'bg-[#efefef] text-[#37352f] font-medium'
                            : 'text-[#9b9a97] hover:bg-[#efefef] hover:text-[#37352f]'
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm truncate pr-2">
                              {post.content.split('\n')[0].substring(0, 15)}...
                            </span>
                            <span className="text-[10px] opacity-60 font-medium flex-shrink-0">
                              {format(parseISO(post.timestamp), 'MM.dd')}
                            </span>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            )
          }

          {
            currentView === 'journal' && (
              <div className="mt-8 px-2 space-y-6 overflow-hidden">
                {/* Categories Section */}
                <div className="space-y-0.5">
                  <div className="px-3 mb-1.5 flex items-center justify-between group">
                    <span className="text-[11px] font-medium text-[#787774] uppercase tracking-wider">카테고리</span>
                    <button
                      onClick={() => setIsAddingJournalCategory(true)}
                      className="p-1 hover:bg-[#efefef] rounded text-[#9b9a97] opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Plus size={12} />
                    </button>
                  </div>



                  {journalCategories.map(cat => (
                    <div
                      key={cat.id}
                      className="relative group/cat"
                      onMouseLeave={() => setActiveCategoryMenu(null)}
                    >
                      <button
                        onClick={() => setSelectedJournalCategory(cat.name)}
                        className={`w-full flex items-center px-3 py-1.5 rounded-[4px] transition-colors text-sm ${selectedJournalCategory === cat.name ? 'bg-[#efefef] text-[#37352f] font-medium' : 'text-[#787774] hover:bg-[#efefef] hover:text-[#37352f]'}`}
                      >
                        <Hash size={14} className="mr-2.5 opacity-50" />
                        <span className="truncate flex-1 text-left">{cat.name}</span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveCategoryMenu(activeCategoryMenu === cat.id ? null : cat.id);
                          }}
                          className="p-0.5 hover:bg-[#d9d9d8] rounded text-[#9b9a97] opacity-0 group-hover/cat:opacity-100 transition-all"
                        >
                          <MoreVertical size={12} />
                        </button>
                      </button>

                      {/* Category Action Menu */}
                      {activeCategoryMenu === cat.id && (
                        <div className="absolute left-full top-0 ml-1 w-32 bg-white border border-[#e9e9e8] rounded-lg shadow-xl py-1 z-[60] animate-in fade-in zoom-in-95 duration-200">
                          <button
                            onClick={() => {
                              setEditingCategoryId(cat.id);
                              setEditingCategoryName(cat.name);
                              setActiveCategoryMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#37352f] hover:bg-[#efefef] transition-colors text-left"
                          >
                            <Edit3 size={12} className="text-[#9b9a97]" /> 이름 변경
                          </button>
                          <button
                            onClick={() => {
                              deleteJournalCategory(cat.id);
                              setActiveCategoryMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#eb5757] hover:bg-[#fff0f0] transition-colors text-left"
                          >
                            <Trash2 size={12} /> 삭제
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {isAddingJournalCategory && (
                    <div className="px-2 mb-2">
                      <input
                        type="text"
                        placeholder="새 카테고리..."
                        value={journalCategoryInput}
                        onChange={e => setJournalCategoryInput(e.target.value)}
                        className="w-full bg-white border border-[#e9e9e8] rounded-[4px] py-1.5 px-3 text-sm outline-none shadow-sm"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            addJournalCategory(journalCategoryInput);
                            setJournalCategoryInput('');
                            setIsAddingJournalCategory(false);
                          }
                          if (e.key === 'Escape') setIsAddingJournalCategory(false);
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Entry List */}
                <div className="space-y-0.5 overflow-hidden">
                  <div className="px-3 mb-1.5">
                    <span className="text-[11px] font-medium text-[#787774] uppercase tracking-wider">기록 목록</span>
                  </div>
                  <div className="max-h-[350px] overflow-y-auto custom-scrollbar space-y-0.5">
                    {entries
                      .filter(e => selectedJournalCategory === 'all' || e.category === selectedJournalCategory)
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map(entry => (
                        <button
                          key={entry.id}
                          onClick={() => setSelectedJournalId(entry.id)}
                          className={`w-full text-left px-3 py-2 rounded-[4px] transition-colors group ${selectedJournalId === entry.id
                            ? 'bg-[#efefef] text-[#37352f] font-medium'
                            : 'text-[#9b9a97] hover:bg-[#efefef] hover:text-[#37352f]'
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm truncate pr-2">
                              {entry.title || '제목 없음'}
                            </span>
                            <span className="text-[10px] opacity-60 font-medium flex-shrink-0">
                              {format(parseISO(entry.date), 'MM.dd')}
                            </span>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            )
          }

          {/* Divider */}
          <div className="mx-4 my-4 border-t border-[#e9e9e8]"></div>

          {/* Settings and User Info */}
          <div className="px-2">
            <div className="pt-4 space-y-0.5">
              <button
                onClick={() => setCurrentView('settings')}
                className={`w-full flex items-center gap-3 px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${currentView === 'settings' ? 'bg-[#efefef] text-[#37352f]' : 'text-[#787774] hover:bg-[#f7f7f5] hover:text-[#37352f]'}`}
              >
                <Settings2 size={16} /> 페르소나 설정
              </button>
            </div>
            <button
              onClick={() => setCurrentView('api-settings')}
              className={`
                w-full flex items-center px-3 py-1.5 rounded-[4px] transition-colors group mt-0.5
                ${currentView === 'api-settings'
                  ? 'bg-[#efefef] text-[#37352f] font-medium'
                  : 'text-[#9b9a97] hover:bg-[#efefef] hover:text-[#37352f]'}
              `}
            >
              <Sparkles size={18} />
              <span className="hidden lg:block ml-2.5 text-sm">
                API 연결 설정
              </span>
            </button>
          </div>
        </div>

        {/* Bottom Section: Pro & Auth */}
        <div className="p-3 space-y-3">
          <div className="bg-white border border-[#e9e9e8] rounded-lg p-3 shadow-sm hidden lg:block">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#2ecc71] to-[#3498db] flex-shrink-0"></div>
              <span className="text-xs font-semibold text-[#37352f]">Pro Plan</span>
            </div>
            <p className="text-[11px] text-[#9b9a97] leading-tight">
              AI 커뮤니티가 활성화되었습니다.
            </p>
          </div>

          {currentUser ? (
            <div className="bg-white border border-[#e9e9e8] rounded-lg p-2 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-6 h-6 rounded-full bg-[#f1f1f0] flex items-center justify-center text-[10px] font-bold text-[#37352f] flex-shrink-0">
                  {currentUser?.name?.[0] || 'U'}
                </div>
                <span className="text-xs font-bold text-[#37352f] truncate">{currentUser?.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-1 hover:bg-[#efefef] rounded text-[#9b9a97] hover:text-[#eb5757] transition-colors flex-shrink-0"
                title="로그아웃"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div className="px-1">
              <button
                onClick={() => {
                  setAuthMode('login');
                  setShowAuth(true);
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#37352f] text-white text-[11px] font-bold rounded-lg hover:bg-black transition-all shadow-sm"
              >
                <UserIcon size={14} strokeWidth={3} />
                로그인 / 가입하기
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      < main className="flex-1 flex flex-col h-full overflow-hidden relative bg-white" >
        {/* Top Mobile Bar (Visible only on small screens) */}
        < header className="lg:hidden h-12 bg-white border-b border-[#e9e9e8] flex items-center justify-center font-semibold text-sm z-40 relative" >
          LifeSync
        </header >

        {/* Scrollable View Content */}
        < div className={`flex-1 relative scroll-smooth ${['todo', 'journal', 'board', 'calendar'].includes(currentView) ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          <div className={`h-full mx-auto ${['todo', 'journal', 'board', 'calendar'].includes(currentView) ? 'max-w-none p-0' : 'max-w-[1200px] p-4 lg:p-8 lg:pt-10'}`}>
            {renderView()}
          </div>
        </div >

        {undoToast && (
          <div className="fixed bottom-6 right-6 z-50">
            <div className="bg-[#37352f] text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3">
              <span className="text-sm">{undoToast.label}</span>
              <button
                onClick={handleUndo}
                className="text-xs font-semibold bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-md transition-colors"
              >
                실행 취소
              </button>
            </div>
          </div>
        )}
      </main >
    </div >
  );
};

export default App;
