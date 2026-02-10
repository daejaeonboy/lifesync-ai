import React, { useEffect, useState, useRef } from 'react';
import { CommunityPost, AIAgent, Comment } from '../types';
import { format, parseISO, isValid } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
    ChevronRight,
    Sparkles,
    MoreVertical,
    Edit3,
    Trash2,
    MessageSquare,
    Send
} from 'lucide-react';

interface CommunityBoardViewProps {
    agents: AIAgent[];
    posts: CommunityPost[];
    selectedId: string | null;
    onSelectId: (id: string | null) => void;
    selectedAgentId: string;
    onUpdatePost: (id: string, updates: Partial<CommunityPost>) => void;
    onDeletePost: (id: string) => void;
    onAddComment: (postId: string, comment: Omit<Comment, 'id' | 'timestamp'>) => void;
    onUpdateOrder?: (newPosts: CommunityPost[]) => void;
}

const CommunityBoardView: React.FC<CommunityBoardViewProps> = ({
    agents = [],
    posts = [],
    selectedId,
    selectedAgentId,
    onSelectId,
    onUpdatePost,
    onDeletePost,
    onAddComment
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState('');
    const [showActions, setShowActions] = useState(false);
    const [commentInput, setCommentInput] = useState('');
    const actionMenuRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Sync selectedId with filtered entries
    useEffect(() => {
        if (isEditing) return;
        const filtered = posts.filter(p => p.author === selectedAgentId);
        const isCurrentValid = filtered.some(p => p.id === selectedId);

        if (filtered.length > 0) {
            if (!selectedId || !isCurrentValid) {
                const sorted = [...filtered].sort((a, b) =>
                    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                );
                onSelectId(sorted[0].id);
            }
        } else {
            if (selectedId !== null) {
                onSelectId(null);
            }
        }
    }, [posts, selectedId, selectedAgentId, onSelectId, isEditing]);

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

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [editedContent, isEditing]);

    const handleEdit = () => {
        const post = posts.find(p => p.id === selectedId);
        if (!post) return;
        setEditedContent(post.content);
        setIsEditing(true);
        setShowActions(false);
    };

    const handleSave = () => {
        if (!selectedId) return;
        onUpdatePost(selectedId, { content: editedContent });
        setIsEditing(false);
    };

    const handleSubmitComment = () => {
        if (!selectedId || !commentInput.trim()) return;
        onAddComment(selectedId, {
            authorId: 'USER',
            authorName: '나',
            authorEmoji: '👤',
            content: commentInput.trim()
        });
        setCommentInput('');
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

    const selectedPost = (posts || []).find(p => p.id === selectedId);
    const selectedAgent = agents.find(a => a.id === selectedAgentId);

    return (
        <div className="flex flex-col h-full bg-white relative">
            <div className="h-14 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md sticky top-0 z-10 flex-shrink-0">
                <div className="flex items-center gap-2 overflow-hidden text-sm font-medium text-[#9b9a97]">
                    {selectedPost && selectedAgent ? (
                        <>
                            <span className="truncate max-w-[120px] font-medium">{selectedAgent.name}</span>
                            <ChevronRight size={14} className="opacity-40" />
                            <span className="truncate max-w-[200px] text-[#37352f] font-medium">
                                {isEditing ? '편집 중' : 'AI 일기'}
                            </span>
                        </>
                    ) : (
                        <span className="text-[#37352f] font-medium">AI 일기장</span>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="max-w-[800px] mx-auto py-20 px-10 w-full animate-in fade-in duration-500">
                    {selectedPost ? (
                        <div className="space-y-12">
                            <div className="space-y-8">
                                <div className="space-y-6 text-center lg:text-left">
                                    <div className="flex items-center gap-2 mb-2 lg:justify-start justify-center">
                                        <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-lg bg-[#f7f7f5] border border-[#e9e9e8]">
                                            {selectedAgent?.avatar ? (
                                                <img src={selectedAgent.avatar} alt={selectedAgent.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span>{selectedAgent?.emoji}</span>
                                            )}
                                        </div>
                                        <div className="inline-block px-2.5 py-1 bg-[#f7f7f5] text-[#37352f] text-[10px] font-medium uppercase tracking-widest rounded-md">
                                            {selectedAgent?.name} 페르소나
                                        </div>
                                    </div>

                                    <h1 className="text-[52px] font-medium leading-[1.05] tracking-tighter text-[#1a1a1a]">
                                        AI의 기록
                                    </h1>

                                    <div className="flex items-center justify-between border-b border-[#f1f1f0] pb-8">
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-2 text-xs text-[#9b9a97]">
                                                <span className="font-medium text-[#37352f]">생성일</span>
                                                <span className="w-px h-2 bg-[#e9e9e8]" />
                                                <span className="font-medium text-[#787774]">
                                                    {formatFullDate(selectedPost.timestamp)}
                                                </span>
                                            </div>
                                        </div>

                                        {!isEditing && (
                                            <div className="relative" ref={actionMenuRef}>
                                                <button
                                                    onClick={() => setShowActions(!showActions)}
                                                    className="p-1.5 hover:bg-[#efefef] rounded transition-colors text-[#9b9a97] hover:text-[#37352f]"
                                                >
                                                    <MoreVertical size={20} />
                                                </button>
                                                {showActions && (
                                                    <div className="absolute right-0 mt-1 w-32 bg-white border border-[#e9e9e8] rounded-[4px] shadow-lg z-20 py-1 animate-in fade-in zoom-in-95 duration-100">
                                                        <button onClick={handleEdit} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-[#37352f] hover:bg-[#efefef] transition-colors text-left font-medium">
                                                            <Edit3 size={14} className="text-[#9b9a97]" /> 수정하기
                                                        </button>
                                                        <button onClick={() => { onDeletePost(selectedPost.id); setShowActions(false); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-[#eb5757] hover:bg-[#fff0f0] transition-colors text-left font-medium">
                                                            <Trash2 size={14} /> 삭제하기
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {isEditing ? (
                                    <div className="space-y-6">
                                        <textarea
                                            ref={textareaRef}
                                            value={editedContent}
                                            onChange={e => setEditedContent(e.target.value)}
                                            className="w-full text-[19px] leading-[1.9] text-[#37352f] border-none focus:ring-0 outline-none p-0 resize-none placeholder-[#e1e1e0] overflow-hidden"
                                            autoFocus
                                        />
                                        <div className="flex justify-end gap-3 pt-8 border-t border-[#f1f1f0]">
                                            <button onClick={() => setIsEditing(false)} className="px-5 py-2 text-sm font-medium text-[#787774] hover:bg-[#f5f5f5] rounded-lg transition-colors">취소</button>
                                            <button onClick={handleSave} className="px-8 py-2 bg-[#37352f] text-white text-sm font-medium rounded-lg hover:bg-black transition-all shadow-lg">수정 내용 저장</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-16">
                                        <div className="text-[19px] leading-[1.9] text-[#37352f] whitespace-pre-wrap min-h-[400px] prose prose-slate max-w-none">
                                            {selectedPost.content}
                                        </div>

                                        {/* Comment Section */}
                                        <div className="pt-16 border-t border-[#f1f1f0] space-y-10">
                                            <div className="flex items-center gap-2.5">
                                                <MessageSquare size={20} className="text-[#37352f]" />
                                                <h3 className="text-lg font-medium tracking-tight">댓글 {selectedPost.comments?.length || 0}</h3>
                                            </div>

                                            <div className="space-y-8">
                                                {selectedPost.comments?.map(comment => (
                                                    <div key={comment.id} className="flex gap-4 group">
                                                        <div className="w-8 h-8 rounded-full bg-[#f7f7f5] flex items-center justify-center text-sm flex-shrink-0 mt-1">
                                                            {comment.authorEmoji}
                                                        </div>
                                                        <div className="flex-1 space-y-1.5">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-medium text-[#37352f]">{comment.authorName}</span>
                                                                <span className="text-[11px] text-[#9b9a97]">{formatFullDate(comment.timestamp)}</span>
                                                            </div>
                                                            <p className="text-[15px] leading-relaxed text-[#37352f]">{comment.content}</p>
                                                        </div>
                                                    </div>
                                                ))}

                                                <div className="flex gap-4 pt-4">
                                                    <div className="w-8 h-8 rounded-full bg-[#f7f7f5] flex items-center justify-center text-sm flex-shrink-0 mt-1">
                                                        👤
                                                    </div>
                                                    <div className="flex-1 relative">
                                                        <textarea
                                                            value={commentInput}
                                                            onChange={e => setCommentInput(e.target.value)}
                                                            placeholder="기록에 대한 생각을 남겨보세요..."
                                                            className="w-full bg-[#f7f7f5] border-none rounded-2xl px-4 py-3 text-[15px] focus:ring-1 focus:ring-[#37352f] transition-all outline-none resize-none pr-12 min-h-[46px]"
                                                            rows={1}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                                    e.preventDefault();
                                                                    handleSubmitComment();
                                                                }
                                                            }}
                                                        />
                                                        <button
                                                            onClick={handleSubmitComment}
                                                            disabled={!commentInput.trim()}
                                                            className="absolute right-2 top-1.5 p-2 text-[#37352f] hover:bg-white rounded-full transition-all disabled:opacity-20"
                                                        >
                                                            <Send size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-[70vh] flex flex-col items-center justify-center text-[#d3d1cb] space-y-6">
                            <div className="p-10 bg-[#f7f7f5] rounded-3xl border border-[#e9e9e8]">
                                <Sparkles size={64} className="opacity-20 text-[#37352f]" strokeWidth={1} />
                            </div>
                            <div className="text-center space-y-2">
                                <p className="text-2xl font-medium text-[#37352f]">아직 AI의 기록이 없어요</p>
                                <p className="text-sm text-[#787774]">당신의 메모를 바탕으로 AI가 새로운 관점의 일기를 작성해줄 거예요.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommunityBoardView;
