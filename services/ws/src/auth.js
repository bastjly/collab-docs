const TIMEOUT_MS = 5000;

export async function validateToken(token) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${process.env.API_URL}/api/internal/validate-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': process.env.WS_INTERNAL_SECRET,
      },
      body: JSON.stringify({ token }),
      signal: controller.signal,
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
