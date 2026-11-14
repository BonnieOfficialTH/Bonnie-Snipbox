import { useEffect, useMemo, useState } from 'react';
import { repository } from './snippetRepository';
import { uid } from '../../lib/templateEngine';

const clone = value => JSON.parse(JSON.stringify(value));
export function useSnippets() {
  const [snippets, setSnippets] = useState(repository.getSnippets);
  const [collections, setCollections] = useState(repository.getCollections);
  const [selectedId, setSelectedId] = useState(() => repository.getSnippets()[0]?.id ?? null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sort, setSort] = useState('recent');
  useEffect(() => repository.saveSnippets(snippets), [snippets]);
  useEffect(() => repository.saveCollections(collections), [collections]);

  const sidebarCollections = useMemo(() => {
    const hasUncategorized = snippets.some(item => !collections.some(collection => collection.id === item.categoryId));
    return hasUncategorized
      ? [...collections, { id: 'uncategorized', name: 'No collection', color: '#aaa3ae' }]
      : collections;
  }, [collections, snippets]);

  const visibleSnippets = useMemo(() => {
    const list = snippets.filter(item =>
      (filter === 'all' ||
        (filter === 'uncategorized'
          ? !collections.some(collection => collection.id === item.categoryId)
          : item.categoryId === filter)) &&
      (!favoritesOnly || item.isFavorite) &&
      (!search || `${item.title} ${item.content} ${collections.find(c => c.id === item.categoryId)?.name ?? 'No collection'}`.toLowerCase().includes(search.toLowerCase()))
    );
    return list.sort((a,b) => sort === 'alpha' ? a.title.localeCompare(b.title)
      : sort === 'created' ? b.createdAt-a.createdAt
      : sort === 'modified' ? b.updatedAt-a.updatedAt
      : sort === 'favorites' ? Number(b.isFavorite)-Number(a.isFavorite)
      : (b.lastUsedAt||0)-(a.lastUsedAt||0));
  }, [snippets, collections, filter, search, favoritesOnly, sort]);

  const selectedSnippet = snippets.find(item => item.id === selectedId) ?? null;
  const saveSnippet = draft => {
    const now = Date.now();
    if (draft.id) setSnippets(items => items.map(item => item.id === draft.id ? { ...draft, updatedAt: now } : item));
    else { const item = { ...draft, id: uid(), createdAt: now, updatedAt: now, lastUsedAt: null, isFavorite: false }; setSnippets(items => [item, ...items]); setSelectedId(item.id); }
    if (draft.id) setSelectedId(draft.id);
  };
  const deleteSnippet = id => { setSnippets(items => items.filter(item => item.id !== id)); if (selectedId === id) setSelectedId(snippets.find(item => item.id !== id)?.id ?? null); };
  const duplicateSnippet = item => ({ ...clone(item), id: null, title: `${item.title} copy`, isFavorite: false });
  const toggleFavorite = id => setSnippets(items => items.map(item => item.id === id ? { ...item, isFavorite: !item.isFavorite } : item));
  const markUsed = id => setSnippets(items => items.map(item => item.id === id ? { ...item, lastUsedAt: Date.now() } : item));
  const addCollection = (name, color) => { const item = { id: uid(), name, color }; setCollections(items => [...items, item]); setFilter(item.id); };
  const moveCollection = (id, targetId) => setCollections(items => {
    const pinned = items.find(collection => collection.id === 'all');
    const ordered = items.filter(collection => collection.id !== 'all');
    const index = ordered.findIndex(collection => collection.id === id);
    const target = ordered.findIndex(collection => collection.id === targetId);
    if (index < 0 || target < 0 || target === index) return items;
    const [moved] = ordered.splice(index, 1);
    ordered.splice(target, 0, moved);
    return pinned ? [pinned, ...ordered] : ordered;
  });
  const deleteCollection = id => {
    if (id === 'all' || id === 'uncategorized') return;
    setCollections(items => items.filter(collection => collection.id !== id));
    setSnippets(items => items.map(item => item.categoryId === id ? { ...item, categoryId: '' } : item));
    setFilter(current => current === id ? 'all' : current);
  };
  const importBackup = data => {
    if (!Array.isArray(data?.templates) || !data.templates.every(item => item.title && typeof item.content === 'string' && Array.isArray(item.dynamicFields))) throw new Error('Invalid backup');
    setSnippets(items => [...items, ...data.templates.map(item => ({ ...item, id: uid(), createdAt: Date.now(), updatedAt: Date.now() }))]);
    if (Array.isArray(data.collections ?? data.categories)) setCollections(items => [...items, ...(data.collections ?? data.categories).filter(c => !items.some(old => old.id === c.id))]);
  };
  const exportBackup = () => ({ version: 2, collections, templates: snippets });
  return { snippets, collections, sidebarCollections, visibleSnippets, selectedSnippet, selectedId, setSelectedId, filter, setFilter, search, setSearch, favoritesOnly, setFavoritesOnly, sort, setSort, saveSnippet, deleteSnippet, duplicateSnippet, toggleFavorite, markUsed, addCollection, moveCollection, deleteCollection, importBackup, exportBackup };
}
