import React, { useMemo, useState } from 'react';
import { AppSettings, ApiConnection } from '../types';
import { Trash2, Plus, X, CheckCircle2, Circle, FlaskConical } from 'lucide-react';
import { callGeminiAPI } from '../utils/gemini';
import { DEFAULT_GEMINI_MODEL, GEMINI_MODEL_OPTIONS } from '../utils/aiConfig';

interface ApiSettingsViewProps {
    settings: AppSettings;
    onUpdateSettings: (settings: AppSettings) => void;
}

const maskApiKey = (key: string): string => {
    if (!key) return '';
    if (key.length <= 10) return `${key.slice(0, 3)}...`;
    return `${key.slice(0, 6)}...${key.slice(-4)}`;
};

const ApiSettingsView: React.FC<ApiSettingsViewProps> = ({ settings, onUpdateSettings }) => {
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

    const persistConnections = (nextConnections: ApiConnection[], preferredId?: string) => {
        const resolvedId =
            preferredId && nextConnections.some(c => c.id === preferredId)
                ? preferredId
                : settings.activeConnectionId && nextConnections.some(c => c.id === settings.activeConnectionId)
                    ? settings.activeConnectionId
                    : nextConnections.find(c => c.isActive)?.id || nextConnections[0]?.id;

        const normalized = nextConnections.map(c => ({
            ...c,
            isActive: c.id === resolvedId,
        }));

        const activeGemini =
            normalized.find(c => c.id === resolvedId && c.provider === 'gemini') ||
            normalized.find(c => c.provider === 'gemini' && c.isActive);

        onUpdateSettings({
            ...settings,
            apiConnections: normalized,
            activeConnectionId: resolvedId,
            geminiApiKey: activeGemini?.apiKey || settings.geminiApiKey,
        });
    };

    const updateConnectionModel = (connectionId: string, modelName: string) => {
        const updated = connections.map(conn =>
            conn.id === connectionId ? { ...conn, modelName } : conn
        );
        persistConnections(updated);
    };

    const addConnection = () => {
        const provider = (newConnection.provider as ApiConnection['provider']) || 'gemini';
        const modelName = (newConnection.modelName || '').trim();
        const apiKey = (newConnection.apiKey || '').trim();

        if (!modelName || !apiKey) return;

        const connection: ApiConnection = {
            id: crypto.randomUUID(),
            provider,
            modelName,
            apiKey,
            isActive: true,
        };

        persistConnections([...connections, connection], connection.id);
        setIsAdding(false);
        setNewConnection({
            provider: 'gemini',
            isActive: true,
            modelName: DEFAULT_GEMINI_MODEL,
            apiKey: '',
        });
    };

    const deleteConnection = (id: string) => {
        if (!window.confirm('이 API 연결을 삭제할까요?')) return;
        const filtered = connections.filter(c => c.id !== id);
        persistConnections(filtered);
    };

    const selectModelConnection = (connection: ApiConnection) => {
        if (connection.provider !== 'gemini') {
            alert('현재 앱은 Gemini 연결만 AI 기능에 사용합니다.');
            return;
        }
        persistConnections(connections, connection.id);
    };

    const testConnection = async (connection: ApiConnection) => {
        if (connection.provider !== 'gemini') {
            alert('연결 테스트는 Gemini만 지원합니다.');
            return;
        }

        setTestingId(connection.id);
        try {
            await callGeminiAPI(
                connection.apiKey,
                '간단한 연결 테스트입니다. "연결 성공"이라고만 답해주세요.',
                undefined,
                connection.modelName
            );
            alert(`테스트 성공: ${connection.modelName}`);
        } catch (error: any) {
            alert(`테스트 실패: ${error?.message || '알 수 없는 오류'}`);
        } finally {
            setTestingId(null);
        }
    };

    return (
        <div className="max-w-[900px] mx-auto text-[#37352f] px-2 font-sans pb-20">
            <div className="flex items-start mb-8 pt-4">
                <div>
                    <h1 className="text-4xl font-bold mb-3 tracking-tight flex items-center gap-3">
                        API 연결 설정
                    </h1>
                    <p className="text-[#9b9a97] text-lg font-medium">
                        Gemini 모델을 목록에서 선택하면 채팅/인사이트/AI 코멘트가 해당 모델로 실행됩니다.
                    </p>
                </div>
            </div>

            <div className="bg-white border border-[#e9e9e8] rounded-xl p-5 mb-6">
                <p className="text-sm text-[#787774]">현재 사용 모델</p>
                <p className="text-lg font-bold mt-1">
                    {selectedConnection
                        ? `${selectedConnection.modelName} (${selectedConnection.provider})`
                        : '선택된 모델 없음'}
                </p>
            </div>

            <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between mb-2 px-1">
                    <h3 className="font-bold text-lg">연결된 API ({connections.length})</h3>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#37352f] text-white rounded-lg hover:bg-[#2f2d28] transition-colors text-sm font-bold shadow-sm"
                    >
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
                        <div
                            key={conn.id}
                            className={`bg-white border rounded-xl p-5 flex items-center justify-between transition-all ${isSelected ? 'border-[#37352f] shadow-sm' : 'border-[#e9e9e8]'}`}
                        >
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => selectModelConnection(conn)}
                                    className={`w-5 h-5 rounded-full flex items-center justify-center ${isSelected ? 'text-[#27c93f]' : 'text-[#d3d1cb]'}`}
                                    title={isGemini ? '이 모델 사용' : 'Gemini만 선택 가능'}
                                >
                                    {isSelected ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                </button>

                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-[#f1f1f0] text-[#787774] rounded">
                                            {conn.provider}
                                        </span>
                                        {isGemini ? (
                                            <select
                                                value={conn.modelName}
                                                onChange={(e) => updateConnectionModel(conn.id, e.target.value)}
                                                className="text-sm font-semibold border border-[#e9e9e8] rounded-lg px-2 py-1 bg-white"
                                            >
                                                {GEMINI_MODEL_OPTIONS.map(model => (
                                                    <option key={model.id} value={model.id}>
                                                        {model.label}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span className="font-bold text-sm">{conn.modelName}</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-[#9b9a97] font-mono mt-1">{maskApiKey(conn.apiKey)}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => selectModelConnection(conn)}
                                    disabled={!isGemini}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${isSelected
                                        ? 'bg-[#e5f9e7] text-[#27c93f]'
                                        : isGemini
                                            ? 'bg-[#f1f1f0] text-[#37352f] hover:bg-[#e9e9e8]'
                                            : 'bg-[#f7f7f5] text-[#b4b3af] cursor-not-allowed'
                                        }`}
                                >
                                    {isSelected ? '사용 중' : isGemini ? '사용하기' : '준비중'}
                                </button>

                                <button
                                    onClick={() => testConnection(conn)}
                                    disabled={!isGemini || testingId === conn.id}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${!isGemini
                                        ? 'bg-[#f7f7f5] text-[#b4b3af] cursor-not-allowed'
                                        : 'bg-[#eef5ff] text-[#2b6de9] hover:bg-[#e0ecff]'
                                        }`}
                                >
                                    <span className="inline-flex items-center gap-1.5">
                                        <FlaskConical size={13} />
                                        {testingId === conn.id ? '테스트 중...' : '연결 테스트'}
                                    </span>
                                </button>

                                <button
                                    onClick={() => deleteConnection(conn.id)}
                                    className="p-2 text-[#9b9a97] hover:text-[#eb5757] hover:bg-[#fff0f0] rounded-lg transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {isAdding && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-xl font-bold">새 API 연결 추가</h3>
                            <button onClick={() => setIsAdding(false)} className="p-1 hover:bg-[#f1f1f0] rounded-full">
                                <X size={20} className="text-[#9b9a97]" />
                            </button>
                        </div>

                        <div>
                            <label className="block text-sm font-bold mb-2">Provider</label>
                            <div className="grid grid-cols-2 gap-2">
                                {(['gemini', 'openai', 'anthropic', 'custom'] as const).map(provider => (
                                    <button
                                        key={provider}
                                        onClick={() => setNewConnection({
                                            ...newConnection,
                                            provider,
                                            modelName: provider === 'gemini' ? DEFAULT_GEMINI_MODEL : ''
                                        })}
                                        className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${newConnection.provider === provider
                                            ? 'border-[#37352f] bg-[#37352f] text-white shadow-md'
                                            : 'border-[#e9e9e8] bg-white text-[#787774] hover:bg-[#fbfbfa]'
                                            }`}
                                    >
                                        {provider.charAt(0).toUpperCase() + provider.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold mb-2">모델</label>
                            {newConnection.provider === 'gemini' ? (
                                <select
                                    value={newConnection.modelName || DEFAULT_GEMINI_MODEL}
                                    onChange={e => setNewConnection({ ...newConnection, modelName: e.target.value })}
                                    className="w-full p-3 border border-[#e9e9e8] rounded-xl focus:outline-none focus:border-[#37352f] focus:ring-2 focus:ring-[#37352f]/10"
                                >
                                    {GEMINI_MODEL_OPTIONS.map(model => (
                                        <option key={model.id} value={model.id}>
                                            {model.label}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    placeholder="예: gpt-4o"
                                    value={newConnection.modelName || ''}
                                    onChange={e => setNewConnection({ ...newConnection, modelName: e.target.value })}
                                    className="w-full p-3 border border-[#e9e9e8] rounded-xl focus:outline-none focus:border-[#37352f] focus:ring-2 focus:ring-[#37352f]/10"
                                />
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-bold mb-2">API Key</label>
                            <input
                                type="password"
                                placeholder="AIza... / sk-..."
                                value={newConnection.apiKey || ''}
                                onChange={e => setNewConnection({ ...newConnection, apiKey: e.target.value })}
                                className="w-full p-3 border border-[#e9e9e8] rounded-xl focus:outline-none focus:border-[#37352f] focus:ring-2 focus:ring-[#37352f]/10 font-mono text-sm"
                            />
                        </div>

                        <button
                            onClick={addConnection}
                            disabled={!newConnection.modelName || !newConnection.apiKey}
                            className="w-full py-3.5 bg-[#37352f] text-white rounded-xl hover:bg-[#2f2d28] transition-colors font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                        >
                            연결 추가하기
                        </button>
                    </div>
                </div>
            )}

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#fbfbfa] border border-[#e9e9e8] rounded-xl p-6">
                    <h3 className="font-bold mb-1 text-[#37352f]">보안 안내</h3>
                    <p className="text-sm text-[#787774] leading-relaxed">
                        API Key는 서버로 전송되지 않고 브라우저 로컬 스토리지에만 저장됩니다.
                    </p>
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
        </div>
    );
};

export default ApiSettingsView;

