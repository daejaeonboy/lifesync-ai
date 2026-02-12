import React, { useState, useMemo } from 'react';
import { AIAgent, AppSettings, ApiConnection } from '../types';
import { Plus, Trash2, Save, RotateCcw, Download, Trash, Edit3, X, CheckCircle2, Circle, FlaskConical } from 'lucide-react';
import { callGeminiAPI } from '../utils/gemini';
import { DEFAULT_GEMINI_MODEL, GEMINI_MODEL_OPTIONS } from '../utils/aiConfig';
import { DEFAULT_AGENTS } from './PersonaSettingsView';

type SettingsTab = 'api' | 'persona' | 'data';

interface SettingsViewProps {
    agents: AIAgent[];
    onUpdateAgents: (agents: AIAgent[]) => void;
    settings: AppSettings;
    onUpdateSettings: (settings: AppSettings) => void;
    onExportData: () => void;
    onClearAllData: () => void;
    onClearActivity: () => void;
    onClearPosts: () => void;
    onClearEvents: () => void;
    onClearTodos: () => void;
    onClearEntries: () => void;
    onClearChat: () => void;
}

const maskApiKey = (key: string): string => {
    if (!key) return '';
    if (key.length <= 10) return `${key.slice(0, 3)}...`;
    return `${key.slice(0, 6)}...${key.slice(-4)}`;
};

const SettingsView: React.FC<SettingsViewProps> = ({
    agents,
    onUpdateAgents,
    settings,
    onUpdateSettings,
    onExportData,
    onClearAllData,
    onClearActivity,
    onClearPosts,
    onClearEvents,
    onClearTodos,
    onClearEntries,
    onClearChat,
}) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('api');

    // Persona states
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState<AIAgent | null>(null);

    // API states
    const [isAdding, setIsAdding] = useState(false);
    const [testingId, setTestingId] = useState<string | null>(null);
    const [newConnection, setNewConnection] = useState<Partial<ApiConnection>>({
        provider: 'gemini',
        isActive: true,
        modelName: DEFAULT_GEMINI_MODEL,
        apiKey: '',
    });

    const connections = settings.apiConnections || [];
    const selectedConnection = useMemo(() => {
        const byId = connections.find(c => c.id === settings.activeConnectionId);
        if (byId) return byId;
        return connections.find(c => c.isActive);
    }, [connections, settings.activeConnectionId]);

    // --- Persona helpers ---
    const editingTarget = useMemo(
        () => agents.find((a) => a.id === editingId) || null,
        [agents, editingId]
    );
    const openEditor = (agent: AIAgent) => { setEditingId(agent.id); setDraft({ ...agent }); };
    const closeEditor = () => { setEditingId(null); setDraft(null); };
    const saveAgent = () => {
        if (!editingId || !draft) return;
        onUpdateAgents(agents.map((a) => (a.id === editingId ? { ...a, ...draft } : a)));
        closeEditor();
    };
    const addCustomAgent = () => {
        const newAgent: AIAgent = {
            id: crypto.randomUUID(), name: 'New Agent', emoji: '✨',
            role: 'Custom Role', personality: 'Describe this agent personality',
            tone: 'Friendly', color: '#6366f1', avatar: '',
        };
        onUpdateAgents([...agents, newAgent]);
        openEditor(newAgent);
    };
    const removeAgent = (id: string) => {
        if (!window.confirm('이 페르소나를 삭제할까요?')) return;
        onUpdateAgents(agents.filter((a) => a.id !== id));
    };
    const resetAgents = () => {
        if (!window.confirm('기본 페르소나로 초기화할까요?')) return;
        onUpdateAgents(DEFAULT_AGENTS);
    };

    // --- API helpers ---
    const persistConnections = (nextConnections: ApiConnection[], preferredId?: string) => {
        const resolvedId =
            preferredId && nextConnections.some(c => c.id === preferredId)
                ? preferredId
                : settings.activeConnectionId && nextConnections.some(c => c.id === settings.activeConnectionId)
                    ? settings.activeConnectionId
                    : nextConnections.find(c => c.isActive)?.id || nextConnections[0]?.id;
        const normalized = nextConnections.map(c => ({ ...c, isActive: c.id === resolvedId }));
        const activeGemini = normalized.find(c => c.id === resolvedId && c.provider === 'gemini') || normalized.find(c => c.provider === 'gemini' && c.isActive);
        onUpdateSettings({ ...settings, apiConnections: normalized, activeConnectionId: resolvedId, geminiApiKey: activeGemini?.apiKey || settings.geminiApiKey });
    };
    const updateConnectionModel = (connectionId: string, modelName: string) => {
        persistConnections(connections.map(c => c.id === connectionId ? { ...c, modelName } : c));
    };
    const addConnection = () => {
        const provider = (newConnection.provider as ApiConnection['provider']) || 'gemini';
        const modelName = (newConnection.modelName || '').trim();
        const apiKey = (newConnection.apiKey || '').trim();
        if (!modelName || !apiKey) return;
        const connection: ApiConnection = { id: crypto.randomUUID(), provider, modelName, apiKey, isActive: true };
        persistConnections([...connections, connection], connection.id);
        setIsAdding(false);
        setNewConnection({ provider: 'gemini', isActive: true, modelName: DEFAULT_GEMINI_MODEL, apiKey: '' });
    };
    const deleteConnection = (id: string) => {
        if (!window.confirm('이 API 연결을 삭제할까요?')) return;
        persistConnections(connections.filter(c => c.id !== id));
    };
    const selectModelConnection = (conn: ApiConnection) => {
        if (conn.provider !== 'gemini') { alert('현재 앱은 Gemini 연결만 AI 기능에 사용합니다.'); return; }
        persistConnections(connections, conn.id);
    };
    const testConnection = async (conn: ApiConnection) => {
        if (conn.provider !== 'gemini') { alert('연결 테스트는 Gemini만 지원합니다.'); return; }
        setTestingId(conn.id);
        try {
            await callGeminiAPI(conn.apiKey, '간단한 연결 테스트입니다. "연결 성공"이라고만 답해주세요.', undefined, conn.modelName);
            alert(`테스트 성공: ${conn.modelName}`);
        } catch (error: any) {
            alert(`테스트 실패: ${error?.message || '알 수 없는 오류'}`);
        } finally { setTestingId(null); }
    };

    const tabs: { id: SettingsTab; label: string }[] = [
        { id: 'api', label: 'API 연결' },
        { id: 'persona', label: '페르소나' },
        { id: 'data', label: '데이터 관리' },
    ];

    return (
        <div className="max-w-[900px] mx-auto px-2 pb-20 font-sans">
            {/* Header */}
            <div className="pt-4 mb-6">
                <h1 className="text-2xl font-normal text-[#37352f] tracking-tight">설정</h1>
                <p className="text-sm text-[#9b9a97] mt-1">AI 연결, 페르소나, 데이터를 관리합니다.</p>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 mb-6 bg-[#f7f7f5] p-1 rounded-lg w-fit">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === tab.id
                                ? 'bg-white text-[#37352f] shadow-sm'
                                : 'text-[#9b9a97] hover:text-[#37352f]'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ===== API 연결 탭 ===== */}
            {activeTab === 'api' && (
                <div className="space-y-6">
                    <div className="bg-white border border-[#e9e9e8] rounded-xl p-5">
                        <p className="text-sm text-[#787774]">현재 사용 모델</p>
                        <p className="text-lg font-bold mt-1 text-[#37352f]">
                            {selectedConnection ? `${selectedConnection.modelName} (${selectedConnection.provider})` : '선택된 모델 없음'}
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="font-bold text-lg text-[#37352f]">연결된 API ({connections.length})</h3>
                            <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 px-3 py-1.5 bg-[#37352f] text-white rounded-lg hover:bg-[#2f2d28] transition-colors text-sm font-bold shadow-sm">
                                <Plus size={14} /> API 연결 추가
                            </button>
                        </div>

                        {connections.length === 0 && (
                            <div className="bg-[#fbfbfa] border border-[#e9e9e8] rounded-xl p-8 text-center text-[#9b9a97]">
                                연결된 API가 없습니다. Gemini API Key를 추가하고 모델을 선택해주세요.
                            </div>
                        )}

                        {connections.map(conn => {
                            const isSelected = conn.id === selectedConnection?.id;
                            const isGemini = conn.provider === 'gemini';
                            return (
                                <div key={conn.id} className={`bg-white border rounded-xl p-5 flex items-center justify-between transition-all ${isSelected ? 'border-[#37352f] shadow-sm' : 'border-[#e9e9e8]'}`}>
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => selectModelConnection(conn)} className={`w-5 h-5 rounded-full flex items-center justify-center ${isSelected ? 'text-[#27c93f]' : 'text-[#d3d1cb]'}`}>
                                            {isSelected ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                        </button>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-[#f1f1f0] text-[#787774] rounded">{conn.provider}</span>
                                                {isGemini ? (
                                                    <select value={conn.modelName} onChange={(e) => updateConnectionModel(conn.id, e.target.value)} className="text-sm font-semibold border border-[#e9e9e8] rounded-lg px-2 py-1 bg-white">
                                                        {GEMINI_MODEL_OPTIONS.map(model => <option key={model.id} value={model.id}>{model.label}</option>)}
                                                    </select>
                                                ) : <span className="font-bold text-sm">{conn.modelName}</span>}
                                            </div>
                                            <p className="text-sm text-[#9b9a97] font-mono mt-1">{maskApiKey(conn.apiKey)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => selectModelConnection(conn)} disabled={!isGemini} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${isSelected ? 'bg-[#e5f9e7] text-[#27c93f]' : isGemini ? 'bg-[#f1f1f0] text-[#37352f] hover:bg-[#e9e9e8]' : 'bg-[#f7f7f5] text-[#b4b3af] cursor-not-allowed'}`}>
                                            {isSelected ? '사용 중' : isGemini ? '사용하기' : '준비중'}
                                        </button>
                                        <button onClick={() => testConnection(conn)} disabled={!isGemini || testingId === conn.id} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${!isGemini ? 'bg-[#f7f7f5] text-[#b4b3af] cursor-not-allowed' : 'bg-[#eef5ff] text-[#2b6de9] hover:bg-[#e0ecff]'}`}>
                                            <span className="inline-flex items-center gap-1.5"><FlaskConical size={13} />{testingId === conn.id ? '테스트 중...' : '연결 테스트'}</span>
                                        </button>
                                        <button onClick={() => deleteConnection(conn.id)} className="p-2 text-[#9b9a97] hover:text-[#eb5757] hover:bg-[#fff0f0] rounded-lg transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-[#fbfbfa] border border-[#e9e9e8] rounded-xl p-6">
                            <h3 className="font-bold mb-1 text-[#37352f]">보안 안내</h3>
                            <p className="text-sm text-[#787774] leading-relaxed">API Key는 서버로 전송되지 않고 브라우저 로컬 스토리지에만 저장됩니다.</p>
                        </div>
                        <div className="bg-white border border-[#e9e9e8] rounded-xl p-6">
                            <h3 className="font-bold mb-1 text-[#37352f]">사용량 안내</h3>
                            <div className="flex justify-between items-center mt-2">
                                <span className="text-sm text-[#787774]">전체 요청 수</span>
                                <span className="font-bold">{settings.apiUsage?.totalRequests || 0}회</span>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                                <span className="text-sm text-[#787774]">누적 토큰</span>
                                <span className="font-bold">{(settings.apiUsage?.totalTokens || 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Add Connection Modal */}
                    {isAdding && (
                        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-xl font-bold">새 API 연결 추가</h3>
                                    <button onClick={() => setIsAdding(false)} className="p-1 hover:bg-[#f1f1f0] rounded-full"><X size={20} className="text-[#9b9a97]" /></button>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-2">Provider</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(['gemini', 'openai', 'anthropic', 'custom'] as const).map(provider => (
                                            <button key={provider} onClick={() => setNewConnection({ ...newConnection, provider, modelName: provider === 'gemini' ? DEFAULT_GEMINI_MODEL : '' })}
                                                className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${newConnection.provider === provider ? 'border-[#37352f] bg-[#37352f] text-white shadow-md' : 'border-[#e9e9e8] bg-white text-[#787774] hover:bg-[#fbfbfa]'}`}>
                                                {provider.charAt(0).toUpperCase() + provider.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-2">모델</label>
                                    {newConnection.provider === 'gemini' ? (
                                        <select value={newConnection.modelName || DEFAULT_GEMINI_MODEL} onChange={e => setNewConnection({ ...newConnection, modelName: e.target.value })} className="w-full p-3 border border-[#e9e9e8] rounded-xl focus:outline-none focus:border-[#37352f]">
                                            {GEMINI_MODEL_OPTIONS.map(model => <option key={model.id} value={model.id}>{model.label}</option>)}
                                        </select>
                                    ) : (
                                        <input type="text" placeholder="예: gpt-4o" value={newConnection.modelName || ''} onChange={e => setNewConnection({ ...newConnection, modelName: e.target.value })} className="w-full p-3 border border-[#e9e9e8] rounded-xl focus:outline-none focus:border-[#37352f]" />
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-2">API Key</label>
                                    <input type="password" placeholder="AIza... / sk-..." value={newConnection.apiKey || ''} onChange={e => setNewConnection({ ...newConnection, apiKey: e.target.value })} className="w-full p-3 border border-[#e9e9e8] rounded-xl focus:outline-none focus:border-[#37352f] font-mono text-sm" />
                                </div>
                                <button onClick={addConnection} disabled={!newConnection.modelName || !newConnection.apiKey} className="w-full py-3.5 bg-[#37352f] text-white rounded-xl hover:bg-[#2f2d28] transition-colors font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-2">
                                    연결 추가하기
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ===== 페르소나 탭 ===== */}
            {activeTab === 'persona' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-[#787774]">AI 페르소나를 편집하고 행동 옵션을 조정하세요.</p>
                        <div className="flex gap-2">
                            <button onClick={addCustomAgent} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#37352f] text-white text-sm hover:bg-[#2b2924] transition-colors">
                                <Plus size={14} /> 추가
                            </button>
                            <button onClick={resetAgents} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#d9d9d7] text-[#37352f] text-sm hover:bg-[#f7f7f5] transition-colors">
                                <RotateCcw size={14} /> 기본값
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {agents.map((agent) => (
                            <div key={agent.id} className="bg-white border border-[#e9e9e8] rounded-xl p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center text-lg text-white" style={{ backgroundColor: agent.color || '#37352f' }}>
                                            {agent.avatar ? <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" /> : <span>{agent.emoji || '🤖'}</span>}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm text-[#37352f] truncate">{agent.name}</div>
                                            <div className="text-xs text-[#9b9a97] truncate">{agent.role}</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => openEditor(agent)} className="p-1.5 rounded-md hover:bg-[#f2f2f0] text-[#787774]" title="편집"><Edit3 size={14} /></button>
                                        <button onClick={() => removeAgent(agent.id)} className="p-1.5 rounded-md hover:bg-[#fff0f0] text-[#cf3f3f]" title="삭제"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                                <p className="text-xs text-[#787774] mt-3 line-clamp-2">{agent.personality}</p>
                            </div>
                        ))}
                    </div>

                    {/* Behavior Options */}
                    <div className="bg-white border border-[#e9e9e8] rounded-xl p-5 space-y-4">
                        <h3 className="text-lg text-[#37352f]">동작 옵션</h3>
                        <label className="flex items-center justify-between py-2">
                            <div>
                                <div className="text-sm text-[#37352f]">AI 자동 반응</div>
                                <div className="text-xs text-[#9b9a97]">일기/할 일/일정 이벤트에 AI 반응을 생성합니다.</div>
                            </div>
                            <input type="checkbox" checked={settings.autoAiReactions} onChange={(e) => onUpdateSettings({ ...settings, autoAiReactions: e.target.checked })} className="w-4 h-4 accent-[#37352f]" />
                        </label>
                        <label className="flex items-center justify-between py-2">
                            <div>
                                <div className="text-sm text-[#37352f]">채팅 실행 전 확인</div>
                                <div className="text-xs text-[#9b9a97]">채팅에서 일정/할 일 생성 전에 확인 단계를 보여줍니다.</div>
                            </div>
                            <input type="checkbox" checked={settings.chatActionConfirm} onChange={(e) => onUpdateSettings({ ...settings, chatActionConfirm: e.target.checked })} className="w-4 h-4 accent-[#37352f]" />
                        </label>
                    </div>

                    {/* Persona Editor Modal */}
                    {editingId && draft && (
                        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                            <div className="w-full max-w-xl bg-white rounded-2xl border border-[#e9e9e8] shadow-xl">
                                <div className="px-5 py-4 border-b border-[#efefef] flex items-center justify-between">
                                    <h4 className="text-[#37352f]">{editingTarget ? '페르소나 편집' : '새 페르소나'}</h4>
                                    <button onClick={closeEditor} className="p-1 rounded-md hover:bg-[#f2f2f0] text-[#787774]"><X size={16} /></button>
                                </div>
                                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <label className="text-xs text-[#787774] md:col-span-2">이름<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg border border-[#dcdcd9] text-sm outline-none focus:border-[#37352f]" /></label>
                                    <label className="text-xs text-[#787774]">역할<input value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg border border-[#dcdcd9] text-sm outline-none focus:border-[#37352f]" /></label>
                                    <label className="text-xs text-[#787774]">톤<input value={draft.tone} onChange={(e) => setDraft({ ...draft, tone: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg border border-[#dcdcd9] text-sm outline-none focus:border-[#37352f]" /></label>
                                    <label className="text-xs text-[#787774] md:col-span-2">성격<textarea value={draft.personality} onChange={(e) => setDraft({ ...draft, personality: e.target.value })} rows={3} className="mt-1 w-full px-3 py-2 rounded-lg border border-[#dcdcd9] text-sm outline-none focus:border-[#37352f] resize-none" /></label>
                                    <label className="text-xs text-[#787774] md:col-span-2">아바타 URL<input value={draft.avatar || ''} onChange={(e) => setDraft({ ...draft, avatar: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg border border-[#dcdcd9] text-sm outline-none focus:border-[#37352f]" /></label>
                                </div>
                                <div className="px-5 py-4 border-t border-[#efefef] flex justify-end gap-2">
                                    <button onClick={closeEditor} className="px-3 py-2 rounded-lg border border-[#dcdcd9] text-sm text-[#37352f] hover:bg-[#f7f7f5]">취소</button>
                                    <button onClick={saveAgent} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#37352f] text-sm text-white hover:bg-[#2b2924]"><Save size={14} /> 저장</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ===== 데이터 관리 탭 ===== */}
            {activeTab === 'data' && (
                <div className="space-y-6">
                    {/* Individual Reset */}
                    <div className="bg-white border border-[#e9e9e8] rounded-xl p-5 space-y-1">
                        <h3 className="text-lg text-[#37352f] mb-3">개별 초기화</h3>
                        {[
                            { label: 'AI 일기장', desc: 'AI가 작성한 일기 게시글을 모두 삭제합니다.', action: onClearPosts },
                            { label: '캘린더', desc: '저장된 일정 데이터를 모두 삭제합니다.', action: onClearEvents },
                            { label: '할 일', desc: '할 일 목록과 항목을 모두 삭제합니다.', action: onClearTodos },
                            { label: '메모장', desc: '작성한 메모/일기를 모두 삭제합니다.', action: onClearEntries },
                            { label: 'AI 대화', desc: 'AI 채팅 기록을 모두 삭제합니다.', action: onClearChat },
                            { label: '활동 로그', desc: '활동 기록만 삭제합니다.', action: onClearActivity },
                        ].map(item => (
                            <div key={item.label} className="flex items-center justify-between py-3 border-b border-[#f2f2f0] last:border-b-0">
                                <div>
                                    <div className="text-sm text-[#37352f] font-medium">{item.label}</div>
                                    <div className="text-xs text-[#9b9a97]">{item.desc}</div>
                                </div>
                                <button
                                    onClick={() => {
                                        if (window.confirm(`${item.label} 데이터를 삭제할까요?\n이 작업은 되돌릴 수 없습니다.`)) {
                                            item.action();
                                        }
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#d9d9d7] text-xs text-[#787774] hover:bg-[#fff0f0] hover:text-[#d94848] hover:border-[#e8b4b4] transition-all"
                                >
                                    <Trash size={12} /> 초기화
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Export & Full Reset */}
                    <div className="bg-white border border-[#e9e9e8] rounded-xl p-5 space-y-4">
                        <h3 className="text-lg text-[#37352f]">데이터 내보내기 및 전체 초기화</h3>
                        <div className="flex flex-wrap gap-2">
                            <button onClick={onExportData} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#d9d9d7] text-sm text-[#37352f] hover:bg-[#f7f7f5]">
                                <Download size={14} /> 내보내기
                            </button>
                            <button onClick={onClearAllData} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#d94848] text-sm text-white hover:bg-[#c33f3f]">
                                <Trash2 size={14} /> 전체 데이터 초기화
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsView;
