import React, { useState } from 'react';
import { AppSettings, ApiConnection } from '../types';
import { Sparkles, Trash2, Plus, Zap, Check, X } from 'lucide-react';

interface ApiSettingsViewProps {
    settings: AppSettings;
    onUpdateSettings: (settings: AppSettings) => void;
}

const ApiSettingsView: React.FC<ApiSettingsViewProps> = ({
    settings,
    onUpdateSettings,
}) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newConnection, setNewConnection] = useState<Partial<ApiConnection>>({
        provider: 'gemini',
        isActive: true
    });

    const handleUpdateConnections = (newConnections: ApiConnection[]) => {
        // Automatically sync the first active Gemini key to the legacy field for backward compatibility
        const activeGemini = newConnections.find(c => c.provider === 'gemini' && c.isActive);

        onUpdateSettings({
            ...settings,
            apiConnections: newConnections,
            geminiApiKey: activeGemini?.apiKey || settings.geminiApiKey // Fallback to existing if none found, or clear if needed? Better to keep existing if none active to avoid breaking changes suddenly
        });
    };

    const addConnection = () => {
        if (!newConnection.apiKey || !newConnection.modelName) return;

        const connection: ApiConnection = {
            id: crypto.randomUUID(),
            provider: newConnection.provider as any || 'gemini',
            modelName: newConnection.modelName,
            apiKey: newConnection.apiKey,
            isActive: true
        };

        handleUpdateConnections([...(settings.apiConnections || []), connection]);
        setIsAdding(false);
        setNewConnection({ provider: 'gemini', isActive: true, modelName: '', apiKey: '' });
    };

    const deleteConnection = (id: string) => {
        if (window.confirm('정말로 이 연결을 삭제하시겠습니까?')) {
            handleUpdateConnections(settings.apiConnections.filter(c => c.id !== id));
        }
    };

    const toggleConnection = (id: string) => {
        const updated = settings.apiConnections.map(c =>
            c.id === id ? { ...c, isActive: !c.isActive } : c
        );
        handleUpdateConnections(updated);
    };

    return (
        <div className="max-w-[900px] mx-auto text-[#37352f] px-2 font-sans pb-20">
            {/* Header */}
            <div className="flex items-start mb-8 pt-4">
                <div>
                    <h1 className="text-4xl font-bold mb-3 tracking-tight flex items-center gap-3">
                        <span className="text-3xl">🔌</span>
                        API 연결 설정
                    </h1>
                    <p className="text-[#9b9a97] text-lg font-medium">다양한 AI 모델을 연결하여 나만의 비서를 만드세요.</p>
                </div>
            </div>

            {/* Connection List */}
            <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between mb-2 px-1">
                    <h3 className="font-bold text-lg">연결된 API ({settings.apiConnections?.length || 0})</h3>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#37352f] text-white rounded-lg hover:bg-[#2f2d28] transition-colors text-sm font-bold shadow-sm"
                    >
                        <Plus size={14} /> 새 연결 추가
                    </button>
                </div>

                {(!settings.apiConnections || settings.apiConnections.length === 0) && (
                    <div className="bg-[#fbfbfa] border border-[#e9e9e8] rounded-xl p-8 text-center text-[#9b9a97]">
                        연결된 API가 없습니다. 새 연결을 추가하여 AI 기능을 활성화하세요.
                    </div>
                )}

                {settings.apiConnections?.map(conn => (
                    <div key={conn.id} className={`bg-white border rounded-xl p-5 flex items-center justify-between transition-all ${conn.isActive ? 'border-[#37352f] shadow-sm' : 'border-[#e9e9e8] opacity-70'}`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm ${conn.provider === 'gemini' ? 'bg-blue-100 text-blue-600' :
                                    conn.provider === 'openai' ? 'bg-green-100 text-green-600' :
                                        conn.provider === 'anthropic' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'
                                }`}>
                                {conn.provider === 'gemini' ? 'G' : conn.provider === 'openai' ? 'O' : conn.provider === 'anthropic' ? 'C' : '?'}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-lg">{conn.modelName}</h4>
                                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-[#f1f1f0] text-[#787774] rounded">
                                        {conn.provider}
                                    </span>
                                </div>
                                <p className="text-sm text-[#9b9a97] font-mono mt-0.5">
                                    {conn.apiKey.slice(0, 8)}••••••••{conn.apiKey.slice(-4)}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => toggleConnection(conn.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${conn.isActive
                                        ? 'bg-[#e5f9e7] text-[#27c93f] hover:bg-[#d4f5d7]'
                                        : 'bg-[#f1f1f0] text-[#9b9a97] hover:bg-[#e9e9e8]'
                                    }`}
                            >
                                {conn.isActive ? '활성' : '비활성'}
                            </button>
                            <button
                                onClick={() => deleteConnection(conn.id)}
                                className="p-2 text-[#9b9a97] hover:text-[#eb5757] hover:bg-[#fff0f0] rounded-lg transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Modal */}
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
                            <label className="block text-sm font-bold mb-2">제공자 (Provider)</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['gemini', 'openai', 'anthropic', 'custom'].map(provider => (
                                    <button
                                        key={provider}
                                        onClick={() => setNewConnection({ ...newConnection, provider: provider as any })}
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
                            <label className="block text-sm font-bold mb-2">모델 이름 (Alias)</label>
                            <input
                                type="text"
                                placeholder="예: Gemini 1.5 Pro, GPT-4o"
                                value={newConnection.modelName || ''}
                                onChange={e => setNewConnection({ ...newConnection, modelName: e.target.value })}
                                className="w-full p-3 border border-[#e9e9e8] rounded-xl focus:outline-none focus:border-[#37352f] focus:ring-2 focus:ring-[#37352f]/10"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold mb-2">API Key</label>
                            <input
                                type="password"
                                placeholder="sk-..."
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

            {/* Info Section */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#fbfbfa] border border-[#e9e9e8] rounded-xl p-6">
                    <h3 className="font-bold mb-1 text-[#37352f]">보안 안내</h3>
                    <p className="text-sm text-[#787774] leading-relaxed">
                        입력하신 모든 API Key는 서버로 전송되지 않고 <strong>오직 사용자의 브라우저(로컬 스토리지)에만 저장</strong>됩니다. 앱 사용 중 로컬 환경에서 직접 API를 호출합니다.
                    </p>
                </div>

                <div className="bg-white border border-[#e9e9e8] rounded-xl p-6">
                    <h3 className="font-bold mb-1 text-[#37352f]">사용량 안내</h3>
                    <div className="flex justify-between items-center mt-2">
                        <span className="text-sm text-[#787774]">금일 요청 수</span>
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
