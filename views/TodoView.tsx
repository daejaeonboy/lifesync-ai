import React, { useState, useRef, useEffect } from 'react';
import { Todo, TodoList } from '../types';
import { Check, ChevronRight, MoreVertical, CalendarIcon, Trash2, Plus, GripVertical } from '../components/Icons';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  DropAnimation,
  rectIntersection,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TodoViewProps {
  todos: Todo[];
  lists: TodoList[];
  onAddList: (title: string) => void;
  onUpdateList: (id: string, updates: Partial<TodoList>) => void;
  onUpdateListOrder?: (lists: TodoList[]) => void;
  onAddTodo: (text: string, listId?: string, dueDate?: string) => void;
  onUpdateTodo?: (id: string, updates: Partial<Todo>) => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  onDeleteList: (id: string) => void;
}



// Checkbox Component
const Checkbox = ({ checked, onClick }: { checked: boolean; onClick: (e: React.MouseEvent) => void }) => (
  <button
    type="button"
    aria-pressed={checked}
    className={`w-4 h-4 mt-0.5 rounded-full border flex-shrink-0 cursor-pointer transition-all flex items-center justify-center
      ${checked
        ? 'bg-[#1a73e8] border-[#1a73e8]'
        : 'border-[#5f6368] hover:bg-[#e8eaed]'
      }`}
    onClick={onClick}
  >
    {checked && <Check size={10} className="text-white stroke-[3px]" />}
  </button>
);

// Sortable Todo Item Component
const SortableTodoItem = ({
  todo,
  isEditing,
  editingText,
  setEditingText,
  startEditing,
  saveTodo,
  cancelEditing,
  onToggle,
  onOpenMenu,
  getDueLabel,
}: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: todo.id,
    data: {
      type: 'Todo',
      todo,
    },
    disabled: isEditing,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const dueLabel = getDueLabel(todo.dueDate);

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="opacity-40 bg-gray-50 border border-dashed border-gray-300 rounded px-3 py-2.5 h-[50px] mb-1"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative px-3 py-2.5 rounded hover:bg-[#f5f5f5] hover:shadow-sm transition-all flex items-start gap-3 cursor-pointer ${isEditing ? 'bg-white shadow ring-2 ring-[#1a73e8] z-10' : ''}`}
      onClick={() => !isEditing && startEditing(todo)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (isEditing) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          startEditing(todo);
        }
      }}
      {...attributes}
      {...listeners}
    >
      <Checkbox checked={todo.completed} onClick={(e) => { e.stopPropagation(); onToggle(todo.id); }} />

      <div className="flex-1 min-w-0 ml-1">
        {isEditing ? (
          <input
            autoFocus
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            onBlur={saveTodo}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveTodo();
              if (e.key === 'Escape') cancelEditing();
            }}
            className="w-full text-[14px] text-[#1f1f1f] bg-transparent border-b border-[#1a73e8] focus:outline-none"
            onPointerDown={e => e.stopPropagation()}
          />
        ) : (
          <p className="text-[14px] text-[#1f1f1f] leading-snug break-words">
            {todo.text}
          </p>
        )}

        {dueLabel && (
          <span className="block mt-1 text-[11px] text-[#d93025] font-medium">
            {dueLabel}
          </span>
        )}
      </div>

      {!isEditing && (
        <button
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#e0e0e0] rounded-full text-[#5f6368] transition-all"
          onClick={(e) => {
            e.stopPropagation();
            onOpenMenu(e, todo);
          }}
          onPointerDown={e => e.stopPropagation()}
        >
          <MoreVertical size={16} />
        </button>
      )}
    </div>
  );
};

// Sortable Column (List) Component
const SortableList = ({
  list,
  lists,
  todos,
  editingListId,
  editingListTitle,
  setEditingListTitle,
  saveListTitle,
  setEditingListId,
  startEditingList,
  handleMoveTodo,
  onAddTodo,
  onUpdateTodo,
  onToggleTodo,
  onDeleteTodo,
  editingTodoId,
  editingTodoText,
  setEditingTodoText,
  setEditingTodoId,
  startEditingTodo,
  saveTodoText,
  setContextMenu,
  setListMenu, // Changed logic to pass setListMenu
  getDueLabel,
}: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: list.id,
    data: {
      type: 'List',
      list,
    },
    disabled: editingListId === list.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const listTodos = todos.filter((t: Todo) => t.listId === list.id);
  const pending = listTodos.filter((t: Todo) => !t.completed);
  const completed = listTodos.filter((t: Todo) => t.completed);
  const [draft, setDraft] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);

  const handleAdd = () => {
    if (!draft.trim()) return;
    onAddTodo(draft.trim(), list.id);
    setDraft('');
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="min-w-[300px] w-[300px] h-[400px] bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl opacity-50"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="min-w-[300px] w-[300px] flex flex-col h-fit max-h-full bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.12)] border border-[#e9e9e8]"
    >
      {/* Column Header - Drag Handle */}
      <div
        className="flex items-center justify-between px-4 py-3 pt-4 flex-shrink-0 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        {editingListId === list.id ? (
          <input
            autoFocus
            value={editingListTitle}
            onChange={(e) => setEditingListTitle(e.target.value)}
            onBlur={saveListTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveListTitle();
              if (e.key === 'Escape') setEditingListId(null);
            }}
            className="font-medium text-lg text-[#1f1f1f] bg-transparent border-b-2 border-[#1a73e8] focus:outline-none w-full"
            onPointerDown={e => e.stopPropagation()}
          />
        ) : (
          <h3
            className="font-medium text-lg text-[#1f1f1f] cursor-text"
            onClick={(e) => {
              e.stopPropagation();
              startEditingList(list);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            title="클릭하여 제목 수정"
          >
            {list.title}
          </h3>
        )}
        <div className="flex items-center gap-1">

          <button
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f5f5f5] text-[#5f6368]"
            onPointerDown={e => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setListMenu({ id: list.id, x: e.clientX, y: e.clientY });
            }}
          >
            <MoreVertical size={18} />
          </button>
        </div>
      </div>

      {/* Add Todo Button */}
      <div className="px-2 mb-1 flex-shrink-0">
        {draft !== '' ? (
          <div className="mx-2 mb-2 bg-white rounded shadow-sm border border-gray-200">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') setDraft('');
              }}
              placeholder="할 일 추가"
              className="w-full px-3 py-3 text-sm focus:outline-none bg-transparent"
              onPointerDown={e => e.stopPropagation()}
            />
          </div>
        ) : (
          <button
            onClick={() => setDraft(' ')}
            className="w-full text-left px-2 py-2 text-[13px] text-[#1a73e8] font-medium rounded hover:bg-[#ebf5fc] transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            할 일 추가
          </button>
        )}
      </div>

      {/* Sortable List Area */}
      <div className="flex-1 overflow-y-auto px-2 pt-1 pb-4 min-h-[50px]">
        <SortableContext
          id={list.id}
          items={pending.map((t: Todo) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-0.5 min-h-[10px]">
            {pending.map((todo: Todo) => (
              <SortableTodoItem
                key={todo.id}
                todo={todo}
                isEditing={editingTodoId === todo.id}
                editingText={editingTodoText}
                setEditingText={setEditingTodoText}
                startEditing={startEditingTodo}
                saveTodo={saveTodoText}
                cancelEditing={() => { setEditingTodoId(null); setEditingTodoText(''); }}
                onToggle={onToggleTodo}
                onOpenMenu={(e: any, t: Todo) => {
                  setContextMenu({ id: t.id, x: e.clientX, y: e.clientY });
                }}
                getDueLabel={getDueLabel}
              />
            ))}
          </div>
        </SortableContext>

        {/* Completed Section */}
        {completed.length > 0 && (
          <div className="mt-4 pt-2 border-t border-transparent">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="flex items-center gap-2 text-sm font-medium text-[#5f6368] hover:bg-[#f5f5f5] px-2 py-1.5 rounded transition-colors w-full mb-1"
            >
              <ChevronRight
                size={16}
                className={`transition-transform duration-200 ${showCompleted ? 'rotate-90' : ''}`}
              />
              <span>완료됨 ({completed.length})</span>
            </button>

            {showCompleted && (
              <div className="space-y-0.5">
                {completed.map((todo: Todo) => (
                  <div key={todo.id} className="group flex items-start gap-3 px-3 py-2.5 rounded hover:bg-[#f5f5f5]">
                    <button
                      type="button"
                      aria-label="완료 취소"
                      className="w-4 h-4 mt-0.5 rounded-full bg-[#1a73e8] border border-[#1a73e8] flex-shrink-0 flex items-center justify-center cursor-pointer"
                      onClick={() => onToggleTodo(todo.id)}
                    >
                      <Check size={10} className="text-white stroke-[3px]" />
                    </button>
                    <span className="text-[14px] text-[#5f6368] line-through flex-1 decoration-[#5f6368]">{todo.text}</span>
                    <button
                      className="opacity-0 group-hover:opacity-100 text-[#5f6368] hover:text-[#d93025] p-1"
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
};

const TodoView: React.FC<TodoViewProps> = ({
  todos,
  lists,
  onAddList,
  onUpdateList,
  onUpdateListOrder,
  onAddTodo,
  onUpdateTodo,
  onToggleTodo,
  onDeleteTodo,
  onDeleteList
}) => {
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListTitle, setEditingListTitle] = useState('');

  // Editing state for todo text
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editingTodoText, setEditingTodoText] = useState('');

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [listMenu, setListMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const listMenuRef = useRef<HTMLDivElement>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'List' | 'Todo' | null>(null);

  const sortedLists = [...lists].sort((a, b) => a.order - b.order);

  // Infinite Canvas State
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ left: 0, top: 0 });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
      if (listMenuRef.current && !listMenuRef.current.contains(event.target as Node)) {
        setListMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Background Panning Logic
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan if clicking on the background container itself
    if (e.target === containerRef.current) {
      setIsPanning(true);
      setStartPan({ x: e.clientX, y: e.clientY });
      if (containerRef.current) {
        setScrollStart({
          left: containerRef.current.scrollLeft,
          top: containerRef.current.scrollTop
        });
      }
      document.body.style.cursor = 'grabbing';
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || !containerRef.current) return;
    const dx = e.clientX - startPan.x;
    const dy = e.clientY - startPan.y;
    containerRef.current.scrollLeft = scrollStart.left - dx;
    containerRef.current.scrollTop = scrollStart.top - dy;
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    document.body.style.cursor = '';
  };

  const startEditingList = (list: TodoList) => {
    setEditingListId(list.id);
    setEditingListTitle(list.title);
  };

  const saveListTitle = () => {
    if (editingListId && editingListTitle.trim()) {
      onUpdateList(editingListId, { title: editingListTitle.trim() });
    }
    setEditingListId(null);
    setEditingListTitle('');
  };

  const startEditingTodo = (todo: Todo) => {
    setEditingTodoId(todo.id);
    setEditingTodoText(todo.text);
    setContextMenu(null);
  };

  const saveTodoText = () => {
    if (editingTodoId && onUpdateTodo) {
      if (editingTodoText.trim()) {
        onUpdateTodo(editingTodoId, { text: editingTodoText.trim() });
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

  // DnD Handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setActiveType(event.active.data.current?.type || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    // We only care about drag over if we are dragging a TODO
    if (active.data.current?.type !== 'Todo') return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTodo = todos.find(t => t.id === activeId);
    const overTodo = todos.find(t => t.id === overId);

    if (!activeTodo) return;

    // Case 1: Over a list container directly (e.g. empty list or header)
    if (lists.some(l => l.id === overId)) {
      if (activeTodo.listId !== overId) {
        // Optimistic update logic could go here if using local state for todos
      }
      return;
    }

    // Case 2: Over another todo
    if (overTodo && activeTodo.listId !== overTodo.listId) {
      // Different list - dragging todo to another list's todo
      // Handled in DragEnd usually for DB sync, or here for UI optimistic update
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveType(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Handle List Reordering
    if (active.data.current?.type === 'List' && over.data.current?.type === 'List') {
      if (activeId !== overId) {
        const oldIndex = lists.findIndex(l => l.id === activeId);
        const newIndex = lists.findIndex(l => l.id === overId);
        const newLists = arrayMove<TodoList>(lists, oldIndex, newIndex);

        // Update orders
        const updatedLists = newLists.map((list, index) => ({
          ...list,
          order: index
        }));

        if (onUpdateListOrder) {
          onUpdateListOrder(updatedLists);
        }
      }
      return;
    }

    // Handle Todo Reordering/Moving
    const activeTodo = todos.find(t => t.id === activeId);
    if (!activeTodo) return;

    // Dropped onto a list container
    if (lists.some(l => l.id === overId)) {
      if (activeTodo.listId !== overId && onUpdateTodo) {
        onUpdateTodo(activeId, { listId: overId });
      }
      return;
    }

    // Dropped onto another todo
    const overTodo = todos.find(t => t.id === overId);
    if (overTodo && onUpdateTodo) {
      if (activeTodo.listId !== overTodo.listId) {
        onUpdateTodo(activeId, { listId: overTodo.listId });
      }
      // Same list reordering is not persisted in DB yet as per requirements
    }
  };

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection} // Better for 2D lists
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div
        ref={containerRef}
        className="flex flex-col h-full bg-white font-sans overflow-y-auto overflow-x-hidden select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isPanning ? 'grabbing' : 'auto' }}
      >
        {/* Infinite Canvas Content Area */}
        <div className="flex-1 py-10 px-4 sm:px-8 min-w-fit min-h-fit">
          <SortableContext
            items={lists.map(l => l.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex flex-wrap gap-6 items-start">
              {sortedLists.map((list) => (
                <SortableList
                  key={list.id}
                  list={list}
                  lists={lists}
                  todos={todos}
                  editingListId={editingListId}
                  editingListTitle={editingListTitle}
                  setEditingListTitle={setEditingListTitle}
                  saveListTitle={saveListTitle}
                  setEditingListId={setEditingListId}
                  startEditingList={startEditingList}
                  handleMoveTodo={handleMoveTodo}
                  onAddTodo={onAddTodo}
                  onUpdateTodo={onUpdateTodo}
                  onToggleTodo={onToggleTodo}
                  onDeleteTodo={onDeleteTodo}
                  editingTodoId={editingTodoId}
                  editingTodoText={editingTodoText}
                  setEditingTodoText={setEditingTodoText}
                  setEditingTodoId={setEditingTodoId}
                  startEditingTodo={startEditingTodo}
                  saveTodoText={saveTodoText}
                  setContextMenu={setContextMenu}
                  setListMenu={setListMenu}
                  getDueLabel={getDueLabel}
                />
              ))}

              {/* Add List Placeholder or Button */}
              <div className="min-w-[50px] h-[50px] flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity">
                <button
                  className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center text-[#1a73e8]"
                  onClick={() => onAddList("새 목록")}
                >
                  <Plus />
                </button>
              </div>
            </div>
          </SortableContext>
        </div>

        {/* Drag Overlay */}
        <DragOverlay dropAnimation={dropAnimation}>
          {activeId ? (
            activeType === 'List' ? (
              <div className="min-w-[300px] w-[300px] h-[400px] bg-white rounded-xl shadow-2xl border border-[#1a73e8] opacity-90 cursor-grabbing p-4">
                <div className="font-medium text-lg text-[#1f1f1f]">{lists.find(l => l.id === activeId)?.title}</div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-xl border border-[#1a73e8] p-3 flex items-center gap-3 opacity-90 cursor-grabbing ring-2 ring-[#1a73e8] z-50">
                {(() => {
                  const todo = todos.find(t => t.id === activeId);
                  if (!todo) return null;
                  return (
                    <>
                      <Checkbox checked={todo.completed} onClick={() => { }} />
                      <span className="text-[14px] text-[#1f1f1f]">{todo.text}</span>
                    </>
                  )
                })()}
              </div>
            )
          ) : null}
        </DragOverlay>

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
        {listMenu && (
          <div
            ref={listMenuRef}
            className="fixed bg-white rounded-lg shadow-xl border border-[#e9e9e8] py-1 z-50 w-40 animate-in fade-in zoom-in-95 duration-100"
            style={{ top: listMenu.y, left: listMenu.x - 140 }}
          >
            <div className="px-3 py-2 border-b border-[#f0f0ef] text-xs font-semibold text-[#9b9a97]">
              목록 관리
            </div>

            <button
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              onClick={() => {
                onDeleteList(listMenu.id);
                setListMenu(null);
              }}
            >
              <Trash2 size={14} />
              <span>목록 삭제</span>
            </button>
          </div>
        )}
      </div>
    </DndContext>
  );
};

export default TodoView;
