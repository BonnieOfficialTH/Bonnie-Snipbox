import { useEffect, useState } from 'react';
import { CalendarDays, Clock3, Copy, Pencil, RotateCcw, Sparkles } from 'lucide-react';
import { sameTemplateTokens } from '../../lib/templateEngine';

export default function SnippetPreview({
  item,
  collectionName,
  output,
  dateOffsetDays = 0,
  onDateOffsetChange,
  onCopy,
  onEdit,
  onTemplateSave,
  onInvalidTemplateEdit,
}) {
  const [templateDraft, setTemplateDraft] = useState(item?.content || '');
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  useEffect(() => setTemplateDraft(item?.content || ''), [item?.id, item?.content]);
  useEffect(() => setIsEditingTemplate(false), [item?.id]);

  if (!item) return <div className="preview-empty">Choose a snippet above to see its live preview.</div>;
  const hasDateField = item.dynamicFields.some(field => field.type === 'date' || field.type === 'day');
  const offsetLabel = dateOffsetDays === 0
    ? 'Today'
    : `${dateOffsetDays > 0 ? '+' : ''}${dateOffsetDays} ${Math.abs(dateOffsetDays) === 1 ? 'day' : 'days'}`;
  const saveTemplate = () => {
    if (templateDraft === item.content) {
      setIsEditingTemplate(false);
      return;
    }
    if (!sameTemplateTokens(item.content, templateDraft)) {
      setTemplateDraft(item.content);
      onInvalidTemplateEdit();
      setIsEditingTemplate(false);
      return;
    }
    onTemplateSave(templateDraft);
    setIsEditingTemplate(false);
  };

  return <div className="preview-card">
    <div className="preview-main">
      <div className="preview-title-row">
        <span className="preview-icon">{item.icon}</span>
        <div><h3>{item.title}</h3><span className="preview-meta">{collectionName} · Updated just now</span></div>
      </div>
      <div className="preview-template">
        <div className="preview-template-heading">
          <span className="preview-template-label">{isEditingTemplate ? 'EDIT TEMPLATE' : 'COPY PREVIEW'}</span>
          <button
            type="button"
            className="preview-template-toggle"
            onClick={() => setIsEditingTemplate(!isEditingTemplate)}
          >
            <Pencil size={13}/>{isEditingTemplate ? 'Done' : 'Edit template'}
          </button>
        </div>
        {isEditingTemplate
          ? <textarea
              className="preview-template-editor"
              aria-label="Edit snippet template"
              value={templateDraft}
              onChange={event => setTemplateDraft(event.target.value)}
              onBlur={saveTemplate}
              spellCheck="false"
            />
          : <pre className="output preview-copy-output">{output}</pre>}
        <span className="preview-template-hint">
          {isEditingTemplate
            ? 'Changes save when you leave this field. Smart content tokens stay protected.'
            : 'This is how the text will look when copied.'}
        </span>
      </div>
      {hasDateField && <div className="date-shift-controls" aria-label="Change preview date">
        <span className="date-shift-label"><CalendarDays size={14}/> Preview date</span>
        <div className="date-shift-main">
          <div className="date-shift-stepper">
            <button type="button" aria-label="Previous day" title="Previous day" onClick={() => onDateOffsetChange(dateOffsetDays - 1)}>−1 day</button>
            <output aria-live="polite">{offsetLabel}</output>
            <button type="button" aria-label="Next day" title="Next day" onClick={() => onDateOffsetChange(dateOffsetDays + 1)}>+1 day</button>
          </div>
          <div className="date-shift-reset-slot">
            {dateOffsetDays !== 0 && <button className="date-shift-reset" type="button" aria-label="Reset to today" title="Reset to today" onClick={() => onDateOffsetChange(0)}><RotateCcw size={12}/> Reset to today</button>}
          </div>
        </div>
      </div>}
      {item.dynamicFields.length > 0 && <div className="dynamic-used">
        <span className="dynamic-label"><Sparkles size={13}/> SMART CONTENT</span>
        <div className="chips">{item.dynamicFields.map(field => <span className="field-chip" key={field.id}>{field.type === 'custom' ? '✎' : '✦'} {field.label}</span>)}</div>
      </div>}
    </div>
    <div className="preview-side">
      <div className="side-preview-label">YOUR TEXT, READY</div>
      <p>Dynamic details update automatically, so your snippet is always fresh.</p>
      <button className="copy-main" onClick={onCopy}><Copy size={16}/> Copy text</button>
      <button className="edit-btn" onClick={onEdit}><Pencil size={15}/> Edit snippet</button>
      <div className="preview-foot">
        <span><Clock3 size={13}/> {item.lastUsedAt ? 'Used recently' : 'Ready to use'}</span>
        <span>Stored on this device</span>
      </div>
    </div>
  </div>;
}
