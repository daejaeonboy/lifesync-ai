import { AppSettings, ApiConnection } from '../types';

export const DEFAULT_GEMINI_MODEL = 'gemini-3-flash-preview';

export interface GeminiModelOption {
    id: string;
    label: string;
}

export const GEMINI_MODEL_OPTIONS: GeminiModelOption[] = [
    { id: 'gemini-3-pro-preview', label: 'Gemini 3 Pro Preview' },
    { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview' },
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash-Lite' },
    { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
];

const GEMINI_MODEL_ALIASES: Record<string, string> = {
    'gemini-3.0-pro': 'gemini-3-pro-preview',
    'gemini-3.0-flash': 'gemini-3-flash-preview',
    'gemini-3-pro': 'gemini-3-pro-preview',
    'gemini-3-flash': 'gemini-3-flash-preview',
};

export const normalizeGeminiModelName = (modelName?: string): string => {
    const normalized = (modelName || '').trim().toLowerCase();
    if (!normalized) return DEFAULT_GEMINI_MODEL;
    return GEMINI_MODEL_ALIASES[normalized] || normalized;
};

export interface ActiveGeminiConfig {
    connectionId?: string;
    apiKey: string;
    modelName: string;
}

const hasUsableKey = (connection: ApiConnection): boolean => {
    return typeof connection.apiKey === 'string' && connection.apiKey.trim().length > 0;
};

export const getActiveGeminiConfig = (settings: AppSettings): ActiveGeminiConfig | null => {
    const connections = settings.apiConnections || [];

    const selected = connections.find(
        c =>
            c.id === settings.activeConnectionId &&
            c.provider === 'gemini' &&
            c.isActive &&
            hasUsableKey(c)
    );

    if (selected) {
        return {
            connectionId: selected.id,
            apiKey: selected.apiKey,
            modelName: normalizeGeminiModelName(selected.modelName),
        };
    }

    const firstActiveGemini = connections.find(
        c => c.provider === 'gemini' && c.isActive && hasUsableKey(c)
    );

    if (firstActiveGemini) {
        return {
            connectionId: firstActiveGemini.id,
            apiKey: firstActiveGemini.apiKey,
            modelName: normalizeGeminiModelName(firstActiveGemini.modelName),
        };
    }

    if (typeof settings.geminiApiKey === 'string' && settings.geminiApiKey.trim().length > 0) {
        return {
            apiKey: settings.geminiApiKey,
            modelName: DEFAULT_GEMINI_MODEL,
        };
    }

    return null;
};
