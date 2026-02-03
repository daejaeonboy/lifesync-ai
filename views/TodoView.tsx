import React, { useState, useRef, useEffect } from 'react';
import { Todo, TodoList } from '../types';
import { Check, ChevronRight, MoreVertical, CalendarIcon, Trash2, Layout, Plus } from '../components/Icons';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

interface TodoViewProps {
  todos: Todo[];
  lists: TodoList[];
  onAddList: (title: string) => void;
  onUpdateList: (id: string, title: string) => void;
  onAddTodo: (text: string, listId?: string, dueDate?: string) => void;
  onUpdateTodo?: (id: string, updates: Partial<Todo>) => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
}

const TodoView: React.FC<TodoViewProps> = ({
  todos,
  lists,
  onAddList,
  onUpdateList,
  onAddTodo,
  onUpdateTodo,
  onToggleTodo,
  onDeleteTodo
}) => {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [showCompleted, setShowCompleted] = useState<Record<string, boolean>>({});
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListTitle, setEditingListTitle] = useState('');

  // Editing state for todo text
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editingTodoText, setEditingTodoText] = useState('');

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const sortedLists = [...lists].sort((a, b) => a.order - b.order);

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const startEditingTodo = (todo: Todo) => {
    setEditingTodoId(todo.id);
    setEditingTodoText(todo.text);
    setContextMenu(null); // Close menu if open
  };

  const saveTodoText = () => {
    if (editingTodoId && onUpdateTodo) {
      if (editingTodoText.trim()) {
        onUpdateTodo(editingTodoId, { text: editingTodoText.trim() });
      } else {
        // Optionally delete if empty? For now just revert to original or do nothing
      }
    }
    setEditingTodoId(null);
    setEditingTodoText('');
  };

  const handleMoveTodo = (todoId: string, newListId: string) => {
    if (onUpdateTodo) {
      onUpdateTodo(todoId, { listId: newListId });
    }
    setContextMenu(null);
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
            <Layout size={18} />
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto h-[calc(100%-65px)] p-6 items-start">
        {sortedLists.map((list) => {
          const listTodos = todos.filter(t => t.listId === list.id);
          const pending = listTodos.filter(t => !t.completed);
          const completed = listTodos.filter(t => t.completed);
          const showDone = showCompleted[list.id] ?? false;

          return (
            <div
              key={list.id}
              className="min-w-[280px] w-[280px] flex flex-col max-h-full"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-1 py-2 mb-2">
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
                    className="font-bold text-[15px] text-[#37352f] bg-transparent border-b border-[#37352f] focus:outline-none w-full"
                  />
                ) : (
                  <h3
                    className="font-bold text-[15px] text-[#37352f] cursor-pointer hover:bg-[#eaeaea] px-2 py-1 rounded transition-colors"
                    onClick={() => startEditingList(list)}
                  >
                    {list.title}
                  </h3>
                )}
                <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#eaeaea] text-[#9b9a97]">
                  <MoreVertical size={14} />
                </button>
              </div>

              {/* Add Todo Input */}
              <div className="mb-3 px-1">
                <div className="relative group">
                  <div className="absolute left-3 top-2 text-[#9b9a97]">
                    <Plus size={14} />
                  </div>
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
                      placeholder="할 일 추가"
                      className="w-full pl-8 pr-3 py-1.5 text-sm bg-transparent focus:outline-none rounded hover:bg-[#eaeaea] focus:bg-[#eaeaea] transition-colors placeholder:text-[#37352f] text-[#37352f]"
                    />
                  ) : (
                    <button
                      onClick={() => setDrafts(prev => ({ ...prev, [list.id]: ' ' }))}
                      className="w-full text-left pl-8 pr-3 py-1.5 text-sm text-[#37352f] font-medium rounded hover:bg-[#eaeaea] transition-colors"
                    >
                      할 일 추가
                    </button>
                  )}
                </div>
              </div>

              {/* Todo Cards */}
              <div className="flex-1 overflow-y-auto px-1 pb-4 space-y-2">
                {pending.map(todo => {
                  const dueLabel = getDueLabel(todo.dueDate);
                  const isEditing = editingTodoId === todo.id;

                  return (
                    <div
                      key={todo.id}
                      className="group relative bg-white border border-[#e9e9e8] rounded-lg p-3 shadow-sm hover:shadow-md transition-all"
                    >
                      {/* Checkbox & Content */}
                      <div className="flex items-start gap-3">
                        <div
                          className="w-5 h-5 mt-0.5 rounded-full border border-[#d3d1cb] flex-shrink-0 cursor-pointer hover:border-[#37352f] hover:bg-[#f7f7f5] transition-all"
                          onClick={() => onToggleTodo(todo.id)}
                        />

                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <input
                              autoFocus
                              value={editingTodoText}
                              onChange={(e) => setEditingTodoText(e.target.value)}
                              onBlur={saveTodoText}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveTodoText();
                                if (e.key === 'Escape') {
                                  setEditingTodoId(null);
                                  setEditingTodoText('');
                                }
                              }}
                              className="w-full text-[14px] text-[#37352f] bg-transparent border-b border-[#37352f] focus:outline-none leading-relaxed"
                            />
                          ) : (
                            <p
                              className="text-[14px] text-[#37352f] leading-relaxed cursor-text"
                              onClick={() => startEditingTodo(todo)}
                            >
                              {todo.text}
                            </p>
                          )}

                          {dueLabel && (
                            <div className="mt-2 flex items-center gap-1.5 text-xs text-[#787774] bg-[#f7f7f5] inline-flex px-2 py-0.5 rounded border border-[#e9e9e8]">
                              <CalendarIcon size={12} />
                              <span>{dueLabel}</span>
                            </div>
                          )}
                        </div>

                        {/* More Button */}
                        <button
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#f7f7f5] rounded text-[#9b9a97] transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            setContextMenu({
                              id: todo.id,
                              x: e.clientX,
                              y: e.clientY
                            });
                          }}
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Completed Section */}
                {completed.length > 0 && (
                  <div className="pt-2">
                    <button
                      onClick={() => setShowCompleted(prev => ({ ...prev, [list.id]: !showDone }))}
                      className="flex items-center gap-1.5 text-xs font-medium text-[#9b9a97] hover:text-[#37352f] px-1 py-1 rounded hover:bg-[#eaeaea] transition-colors w-full"
                    >
                      <ChevronRight
                        size={14}
                        className={`transition-transform duration-200 ${showDone ? 'rotate-90' : ''}`}
                      />
                      <span>완료됨 ({completed.length})</span>
                    </button>

                    {showDone && (
                      <div className="mt-2 space-y-2 pl-2 border-l-2 border-[#f0f0f0] ml-2">
                        {completed.map(todo => (
                          <div key={todo.id} className="group flex items-start gap-2 py-1 opacity-60 hover:opacity-100 transition-opacity">
                            <div
                              className="w-4 h-4 mt-0.5 rounded-full bg-[#37352f] flex-shrink-0 flex items-center justify-center cursor-pointer"
                              onClick={() => onToggleTodo(todo.id)}
                            >
                              <Check size={10} className="text-white" />
                            </div>
                            <span className="text-sm text-[#9b9a97] line-through flex-1">{todo.text}</span>
                            <button
                              className="opacity-0 group-hover:opacity-100 text-[#9b9a97] hover:text-red-500"
                              onClick={() => onDeleteTodo(todo.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Context Menu Portal */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed bg-white rounded-lg shadow-xl border border-[#e9e9e8] py-1 z-50 w-48 animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x - 180 }}
        >
          <div className="px-3 py-2 border-b border-[#f0f0ef] text-xs font-semibold text-[#9b9a97]">
            작업 이동
          </div>
          {lists.map(list => (
            <button
              key={list.id}
              className="w-full text-left px-3 py-2 text-sm text-[#37352f] hover:bg-[#f7f7f5] flex items-center gap-2"
              onClick={() => handleMoveTodo(contextMenu.id, list.id)}
            >
              {list.title}
            </button>
          ))}
          <div className="my-1 border-t border-[#f0f0ef]" />
          <button
            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            onClick={() => {
              onDeleteTodo(contextMenu.id);
              setContextMenu(null);
            }}
          >
            <Trash2 size={14} />
            <span>삭제</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default TodoView;
