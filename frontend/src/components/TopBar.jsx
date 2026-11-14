import { CircleHelp, Settings2 } from "lucide-react";
export default function TopBar({ onHelp, onSettings }) {
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
