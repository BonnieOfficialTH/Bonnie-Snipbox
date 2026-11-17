import { useEffect, useMemo, useState } from 'react';
import { repository } from './snippetRepository';
import { uid, normalizeDynamicFieldTokens } from '../../lib/templateEngine';
import { api } from '../../services/api';

const clone = value => JSON.parse(JSON.stringify(value));

export function useSnippets() {
  const [snippets, setSnippets] = useState(repository.getSnippets);
  const [collections, setCollections] = useState(repository.getCollections);
  const [selectedId, setSelectedId] = useState(() => repository.getSnippets()[0]?.id ?? null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sort, setSort] = useState('recent');
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'synced' | 'offline'

  // Persist locally for instant subsequent loads
  useEffect(() => repository.saveSnippets(snippets), [snippets]);
  useEffect(() => repository.saveCollections(collections), [collections]);

  // Sync with Backend API on mount
  useEffect(() => {
    let mounted = true;
    async function syncBootstrap() {
      setSyncStatus('syncing');
      try {
        const data = await api.getBootstrap();
        if (!mounted || !data) return;

        const meta = repository.getMetadata();

        // 1. Process Collections: Ensure 'all' is always present as the first item
        if (Array.isArray(data.collections) && data.collections.length > 0) {
          const hasAll = data.collections.some(c => c.id === 'all');
          const finalCols = hasAll
            ? data.collections
            : [{ id: 'all', name: 'All snippets', color: '#a78bfa' }, ...data.collections];
          setCollections(finalCols);
        }

        // 2. Process Snippets: Merge with local user favorites & lastUsedAt
        if (Array.isArray(data.snippets)) {
          const mergedSnippets = data.snippets.map(s => {
            const userMeta = meta[s.id] || {};
            return {
              ...s,
              isFavorite: userMeta.isFavorite ?? false,
              lastUsedAt: userMeta.lastUsedAt ?? null,
              ...normalizeDynamicFieldTokens(s.content, s.dynamicFields || []),
            };
          });
          setSnippets(mergedSnippets);
          setSelectedId(prev => (mergedSnippets.some(s => s.id === prev) ? prev : mergedSnippets[0]?.id ?? null));
        }

        setSyncStatus('synced');
      } catch (err) {
        if (!mounted) return;
        setSyncStatus('offline');
        console.warn('[Sync] Operating in offline/cached mode:', err.message);
      }
    }

    syncBootstrap();
    return () => {
      mounted = false;
    };
  }, []);

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

  // Save Snippet (Optimistic + Backend sync)
  const saveSnippet = draft => {
    const now = Date.now();
    const itemId = draft.id || uid();
    const item = {
      ...draft,
      id: itemId,
      createdAt: draft.createdAt || now,
      updatedAt: now,
      lastUsedAt: draft.lastUsedAt ?? null,
      isFavorite: draft.isFavorite ?? false,
      ...normalizeDynamicFieldTokens(draft.content, draft.dynamicFields || []),
    };

    setSnippets(items => {
      const exists = items.some(s => s.id === item.id);
      return exists ? items.map(s => s.id === item.id ? item : s) : [item, ...items];
    });
    setSelectedId(item.id);

    // Sync to backend
    api.saveSnippet({
      id: item.id,
      title: item.title,
      categoryId: item.categoryId || null,
      icon: item.icon || '',
      content: item.content,
      dynamicFields: item.dynamicFields || [],
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }).catch(err => console.warn('[Backend] Could not persist snippet:', err.message));
  };

  // Delete Snippet (Optimistic + Backend sync)
  const deleteSnippet = id => {
    setSnippets(items => items.filter(item => item.id !== id));
    if (selectedId === id) {
      setSelectedId(snippets.find(item => item.id !== id)?.id ?? null);
    }
    api.deleteSnippet(id).catch(err => console.warn('[Backend] Could not delete snippet:', err.message));
  };

  const duplicateSnippet = item => ({ ...clone(item), id: null, title: `${item.title} copy`, isFavorite: false });

  // Toggle Favorite (Stored in local metadata per device)
  const toggleFavorite = id => {
    const meta = repository.getMetadata();
    const currentFav = Boolean(meta[id]?.isFavorite);
    const updatedFav = !currentFav;

    meta[id] = { ...meta[id], isFavorite: updatedFav };
    repository.saveMetadata(meta);

    setSnippets(items => items.map(item => item.id === id ? { ...item, isFavorite: updatedFav } : item));
  };

  // Mark Used (Stored in local metadata per device)
  const markUsed = id => {
    const now = Date.now();
    const meta = repository.getMetadata();
    meta[id] = { ...meta[id], lastUsedAt: now };
    repository.saveMetadata(meta);

    setSnippets(items => items.map(item => item.id === id ? { ...item, lastUsedAt: now } : item));
  };

  // Add Collection (Optimistic + Backend sync)
  const addCollection = (name, color) => {
    const now = Date.now();
    const item = {
      id: uid(),
      name,
      color,
      sortOrder: collections.length,
      createdAt: now,
      updatedAt: now,
    };
    setCollections(items => [...items, item]);
    setFilter(item.id);

    api.saveCollection(item).catch(err => console.warn('[Backend] Could not persist collection:', err.message));
  };

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

  // Delete Collection (Optimistic + Backend sync)
  const deleteCollection = id => {
    if (id === 'all' || id === 'uncategorized') return;
    setCollections(items => items.filter(collection => collection.id !== id));
    setSnippets(items => items.map(item => item.categoryId === id ? { ...item, categoryId: '' } : item));
    setFilter(current => current === id ? 'all' : current);

    api.deleteCollection(id).catch(err => console.warn('[Backend] Could not delete collection:', err.message));
  };

  const importBackup = data => {
    if (!Array.isArray(data?.templates) || !data.templates.every(item => item.title && typeof item.content === 'string' && Array.isArray(item.dynamicFields))) throw new Error('Invalid backup');
    const now = Date.now();
    const newItems = data.templates.map(item => ({ ...item, id: uid(), createdAt: now, updatedAt: now }));
    setSnippets(items => [...items, ...newItems]);
    if (Array.isArray(data.collections ?? data.categories)) {
      setCollections(items => [...items, ...(data.collections ?? data.categories).filter(c => !items.some(old => old.id === c.id))]);
    }
    // Also push to backend
    newItems.forEach(item => api.saveSnippet(item).catch(() => {}));
  };

  const exportBackup = () => ({ version: 2, collections, templates: snippets });

  return {
    snippets,
    collections,
    sidebarCollections,
    visibleSnippets,
    selectedSnippet,
    selectedId,
    setSelectedId,
    filter,
    setFilter,
    search,
    setSearch,
    favoritesOnly,
    setFavoritesOnly,
    sort,
    setSort,
    saveSnippet,
    deleteSnippet,
    duplicateSnippet,
    toggleFavorite,
    markUsed,
    addCollection,
    moveCollection,
    deleteCollection,
    importBackup,
    exportBackup,
    syncStatus,
  };
}
