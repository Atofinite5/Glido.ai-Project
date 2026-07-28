import { Link } from 'react-router-dom';

const features = [
  { title: 'AI Transcription', desc: 'Whisper-powered speech-to-text with Hinglish support and word-level timestamps.' },
  { title: 'Custom Styling', desc: 'Upload fonts, adjust colors, backgrounds, and animations. Full creative control.' },
  { title: 'Silence Remover', desc: 'One-click dead gap removal with configurable thresholds and detailed summary.' },
  { title: 'Multi-Export', desc: 'Export in 1080p or 4K, landscape or portrait, with SRT/VTT subtitle files.' },
  { title: 'Caption Templates', desc: 'Ready-made styles or save your own. Consistent branding across videos.' },
  { title: 'Word Highlight', desc: 'Word-by-word highlight animations like CapCut and Submagic.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-glido-accent rounded-xl flex items-center justify-center text-white font-bold text-lg">G</div>
            <span className="text-xl font-bold">Glido.ai</span>
          </div>
          <div className="flex gap-4">
            <Link to="/dashboard" className="btn-secondary text-sm py-2 px-4">Dashboard</Link>
            <Link to="/dashboard" className="btn-primary text-sm py-2 px-4">Get Started</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="max-w-7xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-glido-accent/10 border border-glido-accent/20 rounded-full px-4 py-1.5 text-sm text-glido-accent-light mb-8">
            AI-Powered Caption Studio
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Captions that{' '}
            <span className="text-gradient">pop</span>
            <br />
            in seconds
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Upload a video, get AI-generated captions with Hinglish support, customize every pixel,
            remove silence, and export in any format.
          </p>
          <Link to="/dashboard" className="btn-primary text-lg px-10 py-4 inline-block">
            Start Creating Free
          </Link>
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {features.map((f, i) => (
              <div key={i} className="card animate-[slideUp_0.5s_ease-out] transition-all duration-300">
                <div className="w-10 h-10 bg-glido-accent/20 rounded-lg flex items-center justify-center text-glido-accent-light font-bold mb-4">
                  {i + 1}
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-800/50 py-8 text-center text-gray-500 text-sm">
        <p>Glido.ai — AI Caption Studio. Built with React, FFmpeg, and Supabase.</p>
      </footer>
    </div>
  );
}
