import React, { useState } from 'react';
import { Todo, TodoList } from '../types';
import { Check, ChevronRight, MoreVertical, CalendarIcon } from '../components/Icons';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

interface TodoViewProps {
  todos: Todo[];
  lists: TodoList[];
  onAddList: (title: string) => void;
  onUpdateList: (id: string, title: string) => void;
  onAddTodo: (text: string, listId?: string, dueDate?: string) => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
}

const TodoView: React.FC<TodoViewProps> = ({ todos, lists, onAddList, onUpdateList, onAddTodo, onToggleTodo, onDeleteTodo }) => {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [showCompleted, setShowCompleted] = useState<Record<string, boolean>>({});
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListTitle, setEditingListTitle] = useState('');

  const sortedLists = [...lists].sort((a, b) => a.order - b.order);

  const handleAddTodo = (listId: string) => {
    const text = drafts[listId]?.trim();
    if (!text) return;
    onAddTodo(text, listId);
    setDrafts(prev => ({ ...prev, [listId]: '' }));
  };

  const startEditingList = (list: TodoList) => {
    setEditingListId(list.id);
    setEditingListTitle(list.title);
  };

  const saveListTitle = () => {
    if (editingListId && editingListTitle.trim()) {
      onUpdateList(editingListId, editingListTitle.trim());
    }
    setEditingListId(null);
    setEditingListTitle('');
  };

  const getDueLabel = (dueDate?: string) => {
    if (!dueDate) return null;
    const d = parseISO(dueDate);
    if (isToday(d)) return '오늘';
    if (isTomorrow(d)) return '내일';
    return format(d, 'M월 d일 (E)', { locale: ko });
  };

  return (
    <div className="h-full bg-[#fbfbfb]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#e9e9e8] bg-white">
        <div />
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f7f7f5] text-[#9b9a97]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f7f7f5] text-[#9b9a97]">
            <CalendarIcon size={18} />
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#37352f] text-white">
            <Check size={18} />
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f7f7f5] text-[#9b9a97]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="5" r="2" />
              <circle cx="12" cy="5" r="2" />
              <circle cx="19" cy="5" r="2" />
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
              <circle cx="5" cy="19" r="2" />
              <circle cx="12" cy="19" r="2" />
              <circle cx="19" cy="19" r="2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-0 overflow-x-auto h-[calc(100%-60px)]">
        {sortedLists.map((list, listIndex) => {
          const listTodos = todos.filter(t => t.listId === list.id);
          const pending = listTodos.filter(t => !t.completed);
          const completed = listTodos.filter(t => t.completed);
          const showDone = showCompleted[list.id] ?? false;

          return (
            <div
              key={list.id}
              className={`min-w-[200px] flex-1 max-w-[240px] flex flex-col bg-white ${listIndex > 0 ? 'border-l border-[#e9e9e8]' : ''}`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#f0f0ef]">
                {editingListId === list.id ? (
                  <input
                    autoFocus
                    value={editingListTitle}
                    onChange={(e) => setEditingListTitle(e.target.value)}
                    onBlur={saveListTitle}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveListTitle();
                      if (e.key === 'Escape') {
                        setEditingListId(null);
                        setEditingListTitle('');
                      }
                    }}
                    className="font-medium text-[15px] text-[#37352f] bg-transparent border-b border-[#37352f] focus:outline-none w-full"
                  />
                ) : (
                  <h3
                    className="font-medium text-[15px] text-[#37352f] cursor-pointer hover:bg-[#f7f7f5] px-1 -mx-1 rounded"
                    onClick={() => startEditingList(list)}
                  >
                    {list.title}
                  </h3>
                )}
                <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#f7f7f5] text-[#9b9a97]">
                  <MoreVertical size={14} />
                </button>
              </div>

              {/* Add Todo Link */}
              <div className="px-4 py-2">
                {drafts[list.id] !== undefined && drafts[list.id] !== '' ? (
                  <input
                    autoFocus
                    value={drafts[list.id]}
                    onChange={(e) => setDrafts(prev => ({ ...prev, [list.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddTodo(list.id);
                      if (e.key === 'Escape') setDrafts(prev => ({ ...prev, [list.id]: '' }));
                    }}
                    onBlur={() => {
                      if (!drafts[list.id]?.trim()) {
                        setDrafts(prev => ({ ...prev, [list.id]: '' }));
                      }
                    }}
                    placeholder="할 일을 입력하세요"
                    className="w-full text-sm text-[#37352f] bg-transparent focus:outline-none"
                  />
                ) : (
                  <button
                    onClick={() => setDrafts(prev => ({ ...prev, [list.id]: ' ' }))}
                    className="flex items-center gap-1.5 text-[#37352f] text-sm hover:underline"
                  >
                    <Check size={14} />
                    <span>할 일 추가</span>
                  </button>
                )}
              </div>

              {/* Todo Items */}
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="space-y-1">
                  {pending.map(todo => {
                    const dueLabel = getDueLabel(todo.dueDate);
                    return (
                      <div
                        key={todo.id}
                        className="group flex items-start gap-2 py-1.5 hover:bg-[#f7f7f5] rounded px-1 -mx-1 cursor-pointer"
                        onClick={() => onToggleTodo(todo.id)}
                      >
                        <div className="w-4 h-4 mt-0.5 rounded-full border-2 border-[#d3d1cb] flex-shrink-0 group-hover:border-[#37352f] transition-colors" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-[#37352f] leading-snug">{todo.text}</p>
                          {dueLabel && (
                            <span className="inline-flex items-center gap-1 mt-1 text-[11px] px-1.5 py-0.5 rounded bg-[#f7f7f5] text-[#9b9a97]">
                              <CalendarIcon size={10} />
                              {dueLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Completed Section */}
                {completed.length > 0 && (
                  <button
                    onClick={() => setShowCompleted(prev => ({ ...prev, [list.id]: !showDone }))}
                    className="flex items-center gap-1 mt-4 text-[12px] text-[#9b9a97] hover:text-[#37352f]"
                  >
                    <ChevronRight
                      size={12}
                      className={`transition-transform ${showDone ? 'rotate-90' : ''}`}
                    />
                    <span>완료됨({completed.length}개)</span>
                  </button>
                )}

                {showDone && completed.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {completed.map(todo => (
                      <div
                        key={todo.id}
                        className="group flex items-start gap-2 py-1.5 hover:bg-[#f7f7f5] rounded px-1 -mx-1 cursor-pointer opacity-50"
                        onClick={() => onToggleTodo(todo.id)}
                      >
                        <div className="w-4 h-4 mt-0.5 rounded-full bg-[#37352f] flex-shrink-0 flex items-center justify-center">
                          <Check size={10} className="text-white" />
                        </div>
                        <p className="text-[13px] text-[#9b9a97] line-through leading-snug">{todo.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TodoView;
