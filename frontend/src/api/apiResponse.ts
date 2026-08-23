export type ApiEnvelope<T> = {
  status?: string;
  message?: string | null;
  data?: T;
  timestamp?: string;
};

export async function parseJsonSafe(response: Response): Promise<unknown> {
  const raw = await response.text();
  if (!raw) return null;

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return { message: raw };
  }
}

export function unwrapApiData<T>(payload: unknown): T | null {
  if (payload === null || typeof payload !== 'object') return null;
  const envelope = payload as ApiEnvelope<T>;
  return 'data' in envelope ? (envelope.data ?? null) : (payload as T);
}

export function getApiMessage(payload: unknown, fallback: string): string {
  if (payload === null || typeof payload !== 'object') return fallback;

  const envelope = payload as ApiEnvelope<{ fields?: Record<string, string> }>;
  if (typeof envelope.message === 'string' && envelope.message.trim()) {
    const fields = envelope.data?.fields;
    const fieldMessage = fields ? Object.values(fields).find(Boolean) : undefined;
    return fieldMessage || envelope.message;
  }

  return fallback;
}
