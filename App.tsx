import React, { useState, useEffect, useRef } from 'react';
import { ViewState, CalendarEvent, Todo, JournalEntry, AiPost, CommunityPost, AIAgent, ActivityItem, AppSettings, TodoList } from './types';
import { CalendarIcon, CheckSquare, BookOpen, MessageCircle, Sparkles, Search } from './components/Icons';
import CalendarView from './views/CalendarView';
import TodoView from './views/TodoView';
import JournalView from './views/JournalView';
import CommunityBoardView from './views/CommunityBoardView';
import PersonaSettingsView, { DEFAULT_AGENTS } from './views/PersonaSettingsView';
import ChatView from './views/ChatView';
import SearchActivityView from './views/SearchActivityView';
import { generateCommunityPosts, TriggerContext } from './utils/triggerEngine';

// Mock Data Loaders (In a real app, this would be an API or more robust local storage)
const loadFromStorage = <T,>(key: string, defaultVal: T): T => {
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : defaultVal;
};

const saveToStorage = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

const DEFAULT_TODO_LISTS: TodoList[] = [
  { id: 'routine', title: '루틴', order: 1 },
  { id: 'do_now', title: '당장 할 수 있는 일', order: 2 },
  { id: 'must_do', title: '해야 할일', order: 3 },
  { id: 'two_week', title: '2주 프로젝트', order: 4 },
  { id: 'personal_project', title: '개인 프로젝트', order: 5 },
];

const mapCategoryToListId = (category?: Todo['category']): string => {
  switch (category) {
    case 'health':
      return 'routine';
    case 'shopping':
      return 'do_now';
    case 'work':
      return 'must_do';
    case 'personal':
    default:
      return 'personal_project';
  }
};

// Settings icon component
const SettingsIcon = ({ size = 18 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('chat');

  // App Data State
  const [events, setEvents] = useState<CalendarEvent[]>(() => loadFromStorage('ls_events', []));
  const [todoLists, setTodoLists] = useState<TodoList[]>(() => {
    const stored = loadFromStorage('ls_todo_lists', []);
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
  const [settings, setSettings] = useState<AppSettings>(() =>
    loadFromStorage('ls_settings', { autoAiReactions: true, chatActionConfirm: true })
  );

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
  useEffect(() => saveToStorage('ls_settings', settings), [settings]);

  useEffect(() => {
    const listIds = new Set(todoLists.map(l => l.id));
    const fallbackId = todoLists[0]?.id ?? 'routine';
    setTodos(prev => prev.map(t => (t.listId && listIds.has(t.listId)) ? t : { ...t, listId: fallbackId }));
  }, [todoLists]);

  // Community post handler
  const addCommunityPost = (post: CommunityPost) => setCommunityPosts(prev => [post, ...prev]);

  // Trigger helper
  const triggerAI = (context: TriggerContext) => {
    if (!settings.autoAiReactions) return;
    generateCommunityPosts(context, aiAgents, addCommunityPost);
  };

  const addTodoList = (title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const nextOrder = Math.max(0, ...todoLists.map(l => l.order)) + 1;
    const newList: TodoList = {
      id: crypto.randomUUID(),
      title: trimmed,
      order: nextOrder,
    };
    setTodoLists(prev => [...prev, newList]);
  };

  const updateTodoList = (id: string, title: string) => {
    setTodoLists(prev => prev.map(l => l.id === id ? { ...l, title } : l));
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
  const addEvent = (event: CalendarEvent) => {
    setEvents(prev => [...prev, event]);
    logActivity({
      type: 'event_added',
      label: `일정 추가: ${event.title}`,
      meta: { id: event.id, date: event.date },
    });
    showUndo('일정이 추가됨', () => {
      setEvents(prev => prev.filter(e => e.id !== event.id));
      logActivity({
        type: 'event_deleted',
        label: `일정 취소(Undo): ${event.title}`,
        meta: { id: event.id },
      });
    });
    // Trigger AI community posts - OUTSIDE of setState to avoid React Strict Mode double-call
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

  const updateEvent = (event: CalendarEvent, previous: CalendarEvent) => {
    setEvents(prev => prev.map(e => e.id === event.id ? event : e));
    logActivity({
      type: 'event_updated',
      label: `일정 수정: ${event.title}`,
      meta: { id: event.id, date: event.date },
    });
    showUndo('일정이 수정됨', () => {
      setEvents(prev => prev.map(e => e.id === previous.id ? previous : e));
      logActivity({
        type: 'event_updated',
        label: `일정 복원(Undo): ${previous.title}`,
        meta: { id: previous.id, date: previous.date },
      });
    });
  };

  const deleteEvent = (id: string) => {
    const removed = events.find(e => e.id === id);
    setEvents(prev => prev.filter(e => e.id !== id));
    logActivity({
      type: 'event_deleted',
      label: `일정 삭제: ${removed?.title ?? '알 수 없음'}`,
      meta: { id },
    });
    if (removed) {
      showUndo('일정이 삭제됨', () => {
        setEvents(prev => [removed, ...prev]);
        logActivity({
          type: 'event_added',
          label: `일정 복원(Undo): ${removed.title}`,
          meta: { id: removed.id, date: removed.date },
        });
      });
    }
  };

  const addTodo = (text: string, listId?: string, dueDate?: string, category: Todo['category'] = 'personal') => {
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
    // Get current state for calculations
    const currentTodos = [...todos, newTodo];
    setTodos(currentTodos);

    logActivity({
      type: 'todo_added',
      label: `할 일 추가: ${text} (${listLabel})`,
      meta: { id: newTodo.id, listId: targetListId },
    });
    showUndo('할 일이 추가됨', () => {
      setTodos(prev => prev.filter(t => t.id !== newTodo.id));
      logActivity({
        type: 'todo_deleted',
        label: `할 일 취소(Undo): ${text}`,
        meta: { id: newTodo.id },
      });
    });

    // Trigger AI AFTER setState - outside callback
    triggerAI({
      trigger: 'todo_added',
      data: {
        text,
        total: currentTodos.length,
        pending: currentTodos.filter(t => !t.completed).length,
      },
    });
  };

  const toggleTodo = (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    const wasCompleted = todo.completed;
    const updated = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    setTodos(updated);

    // Only trigger if completing (not uncompleting) - OUTSIDE of setState
    if (!wasCompleted) {
      const completed = updated.filter(t => t.completed).length;
      const pending = updated.filter(t => !t.completed).length;
      const pendingTodos = updated.filter(t => !t.completed);

      logActivity({
        type: 'todo_completed',
        label: `할 일 완료: ${todo.text}`,
        meta: { id: todo.id },
      });
      showUndo('완료 처리됨', () => {
        setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: false } : t));
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
          completed,
          pending,
          total: updated.length,
          completionRate: Math.round((completed / updated.length) * 100),
          nextTodo: pendingTodos[0]?.text || '없음',
        },
      });
    }
  };

  const deleteTodo = (id: string) => {
    const removed = todos.find(t => t.id === id);
    setTodos(prev => prev.filter(t => t.id !== id));
    logActivity({
      type: 'todo_deleted',
      label: `할 일 삭제: ${removed?.text ?? '알 수 없음'}`,
      meta: { id },
    });
    if (removed) {
      showUndo('할 일이 삭제됨', () => {
        setTodos(prev => [removed, ...prev]);
        logActivity({
          type: 'todo_added',
          label: `할 일 복원(Undo): ${removed.text}`,
          meta: { id: removed.id },
        });
      });
    }
  };

  const addEntry = (content: string, mood: JournalEntry['mood']) => {
    const newEntry = {
      id: crypto.randomUUID(),
      content,
      mood,
      date: new Date().toISOString()
    };
    setEntries(prev => [newEntry, ...prev]);

    logActivity({
      type: 'journal_added',
      label: `일기 기록: ${content.slice(0, 20)}${content.length > 20 ? '…' : ''}`,
      meta: { id: newEntry.id, mood },
    });
    showUndo('일기가 기록됨', () => {
      setEntries(prev => prev.filter(e => e.id !== newEntry.id));
      logActivity({
        type: 'journal_deleted',
        label: `일기 취소(Undo)`,
        meta: { id: newEntry.id },
      });
    });

    // Trigger AI AFTER setState - outside callback
    triggerAI({
      trigger: 'journal_added',
      data: {
        mood: mood === 'good' ? '좋음' : mood === 'bad' ? '안좋음' : '보통',
      },
    });
  };

  const deleteEntry = (id: string) => {
    const removed = entries.find(e => e.id === id);
    setEntries(prev => prev.filter(e => e.id !== id));
    logActivity({
      type: 'journal_deleted',
      label: `일기 삭제: ${removed?.content.slice(0, 20) ?? '알 수 없음'}${removed && removed.content.length > 20 ? '…' : ''}`,
      meta: { id },
    });
    if (removed) {
      showUndo('일기가 삭제됨', () => {
        setEntries(prev => [removed, ...prev]);
        logActivity({
          type: 'journal_added',
          label: `일기 복원(Undo)`,
          meta: { id: removed.id },
        });
      });
    }
  };

  const addPost = (post: AiPost) => setPosts(prev => [post, ...prev]);
  const deletePost = (id: string) => setPosts(prev => prev.filter(p => p.id !== id));

  const updateAgents = (agents: AIAgent[]) => setAiAgents(agents);

  const navItems: { id: ViewState; label: string; icon: React.ElementType }[] = [
    { id: 'chat', label: 'AI 채팅', icon: MessageCircle },
    { id: 'board', label: 'AI 커뮤니티', icon: Sparkles },
    { id: 'calendar', label: '캘린더', icon: CalendarIcon },
    { id: 'todo', label: '할 일', icon: CheckSquare },
    { id: 'journal', label: '일기장', icon: BookOpen },
    { id: 'search', label: '검색/기록', icon: Search },
  ];

  const renderView = () => {
    switch (currentView) {
      case 'calendar':
        return <CalendarView events={events} onAddEvent={addEvent} onDeleteEvent={deleteEvent} onUpdateEvent={updateEvent} />;
      case 'todo':
        return <TodoView todos={todos} lists={todoLists} onAddList={addTodoList} onUpdateList={updateTodoList} onAddTodo={addTodo} onToggleTodo={toggleTodo} onDeleteTodo={deleteTodo} />;
      case 'journal':
        return <JournalView entries={entries} onAddEntry={addEntry} onDeleteEntry={deleteEntry} />;
      case 'chat':
        return <ChatView events={events} todos={todos} entries={entries} posts={posts} todoLists={todoLists} onAddEvent={addEvent} onAddTodo={addTodo} onAddEntry={addEntry} onAddPost={addPost} requireConfirm={settings.chatActionConfirm} />;
      case 'board':
        return <CommunityBoardView events={events} todos={todos} entries={entries} agents={aiAgents} posts={communityPosts} />;
      case 'search':
        return <SearchActivityView events={events} todos={todos} entries={entries} lists={todoLists} activityLog={activityLog} onClearLog={handleClearActivity} />;
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
      default:
        return <ChatView events={events} todos={todos} entries={entries} posts={posts} todoLists={todoLists} onAddEvent={addEvent} onAddTodo={addTodo} onAddEntry={addEntry} onAddPost={addPost} requireConfirm={settings.chatActionConfirm} />;
    }
  };

  return (
    <div className="flex h-screen bg-white text-[#37352f] font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-16 lg:w-[240px] bg-[#f7f7f5] border-r border-[#e9e9e8] flex flex-col justify-between transition-all duration-300 z-50 flex-shrink-0">
        <div>
          {/* Logo Area */}
          <div className="h-14 flex items-center px-3 lg:px-4 mb-2 mt-2">
            <div className="w-8 h-8 bg-[#37352f] rounded-[4px] flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <span className="font-bold text-lg leading-none">L</span>
            </div>
            <span className="hidden lg:block ml-3 font-semibold text-[#37352f] tracking-tight">LifeSync</span>
          </div>

          {/* Nav Items */}
          <nav className="px-2 space-y-0.5">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`
                  w-full flex items-center px-3 py-1.5 rounded-[4px] transition-colors group
                  ${currentView === item.id
                    ? 'bg-[#efefef] text-[#37352f] font-medium'
                    : 'text-[#9b9a97] hover:bg-[#efefef] hover:text-[#37352f]'}
                `}
              >
                <item.icon size={18} className={`flex-shrink-0 ${currentView === item.id ? 'stroke-[2px]' : 'stroke-[1.5px]'}`} />
                <span className="hidden lg:block ml-2.5 text-sm">
                  {item.label}
                </span>
              </button>
            ))}
          </nav>

          {/* Divider */}
          <div className="mx-4 my-4 border-t border-[#e9e9e8]"></div>

          {/* Settings */}
          <nav className="px-2">
            <button
              onClick={() => setCurrentView('settings')}
              className={`
                w-full flex items-center px-3 py-1.5 rounded-[4px] transition-colors group
                ${currentView === 'settings'
                  ? 'bg-[#efefef] text-[#37352f] font-medium'
                  : 'text-[#9b9a97] hover:bg-[#efefef] hover:text-[#37352f]'}
              `}
            >
              <SettingsIcon size={18} />
              <span className="hidden lg:block ml-2.5 text-sm">
                AI 페르소나 설정
              </span>
            </button>
          </nav>
        </div>

        {/* User / Pro Section */}
        <div className="p-3 hidden lg:block">
          <div className="bg-white border border-[#e9e9e8] rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex-shrink-0"></div>
              <span className="text-xs font-semibold text-[#37352f]">Pro Plan</span>
            </div>
            <p className="text-[11px] text-[#9b9a97] leading-tight">
              AI 커뮤니티가 활성화되었습니다.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-white">
        {/* Top Mobile Bar (Visible only on small screens) */}
        <header className="lg:hidden h-12 bg-white border-b border-[#e9e9e8] flex items-center justify-center font-semibold text-sm z-40 relative">
          LifeSync
        </header>

        {/* Scrollable View Content */}
        <div className="flex-1 overflow-y-auto relative scroll-smooth">
          <div className="h-full max-w-[1200px] mx-auto p-4 lg:p-8 lg:pt-10">
            {renderView()}
          </div>
        </div>

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
      </main>
    </div>
  );
};

export default App;
