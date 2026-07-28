import { createContext, useContext, useState, useCallback } from 'react';

const CaptionContext = createContext(null);

export function CaptionProvider({ children }) {
  const [state, setState] = useState({
    segments: [],
    currentTime: 0,
    isPlaying: false,
    currentWord: null,
    isTranscribing: false,
    error: null,
  });

  const setSegments = useCallback((segments) => {
    setState(prev => ({ ...prev, segments, isTranscribing: false }));
  }, []);

  const setCurrentTime = useCallback((time) => {
    setState(prev => {
      const currentSegment = prev.segments.find(
        s => time >= s.start && time <= s.end
      );
      let currentWord = null;
      if (currentSegment) {
        const word = currentSegment.words?.find(
          w => time >= w.start && time <= w.end
        );
        currentWord = word ? { ...word, segmentIndex: prev.segments.indexOf(currentSegment) } : null;
      }
      return { ...prev, currentTime: time, currentWord };
    });
  }, []);

  const setIsPlaying = useCallback((playing) => {
    setState(prev => ({ ...prev, isPlaying: playing }));
  }, []);

  const setTranscribing = useCallback((transcribing) => {
    setState(prev => ({ ...prev, isTranscribing: transcribing, error: transcribing ? null : prev.error }));
  }, []);

  const updateSegment = useCallback((index, updates) => {
    setState(prev => {
      const segments = [...prev.segments];
      segments[index] = { ...segments[index], ...updates };
      return { ...prev, segments };
    });
  }, []);

  const transcribe = useCallback(async (videoId) => {
    setState(prev => ({ ...prev, isTranscribing: true, error: null }));

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Transcription failed');
      }

      const data = await response.json();
      setState(prev => ({
        ...prev,
        segments: data.segments,
        isTranscribing: false,
        error: null,
      }));

      return data;
    } catch (err) {
      setState(prev => ({ ...prev, isTranscribing: false, error: err.message }));
      throw err;
    }
  }, []);

  const clearCaptions = useCallback(() => {
    setState({
      segments: [],
      currentTime: 0,
      isPlaying: false,
      currentWord: null,
      isTranscribing: false,
      error: null,
    });
  }, []);

  return (
    <CaptionContext.Provider value={{
      ...state,
      setSegments,
      setCurrentTime,
      setIsPlaying,
      setTranscribing,
      updateSegment,
      transcribe,
      clearCaptions,
    }}>
      {children}
    </CaptionContext.Provider>
  );
}

export function useCaptions() {
  const ctx = useContext(CaptionContext);
  if (!ctx) throw new Error('useCaptions must be used within CaptionProvider');
  return ctx;
}
