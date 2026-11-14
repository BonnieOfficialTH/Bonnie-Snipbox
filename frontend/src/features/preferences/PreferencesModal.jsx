import { Download, Moon, Sun, Upload, X } from 'lucide-react';
import CustomSelect from '../../components/CustomSelect';
import { DATE_FORMATS } from '../../lib/templateEngine';

const dateFormatOptions = DATE_FORMATS.map(([format]) => ({ value: format, label: format }));
const timezoneOptions = ['Asia/Bangkok', 'Asia/Tokyo', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'UTC']
  .map(timezone => ({ value: timezone, label: timezone }));

export default function PreferencesModal({ preferences, update, onClose, onExport, onImport }) {
  return <div className="modal-backdrop" onMouseDown={event=>event.target===event.currentTarget&&onClose()}><div className="settings-panel"><div className="modal-header"><div><div className="eyebrow">MAKE IT YOURS</div><h2>Preferences</h2></div><button className="modal-close" onClick={onClose}><X size={18}/></button></div>
    <div className="setting-row"><div><b>Default date format</b><small>Used when adding a new date field</small></div><CustomSelect ariaLabel="Default date format" className="setting-select" value={preferences.dateFormat} onChange={value=>update('dateFormat',value)} options={dateFormatOptions}/></div>
    <div className="setting-row"><div><b>Timezone</b><small>Used to calculate dynamic dates and time</small></div><CustomSelect ariaLabel="Timezone" className="setting-select" value={preferences.timezone} onChange={value=>update('timezone',value)} options={timezoneOptions}/></div>
    <div className="setting-row"><div><b>Appearance</b><small>Choose how snippet looks</small></div><div className="theme-options"><button className={preferences.theme==='light'?'on':''} onClick={()=>update('theme','light')}><Sun size={14}/> Light</button><button className={preferences.theme==='dark'?'on':''} onClick={()=>update('theme','dark')}><Moon size={14}/> Dark</button></div></div>
    <div className="setting-row"><div><b>Backup & restore</b><small>Your snippets stay on this device</small></div><div className="backup-actions"><button onClick={onExport}><Download size={14}/> Export</button><label><Upload size={14}/> Import<input type="file" accept="application/json" onChange={onImport}/></label></div></div><div className="settings-note">Your library is stored locally in this browser. Export a backup before clearing browser data.</div>
  </div></div>;
}
