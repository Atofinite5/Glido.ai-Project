import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useVideo } from '../../contexts/VideoContext.jsx';
import { useStyle } from '../../contexts/StyleContext.jsx';

export default function ExportPanel() {
  const { videoId, setError } = useVideo();
  const { getStylePayload } = useStyle();
  const [showModal, setShowModal] = useState(false);
  const [orientation, setOrientation] = useState('landscape');
  const [resolution, setResolution] = useState('1080p');
  const [includeSubtitles, setIncludeSubtitles] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState(null);

  const handleExport = useCallback(async () => {
    if (!videoId) return;

    setIsExporting(true);
    setExportResult(null);

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, orientation, resolution, includeSubtitles }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Export failed');
      }

      const data = await response.json();
      setExportResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsExporting(false);
    }
  }, [videoId, orientation, resolution, includeSubtitles, setError]);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={!videoId}
        className="btn-primary text-sm py-2 px-4"
      >
        Export
      </button>

      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowModal(false)}>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md mx-4 z-50" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Export Video</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-xs text-gray-400 block mb-2">Orientation</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'landscape', label: 'Landscape (16:9)', icon: '⊞' },
                    { key: 'portrait', label: 'Portrait (9:16)', icon: '⊟' },
                  ].map(({ key, label, icon }) => (
                    <button
                      key={key}
                      onClick={() => setOrientation(key)}
                      className={`text-sm py-3 px-4 rounded-xl border transition-all ${
                        orientation === key
                          ? 'border-glido-accent bg-glido-accent/10 text-glido-accent-light'
                          : 'border-gray-700 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      <div className="text-lg mb-1">{icon}</div>
                      <div className="text-xs">{label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-2">Resolution</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: '1080p', label: '1080p', desc: '1920x1080 / 1080x1920' },
                    { key: '4K', label: '4K', desc: '3840x2160 / 2160x3840' },
                  ].map(({ key, label, desc }) => (
                    <button
                      key={key}
                      onClick={() => setResolution(key)}
                      className={`text-sm py-3 px-4 rounded-xl border transition-all ${
                        resolution === key
                          ? 'border-glido-accent bg-glido-accent/10 text-glido-accent-light'
                          : 'border-gray-700 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      <div className="font-medium">{label}</div>
                      <div className="text-[10px] opacity-60">{desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSubtitles}
                  onChange={(e) => setIncludeSubtitles(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-800 accent-glido-accent"
                />
                <div>
                  <span className="text-sm">Include SRT/VTT subtitles</span>
                  <p className="text-[10px] text-gray-500">Download subtitle files alongside video</p>
                </div>
              </label>

              <button
                onClick={handleExport}
                disabled={isExporting}
                className="btn-primary w-full"
              >
                {isExporting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Exporting...
                  </span>
                ) : (
                  `Export ${resolution} ${orientation}`
                )}
              </button>

              {exportResult && (
                <div className="bg-green-900/20 border border-green-800/30 rounded-xl p-4 space-y-2">
                  <p className="text-sm text-green-300 font-medium">Export Complete!</p>
                  <div className="space-y-2">
                    <a
                      href={exportResult.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm text-glido-accent-light hover:text-white transition-colors truncate"
                    >
                      Download Video
                    </a>
                    {exportResult.subtitleUrl && (
                      <a
                        href={exportResult.subtitleUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-glido-accent-light hover:text-white transition-colors truncate"
                      >
                        Download Subtitles (SRT)
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
      document.body
    )}
    </>
  );
}
