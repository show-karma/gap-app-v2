const MODEL_PROVIDER_BY_PREFIX: ReadonlyArray<[string, string]> = [
  ["gpt", "OpenAI"],
  ["claude", "Anthropic"],
  ["grok", "xAI"],
  ["gemini", "Google"],
];

export function formatModelLabel(modelId: string): string {
  const match = MODEL_PROVIDER_BY_PREFIX.find(([prefix]) => modelId.startsWith(prefix));
  return match ? `${modelId} (${match[1]})` : modelId;
}

// Keeps the stored model selectable when editing a config whose model was
// since removed from the backend settings list.
export function buildModelOptions(availableModels: string[], currentModelId?: string): string[] {
  if (currentModelId && !availableModels.includes(currentModelId)) {
    return [...availableModels, currentModelId];
  }
  return availableModels;
}
