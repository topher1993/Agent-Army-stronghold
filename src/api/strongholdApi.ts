export async function backendHealth(): Promise<{ ok: boolean; phase?: number; error?: string }> {
  try {
    const response = await fetch('http://127.0.0.1:5175/api/health', { cache: 'no-store' });
    if (!response.ok) return { ok: false, error: String(response.status) };
    return response.json();
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'backend unavailable' };
  }
}
