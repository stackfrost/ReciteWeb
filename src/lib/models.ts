// ─────────────────────────────────────────────────────────────────────────────
// § MODEL REGISTRY — Late 2026 Flagship Models
// ─────────────────────────────────────────────────────────────────────────────
// This is the single source of truth for all available LLM models.
// The Settings UI reads from this registry to populate dropdowns dynamically.
// ─────────────────────────────────────────────────────────────────────────────

export type LLMProvider = 'anthropic' | 'openai' | 'google' | 'openrouter' | 'ollama';

export interface ModelDescriptor {
  id: string;
  label: string;
  contextWindow?: string;
  note?: string;
}

export interface ProviderDescriptor {
  id: LLMProvider;
  label: string;
  /** API key placeholder hint shown in the credential input */
  keyPlaceholder?: string;
  /** If true, no API key input is required */
  noApiKey?: boolean;
  models: ModelDescriptor[];
}

export const MODEL_REGISTRY: ProviderDescriptor[] = [
  {
    id: 'anthropic',
    label: 'Anthropic',
    keyPlaceholder: 'sk-ant-...',
    models: [
      { id: 'claude-5-sonnet', label: 'Claude 5 Sonnet', contextWindow: '200k' },
      { id: 'claude-5-opus',   label: 'Claude 5 Opus',   contextWindow: '200k', note: 'Flagship' },
      { id: 'claude-4.5-haiku', label: 'Claude 4.5 Haiku', contextWindow: '200k', note: 'Fast' },
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    keyPlaceholder: 'sk-...',
    models: [
      { id: 'gpt-5.6-sol',   label: 'GPT-5.6 Sol',   contextWindow: '256k', note: 'Flagship' },
      { id: 'gpt-5.6-terra', label: 'GPT-5.6 Terra', contextWindow: '256k' },
      { id: 'gpt-5.6-luna',  label: 'GPT-5.6 Luna',  contextWindow: '128k', note: 'Fast' },
      { id: 'gpt-5.5',       label: 'GPT-5.5',        contextWindow: '128k' },
      { id: 'o3-pro',        label: 'o3 Pro',         contextWindow: '128k', note: 'Reasoning' },
    ],
  },
  {
    id: 'google',
    label: 'Google Gemini',
    keyPlaceholder: 'AIzaSy...',
    models: [
      { id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash', contextWindow: '1M', note: 'Fast' },
      { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite', contextWindow: '1M', note: 'Ultra Fast' },
      { id: 'gemini-3.1-pro',   label: 'Gemini 3.1 Pro',   contextWindow: '1M', note: 'Flagship' },
    ],
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    keyPlaceholder: 'sk-or-...',
    models: [
      {
        id: 'openrouter/free',
        label: 'Openrouter/free',
      },
      { id: 'openai/gpt-5.6-sol',             label: 'OpenAI: GPT-5.6 Sol',       contextWindow: '256k' },
      { id: 'anthropic/claude-5-sonnet',       label: 'Anthropic: Claude 5 Sonnet', contextWindow: '200k' },
      { id: 'google/gemini-3.7-flash',         label: 'Google: Gemini 3.7 Flash',   contextWindow: '1M'  },
      { id: 'google/gemini-3.5-flash-lite',    label: 'Google: Gemini 3.5 Flash Lite', contextWindow: '1M' },
      { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Meta: Llama 3.3 70B',     contextWindow: '128k' },
    ],
  },
  {
    id: 'ollama',
    label: 'Ollama (Local)',
    noApiKey: true,
    models: [
      { id: 'llama3.3',  label: 'Llama 3.3',   note: 'Air-gapped' },
      { id: 'qwen2.5',   label: 'Qwen 2.5',    note: 'Air-gapped' },
      { id: 'mistral',   label: 'Mistral',      note: 'Air-gapped' },
    ],
  },
];

/** Quick lookup map: provider id → descriptor */
export const PROVIDER_MAP = new Map<LLMProvider, ProviderDescriptor>(
  MODEL_REGISTRY.map((p) => [p.id, p])
);

/** Get models for a given provider */
export function getModelsForProvider(provider: LLMProvider): ModelDescriptor[] {
  return PROVIDER_MAP.get(provider)?.models ?? [];
}

/** Get the first (default) model id for a provider */
export function getDefaultModel(provider: LLMProvider): string {
  return getModelsForProvider(provider)[0]?.id ?? '';
}
