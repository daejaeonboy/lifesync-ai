import React, { useMemo, useState } from 'react';
import { ActivityItem, CalendarEvent, JournalEntry, Todo, TodoList } from '../types';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

interface SearchActivityViewProps {
  events: CalendarEvent[];
  todos: Todo[];
  entries: JournalEntry[];
  lists: TodoList[];
  activityLog: ActivityItem[];
  onClearLog: () => void;
}

type ItemKind = 'event' | 'todo' | 'journal';

interface UnifiedItem {
  id: string;
  kind: ItemKind;
  title: string;
  description?: string;
  date: string;
  meta?: string;
  completed?: boolean;
}

const activityMeta: Record<ActivityItem['type'], { label: string; icon: string; group: 'calendar' | 'todo' | 'journal' }> = {
  event_added: { label: '일정 추가', icon: '📅', group: 'calendar' },
  event_deleted: { label: '일정 삭제', icon: '🗑️', group: 'calendar' },
  event_updated: { label: '일정 수정', icon: '✏️', group: 'calendar' },
  todo_added: { label: '할 일 추가', icon: '☑️', group: 'todo' },
  todo_completed: { label: '할 일 완료', icon: '✅', group: 'todo' },
  todo_uncompleted: { label: '완료 취소', icon: '↩️', group: 'todo' },
  todo_deleted: { label: '할 일 삭제', icon: '🗑️', group: 'todo' },
  journal_added: { label: '일기 기록', icon: '📝', group: 'journal' },
  journal_deleted: { label: '일기 삭제', icon: '🗑️', group: 'journal' },
};

const SearchActivityView: React.FC<SearchActivityViewProps> = ({
  events,
  todos,
  entries,
  lists,
  activityLog,
  onClearLog,
}) => {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'all' | ItemKind>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [todoStatus, setTodoStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activityFilter, setActivityFilter] = useState<'all' | 'calendar' | 'todo' | 'journal'>('all');

  const listMap = useMemo(() => new Map(lists.map(l => [l.id, l.title])), [lists]);

  const items = useMemo<UnifiedItem[]>(() => {
    const eventItems: UnifiedItem[] = events.map(e => ({
      id: e.id,
      kind: 'event',
      title: e.title,
      description: e.description,
      date: e.date,
      meta: e.startTime ? `${e.startTime}` : undefined,
    }));

    const todoItems: UnifiedItem[] = todos.map(t => ({
      id: t.id,
      kind: 'todo',
      title: t.text,
      date: t.date,
      completed: t.completed,
      meta: listMap.get(t.listId || '') || '목록 미지정',
      description: t.dueDate ? `마감: ${t.dueDate}` : undefined,
    }));

    const journalItems: UnifiedItem[] = entries.map(e => ({
      id: e.id,
      kind: 'journal',
      title: e.content.slice(0, 40) + (e.content.length > 40 ? '…' : ''),
      description: e.content,
      date: e.date,
      meta: e.mood === 'good' ? '좋음' : e.mood === 'bad' ? '안좋음' : '보통',
    }));

    return [...eventItems, ...todoItems, ...journalItems];
  }, [events, todos, entries, listMap]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const start = startDate ? parseISO(startDate) : null;
    const end = endDate ? parseISO(endDate) : null;

    return items
      .filter(item => (kind === 'all' ? true : item.kind === kind))
      .filter(item => {
        if (item.kind !== 'todo' || todoStatus === 'all') return true;
        return todoStatus === 'completed' ? item.completed : !item.completed;
      })
      .filter(item => {
        if (!start && !end) return true;
        const d = parseISO(item.date);
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      })
      .filter(item => {
        if (!q) return true;
        const hay = `${item.title} ${item.description ?? ''}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => {
        const aTime = parseISO(a.date).getTime();
        const bTime = parseISO(b.date).getTime();
        return sortOrder === 'desc' ? bTime - aTime : aTime - bTime;
      });
  }, [items, query, kind, todoStatus, startDate, endDate, sortOrder]);

  const activityFiltered = activityLog.filter(item => {
    if (activityFilter === 'all') return true;
    return activityMeta[item.type]?.group === activityFilter;
  });

  return (
    <div className="max-w-[1000px] mx-auto text-[#37352f] px-2 font-sans">
      <div className="mb-8 pt-4">
        <h1 className="text-4xl font-bold mb-3 tracking-tight">검색/기록</h1>
        <p className="text-[#9b9a97] text-lg font-medium">데이터를 찾고, 흐름을 확인하세요.</p>
      </div>

      <div className="bg-white border border-[#e9e9e8] rounded-xl p-5 shadow-sm mb-10">
        <div className="flex flex-col lg:flex-row gap-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색어를 입력하세요..."
            className="flex-1 p-3 border border-[#e9e9e8] rounded-lg focus:outline-none focus:border-[#37352f] focus:ring-1 focus:ring-[#37352f]/10"
          />
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            className="p-3 border border-[#e9e9e8] rounded-lg bg-white text-sm"
          >
            <option value="desc">최신순</option>
            <option value="asc">오래된순</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {[
            { id: 'all', label: '전체' },
            { id: 'event', label: '일정' },
            { id: 'todo', label: '할 일' },
            { id: 'journal', label: '일기' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setKind(tab.id as typeof kind)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                kind === tab.id
                  ? 'bg-[#37352f] text-white border-[#37352f] font-medium shadow-sm'
                  : 'bg-white text-[#9b9a97] border-[#e9e9e8] hover:bg-[#f7f7f5] hover:border-[#d3d1cb]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 mt-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#9b9a97]">시작</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="p-2 border border-[#e9e9e8] rounded-lg text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#9b9a97]">종료</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="p-2 border border-[#e9e9e8] rounded-lg text-sm"
            />
          </div>

          {kind === 'todo' && (
            <div className="flex items-center gap-2">
              {[
                { id: 'all', label: '전체' },
                { id: 'pending', label: '미완료' },
                { id: 'completed', label: '완료' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTodoStatus(t.id as typeof todoStatus)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                    todoStatus === t.id
                      ? 'bg-[#37352f] text-white border-[#37352f]'
                      : 'bg-white text-[#9b9a97] border-[#e9e9e8] hover:bg-[#f7f7f5]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3 mb-14">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-[#d3d1cb] border border-dashed border-[#e9e9e8] rounded-xl">
            <p>검색 결과가 없습니다.</p>
          </div>
        ) : (
          filtered.map(item => (
            <div key={`${item.kind}-${item.id}`} className="bg-white border border-[#e9e9e8] rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-[#9b9a97]">
                <span className="uppercase tracking-wider">
                  {item.kind === 'event' ? '일정' : item.kind === 'todo' ? '할 일' : '일기'}
                </span>
                <span>·</span>
                <span>{format(parseISO(item.date), 'M월 d일 HH:mm', { locale: ko })}</span>
              </div>
              <div className="mt-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-[#37352f] truncate">{item.title}</p>
                  {item.description && (
                    <p className="text-sm text-[#787774] mt-1 line-clamp-2">{item.description}</p>
                  )}
                </div>
                {item.meta && (
                  <span className="text-xs px-2 py-1 rounded-full bg-[#f7f7f5] text-[#9b9a97] whitespace-nowrap">
                    {item.meta}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">활동 기록</h2>
        <button
          onClick={onClearLog}
          className="px-4 py-2 text-sm text-[#9b9a97] hover:text-[#37352f] border border-[#e9e9e8] rounded-lg hover:bg-[#f7f7f5] transition-colors"
        >
          기록 지우기
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {[
          { id: 'all', label: '전체' },
          { id: 'calendar', label: '일정' },
          { id: 'todo', label: '할 일' },
          { id: 'journal', label: '일기' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActivityFilter(tab.id as typeof activityFilter)}
            className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
              activityFilter === tab.id
                ? 'bg-[#37352f] text-white border-[#37352f] font-medium shadow-sm'
                : 'bg-white text-[#9b9a97] border-[#e9e9e8] hover:bg-[#f7f7f5] hover:border-[#d3d1cb]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {activityFiltered.length === 0 ? (
          <div className="py-12 text-center text-[#d3d1cb] border border-dashed border-[#e9e9e8] rounded-xl">
            <p>활동 기록이 없습니다.</p>
          </div>
        ) : (
          activityFiltered.map(item => {
            const meta = activityMeta[item.type];
            return (
              <div key={item.id} className="flex items-start gap-4 bg-white border border-[#e9e9e8] rounded-xl p-4 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-[#f7f7f5] flex items-center justify-center text-lg">
                  {meta?.icon ?? '•'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#37352f]">{meta?.label ?? item.type}</span>
                    <span className="text-xs text-[#9b9a97]">
                      {format(parseISO(item.timestamp), 'M월 d일 HH:mm', { locale: ko })}
                    </span>
                  </div>
                  <p className="text-sm text-[#787774] mt-1 truncate">{item.label}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SearchActivityView;
