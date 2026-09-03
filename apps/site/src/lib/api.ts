// API base URL — set PUBLIC_API_URL in .env; defaults to local dev.
export const API_URL: string =
  import.meta.env.PUBLIC_API_URL ?? 'http://localhost:8081/api/v1';

export interface SignalPayload {
  type: 'contact' | 'inquiry';
  name: string;
  email: string;
  company?: string;
  service?: string;
  message: string;
  source_page?: string;
  locale: string;
}

export interface SignalResponse {
  id: number;
  type: string;
  name: string;
  email: string;
  message: string;
  locale: string;
  created_at: string;
}

export async function submitSignal(
  payload: SignalPayload,
): Promise<SignalResponse> {
  const res = await fetch(`${API_URL}/signals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      body?.error ?? `Request failed with status ${res.status}`,
    );
  }

  return res.json();
}