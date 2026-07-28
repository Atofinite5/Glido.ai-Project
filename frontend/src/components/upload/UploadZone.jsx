import { useState, useRef, useCallback } from 'react';

export default function UploadZone({ onUpload, isUploading, progress }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'video/mp4' || file.name.endsWith('.mp4')) {
        onUpload(file);
      }
    }
  }, [onUpload]);

  const handleSelect = useCallback((e) => {
    const file = e.target.files[0];
    if (file) onUpload(file);
  }, [onUpload]);

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
        transition-all duration-200
        ${isDragging
          ? 'border-glido-accent bg-glido-accent/5 glow'
          : 'border-gray-700 hover:border-gray-500 bg-gray-900/50'}
        ${isUploading ? 'pointer-events-none' : ''}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4"
        className="hidden"
        onChange={handleSelect}
      />

      {isUploading ? (
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-glido-accent/20 flex items-center justify-center">
            <span className="animate-spin w-8 h-8 border-3 border-glido-accent border-t-transparent rounded-full" />
          </div>
          <div>
            <p className="font-medium">Uploading...</p>
            <p className="text-sm text-gray-400 mt-1">{progress}%</p>
          </div>
          <div className="w-full max-w-xs mx-auto bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-glido-accent rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-gray-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <p className="font-medium">Drop your video here</p>
            <p className="text-sm text-gray-400 mt-1">or click to browse</p>
          </div>
          <p className="text-xs text-gray-500">MP4 only · Up to 2GB · 4K supported</p>
        </div>
      )}
    </div>
  );
}
