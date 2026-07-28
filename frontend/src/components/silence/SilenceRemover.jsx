import { useState, useCallback } from 'react';
import { useVideo } from '../../contexts/VideoContext.jsx';

export default function SilenceRemover() {
  const { videoId, setVideo, setError } = useVideo();
  const [threshold, setThreshold] = useState(0.5);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);

  const handleRemoveSilence = useCallback(async () => {
    if (!videoId) return;

    setIsProcessing(true);
    setResult(null);

    try {
      const response = await fetch('/api/remove-silence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, threshold }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Silence removal failed');
      }

      const data = await response.json();

      setResult({
        originalDuration: data.originalDuration,
        newDuration: data.newDuration,
        removedDuration: data.removedDuration,
        processedUrl: data.processedUrl,
      });

      if (data.processedUrl) {
        setVideo(videoId, data.processedUrl, null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  }, [videoId, threshold, setVideo, setError]);

  const formatDuration = (seconds) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm">Silence Remover</h3>

      <div>
        <label className="text-xs text-gray-400 block mb-2">
          Min silence: {threshold}s
        </label>
        <input
          type="range"
          min="0.3" max="2.0" step="0.1"
          className="slider"
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          disabled={isProcessing}
        />
        <div className="flex justify-between text-[10px] text-gray-600 mt-1">
          <span>0.3s</span>
          <span>2.0s</span>
        </div>
      </div>

      <button
        onClick={handleRemoveSilence}
        disabled={!videoId || isProcessing}
        className="btn-primary w-full text-sm py-2.5"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            Processing...
          </span>
        ) : (
          'Remove Silence'
        )}
      </button>

      {result && (
        <div className="bg-green-900/20 border border-green-800/30 rounded-xl p-4 space-y-2">
          <p className="text-sm text-green-300 font-medium">Silence Removed!</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-white">{formatDuration(result.originalDuration)}</p>
              <p className="text-[10px] text-gray-500">Original</p>
            </div>
            <div>
              <p className="text-lg font-bold text-green-400">{formatDuration(result.removedDuration)}</p>
              <p className="text-[10px] text-gray-500">Removed</p>
            </div>
            <div>
              <p className="text-lg font-bold text-white">{formatDuration(result.newDuration)}</p>
              <p className="text-[10px] text-gray-500">New</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
