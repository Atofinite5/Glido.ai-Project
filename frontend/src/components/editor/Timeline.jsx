import { useRef, useCallback } from 'react';
import { useCaptions } from '../../contexts/CaptionContext.jsx';
import { useStyle } from '../../contexts/StyleContext.jsx';

export default function Timeline() {
  const { segments, currentTime, setCurrentTime } = useCaptions();
  const { style } = useStyle();
  const containerRef = useRef(null);

  const totalDuration = segments.length > 0 ? segments[segments.length - 1].end : 10;

  const handleClick = useCallback((e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const ratio = x / rect.width;
    setCurrentTime(ratio * totalDuration);
  }, [totalDuration, setCurrentTime]);

  if (segments.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-sm">
        Generate captions to see the timeline
      </div>
    );
  }

  return (
    <div className="h-full p-4">
      <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
        <span>0:00</span>
        <div className="flex-1 text-center">
          <span className="text-glido-accent-light font-medium">
            {segments.length} segments
          </span>
        </div>
        <span>{formatTime(totalDuration)}</span>
      </div>

      <div
        ref={containerRef}
        className="relative h-16 bg-gray-800/50 rounded-xl overflow-hidden cursor-pointer"
        onClick={handleClick}
      >
        {segments.map((seg, i) => (
          <div
            key={i}
            className="absolute top-1 bottom-1 rounded-lg transition-all duration-150 hover:opacity-80"
            style={{
              left: `${(seg.start / totalDuration) * 100}%`,
              width: `${((seg.end - seg.start) / totalDuration) * 100}%`,
              background: `linear-gradient(135deg, ${style.backgroundColor || '#7c3aed'}44, ${style.fontColor || '#a78bfa'}22)`,
              border: '1px solid rgba(124, 58, 237, 0.3)',
            }}
            title={seg.text}
          >
            <span className="text-[10px] text-gray-400 px-2 truncate block leading-[56px]">
              {seg.text}
            </span>
          </div>
        ))}

        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10"
          style={{
            left: `${(currentTime / totalDuration) * 100}%`,
            boxShadow: '0 0 8px rgba(255,255,255,0.5)',
          }}
        />
      </div>

      <div className="flex justify-between mt-2 text-xs text-gray-600">
        <span>Drag to seek</span>
        <span>Click to jump</span>
      </div>
    </div>
  );
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
