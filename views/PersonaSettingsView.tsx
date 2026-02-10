import React, { useMemo, useState } from 'react';
import { AIAgent, AppSettings } from '../types';
import { Plus, Trash2, Save, RotateCcw, Download, Trash, Edit3, X } from 'lucide-react';

export const DEFAULT_AGENTS: AIAgent[] = [
  {
    id: 'ARIA',
    name: 'LifeSync AI',
    emoji: '🤖',
    role: 'Personal Assistant',
    personality: 'Friendly, helpful, and organized',
    tone: 'Professional yet approachable',
    color: '#4F46E5',
    avatar: 'https://ui-avatars.com/api/?name=LifeSync+AI&background=4F46E5&color=fff',
  },
  {
    id: 'COACH',
    name: 'Productivity Coach',
    emoji: '🚀',
    role: 'Coach',
    personality: 'Motivating, direct, and results-oriented',
    tone: 'Energetic and encouraging',
    color: '#10B981',
    avatar: 'https://ui-avatars.com/api/?name=Productivity+Coach&background=10B981&color=fff',
  },
  {
    id: 'EMPATH',
    name: 'Mindfulness Guide',
    emoji: '🌿',
    role: 'Therapist',
    personality: 'Empathetic, calm, and a good listener',
    tone: 'Soothing and supportive',
    color: '#F59E0B',
    avatar: 'https://ui-avatars.com/api/?name=Mindfulness+Guide&background=F59E0B&color=fff',
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AIAgent | null>(null);

  const editingTarget = useMemo(
    () => agents.find((agent) => agent.id === editingId) || null,
    [agents, editingId]
  );

  const openEditor = (agent: AIAgent) => {
    setEditingId(agent.id);
    setDraft({ ...agent });
  };

  const closeEditor = () => {
    setEditingId(null);
    setDraft(null);
  };

  const saveAgent = () => {
    if (!editingId || !draft) return;
    onUpdateAgents(
      agents.map((agent) => (agent.id === editingId ? { ...agent, ...draft } : agent))
    );
    closeEditor();
  };

  const addCustomAgent = () => {
    const newAgent: AIAgent = {
      id: crypto.randomUUID(),
      name: 'New Agent',
      emoji: '✨',
      role: 'Custom Role',
      personality: 'Describe this agent personality',
      tone: 'Friendly',
      color: '#6366f1',
      avatar: '',
    };
    onUpdateAgents([...agents, newAgent]);
    openEditor(newAgent);
  };

  const removeAgent = (id: string) => {
    if (!window.confirm('이 페르소나를 삭제할까요?')) return;
    onUpdateAgents(agents.filter((agent) => agent.id !== id));
  };

  const resetAgents = () => {
    if (!window.confirm('기본 페르소나로 초기화할까요?')) return;
    onUpdateAgents(DEFAULT_AGENTS);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 px-2">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-normal text-[#37352f]">페르소나 설정</h2>
          <p className="text-sm text-[#787774] mt-1">AI 페르소나를 편집하고 행동 옵션을 조정하세요.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={addCustomAgent}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#37352f] text-white text-sm hover:bg-[#2b2924] transition-colors"
          >
            <Plus size={14} /> 추가
          </button>
          <button
            onClick={resetAgents}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#d9d9d7] text-[#37352f] text-sm hover:bg-[#f7f7f5] transition-colors"
          >
            <RotateCcw size={14} /> 기본값
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map((agent) => (
          <div key={agent.id} className="bg-white border border-[#e9e9e8] rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center text-lg text-white"
                  style={{ backgroundColor: agent.color || '#37352f' }}
                >
                  {agent.avatar ? (
                    <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{agent.emoji || '🤖'}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm text-[#37352f] truncate">{agent.name}</div>
                  <div className="text-xs text-[#9b9a97] truncate">{agent.role}</div>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => openEditor(agent)}
                  className="p-1.5 rounded-md hover:bg-[#f2f2f0] text-[#787774]"
                  title="편집"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => removeAgent(agent.id)}
                  className="p-1.5 rounded-md hover:bg-[#fff0f0] text-[#cf3f3f]"
                  title="삭제"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <p className="text-xs text-[#787774] mt-3 line-clamp-2">{agent.personality}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#e9e9e8] rounded-xl p-5 space-y-4">
        <h3 className="text-lg text-[#37352f]">동작 옵션</h3>
        <label className="flex items-center justify-between py-2">
          <div>
            <div className="text-sm text-[#37352f]">AI 자동 반응</div>
            <div className="text-xs text-[#9b9a97]">일기/할 일/일정 이벤트에 AI 반응을 생성합니다.</div>
          </div>
          <input
            type="checkbox"
            checked={settings.autoAiReactions}
            onChange={(e) => onUpdateSettings({ ...settings, autoAiReactions: e.target.checked })}
            className="w-4 h-4 accent-[#37352f]"
          />
        </label>
        <label className="flex items-center justify-between py-2">
          <div>
            <div className="text-sm text-[#37352f]">채팅 실행 전 확인</div>
            <div className="text-xs text-[#9b9a97]">채팅에서 일정/할 일 생성 전에 확인 단계를 보여줍니다.</div>
          </div>
          <input
            type="checkbox"
            checked={settings.chatActionConfirm}
            onChange={(e) => onUpdateSettings({ ...settings, chatActionConfirm: e.target.checked })}
            className="w-4 h-4 accent-[#37352f]"
          />
        </label>
      </div>

      <div className="bg-white border border-[#e9e9e8] rounded-xl p-5 space-y-3">
        <h3 className="text-lg text-[#37352f]">데이터 관리</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onExportData}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#d9d9d7] text-sm text-[#37352f] hover:bg-[#f7f7f5]"
          >
            <Download size={14} /> 내보내기
          </button>
          <button
            onClick={onClearActivity}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#d9d9d7] text-sm text-[#37352f] hover:bg-[#f7f7f5]"
          >
            <Trash size={14} /> 활동 로그 삭제
          </button>
          <button
            onClick={onClearAllData}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#d94848] text-sm text-white hover:bg-[#c33f3f]"
          >
            <Trash2 size={14} /> 전체 데이터 초기화
          </button>
        </div>
      </div>

      {editingId && draft && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl border border-[#e9e9e8] shadow-xl">
            <div className="px-5 py-4 border-b border-[#efefef] flex items-center justify-between">
              <h4 className="text-[#37352f]">{editingTarget ? '페르소나 편집' : '새 페르소나'}</h4>
              <button onClick={closeEditor} className="p-1 rounded-md hover:bg-[#f2f2f0] text-[#787774]">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-xs text-[#787774]">
                이름
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-[#dcdcd9] text-sm outline-none focus:border-[#37352f]"
                />
              </label>
              <label className="text-xs text-[#787774]">
                이모지
                <input
                  value={draft.emoji}
                  onChange={(e) => setDraft({ ...draft, emoji: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-[#dcdcd9] text-sm outline-none focus:border-[#37352f]"
                />
              </label>
              <label className="text-xs text-[#787774]">
                역할
                <input
                  value={draft.role}
                  onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-[#dcdcd9] text-sm outline-none focus:border-[#37352f]"
                />
              </label>
              <label className="text-xs text-[#787774]">
                톤
                <input
                  value={draft.tone}
                  onChange={(e) => setDraft({ ...draft, tone: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-[#dcdcd9] text-sm outline-none focus:border-[#37352f]"
                />
              </label>
              <label className="text-xs text-[#787774] md:col-span-2">
                성격
                <textarea
                  value={draft.personality}
                  onChange={(e) => setDraft({ ...draft, personality: e.target.value })}
                  rows={3}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-[#dcdcd9] text-sm outline-none focus:border-[#37352f] resize-none"
                />
              </label>
              <label className="text-xs text-[#787774] md:col-span-2">
                아바타 URL
                <input
                  value={draft.avatar || ''}
                  onChange={(e) => setDraft({ ...draft, avatar: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-[#dcdcd9] text-sm outline-none focus:border-[#37352f]"
                />
              </label>
            </div>
            <div className="px-5 py-4 border-t border-[#efefef] flex justify-end gap-2">
              <button
                onClick={closeEditor}
                className="px-3 py-2 rounded-lg border border-[#dcdcd9] text-sm text-[#37352f] hover:bg-[#f7f7f5]"
              >
                취소
              </button>
              <button
                onClick={saveAgent}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#37352f] text-sm text-white hover:bg-[#2b2924]"
              >
                <Save size={14} /> 저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonaSettingsView;
