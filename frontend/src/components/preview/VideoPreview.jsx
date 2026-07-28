import { useRef, useEffect, useCallback, useState } from 'react';
import { useVideo } from '../../contexts/VideoContext.jsx';
import { useCaptions } from '../../contexts/CaptionContext.jsx';
import { useStyle } from '../../contexts/StyleContext.jsx';

export default function VideoPreview() {
  const { url } = useVideo();
  const { segments, isPlaying } = useCaptions();
  const { style } = useStyle();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const [currentTime, setCurrentTimeState] = useState(0);
  const { setCurrentTime } = useCaptions();

  const drawCaption = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const currentSegment = segments.find(s => currentTime >= s.start && currentTime <= s.end);
    if (!currentSegment) {
      rafRef.current = requestAnimationFrame(drawCaption);
      return;
    }

    const fontSize = (style.fontSize / 1080) * canvas.height;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let y;
    if (style.position === 'bottom') y = canvas.height - 60;
    else if (style.position === 'center') y = canvas.height / 2;
    else if (style.position === 'top') y = 60;
    else y = style.customPosition.y / 100 * canvas.height;

    const text = currentSegment.text;
    ctx.font = `${style.fontItalic ? 'italic ' : ''}${style.fontBold ? 'bold ' : ''}${fontSize}px ${style.fontFamily}`;
    const textWidth = ctx.measureText(text).width;
    const padding = 24;
    const boxX = (canvas.width - textWidth) / 2 - padding;
    const boxY = y - fontSize / 2 - padding;
    const boxW = textWidth + padding * 2;
    const boxH = fontSize + padding * 2;

    if (style.backgroundType === 'semi-transparent') {
      ctx.fillStyle = `${style.backgroundColor}99`;
      ctx.beginPath();
      const r = 12;
      ctx.moveTo(boxX + r, boxY);
      ctx.lineTo(boxX + boxW - r, boxY);
      ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + r);
      ctx.lineTo(boxX + boxW, boxY + boxH - r);
      ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - r, boxY + boxH);
      ctx.lineTo(boxX + r, boxY + boxH);
      ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - r);
      ctx.lineTo(boxX, boxY + r);
      ctx.quadraticCurveTo(boxX, boxY, boxX + r, boxY);
      ctx.closePath();
      ctx.fill();
    } else if (style.backgroundType === 'solid') {
      ctx.fillStyle = style.backgroundColor;
      ctx.fillRect(boxX, boxY, boxW, boxH);
    }

    if (style.animationStyle === 'word-highlight' && currentSegment.words) {
      let xOffset = (canvas.width - textWidth) / 2;
      const words = currentSegment.words || [];
      const currentWordObj = words.find(
        w => currentTime >= w.start && currentTime <= w.end
      );

      words.forEach((w) => {
        const isCurrentWord = currentWordObj === w;
        ctx.fillStyle = isCurrentWord ? style.fontColor : `${style.fontColor}66`;
        ctx.font = `${style.fontItalic ? 'italic ' : ''}${style.fontBold ? 'bold ' : ''}${fontSize}px ${style.fontFamily}`;
        ctx.fillText(w.word, xOffset + fontSize * 0.1, y);
        xOffset += ctx.measureText(w.word + ' ').width;
      });
    } else {
      ctx.fillStyle = style.fontColor;
      ctx.font = `${style.fontItalic ? 'italic ' : ''}${style.fontBold ? 'bold ' : ''}${fontSize}px ${style.fontFamily}`;
      ctx.fillText(text, canvas.width / 2, y);
    }

    rafRef.current = requestAnimationFrame(drawCaption);
  }, [segments, currentTime, style]);

  useEffect(() => {
    if (!url) return;
    rafRef.current = requestAnimationFrame(drawCaption);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [url, drawCaption]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTimeState(time);
      setCurrentTime(time);
    }
  };

  if (!url) {
    return (
      <div className="text-center text-gray-500">
        <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-gray-800 flex items-center justify-center">
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p>Upload a video to preview</p>
      </div>
    );
  }

  return (
    <div className="relative max-w-full max-h-full">
      <video
        ref={videoRef}
        src={url}
        className="max-w-full max-h-[calc(100vh-12rem)] rounded-xl"
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => { const { setIsPlaying } = useCaptions(); setIsPlaying(true); }}
        onPause={() => { const { setIsPlaying } = useCaptions(); setIsPlaying(false); }}
        controls
        crossOrigin="anonymous"
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ objectFit: 'contain' }}
      />
    </div>
  );
}
