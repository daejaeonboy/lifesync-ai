import { AIAgent } from '../types';

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
