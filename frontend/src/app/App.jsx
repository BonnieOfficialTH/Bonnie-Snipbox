import { useEffect, useMemo, useState } from 'react';
import { ArrowUpDown, Check, Copy, FileText, Plus, Search, Settings2, Star, X } from 'lucide-react';
import TopBar from '../components/TopBar';
import ArtistBanner from '../components/ArtistBanner';
import CustomSelect from '../components/CustomSelect';
import CollectionSidebar from '../features/collections/CollectionSidebar';
import CollectionModal from '../features/collections/CollectionModal';
import SnippetCard from '../features/snippets/SnippetCard';
import SnippetPreview from '../features/snippets/SnippetPreview';
import EditorModal from '../features/snippets/EditorModal';
import PreferencesModal from '../features/preferences/PreferencesModal';
import { useSnippets } from '../features/snippets/useSnippets';
import { usePreferences } from '../features/preferences/usePreferences';
import { renderContent } from '../lib/templateEngine';

const clone = value => JSON.parse(JSON.stringify(value));
export default function App() {
  const library = useSnippets();
  const { preferences, update: updatePreference } = usePreferences();
  const [editor, setEditor] = useState(null);
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuId, setMenuId] = useState(null);
  const [toast, setToast] = useState('');
  const [pendingCopy, setPendingCopy] = useState(null);
  const [copyInputs, setCopyInputs] = useState({});
  const [previewDayOffset, setPreviewDayOffset] = useState(0);
  const notify = message => setToast(message);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 2400); return () => window.clearTimeout(timer); }, [toast]);
  useEffect(() => setPreviewDayOffset(0), [library.selectedId]);
  const modalOpen = Boolean(editor || collectionModalOpen || settingsOpen || pendingCopy);
  useEffect(() => {
    if (!modalOpen) return;
    const root = document.documentElement;
    const body = document.body;
    const previousStyles = {
      rootOverflow: root.style.overflow,
      rootOverscrollBehavior: root.style.overscrollBehavior,
      bodyOverflow: body.style.overflow,
      bodyOverscrollBehavior: body.style.overscrollBehavior,
      bodyPaddingRight: body.style.paddingRight,
    };
    const scrollbarWidth = window.innerWidth - root.clientWidth;
    root.style.overflow = 'hidden';
    root.style.overscrollBehavior = 'none';
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      root.style.overflow = previousStyles.rootOverflow;
      root.style.overscrollBehavior = previousStyles.rootOverscrollBehavior;
      body.style.overflow = previousStyles.bodyOverflow;
      body.style.overscrollBehavior = previousStyles.bodyOverscrollBehavior;
      body.style.paddingRight = previousStyles.bodyPaddingRight;
    };
  }, [modalOpen]);

  const output = (item, values = {}, dateOffsetDays = 0) => renderContent(item.content, item.dynamicFields, values, preferences.timezone, dateOffsetDays);
  const collectionName = id => library.collections.find(collection => collection.id === id)?.name ?? 'No collection';
  const greeting = useMemo(() => {
    const hour = Number(new Intl.DateTimeFormat('en-US', { hour: '2-digit', hour12: false, timeZone: preferences.timezone }).format(new Date()));
    return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  }, [preferences.timezone]);
  const openNew = () => {
    const defaultCollection = library.collections.find(collection => collection.id === 'social')
      ?? library.collections.find(collection => collection.id !== 'all');
    const categoryId = library.filter === 'all'
      ? defaultCollection?.id ?? ''
      : library.filter === 'uncategorized' ? '' : library.filter;
    setEditor({ title: '', categoryId, icon: '✦', content: '', dynamicFields: [] });
  };
  const copySnippet = async (item, values = {}, dateOffsetDays = 0) => {
    const missing = item.dynamicFields.filter(field => field.type === 'custom' && !((values[field.id] ?? field.defaultValue) || '').trim());
    if (missing.length) { setPendingCopy({ item, missing, dateOffsetDays }); setCopyInputs({ ...values }); return; }
    try { await navigator.clipboard.writeText(output(item, values, dateOffsetDays)); library.markUsed(item.id); notify('Copied to clipboard!'); setPendingCopy(null); }
    catch { notify('Could not copy. Check clipboard permissions.'); }
  };
  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(library.exportBackup(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'snippet-backup.json'; anchor.click(); URL.revokeObjectURL(url); notify('Backup exported');
  };
  const importBackup = event => {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = () => { try { library.importBackup(JSON.parse(reader.result)); notify('Backup imported'); } catch { notify('Invalid backup file'); } };
    reader.readAsText(file); event.target.value = '';
  };
  const addCollection = () => setCollectionModalOpen(true);
  const saveCollection = (name, color) => { library.addCollection(name, color); setCollectionModalOpen(false); notify('Collection created'); };
  const deleteCollection = id => { library.deleteCollection(id); notify('Collection deleted; its snippets have no collection now'); };
  const save = draft => { library.saveSnippet(draft); setEditor(null); notify(draft.id ? 'Changes saved' : 'Snippet created'); };
  const savePreviewTemplate = content => {
    const item = library.selectedSnippet;
    if (!item || item.content === content) return;
    library.saveSnippet({ ...item, content });
    notify('Changes saved');
  };
  const rejectPreviewTemplateEdit = () => notify('Smart content tokens cannot be changed in Preview. Edit them in the snippet editor.');
  const deleteItem = item => { if (window.confirm(`Delete “${item.title}”? This cannot be undone.`)) { library.deleteSnippet(item.id); notify('Snippet deleted'); } setMenuId(null); };

  return <div className={`app ${preferences.theme === 'dark' ? 'dark' : ''}`}>
    <TopBar onHelp={() => notify('Select a snippet to preview, then copy it in one click.')} onSettings={() => setSettingsOpen(true)} />
    <main className="page">
      <ArtistBanner image={preferences.bannerImage} onImageChange={image => updatePreference('bannerImage', image)} greeting={greeting} />
      <div className="toolbar-row"><div className="search-wrap"><Search size={18}/><input value={library.search} onChange={event => library.setSearch(event.target.value)} placeholder="Search your snippets..."/>{library.search&&<button className="clear-search" onClick={()=>library.setSearch('')}><X size={16}/></button>}<kbd>⌘ K</kbd></div><button className="primary-btn" onClick={openNew}><Plus size={17}/> New snippet</button></div>
      <div className="collection-heading"><div><h2>Your collection <span className="count">{library.visibleSnippets.length}</span></h2><p>A little library of things you say often.</p></div><div className="collection-tools"><button className={`filter-toggle ${library.favoritesOnly?'active':''}`} onClick={()=>library.setFavoritesOnly(!library.favoritesOnly)}><Star size={15} fill={library.favoritesOnly?'currentColor':'none'}/> Favorites</button><div className="sort-select"><ArrowUpDown size={14}/><CustomSelect className="sort-custom-select" ariaLabel="Sort snippets" value={library.sort} onChange={library.setSort} options={[{value:'recent',label:'Recently used'},{value:'created',label:'Recently created'},{value:'modified',label:'Recently modified'},{value:'alpha',label:'Alphabetical'},{value:'favorites',label:'Favorites first'}]}/></div></div></div>
      <div className="content-layout"><CollectionSidebar collections={library.sidebarCollections} snippets={library.snippets} filter={library.filter} onFilter={id=>{library.setFilter(id);library.setFavoritesOnly(false);}} onAdd={addCollection}/>
        <section className="cards-area">{library.visibleSnippets.length===0?<div className="empty"><div className="empty-icon"><FileText size={25}/></div><h3>{library.search?'No snippets found':'Your collection is waiting'}</h3><p>{library.search?'Try another keyword or clear your search.':'Create your first snippet and make your everyday a little easier.'}</p>{!library.search&&<button className="primary-btn" onClick={openNew}><Plus size={16}/> Create your first snippet</button>}</div>:<div className="card-grid">{library.visibleSnippets.map(item=><SnippetCard key={item.id} item={item} selected={library.selectedId===item.id} collectionName={collectionName(item.categoryId)} onSelect={()=>library.setSelectedId(item.id)} onCopy={()=>copySnippet(item)} onFavorite={()=>library.toggleFavorite(item.id)} menuOpen={menuId===item.id} onMenu={()=>setMenuId(menuId===item.id?null:item.id)} onEdit={()=>{setEditor(clone(item));setMenuId(null);}} onDuplicate={()=>{setEditor(library.duplicateSnippet(item));setMenuId(null);}} onDelete={()=>deleteItem(item)}/>)}</div>}</section>
      </div>
      <section className="preview-section"><div className="preview-head"><div><div className="eyebrow">READY TO REUSE</div><h2>Snippet preview</h2></div>{library.selectedSnippet&&<span className="live-pill"><span/> LIVE PREVIEW</span>}</div><SnippetPreview item={library.selectedSnippet} collectionName={library.selectedSnippet?collectionName(library.selectedSnippet.categoryId):''} output={library.selectedSnippet?output(library.selectedSnippet, {}, previewDayOffset):''} dateOffsetDays={previewDayOffset} onDateOffsetChange={setPreviewDayOffset} onCopy={()=>copySnippet(library.selectedSnippet, {}, previewDayOffset)} onEdit={()=>setEditor(clone(library.selectedSnippet))} onTemplateSave={savePreviewTemplate} onInvalidTemplateEdit={rejectPreviewTemplateEdit}/></section>
      <footer><div className="footer-brand">snippet<span>.</span></div><span>Write once. Reuse anytime.</span><button onClick={()=>setSettingsOpen(true)}>Preferences</button></footer>
    </main>
    {editor&&<EditorModal data={editor} collections={library.collections} onClose={()=>setEditor(null)} onSave={save} timezone={preferences.timezone} defaultDateFormat={preferences.dateFormat}/>}
    {collectionModalOpen&&<CollectionModal collections={library.collections} snippets={library.snippets} onClose={()=>setCollectionModalOpen(false)} onSave={saveCollection} onMove={library.moveCollection} onDelete={deleteCollection}/>}
    {settingsOpen&&<PreferencesModal preferences={preferences} update={updatePreference} onClose={()=>setSettingsOpen(false)} onExport={exportBackup} onImport={importBackup}/>}
    {pendingCopy&&<div className="modal-backdrop" onMouseDown={event=>event.target===event.currentTarget&&setPendingCopy(null)}><div className="small-modal"><button className="modal-close" onClick={()=>setPendingCopy(null)}><X size={18}/></button><div className="eyebrow">ONE LAST THING</div><h2>Fill in the details</h2><p>Just a couple of details before your text is ready.</p>{pendingCopy.missing.map(field=><label className="form-field" key={field.id}><span>{field.label}</span><input autoFocus placeholder={`Enter ${field.label.toLowerCase()}`} value={copyInputs[field.id]||''} onChange={event=>setCopyInputs(values=>({...values,[field.id]:event.target.value}))}/></label>)}<button className="primary-btn full" onClick={()=>copySnippet(pendingCopy.item,copyInputs,pendingCopy.dateOffsetDays)}><Copy size={16}/> Copy my text</button></div></div>}
    {toast&&<div className="toast"><span><Check size={15}/></span>{toast}</div>}
  </div>;
}
