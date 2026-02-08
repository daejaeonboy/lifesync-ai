import React, { useState, useEffect } from 'react';
import { AIAgent, AppSettings } from '../types';

// Default AI Agents Configuration - 3명으로 축소
const DEFAULT_AGENTS: AIAgent[] = [
    {
        id: 'ARIA',
        name: '아리아',
        emoji: '🧮',
        role: '분석가',
        personality: '데이터와 패턴을 기반으로 객관적이고 논리적인 분석을 제공합니다. 숫자와 트렌드를 좋아하며, 사용자의 행동에서 의미 있는 인사이트를 발견합니다.',
        tone: '침착하고 분석적인 톤. 구체적인 수치와 비교를 자주 언급합니다.',
        color: '#37352f',
    },
];

interface PersonaSettingsViewProps {
    agents: AIAgent[];
    onUpdateAgents: (agents: AIAgent[]) => void;
    settings: AppSettings;
    onUpdateSettings: (settings: AppSettings) => void;
    onExportData: () => void;
    onClearAllData: () => void;
    onClearActivity: () => void;
}

const PersonaSettingsView: React.FC<PersonaSettingsViewProps> = ({
    agents,
    onUpdateAgents,
    settings,
    onUpdateSettings,
    onExportData,
    onClearAllData,
    onClearActivity,
}) => {
    const [localAgents, setLocalAgents] = useState<AIAgent[]>(agents);
    const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);

    useEffect(() => {
        setLocalAgents(agents);
    }, [agents]);

    const handleSaveAgent = (updatedAgent: AIAgent) => {
        const newAgents = localAgents.map(a => a.id === updatedAgent.id ? updatedAgent : a);
        setLocalAgents(newAgents);
        onUpdateAgents(newAgents);
        setEditingAgent(null);
    };

    const handleResetToDefault = () => {
        setLocalAgents(DEFAULT_AGENTS);
        onUpdateAgents(DEFAULT_AGENTS);
    };

    return (
        <div className="max-w-[900px] mx-auto text-[#37352f] px-2 font-sans">
            {/* Header */}
            <div className="flex justify-between items-start mb-8 pt-4">
                <div>
                    <h1 className="text-4xl font-bold mb-3 tracking-tight flex items-center gap-3">
                        <span className="text-3xl">🎭</span>
                        AI 페르소나 설정
                    </h1>
                    <p className="text-[#9b9a97] text-lg font-medium">각 AI의 성격과 말투를 커스터마이징하세요.</p>
                </div>
                <button
                    onClick={handleResetToDefault}
                    className="px-4 py-2 text-sm text-[#9b9a97] hover:text-[#37352f] border border-[#e9e9e8] rounded-lg hover:bg-[#f7f7f5] transition-colors"
                >
                    기본값으로 초기화
                </button>
            </div>

            {/* Agent Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {localAgents.map(agent => (
                    <div
                        key={agent.id}
                        className="bg-white border border-[#e9e9e8] rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer group"
                        onClick={() => setEditingAgent(agent)}
                    >
                        <div className="flex items-start gap-4 mb-4">
                            <div
                                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm overflow-hidden"
                                style={{ backgroundColor: agent.color + '20', border: `2px solid ${agent.color}` }}
                            >
                                {agent.avatar ? (
                                    <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" />
                                ) : (
                                    agent.emoji
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl font-bold" style={{ color: agent.color }}>{agent.name}</span>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#f7f7f5] text-[#9b9a97]">{agent.role}</span>
                                </div>
                                <p className="text-sm text-[#787774] mt-2 line-clamp-2">{agent.personality}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-[#d3d1cb]">클릭하여 수정</span>
                            <div
                                className="w-6 h-6 rounded-full opacity-60 group-hover:opacity-100 transition-opacity"
                                style={{ backgroundColor: agent.color }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Description Section */}
            <div className="mt-12 bg-[#fbfbfa] border border-[#e9e9e8] rounded-xl p-6">
                <h3 className="font-bold mb-4">💡 페르소나란?</h3>
                <p className="text-sm text-[#787774] leading-relaxed mb-4">
                    각 AI 에이전트는 고유한 성격과 역할을 가지고 있습니다.
                    당신이 캘린더에 일정을 추가하거나, 할 일을 완료하거나, 일기를 쓸 때마다
                    이 AI들이 <strong>"AI 커뮤니티"</strong> 보드에서 자동으로 대화를 나눕니다.
                </p>
                <p className="text-sm text-[#787774] leading-relaxed">
                    원하는 대로 각 AI의 성격을 수정하면, 더 개인화된 경험을 만들 수 있어요.
                    예를 들어, 응원단장 <strong>모모</strong>가 너무 시끄럽다면 조용한 성격으로 바꿔보세요!
                </p>
            </div>



            {/* App Settings */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-[#e9e9e8] rounded-xl p-6">
                    <h3 className="font-bold mb-4">⚙️ 자동 반응 설정</h3>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-sm font-semibold text-[#37352f]">AI 자동 반응</p>
                            <p className="text-xs text-[#9b9a97]">할 일/일정/일기 기록 시 AI 커뮤니티가 자동으로 반응합니다.</p>
                        </div>
                        <button
                            onClick={() => onUpdateSettings({ ...settings, autoAiReactions: !settings.autoAiReactions })}
                            className={`w-12 h-6 rounded-full transition-colors ${settings.autoAiReactions ? 'bg-[#37352f]' : 'bg-[#d3d1cb]'}`}
                        >
                            <span
                                className={`block w-5 h-5 bg-white rounded-full transition-transform ${settings.autoAiReactions ? 'translate-x-6' : 'translate-x-1'}`}
                            />
                        </button>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-[#37352f]">채팅 실행 전 확인</p>
                            <p className="text-xs text-[#9b9a97]">AI 채팅에서 일정/할 일/일기를 만들기 전에 확인을 거칩니다.</p>
                        </div>
                        <button
                            onClick={() => onUpdateSettings({ ...settings, chatActionConfirm: !settings.chatActionConfirm })}
                            className={`w-12 h-6 rounded-full transition-colors ${settings.chatActionConfirm ? 'bg-[#37352f]' : 'bg-[#d3d1cb]'}`}
                        >
                            <span
                                className={`block w-5 h-5 bg-white rounded-full transition-transform ${settings.chatActionConfirm ? 'translate-x-6' : 'translate-x-1'}`}
                            />
                        </button>
                    </div>
                </div>

                <div className="bg-white border border-[#e9e9e8] rounded-xl p-6">
                    <h3 className="font-bold mb-4">🧾 데이터 관리</h3>
                    <div className="space-y-3">
                        <button
                            onClick={onExportData}
                            className="w-full px-4 py-2 text-sm text-[#37352f] border border-[#e9e9e8] rounded-lg hover:bg-[#f7f7f5] transition-colors"
                        >
                            데이터 내보내기 (JSON)
                        </button>
                        <button
                            onClick={onClearActivity}
                            className="w-full px-4 py-2 text-sm text-[#9b9a97] border border-[#e9e9e8] rounded-lg hover:bg-[#f7f7f5] transition-colors"
                        >
                            활동 기록 지우기
                        </button>
                        <button
                            onClick={onClearAllData}
                            className="w-full px-4 py-2 text-sm text-white bg-[#eb5757] rounded-lg hover:bg-[#d64545] transition-colors"
                        >
                            모든 기록 삭제
                        </button>
                    </div>
                    <p className="text-xs text-[#9b9a97] mt-3">
                        삭제 항목: 일정/할 일/일기/AI 보드/활동 기록 (페르소나 설정은 유지)
                    </p>
                </div>
            </div>

            {/* Agent Edit Modal */}
            {editingAgent && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-[#e9e9e8]" style={{ backgroundColor: editingAgent.color + '10' }}>
                            <div className="flex items-center gap-4">
                                <div
                                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl overflow-hidden"
                                    style={{ backgroundColor: 'white', border: `3px solid ${editingAgent.color}` }}
                                >
                                    {editingAgent.avatar ? (
                                        <img src={editingAgent.avatar} alt={editingAgent.name} className="w-full h-full object-cover" />
                                    ) : (
                                        editingAgent.emoji
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold" style={{ color: editingAgent.color }}>{editingAgent.name}</h3>
                                    <p className="text-[#9b9a97]">{editingAgent.role}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-semibold mb-2">이름</label>
                                <input
                                    type="text"
                                    value={editingAgent.name}
                                    onChange={(e) => setEditingAgent({ ...editingAgent, name: e.target.value })}
                                    className="w-full p-3 border border-[#e9e9e8] rounded-xl focus:outline-none focus:border-[#37352f] focus:ring-2 focus:ring-[#37352f]/10"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-2">역할</label>
                                <input
                                    type="text"
                                    value={editingAgent.role}
                                    onChange={(e) => setEditingAgent({ ...editingAgent, role: e.target.value })}
                                    className="w-full p-3 border border-[#e9e9e8] rounded-xl focus:outline-none focus:border-[#37352f] focus:ring-2 focus:ring-[#37352f]/10"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-2">성격 설명</label>
                                <textarea
                                    value={editingAgent.personality}
                                    onChange={(e) => setEditingAgent({ ...editingAgent, personality: e.target.value })}
                                    rows={3}
                                    className="w-full p-3 border border-[#e9e9e8] rounded-xl focus:outline-none focus:border-[#37352f] focus:ring-2 focus:ring-[#37352f]/10 resize-none"
                                    placeholder="이 AI의 성격을 설명해주세요..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-2">말투 스타일</label>
                                <textarea
                                    value={editingAgent.tone}
                                    onChange={(e) => setEditingAgent({ ...editingAgent, tone: e.target.value })}
                                    rows={2}
                                    className="w-full p-3 border border-[#e9e9e8] rounded-xl focus:outline-none focus:border-[#37352f] focus:ring-2 focus:ring-[#37352f]/10 resize-none"
                                    placeholder="어떤 톤으로 말할지 설명해주세요..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-2">프로필 이미지 URL</label>
                                <input
                                    type="text"
                                    value={editingAgent.avatar || ''}
                                    onChange={(e) => setEditingAgent({ ...editingAgent, avatar: e.target.value })}
                                    className="w-full p-3 border border-[#e9e9e8] rounded-xl focus:outline-none focus:border-[#37352f] focus:ring-2 focus:ring-[#37352f]/10"
                                    placeholder="이미지 주소를 입력하세요 (https://...)"
                                />
                                <p className="text-xs text-[#9b9a97] mt-1">입력하지 않으면 이모티콘이 표시됩니다.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-3">테마 색상</label>
                                <div className="flex gap-3 flex-wrap">
                                    {['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#ec4899', '#06b6d4', '#84cc16', '#f97316'].map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setEditingAgent({ ...editingAgent, color })}
                                            className={`w-10 h-10 rounded-xl transition-all ${editingAgent.color === color ? 'ring-2 ring-offset-2 ring-[#37352f] scale-110' : 'hover:scale-105'}`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-[#e9e9e8] flex gap-3 justify-end bg-[#fbfbfa]">
                            <button
                                onClick={() => setEditingAgent(null)}
                                className="px-5 py-2.5 text-[#9b9a97] hover:text-[#37352f] transition-colors font-medium"
                            >
                                취소
                            </button>
                            <button
                                onClick={() => handleSaveAgent(editingAgent)}
                                className="px-6 py-2.5 bg-[#37352f] text-white rounded-xl hover:bg-[#2f2d28] transition-colors font-medium shadow-sm"
                            >
                                저장하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export { DEFAULT_AGENTS };
export default PersonaSettingsView;
