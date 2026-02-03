import React, { useState } from 'react';
import { JournalEntry } from '../types';
import { BookOpen, Smile, Frown, Meh, Trash2 } from '../components/Icons';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

interface JournalViewProps {
  entries: JournalEntry[];
  onAddEntry: (content: string, mood: JournalEntry['mood']) => void;
  onDeleteEntry: (id: string) => void;
}

const JournalView: React.FC<JournalViewProps> = ({ entries, onAddEntry, onDeleteEntry }) => {
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<JournalEntry['mood']>('good');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onAddEntry(content, mood);
      setContent('');
      setMood('good');
    }
  };

  const getMoodIcon = (m: JournalEntry['mood'], size = 20) => {
    switch (m) {
      case 'good': return <Smile size={size} />;
      case 'neutral': return <Meh size={size} />;
      case 'bad': return <Frown size={size} />;
    }
  };

  const getMoodColor = (m: JournalEntry['mood']) => {
    switch (m) {
      case 'good': return 'bg-orange-50 text-orange-600 border-orange-200';
      case 'neutral': return 'bg-gray-50 text-gray-600 border-gray-200';
      case 'bad': return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="max-w-[800px] mx-auto text-[#37352f] px-2 font-sans">
      {/* Header */}
      <div className="mb-10 pt-4">
        <h1 className="text-4xl font-bold mb-3 tracking-tight">일기장</h1>
        <p className="text-[#9b9a97] text-lg font-medium">하루의 생각과 감정을 기록해보세요.</p>
      </div>

      {/* Write Area */}
      <div className="bg-white rounded-xl border border-[#e9e9e8] shadow-sm mb-12 overflow-hidden transition-shadow focus-within:shadow-md focus-within:border-[#d3d1cb]">
        <form onSubmit={handleSubmit}>
          <textarea
            className="w-full p-6 text-lg placeholder-[#d3d1cb] resize-none focus:outline-none min-h-[160px] leading-relaxed text-[#37352f]"
            placeholder="오늘 하루는 어떠셨나요?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="px-6 py-4 bg-[#fbfbfa] border-t border-[#e9e9e8] flex justify-between items-center">
            <div className="flex gap-2">
              {(['good', 'neutral', 'bad'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(m)}
                  className={`
                    p-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all border
                    ${mood === m
                      ? 'bg-white shadow-sm border-[#d3d1cb] text-[#37352f] ring-1 ring-[#e9e9e8]'
                      : 'text-[#9b9a97] border-transparent hover:bg-[#efefef] hover:text-[#37352f]'}
                  `}
                >
                  {getMoodIcon(m, 18)}
                  <span>{m === 'good' ? '좋음' : m === 'neutral' ? '보통' : '나쁨'}</span>
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={!content.trim()}
              className="px-5 py-2 bg-[#37352f] text-white rounded-lg hover:bg-[#2f2d28] disabled:opacity-30 disabled:hover:bg-[#37352f] transition-all font-medium text-sm shadow-sm"
            >
              기록하기
            </button>
          </div>
        </form>
      </div>

      {/* Timeline */}
      <div className="relative pl-8 border-l border-[#e9e9e8] space-y-12">
        {entries.length === 0 ? (
          <div className="py-10 text-center text-[#d3d1cb] -ml-8">
            <div className="inline-block p-4 rounded-full bg-[#fbfbfa] mb-3">
              <BookOpen size={32} strokeWidth={1.5} />
            </div>
            <p>작성된 일기가 없습니다.</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="relative group">
              {/* Timeline Dot */}
              <div className="absolute -left-[41px] top-6 w-5 h-5 bg-white border-2 border-[#e9e9e8] rounded-full flex items-center justify-center z-10">
                <div className={`w-2 h-2 rounded-full ${entry.mood === 'good' ? 'bg-orange-400' : entry.mood === 'neutral' ? 'bg-gray-400' : 'bg-slate-400'
                  }`} />
              </div>

              {/* Date Header */}
              <div className="flex items-baseline gap-3 mb-3">
                <h3 className="text-xl font-bold text-[#37352f]">
                  {format(parseISO(entry.date), 'M월 d일', { locale: ko })}
                </h3>
                <span className="text-sm text-[#9b9a97]">
                  {format(parseISO(entry.date), 'EEEE', { locale: ko })}
                </span>
                <span className="text-xs text-[#d3d1cb] font-mono">
                  {format(parseISO(entry.date), 'a h:mm')}
                </span>
              </div>

              {/* Card */}
              <div className="bg-white p-6 rounded-xl border border-[#e9e9e8] shadow-sm hover:shadow-md hover:border-[#d3d1cb] transition-all relative">
                <p className="whitespace-pre-wrap leading-relaxed text-[#37352f] mb-4">
                  {entry.content}
                </p>

                <div className={`
                    inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border
                    ${getMoodColor(entry.mood)}
                `}>
                  {getMoodIcon(entry.mood, 14)}
                  {entry.mood === 'good' ? '기분 좋음' : entry.mood === 'neutral' ? '그저 그럼' : '기분 나쁨'}
                </div>

                <button
                  onClick={() => onDeleteEntry(entry.id)}
                  className="absolute top-4 right-4 text-[#d3d1cb] hover:text-[#eb5757] hover:bg-[#f7f7f5] p-2 rounded transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default JournalView;
