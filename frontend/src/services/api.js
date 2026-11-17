function getApiBase() {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();

  if (typeof window !== 'undefined') {
    const isLocalHost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    // When running in production (e.g. on Vercel or any non-localhost domain)
    if (!isLocalHost) {
      // If user provided a valid remote HTTPS backend URL, use it
      if (
        envUrl.startsWith('https://') ||
        (envUrl.startsWith('http://') &&
          !envUrl.includes('localhost') &&
          !envUrl.includes('127.0.0.1'))
      ) {
        return envUrl.replace(/\/+$/, '');
      }
      // Otherwise, ALWAYS use same-origin relative path /api (Vercel Serverless Function)
      return '/api';
    }
  }

  // Local development fallback
  if (
    envUrl &&
    (envUrl.startsWith('http://') || envUrl.startsWith('https://'))
  ) {
    return envUrl.replace(/\/+$/, '');
  }
  return 'http://localhost:3001/api';
}

const API_BASE = getApiBase();

async function request(endpoint, options = {}) {
  try {
    const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    const json = await res.json();
    if (!json.ok) {
      throw new Error(
        json.error?.message || `Request failed with status ${res.status}`
      );
    }
    return json.data;
  } catch (error) {
    console.warn(`[API] ${endpoint} request failed:`, error.message);
    throw error;
  }
}

export const api = {
  getBootstrap: () => request('/bootstrap'),

  // Snippets
  getSnippets: (categoryId) =>
    request(`/snippets${categoryId ? `?categoryId=${categoryId}` : ''}`),
  saveSnippet: (snippet) =>
    request('/snippets', {
      method: 'POST',
      body: JSON.stringify(snippet),
    }),
  deleteSnippet: (id) =>
    request(`/snippets/${id}`, {
      method: 'DELETE',
    }),

  // Collections
  getCollections: () => request('/collections'),
  saveCollection: (collection) =>
    request('/collections', {
      method: 'POST',
      body: JSON.stringify(collection),
    }),
  deleteCollection: (id) =>
    request(`/collections/${id}`, {
      method: 'DELETE',
    }),
};
