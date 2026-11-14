import { useState } from 'react';
import { ChevronDown, Plus, Search, Sparkles } from 'lucide-react';

function CollectionButton({ collection, snippets, collections, filter, onSelect }) {
  const count = collection.id === 'all'
    ? snippets.length
    : collection.id === 'uncategorized'
      ? snippets.filter(item => !collections.some(known => known.id === item.categoryId)).length
      : snippets.filter(item => item.categoryId === collection.id).length;

  return <button className={`category ${filter === collection.id ? 'chosen' : ''}`} onClick={() => onSelect(collection.id)}>
    <span className="cat-dot" style={{ background: collection.color || '#b99be8' }}/>
    {collection.name}
    <span className="cat-count">{count}</span>
  </button>;
}

export default function CollectionSidebar({ collections, snippets, filter, onFilter, onAdd }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [search, setSearch] = useState('');
  const allCollection = collections.find(collection => collection.id === 'all');
  const uncategorized = collections.find(collection => collection.id === 'uncategorized');
  const regularCollections = collections.filter(collection => collection.id !== 'all' && collection.id !== 'uncategorized');
  const visibleCollections = regularCollections.slice(0, 4);
  const moreCollections = regularCollections.slice(4);
  const activeMoreCollection = moreCollections.find(collection => collection.id === filter);
  const filteredMoreCollections = moreCollections.filter(collection => collection.name.toLowerCase().includes(search.toLowerCase()));
  const selectCollection = id => {
    onFilter(id);
    setMoreOpen(false);
    setSearch('');
  };

  return <aside className="sidebar">
    <div className="side-label">COLLECTIONS</div>
    {allCollection && <CollectionButton collection={allCollection} snippets={snippets} collections={collections} filter={filter} onSelect={selectCollection}/>}
    {visibleCollections.map(collection => <CollectionButton key={collection.id} collection={collection} snippets={snippets} collections={collections} filter={filter} onSelect={selectCollection}/>)}
    {uncategorized && <CollectionButton collection={uncategorized} snippets={snippets} collections={collections} filter={filter} onSelect={selectCollection}/>}
    {moreCollections.length > 0 && <div className="collection-more">
      <button className={`category collection-more-toggle ${moreOpen || activeMoreCollection ? 'chosen' : ''}`} aria-expanded={moreOpen} aria-controls="collection-more-list" onClick={() => setMoreOpen(open => !open)}>
        <span className="cat-dot collection-more-dot"><ChevronDown size={11}/></span>
        {activeMoreCollection?.name ?? 'More'}
        <span className="cat-count">{moreCollections.length}</span>
      </button>
      {moreOpen && <div className="collection-more-menu" id="collection-more-list">
        <label className="collection-search"><Search size={14}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Find a collection"/></label>
        <div className="collection-more-items">
          {filteredMoreCollections.length
            ? filteredMoreCollections.map(collection => <CollectionButton key={collection.id} collection={collection} snippets={snippets} collections={collections} filter={filter} onSelect={selectCollection}/>)
            : <span className="collection-no-results">No matching collections</span>}
        </div>
      </div>}
    </div>}
    <button className="add-category" onClick={onAdd}><Plus size={14}/> Manage collections</button>
    <div className="side-note"><Sparkles size={15}/><span>Good words deserve<br/>to be reused.</span></div>
  </aside>;
}
