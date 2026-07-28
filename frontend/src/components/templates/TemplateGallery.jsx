import { useState, useEffect, useCallback } from 'react';
import { useStyle } from '../../contexts/StyleContext.jsx';

export default function TemplateGallery() {
  const { applyTemplate, activeTemplate, getStylePayload } = useStyle();
  const [templates, setTemplates] = useState([]);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [templateName, setTemplateName] = useState('');

  useEffect(() => {
    fetch('/api/templates')
      .then(r => { if (!r.ok) throw new Error('Failed to fetch'); return r.json(); })
      .then(data => { if (Array.isArray(data)) setTemplates(data); })
      .catch(() => {});
  }, []);

  const handleSave = useCallback(async () => {
    if (!templateName.trim()) return;
    try {
      const style = getStylePayload();
      await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: templateName, style }),
      });
      setTemplateName('');
      setShowSaveInput(false);
    } catch (err) {
      console.error('Save failed:', err);
    }
  }, [templateName, getStylePayload]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Templates</h3>
        <button
          onClick={() => setShowSaveInput(!showSaveInput)}
          className="text-xs text-glido-accent-light hover:text-white transition-colors"
        >
          {showSaveInput ? 'Cancel' : '+ Save Current'}
        </button>
      </div>

      {showSaveInput && (
        <div className="flex gap-2">
          <input
            type="text"
            className="input flex-1 text-xs"
            placeholder="Template name"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <button onClick={handleSave} className="btn-primary text-xs py-2 px-3">Save</button>
        </div>
      )}

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {templates.map((t, i) => (
          <button
            key={i}
            onClick={() => applyTemplate(t)}
            className={`w-full text-left p-3 rounded-xl border transition-all ${
              activeTemplate === t.name
                ? 'border-glido-accent bg-glido-accent/10'
                : 'border-gray-800 hover:border-gray-700 bg-gray-900/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold"
                style={{
                  backgroundColor: t.style?.background_color || '#000',
                  color: t.style?.font_color || '#fff',
                  fontFamily: t.style?.font_family || 'Arial',
                }}
              >
                Aa
              </div>
              <div>
                <p className="text-sm font-medium">{t.name}</p>
                <p className="text-[10px] text-gray-500">
                  {t.style?.animation_style === 'word-highlight' ? 'Word highlight' : t.style?.animation_style || 'Static'} · {t.style?.position || 'bottom'}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
