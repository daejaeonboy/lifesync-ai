import React from 'react';
import { CommunityPost, AIAgent, CalendarEvent, Todo, JournalEntry } from '../types';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

// Default AI Agents Configuration - 3명
const DEFAULT_AGENTS: AIAgent[] = [
    { id: 'ARIA', name: '아리아', emoji: '🧮', role: '분석가', personality: '', tone: '', color: '#37352f' },
    { id: 'MOMO', name: '모모', emoji: '💛', role: '응원단장', personality: '', tone: '', color: '#37352f' },
    { id: 'SAGE', name: '세이지', emoji: '🎯', role: '전략가', personality: '', tone: '', color: '#37352f' },
];

interface CommunityBoardViewProps {
    events: CalendarEvent[];
    todos: Todo[];
    entries: JournalEntry[];
    agents: AIAgent[];
    posts: CommunityPost[];
}

const CommunityBoardView: React.FC<CommunityBoardViewProps> = ({
    agents,
    posts,
}) => {
    const getAgentById = (id: AIAgent['id']) => agents.find(a => a.id === id) || DEFAULT_AGENTS.find(a => a.id === id) || DEFAULT_AGENTS[0];

    const sortedPosts = [...posts].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Group posts by thread (replyTo)
    const threadedPosts = sortedPosts.reduce((acc, post) => {
        if (!post.replyTo) {
            acc.push({ parent: post, replies: [] });
        } else {
            const thread = acc.find(t => t.parent.id === post.replyTo);
            if (thread) {
                thread.replies.push(post);
            } else {
                acc.push({ parent: post, replies: [] });
            }
        }
        return acc;
    }, [] as { parent: CommunityPost; replies: CommunityPost[] }[]);

    return (
        <div className="max-w-[720px] mx-auto text-[#37352f] px-4 py-8 font-sans">
            {/* Minimal Header */}
            <div className="mb-12 text-center">
                <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 bg-[#f0f0f0] rounded-full">
                    <span className="w-2 h-2 rounded-full bg-[#37352f] animate-pulse"></span>
                    <span className="text-xs font-medium text-[#787774] tracking-wide uppercase">AI Community Live</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight mb-2 text-[#2f2f2f]">나의 디지털 자문단</h1>
                <p className="text-[#9b9a97] text-sm">3명의 AI가 당신의 일상을 함께 고민하고 응원합니다.</p>
            </div>

            {/* Elegant Agent Avatars Row */}
            <div className="flex justify-center mb-16">
                <div className="flex -space-x-4 items-center">
                    {agents.map((agent, index) => (
                        <div key={agent.id} className="relative group z-0 hover:z-10 transition-all duration-300 hover:-translate-y-2">
                            <div
                                className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-md border-[3px] border-white transition-all group-hover:shadow-xl bg-[#f7f7f5]"
                            >
                                <span className="drop-shadow-sm filter">{agent.emoji}</span>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 text-white text-xs py-1 px-2 rounded transition-opacity duration-300 pointer-events-none">
                                {agent.name}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Posts Feed: Modern Card Style */}
            <div className="space-y-12 relative">
                {/* Vertical Guide Line */}
                <div className="absolute left-[27px] top-6 bottom-0 w-[2px] bg-[#e9e9e8] z-[-1]" />

                {sortedPosts.length === 0 ? (
                    <div className="text-center py-24 px-8 bg-[#fbfbfa] rounded-3xl border border-[#e9e9e8] border-dashed">
                        <div className="text-5xl mb-6 opacity-30 grayscale filter blur-[1px]">🎭</div>
                        <h3 className="text-lg font-semibold mb-2 text-[#5a5a5a]">대화가 시작되기를 기다리고 있어요</h3>
                        <p className="text-[#9b9a97] text-sm mb-6 leading-relaxed max-w-sm mx-auto">
                            할 일을 완료하거나 일기를 쓰면<br />
                            AI들이 자동으로 이야기를 시작합니다.
                        </p>
                    </div>
                ) : (
                    threadedPosts.map(thread => {
                        const parentAgent = getAgentById(thread.parent.author);

                        return (
                            <div key={thread.parent.id} className="relative group animate-[scaleIn_0.3s_ease-out]">
                                {/* Parent Post */}
                                <div className="flex gap-5">
                                    {/* Avatar Column */}
                                    <div className="flex-shrink-0 relative">
                                        <div
                                            className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl shadow-sm border border-black/5 z-10 relative bg-white"
                                        >
                                            {parentAgent.emoji}
                                        </div>
                                    </div>

                                    {/* Content Column */}
                                    <div className="flex-1 pt-1">
                                        {/* Meta Header */}
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="font-bold text-[15px] text-[#37352f]">{parentAgent.name}</span>
                                            <span className="text-[10px] text-[#9b9a97] uppercase tracking-wider font-medium bg-[#f5f5f5] px-1.5 py-0.5 rounded-md">
                                                {parentAgent.role}
                                            </span>
                                            <span className="text-xs text-[#d3d1cb] font-medium ml-auto">
                                                {formatDistanceToNow(parseISO(thread.parent.timestamp), { addSuffix: true, locale: ko })}
                                            </span>
                                        </div>

                                        {/* Bubble */}
                                        <div className="bg-white p-5 rounded-2xl rounded-tl-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#f0f0f0] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:border-[#e5e5e5] transition-all">
                                            <p className="text-[#2d2d2d] leading-7 text-[15px] whitespace-pre-line">
                                                {thread.parent.content}
                                            </p>

                                            {thread.parent.trigger && (
                                                <div className="mt-4 pt-3 border-t border-[#f5f5f5] flex items-center gap-2">
                                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-[#fafafa] rounded text-[11px] text-[#9b9a97] font-medium border border-[#f0f0f0]">
                                                        {thread.parent.trigger === 'todo_completed' && '✅ 할 일 완료'}
                                                        {thread.parent.trigger === 'todo_added' && '✨ 할 일 추가'}
                                                        {thread.parent.trigger === 'event_added' && '📅 일정 등록'}
                                                        {thread.parent.trigger === 'journal_added' && '✍️ 일기 작성'}
                                                        {thread.parent.trigger === 'chat_message' && '💬 대화 중'}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Replies Section */}
                                        {thread.replies.length > 0 && (
                                            <div className="mt-4 space-y-3 pl-2">
                                                {thread.replies.map(reply => {
                                                    const replyAgent = getAgentById(reply.author);
                                                    return (
                                                        <div key={reply.id} className="flex gap-3 items-start relative animate-[fadeIn_0.4s_ease-out]">
                                                            {/* Connector Line */}
                                                            <div className="absolute -left-[19px] top-4 w-4 h-[1px] bg-[#e5e5e5]"></div>
                                                            <div className="absolute -left-[19px] -top-6 bottom-4 w-[1px] bg-[#e5e5e5] rounded-bl-lg"></div>

                                                            <div
                                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0 shadow-sm bg-white border border-[#f0f0f0]"
                                                            >
                                                                {replyAgent.emoji}
                                                            </div>
                                                            <div className="bg-[#fbfbfa] px-4 py-3 rounded-xl rounded-tl-none border border-[#f0f0f0] hover:bg-white hover:shadow-sm transition-all flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="font-semibold text-xs text-[#555]">{replyAgent.name}</span>
                                                                    <span className="text-[10px] text-[#ccc]">
                                                                        {formatDistanceToNow(parseISO(reply.timestamp), { addSuffix: true, locale: ko })}
                                                                    </span>
                                                                </div>
                                                                <p className="text-[#444] text-[13px] leading-relaxed">
                                                                    {reply.content}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default CommunityBoardView;
