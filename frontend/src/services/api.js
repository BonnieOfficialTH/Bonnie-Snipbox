const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api');

async function request(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    const json = await res.json();
    if (!json.ok) {
      throw new Error(json.error?.message || `Request failed with status ${res.status}`);
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
