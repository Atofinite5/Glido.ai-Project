import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import UploadZone from '../components/upload/UploadZone.jsx';
import { useVideo } from '../contexts/VideoContext.jsx';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { uploadVideo, isUploading, uploadProgress, error } = useVideo();
  const [recentProjects, setRecentProjects] = useState([]);

  const handleUpload = async (file) => {
    try {
      const result = await uploadVideo(file);
      navigate(`/editor/${result.videoId}`);
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-glido-accent rounded-xl flex items-center justify-center text-white font-bold text-lg">G</div>
            <span className="text-xl font-bold">Glido.ai</span>
          </div>
          <nav className="flex gap-4">
            <Link to="/" className="text-gray-400 hover:text-white transition-colors">Home</Link>
            <Link to="/dashboard" className="text-white font-medium">Dashboard</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-400">Upload a video to get started with AI captions.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4">Upload Video</h2>
            <UploadZone onUpload={handleUpload} isUploading={isUploading} progress={uploadProgress} />
            {error && (
              <div className="mt-4 bg-red-900/30 border border-red-800 rounded-xl p-4 text-red-300 text-sm">
                {error}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4">Recent Projects</h2>
            {recentProjects.length === 0 ? (
              <div className="card text-center py-10">
                <div className="text-4xl mb-3">🎬</div>
                <p className="text-gray-400 text-sm">No projects yet.<br />Upload a video to start.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentProjects.map((p, i) => (
                  <div key={i} className="card p-4 cursor-pointer hover:border-glido-accent/30 transition-colors"
                    onClick={() => navigate(`/editor/${p.id}`)}>
                    <p className="font-medium text-sm truncate">{p.filename}</p>
                    <p className="text-xs text-gray-500 mt-1">{p.created_at}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
