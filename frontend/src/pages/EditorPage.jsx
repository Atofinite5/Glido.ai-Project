import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useVideo } from '../contexts/VideoContext.jsx';
import { CaptionProvider, useCaptions } from '../contexts/CaptionContext.jsx';
import { StyleProvider } from '../contexts/StyleContext.jsx';
import VideoPreview from '../components/preview/VideoPreview.jsx';
import Timeline from '../components/editor/Timeline.jsx';
import StylePanel from '../components/styles/StylePanel.jsx';
import SilenceRemover from '../components/silence/SilenceRemover.jsx';
import ExportPanel from '../components/export/ExportPanel.jsx';
import TemplateGallery from '../components/templates/TemplateGallery.jsx';

function EditorContent() {
  const { id } = useParams();
  const { videoId, url, metadata, setVideo } = useVideo();
  const { transcribe, isTranscribing, segments } = useCaptions();

  useEffect(() => {
    if (id && !videoId) {
      fetch(`/api/upload/${id}`)
        .then(r => r.json())
        .then(data => {
          if (data?.id) setVideo(data.id, data.original_url, data);
        })
        .catch(() => {});
    }
  }, [id]);

  return (
    <div className="h-screen flex flex-col bg-glido-darker">
      <header className="border-b border-gray-800/50 px-6 py-3 flex items-center justify-between bg-glido-dark/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-glido-accent rounded-lg flex items-center justify-center text-white font-bold text-sm">G</div>
          <span className="font-semibold">Glido.ai Editor</span>
          {metadata && (
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
              {metadata.width}x{metadata.height} · {metadata.orientation}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!isTranscribing && segments.length === 0 && (
            <button
              onClick={() => transcribe(videoId)}
              className="btn-primary text-sm py-2 px-4"
            >
              Generate Captions
            </button>
          )}
          {isTranscribing && (
            <span className="text-sm text-glido-accent-light flex items-center gap-2">
              <span className="animate-spin w-4 h-4 border-2 border-glido-accent border-t-transparent rounded-full" />
              Transcribing...
            </span>
          )}
          <ExportPanel />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex items-center justify-center bg-black/50 p-4">
            <VideoPreview />
          </div>
          <div className="h-40 border-t border-gray-800/50 bg-glido-dark/30">
            <Timeline />
          </div>
        </div>

        <aside className="w-80 border-l border-gray-800/50 bg-glido-dark/30 overflow-y-auto">
          <div className="p-4 space-y-6">
            <StylePanel />
            <TemplateGallery />
            <SilenceRemover />
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function EditorPage() {
  return (
    <CaptionProvider>
      <StyleProvider>
        <EditorContent />
      </StyleProvider>
    </CaptionProvider>
  );
}
