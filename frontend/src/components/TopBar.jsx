import { CircleHelp, Settings2 } from "lucide-react";

export default function TopBar({ onHelp, onSettings, syncStatus }) {
  const isCloud = syncStatus === 'synced';
  const isSyncing = syncStatus === 'syncing';

  return (
    <header className="topbar">
      <button
        className="brand"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <span className="brand-mark">s.</span>
        <span>
          snippet<span className="brand-dot">.</span>
        </span>
      </button>

      <div className="top-actions">
        <div
          className={`status-pill ${isCloud ? 'cloud' : isSyncing ? 'syncing' : 'offline'}`}
          title={
            isCloud
              ? 'Connected to Supabase Cloud'
              : isSyncing
              ? 'Connecting to Supabase...'
              : 'Using Local Storage (Supabase API not connected or offline)'
          }
        >
          <span className="status-dot"></span>
          <span>{isCloud ? 'Supabase' : isSyncing ? 'Syncing...' : 'Local'}</span>
        </div>

        <button className="icon-btn help" onClick={onHelp}>
          <CircleHelp size={16} />
          <span>Help</span>
        </button>
        <button className="icon-btn" title="Settings" onClick={onSettings}>
          <Settings2 size={17} />
        </button>
        <button className="avatar" onClick={onSettings}>
          B
        </button>
      </div>
    </header>
  );
}
