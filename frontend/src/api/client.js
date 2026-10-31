import { parseResponse } from './schema.js';

/**
 * HttpClient — calls the real backend /extract endpoint.
 * @param {File} imageFile
 * @param {AbortSignal} signal
 * @param {string} apiUrl
 */
export async function extractFromApi(imageFile, signal, apiUrl = '') {
  const formData = new FormData();
  formData.append('image', imageFile);

  const response = await fetch(`${apiUrl}/extract`, {
    method: 'POST',
    body: formData,
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Server returned ${response.status}: ${text || response.statusText}`);
  }

  const raw = await response.json();
  const parsed = parseResponse(raw);

  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.data;
}

/**
 * Check backend health.
 * @param {string} apiUrl
 * @returns {'online' | 'warming' | 'offline'}
 */
export async function checkHealth(apiUrl = '') {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${apiUrl}/health`, { signal: controller.signal });
    clearTimeout(id);
    return res.ok ? 'online' : 'offline';
  } catch (e) {
    if (e.name === 'AbortError') return 'warming';
    return 'offline';
  }
}
