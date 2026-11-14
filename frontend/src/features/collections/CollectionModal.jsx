import { useState } from 'react';
import { Check, GripVertical, Search, Trash2, X } from 'lucide-react';

const colorOptions = ['#f0a6c1', '#8bc9b5', '#f4c96b', '#93b8f4', '#b99be8', '#f39b76', '#78b9c5'];

export default function CollectionModal({ collections, snippets, onClose, onSave, onDelete, onMove }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(colorOptions[0]);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [collectionSearch, setCollectionSearch] = useState('');
  const [draggedId, setDraggedId] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);
  const deletableCollections = collections.filter(collection => collection.id !== 'all');
  const visibleCollections = deletableCollections.filter(collection => collection.name.toLowerCase().includes(collectionSearch.toLowerCase()));
  const pendingCollection = deletableCollections.find(collection => collection.id === pendingDelete);
  const affectedCount = pendingDelete
    ? snippets.filter(snippet => snippet.categoryId === pendingDelete).length
    : 0;

  const submit = event => {
    event.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), color);
  };

  return <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className="collection-modal" role="dialog" aria-modal="true" aria-labelledby="collection-modal-title">
      <div className="modal-header">
        <div><div className="eyebrow">ORGANIZE YOUR SNIPPETS</div><h2 id="collection-modal-title">Manage collections</h2></div>
        <button className="modal-close" type="button" aria-label="Close" onClick={onClose}><X size={18}/></button>
      </div>

      {deletableCollections.length > 4 && <label className="collection-modal-search"><Search size={14}/><input value={collectionSearch} onChange={event => setCollectionSearch(event.target.value)} placeholder="Find a collection"/></label>}
      <div className="collection-list">
        {visibleCollections.length
          ? visibleCollections.map(collection => <div className={`collection-row ${dropTargetId === collection.id ? 'drag-over' : ''}`} key={collection.id}
            onDragOver={event => { event.preventDefault(); if (draggedId && draggedId !== collection.id) setDropTargetId(collection.id); }}
            onDrop={event => {
              event.preventDefault();
              if (draggedId && draggedId !== collection.id) onMove(draggedId, collection.id);
              setDraggedId(null);
              setDropTargetId(null);
            }}>
            <span className="cat-dot" style={{ background: collection.color || '#b99be8' }}/>
            <span className="collection-row-name">{collection.name}</span>
            <span className="cat-count">{snippets.filter(snippet => snippet.categoryId === collection.id).length}</span>
            <button className="collection-drag-handle" type="button" draggable aria-label={`Drag to reorder ${collection.name}`} title="Drag to reorder" onDragStart={event => {
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/plain', collection.id);
              setDraggedId(collection.id);
            }} onDragEnd={() => { setDraggedId(null); setDropTargetId(null); }} onKeyDown={event => {
              if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
              event.preventDefault();
              const index = deletableCollections.findIndex(item => item.id === collection.id);
              const neighbor = deletableCollections[index + (event.key === 'ArrowUp' ? -1 : 1)];
              if (neighbor) onMove(collection.id, neighbor.id);
            }}><GripVertical size={16}/></button>
            <button className="collection-remove-btn" type="button" title={`Delete ${collection.name}`} aria-label={`Delete ${collection.name}`} onClick={() => setPendingDelete(collection.id)}><Trash2 size={15}/></button>
          </div>)
          : <p className="collection-empty">{deletableCollections.length ? 'No matching collections.' : 'No collections yet. Create one below.'}</p>}
      </div>

      {pendingCollection && <div className="collection-confirm" role="alertdialog" aria-label={`Delete ${pendingCollection.name}?`}>
        <p><strong>Delete “{pendingCollection.name}”?</strong><br/>
          {affectedCount
            ? `${affectedCount} snippet${affectedCount === 1 ? '' : 's'} will remain saved without a collection.`
            : 'This collection will be removed.'}
        </p>
        <div>
          <button className="cancel-btn" type="button" onClick={() => setPendingDelete(null)}>Cancel</button>
          <button className="danger-btn" type="button" onClick={() => { onDelete(pendingCollection.id); setPendingDelete(null); }}>Delete collection</button>
        </div>
      </div>}

      <form className="collection-form" onSubmit={submit}>
        <div className="collection-form-heading">CREATE A COLLECTION</div>
        <label className="form-field"><span>Collection name</span><input autoFocus value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Projects"/></label>
        <div className="collection-color-row">
          <span className="collection-color-label">Dot color</span>
          <div className="collection-color-options" role="group" aria-label="Choose collection dot color">
            {colorOptions.map(option => <button key={option} className={color === option ? 'selected' : ''} type="button" style={{ background: option }} aria-label={`Choose ${option}`} aria-pressed={color === option} onClick={() => setColor(option)}/>)}
          </div>
          <input className="collection-color-picker" type="color" value={color} aria-label="Custom dot color" onChange={event => setColor(event.target.value)}/>
        </div>
        <div className="modal-footer">
          <button className="cancel-btn" type="button" onClick={onClose}>Close</button>
          <button className="primary-btn" type="submit" disabled={!name.trim()}><Check size={15}/> Add collection</button>
        </div>
      </form>
    </section>
  </div>;
}
