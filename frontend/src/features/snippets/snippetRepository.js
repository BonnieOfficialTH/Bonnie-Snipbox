import { initialTemplates, normalizeDynamicFieldTokens } from '../../lib/templateEngine';

const KEYS = { snippets: 'snippet.templates', collections: 'snippet.categories', preferences: 'snippet.preferences' };
const read = (key, fallback) => {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; }
  catch { return fallback; }
};
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));

export const defaultCollections = [
  { id: 'all', name: 'All snippets', color: '#a78bfa' },
  { id: 'social', name: 'Social', color: '#f0a6c1' },
  { id: 'work', name: 'Work', color: '#8bc9b5' },
  { id: 'personal', name: 'Personal', color: '#f4c96b' },
  { id: 'other', name: 'Other', color: '#93b8f4' },
];

export const repository = {
  getSnippets: () => read(KEYS.snippets, initialTemplates).map(snippet => ({
    ...snippet,
    ...normalizeDynamicFieldTokens(snippet.content, snippet.dynamicFields || []),
  })),
  saveSnippets: value => write(KEYS.snippets, value),
  getCollections: () => read(KEYS.collections, defaultCollections),
  saveCollections: value => write(KEYS.collections, value),
  getPreferences: () => read(KEYS.preferences, { timezone: 'Asia/Bangkok', theme: 'light', dateFormat: 'DD/MM/YYYY', bannerImage: '' }),
  savePreferences: value => write(KEYS.preferences, value),
};
