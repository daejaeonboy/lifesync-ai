import { AppSettings, ApiConnection } from '../types';

export const DEFAULT_GEMINI_MODEL = 'gemini-1.5-flash';

export interface GeminiModelOption {
    id: string;
    label: string;
}

export const GEMINI_MODEL_OPTIONS: GeminiModelOption[] = [
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash-Lite' },
    { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
];

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
            modelName: selected.modelName?.trim() || DEFAULT_GEMINI_MODEL,
        };
    }

    const firstActiveGemini = connections.find(
        c => c.provider === 'gemini' && c.isActive && hasUsableKey(c)
    );

    if (firstActiveGemini) {
        return {
            connectionId: firstActiveGemini.id,
            apiKey: firstActiveGemini.apiKey,
            modelName: firstActiveGemini.modelName?.trim() || DEFAULT_GEMINI_MODEL,
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
