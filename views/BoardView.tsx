import React, { useState } from 'react';
import { AiPost, CalendarEvent, Todo, JournalEntry } from '../types';
import { Sparkles, Layout, CalendarIcon, CheckSquare, BookOpen, ChevronRight, Check } from '../components/Icons';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

interface BoardViewProps {
  posts: AiPost[];
  events: CalendarEvent[];
  todos: Todo[];
  entries: JournalEntry[];
  onAddPost: (post: AiPost) => void;
  onDeletePost: (id: string) => void;
  onToggleTodo: (id: string) => void;
}

const BoardView: React.FC<BoardViewProps> = ({ posts, events, todos, entries, onAddPost, onDeletePost, onToggleTodo }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const pendingTodos = todos.filter(t => !t.completed).slice(0, 3);
  const todayEvents = events.slice(0, 3); // In real app, filter by today

  const handleGenerateInsight = async () => {
    setIsGenerating(true);
    // Simulation of AI generation
    setTimeout(() => {
      const newPost: AiPost = {
        id: crypto.randomUUID(),
        title: '오늘의 생산성 리포트',
        content: `최근 업무 관련 일정이 3건 완수되었습니다. 집중력이 매우 좋은 하루였네요! 다만, 일기장에 '피곤함' 키워드가 감지되었습니다. 오늘은 30분 일찍 취침하는 것을 추천드립니다.`,
        date: new Date().toISOString(),
        tags: ['생산성', '건강'],
        type: 'analysis'
      };
      onAddPost(newPost);
      setIsGenerating(false);
    }, 2000);
  };

  return (
    <div className="max-w-[1000px] mx-auto text-[#37352f] px-2 font-sans h-full flex gap-12">

      {/* Main Feed Area */}
      <div className="flex-1 overflow-y-auto pr-2 pb-20">
        <div className="mb-8 pt-4">
          <h1 className="text-4xl font-bold mb-3 tracking-tight">AI 인사이트</h1>
          <p className="text-[#9b9a97] text-lg font-medium">나의 기록을 분석하여 더 나은 하루를 제안합니다.</p>
        </div>

        {/* Generate Button */}
        <div className="mb-10">
          <button
            onClick={handleGenerateInsight}
            disabled={isGenerating}
            className={`
              w-full py-4 rounded-xl border border-[#e9e9e8] shadow-sm flex items-center justify-center gap-3 transition-all group
              ${isGenerating ? 'bg-[#f7f7f5] text-[#9b9a97] cursor-not-allowed' : 'bg-white hover:bg-[#fbfbfa] hover:border-[#d3d1cb] hover:shadow-md'}
            `}
          >
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center
              ${isGenerating ? 'bg-[#e0e0e0]' : 'bg-gradient-to-tr from-indigo-500 to-purple-500 text-white'}
            `}>
              <Sparkles size={16} className={isGenerating ? 'animate-spin' : ''} />
            </div>
            <span className="font-semibold text-lg">
              {isGenerating ? '기록을 분석하고 있습니다...' : '새로운 인사이트 생성하기'}
            </span>
          </button>
        </div>

        {/* AI Posts Feed */}
        <div className="space-y-8">
          {posts.length === 0 ? (
            <div className="text-center py-16 bg-[#fbfbfa] rounded-xl border border-dashed border-[#e9e9e8]">
              <Sparkles className="mx-auto text-[#d3d1cb] mb-3" size={32} />
              <p className="text-[#9b9a97]">아직 분석 리포트가 없습니다.</p>
              <p className="text-sm text-[#d3d1cb] mt-1">상단 버튼을 눌러 첫 번째 분석을 받아보세요.</p>
            </div>
          ) : (
            posts.map(post => (
              <article key={post.id} className="bg-white rounded-xl border border-[#e9e9e8] p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <span className="bg-gradient-to-tr from-indigo-500 to-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                      AI Analysis
                    </span>
                    <span className="text-sm text-[#9b9a97]">
                      {format(parseISO(post.date), 'M월 d일 a h:mm', { locale: ko })}
                    </span>
                  </div>
                </div>

                <h3 className="text-2xl font-bold mb-3 text-[#37352f]">{post.title}</h3>
                <p className="text-[#37352f] leading-relaxed whitespace-pre-line mb-6 text-lg">
                  {post.content}
                </p>

                <div className="flex justify-between items-center border-t border-[#f7f7f5] pt-4">
                  <div className="flex gap-2">
                    {post.tags.map(tag => (
                      <span key={tag} className="text-xs bg-[#f7f7f5] text-[#787774] px-2 py-1 rounded border border-[#e9e9e8]">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>

      {/* Right Sidebar (Dashboard) */}
      <div className="hidden lg:block w-[320px] pt-4">
        {/* Today's Summary Widget */}
        <div className="sticky top-8 space-y-8">

          {/* Calendar Widget */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#9b9a97] uppercase tracking-wider flex items-center gap-2">
                <CalendarIcon size={16} /> 일정 요약
              </h3>
            </div>
            <div className="bg-[#fbfbfa] border border-[#e9e9e8] rounded-xl p-4 shadow-sm">
              {todayEvents.length === 0 ? (
                <p className="text-sm text-[#9b9a97] text-center py-2">오늘 예정된 일정이 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {todayEvents.map(event => (
                    <div key={event.id} className="flex items-center gap-3">
                      <div className={`w-1.5 h-1.5 rounded-full ${event.type === 'important' ? 'bg-[#37352f]' : 'bg-[#d3d1cb]'}`} />
                      <div className="flex-1 truncate">
                        <div className="text-sm font-medium text-[#37352f] truncate">{event.title}</div>
                        <div className="text-xs text-[#9b9a97]">
                          {event.startTime || 'All Day'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Todo Widget */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#9b9a97] uppercase tracking-wider flex items-center gap-2">
                <CheckSquare size={16} /> 할 일
              </h3>
            </div>
            <div className="bg-white border border-[#e9e9e8] rounded-xl p-1 shadow-sm">
              {pendingTodos.length === 0 ? (
                <p className="text-sm text-[#9b9a97] text-center py-6">모든 작업을 완료했습니다!</p>
              ) : (
                <div>
                  {pendingTodos.map(todo => (
                    <div key={todo.id} className="flex items-center p-3 hover:bg-[#f7f7f5] rounded-lg transition-colors group cursor-pointer" onClick={() => onToggleTodo(todo.id)}>
                      <div className="w-4 h-4 rounded border border-[#d3d1cb] flex items-center justify-center mr-3 group-hover:border-[#37352f] transition-colors">
                        {/* Custom Checkbox */}
                      </div>
                      <span className="text-sm text-[#37352f] flex-1">{todo.text}</span>
                    </div>
                  ))}
                </div>
              )}
              {pendingTodos.length > 0 && <div className="p-2 text-center border-t border-[#f7f7f5] text-xs text-[#9b9a97] cursor-pointer hover:text-[#37352f]">전체 보기</div>}
            </div>
          </section>

        </div>
      </div>

    </div>
  );
};

export default BoardView;