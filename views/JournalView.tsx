import React, { useState, useEffect, useRef } from 'react';
import { JournalEntry, JournalCategory, Comment, AIAgent } from '../types';
import {
  Trash2,
  Plus,
  ChevronDown,
  BookOpen,
  Edit3,
  Settings,
  MoreHorizontal,
  MoreVertical,
  FolderPlus,
  Search,
  Hash,
  Layout,
  ChevronRight,
  Filter,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { ko } from 'date-fns/locale';

interface JournalViewProps {
  entries: JournalEntry[];
  agents: AIAgent[];
  categories: JournalCategory[];
  selectedId: string | null;
  selectedCategory: string | 'all';
  searchQuery: string;
  onSelectId: (id: string | null) => void;
  onSelectCategory: (category: string | 'all') => void;
  onSearchQuery: (query: string) => void;
  onAddEntry: (title: string, content: string, category: string) => void;
  onUpdateEntry: (id: string, updates: Partial<JournalEntry>) => void;
  onDeleteEntry: (id: string) => void;
  onAddCategory: (name: string) => void;
  onAddComment: (entryId: string, comment: Omit<Comment, 'id' | 'timestamp'>) => void;
  onRequestAiComment: (id: string) => void;
}

const JournalView: React.FC<JournalViewProps> = ({
  entries = [],
  agents = [],
  categories = [],
  selectedId,
  selectedCategory,
  searchQuery,
  onSelectId,
  onSelectCategory,
  onSearchQuery,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  onAddCategory,
  onAddComment,
  onRequestAiComment
}) => {
  const [isWriting, setIsWriting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [isListOpen, setIsListOpen] = useState(true);
  const [visibleRows, setVisibleRows] = useState(5);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // Write Form State
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState(categories[0]?.name || '메모장');

  // Sync selectedId with filtered entries
  useEffect(() => {
    if (isWriting) return;
    const filtered = entries.filter(e => selectedCategory === 'all' || e.category === selectedCategory);
    const isCurrentValid = filtered.some(e => e.id === selectedId);

    if (filtered.length > 0) {
      if (!selectedId || !isCurrentValid) {
        const sorted = [...filtered].sort((a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        onSelectId(sorted[0].id);
      }
    } else {
      if (selectedId !== null) {
        onSelectId(null);
      }
    }
  }, [entries, selectedId, selectedCategory, isWriting, onSelectId]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setShowActions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [newContent, isWriting]);

  const handleCreate = () => {
    if (!newTitle.trim() || !newContent.trim()) return;

    if (editingId) {
      onUpdateEntry(editingId, {
        title: newTitle,
        content: newContent,
        category: newCategory
      });
      setEditingId(null);
    } else {
      onAddEntry(newTitle, newContent, newCategory);
    }

    setNewTitle('');
    setNewContent('');
    setIsWriting(false);
  };

  const handleEdit = () => {
    const entry = entries.find(e => e.id === selectedId);
    if (!entry) return;
    setNewTitle(entry.title || '');
    setNewContent(entry.content || '');
    setNewCategory(entry.category || categories[0]?.name || '메모장');
    setEditingId(entry.id);
    setIsWriting(true);
    setShowActions(false);
  };

  const handleDelete = () => {
    if (!selectedId) return;
    if (window.confirm('정말로 이 메모를 삭제하시겠습니까?')) {
      onDeleteEntry(selectedId);
      onSelectId(null);
      setShowActions(false);
    }
  };

  const formatFullDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      if (!isValid(date)) return '날짜 정보가 없습니다';
      return format(date, 'yyyy년 M월 d일 HH:mm', { locale: ko });
    } catch (e) {
      return '날짜 정보가 없습니다';
    }
  };

  const selectedEntry = (entries || []).find(e => e.id === selectedId);

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="h-14 flex items-center justify-between px-4 sm:px-8 bg-white/80 backdrop-blur-md sticky top-0 z-10 flex-shrink-0 gap-4">
        <div className="flex flex-1 items-center gap-2 overflow-hidden text-sm font-medium text-[#9b9a97] min-w-0">
          {isWriting ? (
            <span className="text-[#37352f] font-medium">{editingId ? '수정' : '작성'}</span>
          ) : selectedEntry ? (
            <>
              <span className="truncate max-w-[120px] font-medium">{selectedEntry.category || '메모장'}</span>
              <ChevronRight size={14} className="opacity-40" />
              <span className="truncate max-w-[200px] text-[#37352f] font-medium">{selectedEntry.title || '제목 없음'}</span>
            </>
          ) : (
            <span className="text-[#37352f] font-medium">보기</span>
          )}
        </div>

      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-[800px] mx-auto py-20 px-4 sm:px-8 w-full animate-in fade-in duration-500">
          {!isWriting && (
            <div className="mb-16">
              {/* Header Controls */}
              <div className="flex items-center justify-between py-4 px-0 border-b border-[#f1f1f0]">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#37352f]">전체보기</span>
                  <span className="text-sm text-[#787774]">{entries.filter(e => selectedCategory === 'all' || e.category === selectedCategory).length}개의 글</span>
                </div>
                <button
                  onClick={() => setIsListOpen(!isListOpen)}
                  className="text-sm text-[#37352f] hover:underline font-medium"
                >
                  {isListOpen ? '목록닫기' : '목록열기'}
                </button>
              </div>

              {isListOpen && (
                <>
                  {/* Table Body */}
                  <div className="">
                    {entries.filter(e => selectedCategory === 'all' || e.category === selectedCategory)
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, visibleRows)
                      .map(entry => (
                        <button
                          key={entry.id}
                          onClick={() => {
                            onSelectId(entry.id);
                          }}
                          className="w-full flex items-center py-4 px-0 text-left transition-colors border-b border-[#f1f1f0] group outline-none"
                        >
                          <div className="flex-1 flex items-center gap-3 min-w-0 pr-4">
                            <span className={`text-[14px] truncate font-medium ${selectedId === entry.id ? 'text-[#37352f]' : 'text-[#787774] group-hover:text-[#37352f]'}`}>
                              {entry.title || '제목 없음'}
                            </span>
                          </div>
                          <div className="w-32 flex-shrink-0 text-right text-[#9b9a97] text-[13px] tabular-nums">
                            {format(parseISO(entry.date), 'yyyy. M. d.', { locale: ko })}
                          </div>
                        </button>
                      ))
                    }
                  </div>

                  {/* Footer Controls */}
                  <div className="flex items-center justify-between py-6">
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setNewTitle('');
                        setNewContent('');
                        setIsWriting(true);
                      }}
                      className="flex items-center gap-1.5 text-xs font-medium text-white bg-[#37352f] hover:bg-black px-4 py-2 rounded-full transition-all shadow-sm"
                    >
                      <Plus size={14} /> 메모하기
                    </button>
                    <div className="relative">
                      <select
                        value={visibleRows}
                        onChange={(e) => setVisibleRows(Number(e.target.value))}
                        className="appearance-none bg-white border border-[#e9e9e8] rounded-md px-4 py-1.5 pr-10 text-xs font-medium text-[#37352f] focus:outline-none focus:ring-2 focus:ring-[#37352f]/5 cursor-pointer"
                      >
                        <option value={5}>5줄 보기</option>
                        <option value={10}>10줄 보기</option>
                        <option value={20}>20줄 보기</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#9b9a97]">
                        <ChevronRight size={14} className="rotate-90" />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {isWriting ? (
            <div className="space-y-10">
              <div className="space-y-8">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium uppercase text-[#787774] tracking-wider px-1">카테고리</span>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="bg-[#f7f7f5] border-none focus:ring-1 focus:ring-[#37352f] px-3 py-1 rounded text-xs font-medium text-[#37352f] transition-all outline-none appearance-none cursor-pointer"
                  >
                    {(categories || []).map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="제목을 입력하세요"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full text-[32px] font-medium border-none focus:ring-0 outline-none p-0 placeholder-[#e1e1e0] tracking-tight leading-tight"
                  autoFocus
                />
              </div>
              <textarea
                ref={textareaRef}
                placeholder="어떤 남기고 싶은 메모가 있나요? 자유롭게 기록해 보세요..."
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                className="w-full text-[16px] leading-[1.8] border-none focus:ring-0 outline-none p-0 resize-none placeholder-[#e1e1e0] overflow-hidden"
              />
              <div className="flex justify-end gap-3 pt-8 border-t border-[#f1f1f0]">
                <button
                  onClick={() => {
                    setIsWriting(false);
                    setEditingId(null);
                  }}
                  className="px-5 py-2 text-sm font-medium text-[#787774] hover:bg-[#f5f5f5] rounded-lg transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newTitle.trim() || !newContent.trim()}
                  className="px-8 py-2 bg-[#37352f] text-white text-sm font-medium rounded-lg hover:bg-black transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg"
                >
                  {editingId ? '수정 내용 저장' : '메모 저장하기'}
                </button>
              </div>
            </div>
          ) : selectedEntry ? (
            <div className="space-y-12">
              <div className="space-y-8">
                <div className="space-y-6 text-left">
                  <div className="inline-block px-2.5 py-1 bg-[#f1f1f0] text-[#787774] text-[10px] font-medium uppercase tracking-widest rounded-md">{selectedEntry.category || '메모장'}</div>
                  <h1 className="text-[32px] font-medium leading-[1.2] tracking-tighter text-[#1a1a1a] break-keep">
                    {selectedEntry.title || '제목 없음'}
                  </h1>

                  <div className="flex items-center justify-between border-b border-[#f1f1f0] pb-8">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2 text-xs text-[#9b9a97]">
                        <span className="font-medium text-[#37352f]">작성일</span>
                        <span className="w-px h-2 bg-[#e9e9e8]" />
                        <span className="font-medium text-[#787774]">
                          {formatFullDate(selectedEntry.date)}
                        </span>
                      </div>
                    </div>

                    <div className="relative" ref={actionMenuRef}>
                      <button
                        onClick={() => setShowActions(!showActions)}
                        className="p-1.5 hover:bg-[#efefef] rounded transition-colors text-[#9b9a97] hover:text-[#37352f]"
                      >
                        <MoreVertical size={20} />
                      </button>
                      {showActions && (
                        <div className="absolute right-0 mt-1 w-32 bg-white border border-[#e9e9e8] rounded-[4px] shadow-lg z-20 py-1 animate-in fade-in zoom-in-95 duration-100">
                          <button onClick={handleEdit} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-[#37352f] hover:bg-[#efefef] transition-colors text-left">
                            <Edit3 size={14} className="text-[#9b9a97]" /> 수정하기
                          </button>
                          <button onClick={handleDelete} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-[#eb5757] hover:bg-[#fff0f0] transition-colors text-left">
                            <Trash2 size={14} /> 삭제하기
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-16">
                  <div className="text-[16px] leading-[1.8] text-[#37352f] whitespace-pre-wrap min-h-[400px] prose prose-slate max-w-none">
                    {selectedEntry.content}
                  </div>

                  {/* AI Comment Section */}
                  <div className="pt-16 border-t border-[#f1f1f0] space-y-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <MessageSquare size={20} className="text-[#37352f]" />
                        <h3 className="text-lg font-medium tracking-tight">AI의 반응 ({selectedEntry.comments?.length || 0})</h3>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#9b9a97] bg-[#f7f7f5] rounded-lg">
                        <Sparkles size={12} />
                        AI가 글을 읽고 있습니다...
                      </div>
                    </div>

                    {selectedEntry.comments && selectedEntry.comments.length > 0 ? (
                      <div className="space-y-8">
                        {selectedEntry.comments.map(comment => {
                          const agent = (agents || []).find(a => a.id === comment.authorId);
                          const avatar = agent?.avatar;
                          const emoji = agent?.emoji || comment.authorEmoji;

                          return (
                            <div key={comment.id} className="flex gap-4">
                              <div className="w-10 h-10 rounded-full bg-[#f7f7f5] flex items-center justify-center text-lg flex-shrink-0 overflow-hidden border border-[#e9e9e8]">
                                {(agent?.avatar) ? (
                                  <img src={agent.avatar} alt={comment.authorName} className="w-full h-full object-cover" />
                                ) : (
                                  comment.authorEmoji || agent?.emoji || '🤖'
                                )}
                              </div>
                              <div className="flex-1 space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-[#37352f]">{agent?.name || comment.authorName}</span>
                                  <span className="text-[11px] text-[#9b9a97]">{formatFullDate(comment.timestamp)}</span>
                                </div>
                                <p className="text-[15px] leading-relaxed text-[#37352f] bg-[#fbfbfa] p-3 rounded-tr-xl rounded-br-xl rounded-bl-xl border border-[#f1f1f0]">
                                  {comment.content}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-10 bg-[#fbfbfa] rounded-xl border border-dashed border-[#e9e9e8]">
                        <p className="text-sm text-[#9b9a97] mb-3">AI가 곧 반응을 남길 거예요.</p>
                        <div className="inline-flex items-center gap-2 px-4 py-2 text-[#9b9a97] text-sm font-medium">
                          <Sparkles size={14} className="text-[#f59e0b] animate-pulse" />
                          분석 중...
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[70vh] flex flex-col items-center justify-center text-[#d3d1cb] space-y-6">
              <div className="p-10 bg-[#f7f7f5] rounded-3xl border border-[#e9e9e8]">
                <BookOpen size={64} className="opacity-20 text-[#37352f]" strokeWidth={1} />
              </div>
              <div className="text-center space-y-2">
                <p className="text-2xl font-medium text-[#37352f]">남기고 싶은 메모가 있나요?</p>
                <p className="text-sm text-[#787774]">중요한 생각이나 기록하고 싶은 순간을 지금 바로 남겨보세요.</p>
              </div>
              <button
                onClick={() => {
                  setEditingId(null);
                  setNewTitle('');
                  setNewContent('');
                  setIsWriting(true);
                }}
                className="px-10 py-4 bg-[#37352f] text-white font-medium rounded-full hover:bg-black transition-all shadow-xl"
              >
                첫 메모 남기기
              </button>
            </div>
          )}
        </div>
      </div>
    </div >
  );
};

export default JournalView;
