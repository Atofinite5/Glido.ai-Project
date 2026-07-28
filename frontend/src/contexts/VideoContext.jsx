import { createContext, useContext, useState, useCallback } from 'react';

const VideoContext = createContext(null);

export function VideoProvider({ children }) {
  const [state, setState] = useState({
    videoId: null,
    url: null,
    metadata: null,
    isUploading: false,
    uploadProgress: 0,
    error: null,
  });

  const setUploading = useCallback((uploading) => {
    setState(prev => ({ ...prev, isUploading: uploading }));
  }, []);

  const setProgress = useCallback((progress) => {
    setState(prev => ({ ...prev, uploadProgress: progress }));
  }, []);

  const setVideo = useCallback((videoId, url, metadata) => {
    setState(prev => ({
      ...prev,
      videoId,
      url,
      metadata,
      isUploading: false,
      uploadProgress: 0,
      error: null,
    }));
  }, []);

  const setError = useCallback((error) => {
    setState(prev => ({ ...prev, error, isUploading: false }));
  }, []);

  const clearVideo = useCallback(() => {
    setState({
      videoId: null,
      url: null,
      metadata: null,
      isUploading: false,
      uploadProgress: 0,
      error: null,
    });
  }, []);

  const uploadVideo = useCallback(async (file) => {
    setState(prev => ({ ...prev, isUploading: true, uploadProgress: 0, error: null }));

    try {
      const formData = new FormData();
      formData.append('video', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload');

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setState(prev => ({ ...prev, uploadProgress: progress }));
        }
      };

      const result = await new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(xhr.responseText || 'Upload failed'));
          }
        };
        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.send(formData);
      });

      setState(prev => ({
        ...prev,
        videoId: result.videoId,
        url: result.url,
        metadata: result.metadata,
        isUploading: false,
        uploadProgress: 100,
        error: null,
      }));

      return result;
    } catch (err) {
      setState(prev => ({
        ...prev,
        isUploading: false,
        uploadProgress: 0,
        error: err.message,
      }));
      throw err;
    }
  }, []);

  return (
    <VideoContext.Provider value={{
      ...state,
      setUploading,
      setProgress,
      setVideo,
      setError,
      clearVideo,
      uploadVideo,
    }}>
      {children}
    </VideoContext.Provider>
  );
}

export function useVideo() {
  const ctx = useContext(VideoContext);
  if (!ctx) throw new Error('useVideo must be used within VideoProvider');
  return ctx;
}
