// Model configurations based on your project
export const MODELS = [
  {
    id: 'gpt4',
    name: 'GPT-4.1-mini',
    provider: 'OpenAI',
    color: '#10a37f',
    icon: '🟢',
    avgAccuracy: 7.2,
    avgCoherence: 8.1,
    avgCompleteness: 7.5,
    avgRelevance: 7.8
  },
  {
    id: 'claude',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    color: '#d97706',
    icon: '🟠',
    avgAccuracy: 7.8,
    avgCoherence: 8.4,
    avgCompleteness: 7.9,
    avgRelevance: 8.2
  },
  {
    id: 'gemini',
    name: 'Gemini 2.0 Flash',
    provider: 'Google',
    color: '#4285f4',
    icon: '🔵',
    avgAccuracy: 8.1,
    avgCoherence: 7.9,
    avgCompleteness: 7.6,
    avgRelevance: 8.0
  },
  {
    id: 'deepseek',
    name: 'DeepSeek Chat V3',
    provider: 'DeepSeek',
    color: '#8b5cf6',
    icon: '🟣',
    avgAccuracy: 8.3,
    avgCoherence: 8.2,
    avgCompleteness: 8.0,
    avgRelevance: 8.1
  },
  {
    id: 'minimax',
    name: 'MiniMax M2',
    provider: 'MiniMax',
    color: '#ef4444',
    icon: '🔴',
    avgAccuracy: 6.5,
    avgCoherence: 6.8,
    avgCompleteness: 6.2,
    avgRelevance: 6.4
  }
];

export const JUDGE_MODEL = {
  name: 'LLaMA-3-8B-Instant',
  provider: 'Meta',
  icon: '⚖️'
};

export const PROMPT_TYPES = [
  { id: 'implicit', name: 'Implicit Zero-Shot', description: 'Raw question only' },
  { id: 'explicit', name: 'Explicit Zero-Shot', description: 'Direct instruction added' },
  { id: 'autocot', name: 'Auto-CoT', description: 'Chain-of-thought reasoning' }
];

export const METRICS = ['Accuracy', 'Completeness', 'Coherence', 'Relevance'];

// Feature importance from your Random Forest analysis
export const FEATURE_IMPORTANCE = [
  { metric: 'Coherence', importance: 0.399971 },
  { metric: 'Completeness', importance: 0.279987 },
  { metric: 'Relevance', importance: 0.166689 },
  { metric: 'Accuracy', importance: 0.153533 }
];
