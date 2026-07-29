import { useRef, useState } from 'react';
import { useStyle } from '../../contexts/StyleContext.jsx';

export default function StylePanel() {
  const { style, updateStyle, resetStyle } = useStyle();
  const fontInputRef = useRef(null);
  const [fontFileName, setFontFileName] = useState(null);

  const handleFontUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.ttf') && !file.name.endsWith('.otf')) {
      alert('Please upload a .ttf or .otf font file');
      return;
    }
    const url = URL.createObjectURL(file);
    updateStyle('fontUrl', url);
    updateStyle('fontFamily', file.name.replace(/\.(ttf|otf)$/, ''));
    setFontFileName(file.name);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Caption Style</h3>
        <button onClick={resetStyle} className="text-xs text-gray-500 hover:text-white transition-colors">
          Reset
        </button>
      </div>

      <div>
        <label className="text-xs text-gray-400 block mb-2">Font</label>
        <div className="flex gap-2">
          <input
            type="text"
            className="input flex-1 text-sm"
            placeholder={fontFileName || 'Font name'}
            value={style.fontFamily}
            onChange={(e) => updateStyle('fontFamily', e.target.value)}
          />
          <button
            onClick={() => fontInputRef.current?.click()}
            className="btn-secondary text-xs py-2 px-3"
            title="Upload custom font"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </button>
          <input ref={fontInputRef} type="file" accept=".ttf,.otf" className="hidden" onChange={handleFontUpload} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-400 block mb-2">Size</label>
          <input
            type="range"
            min="24" max="96"
            className="slider"
            value={style.fontSize}
            onChange={(e) => updateStyle('fontSize', Number(e.target.value))}
          />
          <span className="text-xs text-gray-500 mt-1 block">{style.fontSize}px</span>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-2">Color</label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border border-gray-700"
              value={style.fontColor}
              onChange={(e) => updateStyle('fontColor', e.target.value)}
            />
            <span className="text-xs text-gray-500">{style.fontColor}</span>
          </div>
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-2">Letter Spacing</label>
        <input
          type="range"
          min="-2" max="8" step="0.5"
          className="slider"
          value={style.letterSpacing}
          onChange={(e) => updateStyle('letterSpacing', Number(e.target.value))}
        />
        <span className="text-xs text-gray-500 mt-1 block">{style.letterSpacing}px</span>
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={style.fontBold}
            onChange={(e) => updateStyle('fontBold', e.target.checked)}
            className="w-4 h-4 rounded border-gray-600 bg-gray-800 accent-glido-accent"
          />
          <span className="text-xs font-bold">Bold</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={style.fontItalic}
            onChange={(e) => updateStyle('fontItalic', e.target.checked)}
            className="w-4 h-4 rounded border-gray-600 bg-gray-800 accent-glido-accent"
          />
          <span className="text-xs italic">Italic</span>
        </label>
      </div>

      <div>
        <label className="text-xs text-gray-400 block mb-2">Background</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: 'none', label: 'None' },
            { key: 'solid', label: 'Solid' },
            { key: 'semi-transparent', label: 'Semi' },
            { key: 'blurred', label: 'Blurred' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => updateStyle('backgroundType', key)}
              className={`text-xs py-2 px-3 rounded-xl border transition-all ${
                style.backgroundType === key
                  ? 'border-glido-accent bg-glido-accent/10 text-glido-accent-light'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {style.backgroundType !== 'none' && (
          <div className="flex gap-2 items-center mt-2">
            <input
              type="color"
              className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border border-gray-700"
              value={style.backgroundColor}
              onChange={(e) => updateStyle('backgroundColor', e.target.value)}
            />
            <span className="text-xs text-gray-500">{style.backgroundColor}</span>
          </div>
        )}
      </div>

      <div>
        <label className="text-xs text-gray-400 block mb-2">Transition</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: 'none', label: 'None' },
            { key: 'fade', label: 'Fade' },
            { key: 'slide-up', label: 'Slide Up' },
            { key: 'slide-down', label: 'Slide Down' },
            { key: 'scale-in', label: 'Scale In' },
            { key: 'slide-left', label: 'Slide In' },
            { key: 'word-highlight', label: 'Word Glow' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => updateStyle('animationStyle', key)}
              className={`text-xs py-2 px-3 rounded-xl border transition-all ${
                style.animationStyle === key
                  ? 'border-glido-accent bg-glido-accent/10 text-glido-accent-light'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-400 block mb-2">Position</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: 'top', label: 'Top' },
            { key: 'center', label: 'Center' },
            { key: 'bottom', label: 'Bottom' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => updateStyle('position', key)}
              className={`text-xs py-2 px-3 rounded-xl border transition-all ${
                style.position === key
                  ? 'border-glido-accent bg-glido-accent/10 text-glido-accent-light'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
