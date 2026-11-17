import { initialTemplates, normalizeDynamicFieldTokens } from '../../lib/templateEngine';

const KEYS = {
  snippets: 'snippet.templates',
  collections: 'snippet.categories',
  preferences: 'snippet.preferences',
  metadata: 'snippet.user_metadata',
};

const read = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('[Storage] Write failed:', e);
  }
};

export const defaultCollections = [
  { id: 'all', name: 'All snippets', color: '#a78bfa' },
  { id: 'social', name: 'Social', color: '#f0a6c1' },
  { id: 'work', name: 'Work', color: '#8bc9b5' },
  { id: 'personal', name: 'Personal', color: '#f4c96b' },
  { id: 'other', name: 'Other', color: '#93b8f4' },
];

export const repository = {
  // Local metadata (favorites, lastUsedAt per user device)
  getMetadata: () => read(KEYS.metadata, {}),
  saveMetadata: value => write(KEYS.metadata, value),

  // Snippets
  getSnippets: () => {
    const meta = read(KEYS.metadata, {});
    return read(KEYS.snippets, initialTemplates).map(snippet => {
      const userMeta = meta[snippet.id] || {};
      return {
        ...snippet,
        isFavorite: userMeta.isFavorite ?? snippet.isFavorite ?? false,
        lastUsedAt: userMeta.lastUsedAt ?? snippet.lastUsedAt ?? null,
        ...normalizeDynamicFieldTokens(snippet.content, snippet.dynamicFields || []),
      };
    });
  },
  saveSnippets: value => write(KEYS.snippets, value),

  // Collections
  getCollections: () => read(KEYS.collections, defaultCollections),
  saveCollections: value => write(KEYS.collections, value),

  // Preferences
  getPreferences: () =>
    read(KEYS.preferences, {
      timezone: 'Asia/Bangkok',
      theme: 'light',
      dateFormat: 'DD/MM/YYYY',
      bannerImage: '',
    }),
  savePreferences: value => write(KEYS.preferences, value),
};
