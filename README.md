# Glido.ai — AI Caption Studio

> **AI-powered caption tool for video content** — Upload, transcribe (with Hinglish support), style captions, remove silence, and export in any format.

![Glido.ai](https://img.shields.io/badge/Glido.ai-AI_Caption_Studio-7c3aed)
![React](https://img.shields.io/badge/React-18-61dafb)
![Node.js](https://img.shields.io/badge/Node.js-24-339933)
![FFmpeg](https://img.shields.io/badge/FFmpeg-6.0-007808)
![Supabase](https://img.shields.io/badge/Supabase-FFC107?logo=supabase)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Setup & Installation](#setup--installation)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Workflow](#workflow)
- [Database Schema](#database-schema)
- [Known Limitations](#known-limitations)
- [Walkthrough](#walkthrough)

---

## Overview

Glido.ai is a complete end-to-end caption studio that lets you:

1. **Upload** MP4 videos (landscape/portrait, up to 4K)
2. **Transcribe** using Whisper AI (supports English, Hindi, and Hinglish)
3. **Style** captions with custom fonts, colors, backgrounds, and word-by-word animations
4. **Remove** silent gaps in one click
5. **Export** in 1080p or 4K, landscape or portrait, with SRT/VTT subtitle files

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      GLIDO.AI PLATFORM                       │
├─────────────────┬─────────────────────┬─────────────────────┤
│   FRONTEND      │     API GATEWAY     │      DATA LAYER      │
│   (React 18 +   │    (Express.js)     │     (Supabase)       │
│    Vite +        │                     │                      │
│    Tailwind CSS) │  ┌───────────────┐  │  ┌───────────────┐  │
│                  │  │ Upload API    │  │  │  PostgreSQL    │  │
│  UploadZone      │  └───────────────┘  │  │  (Videos,      │  │
│  VideoPreview    │  ┌───────────────┐  │  │   Captions,    │  │
│  StylePanel      │  │ Transcribe API│  │  │   Templates)   │  │
│  Timeline        │  └───────────────┘  │  └───────────────┘  │
│  TemplateGallery │  ┌───────────────┐  │  ┌───────────────┐  │
│  SilenceRemover  │  │ Render API    │  │  │  Storage       │  │
│  ExportPanel     │  └───────────────┘  │  │  (Videos,      │  │
│                  │  ┌───────────────┐  │  │   Fonts,       │  │
│                  │  │ Silence API   │  │  │   Exports)     │  │
│                  │  └───────────────┘  │  └───────────────┘  │
│                  │  ┌───────────────┐  │  ┌───────────────┐  │
│                  │  │ Export API    │  │  │  Auth          │  │
│                  │  └───────────────┘  │  │  (Supabase)    │  │
└─────────────────┴─────────────────────┴─────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │   External Services  │
                    │  ┌─────────────────┐ │
                    │  │  OpenRouter     │ │
                    │  │  (Whisper API)  │ │
                    │  └─────────────────┘ │
                    │  ┌─────────────────┐ │
                    │  │  FFmpeg          │ │
                    │  │  (Video Proc.)   │ │
                    │  └─────────────────┘ │
                    └─────────────────────┘
```

### Processing Pipeline

```
Upload ──▶ Transcribe ──▶ Style/Render ──▶ Remove Silence ──▶ Export
  │           │               │                  │                │
  ▼           ▼               ▼                  ▼                ▼
Validate   OpenRouter      FFmpeg             FFmpeg           FFmpeg
.mp4       Whisper API     drawtext           silencedetect     scale +
Upload to  word-level      filter burn        + concat         encode
Supabase   timestamps      captions           trim gaps        1080p/4K
Storage                                                                  │
                                                                         ▼
                                                                     SRT/VTT
                                                                     subtitles
```

---

## Features

### ✅ Video Upload & Support
- MP4 format support
- Both landscape (16:9) and portrait (9:16) auto-detection
- Supports resolutions up to 4K
- Drag-and-drop upload interface with progress bar
- Files up to 2GB

### ✅ Speech-to-Text (Caption Generation)
- Powered by OpenRouter Whisper API (best accuracy/cost balance)
- Word-level timestamps for highlight animations
- English and Hindi support
- **Hinglish (mixed Hindi-English)** — tested specifically
- Automatic punctuation and sentence breaks

### ✅ Caption Styling & Customization
- Custom font upload (.ttf / .otf)
- Font size slider (24px - 96px)
- Color picker for text
- Bold and italic toggles
- Background options: none, solid, semi-transparent, blurred
- Word-by-word highlight animation (like CapCut / Submagic)
- Caption position: top, center, bottom
- 5 ready-made templates: Bold Yellow, Minimal White, Neon Glow, Clean Dark, Cinematic
- Save custom templates

### ✅ Silence Remover
- Configurable silence threshold (0.3s - 2.0s)
- One-click detection and removal
- Post-processing summary with original/removed/new duration

### ✅ Export
- Landscape (16:9) and Portrait (9:16)
- 1080p and 4K resolutions
- MP4 with captions burned in
- Separate SRT and VTT subtitle files

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js 24, Express.js |
| Database | Supabase (PostgreSQL) |
| Storage | Supabase Storage |
| Auth | Supabase Auth |
| Speech-to-Text | OpenRouter Whisper API |
| Video Processing | FFmpeg 6.0+ (via fluent-ffmpeg) |

---

## Setup & Installation

### Prerequisites

- Node.js >= 22
- FFmpeg >= 6.0 (install via `brew install ffmpeg` on macOS)
- A Supabase project (free tier works)
- An OpenRouter API key

### 1. Clone & Install

```bash
git clone <repo-url> glido-ai
cd glido-ai

# Install root dependencies
npm install

# Install frontend & backend dependencies
cd frontend && npm install && cd ..
cd backend && npm install && cd ..
```

### 2. Configure Environment

**Backend** — `backend/.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxx
PORT=3001
CORS_ORIGIN=http://localhost:5173
MAX_FILE_SIZE=2097152000
```

**Frontend** — `frontend/.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3001/api
```

### 3. Setup Supabase

1. Create a new Supabase project
2. Run the following SQL in the SQL Editor:

```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('glido-media', 'glido-media', true);

-- Videos table
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT DEFAULT 'anonymous',
  filename TEXT NOT NULL,
  original_url TEXT NOT NULL,
  processed_url TEXT,
  duration FLOAT,
  width INT,
  height INT,
  orientation TEXT CHECK (orientation IN ('landscape', 'portrait')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Captions table
CREATE TABLE captions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  language TEXT DEFAULT 'en',
  segments JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Caption styles table
CREATE TABLE caption_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  font_family TEXT DEFAULT 'Arial',
  font_url TEXT,
  font_size INT DEFAULT 48,
  font_color TEXT DEFAULT '#FFFFFF',
  font_bold BOOLEAN DEFAULT false,
  font_italic BOOLEAN DEFAULT false,
  background_type TEXT DEFAULT 'semi-transparent',
  background_color TEXT DEFAULT '#000000',
  animation_style TEXT DEFAULT 'word-highlight',
  position TEXT DEFAULT 'bottom',
  custom_position_x INT,
  custom_position_y INT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Templates table
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT DEFAULT 'anonymous',
  name TEXT NOT NULL,
  preview_url TEXT,
  style JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Export jobs table
CREATE TABLE export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  orientation TEXT NOT NULL,
  resolution TEXT NOT NULL,
  include_subtitles BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'pending',
  output_url TEXT,
  subtitle_url TEXT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4. Start Development

```bash
# From root directory - starts both frontend and backend
npm run dev

# Or separately:
cd backend && npm run dev   # API at http://localhost:3001
cd frontend && npm run dev  # UI at http://localhost:5173
```

---

## Project Structure

```
glido-ai/
├── README.md
├── package.json
├── docs/
│   ├── HLD.md                  # High-Level Design
│   ├── LLD.md                  # Low-Level Design
│   └── ARCHITECTURE.md         # System Architecture
├── backend/
│   ├── package.json
│   ├── .env
│   └── src/
│       ├── server.js            # Express entry point
│       ├── middleware/
│       │   ├── auth.js          # Supabase JWT auth
│       │   └── errorHandler.js  # Global error handler
│       ├── routes/
│       │   ├── upload.js        # Video upload endpoint
│       │   ├── transcribe.js    # Whisper transcription
│       │   ├── render.js        # Caption burning via FFmpeg
│       │   ├── silence.js       # Silence detection & removal
│       │   ├── export.js        # Video export & subtitles
│       │   └── templates.js     # Template CRUD
│       └── utils/
│           ├── supabase.js      # Supabase client init
│           └── ffmpeg.js        # FFmpeg operations
└── frontend/
    ├── package.json
    ├── .env
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── main.jsx             # React entry
        ├── App.jsx              # Router
        ├── index.css            # Tailwind styles
        ├── contexts/
        │   ├── VideoContext.jsx  # Video state management
        │   ├── CaptionContext.jsx # Caption state
        │   └── StyleContext.jsx  # Style state
        ├── pages/
        │   ├── LandingPage.jsx   # Marketing page
        │   ├── DashboardPage.jsx # Project dashboard
        │   └── EditorPage.jsx    # Main editor
        └── components/
            ├── upload/
            │   └── UploadZone.jsx    # Drag-drop upload
            ├── preview/
            │   └── VideoPreview.jsx  # Video + caption overlay
            ├── editor/
            │   └── Timeline.jsx      # Caption timeline
            ├── styles/
            │   └── StylePanel.jsx    # Style controls
            ├── templates/
            │   └── TemplateGallery.jsx # Template browser
            ├── silence/
            │   └── SilenceRemover.jsx # Silence tool
            └── export/
                └── ExportPanel.jsx   # Export modal
```

---

## API Reference

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| POST | `/api/upload` | Upload video | `multipart: video` |
| POST | `/api/transcribe` | Generate captions | `{ videoId }` |
| GET | `/api/captions/:id` | Get captions | - |
| POST | `/api/render-captions` | Burn captions | `{ videoId, style }` |
| POST | `/api/remove-silence` | Remove gaps | `{ videoId, threshold }` |
| POST | `/api/export` | Export video | `{ videoId, orientation, resolution, includeSubtitles }` |
| GET | `/api/export/:id/status` | Export status | - |
| GET | `/api/templates` | List templates | - |
| POST | `/api/templates` | Save template | `{ name, style, isPublic }` |
| DELETE | `/api/templates/:id` | Delete template | - |
| GET | `/api/health` | Health check | - |

---

## Workflow

### User Journey

1. **Landing** → User arrives at glido.ai, reads about features
2. **Dashboard** → User clicks "Get Started" or "Dashboard"
3. **Upload** → Drag-and-drop MP4 video file
4. **Transcribe** → Click "Generate Captions" to trigger Whisper via OpenRouter
5. **Style** → Customize fonts, colors, backgrounds, animation, position
6. **Templates** → Apply pre-made style or save current as template
7. **Silence** → Adjust threshold, click "Remove Silence"
8. **Export** → Choose orientation + resolution, download video + subtitles

### Data Flow

```
User Action          Frontend              Backend               External
─────────────────────────────────────────────────────────────────────────
Upload Video  ──▶  UploadZone.jsx   ──▶  POST /api/upload  ──▶ Supabase Storage
                                                                    │
Generate Captions ─▶ EditorPage.jsx   ──▶  POST /api/transcribe ─▶ OpenRouter Whisper
                                                                    │
Apply Style    ──▶  StylePanel.jsx    ──▶  POST /api/render-captions ─▶ FFmpeg
                                                                    │
Remove Silence ──▶  SilenceRemover    ──▶  POST /api/remove-silence ─▶ FFmpeg
                                                                    │
Export Video   ──▶  ExportPanel.jsx   ──▶  POST /api/export    ──▶ FFmpeg + Storage
```

---

## Known Limitations

1. **FFmpeg drawtext** — Complex word-level animations require multiple drawtext filter passes, which can be slow for long videos with many segments. For production, consider subtitles filter instead.

2. **Whisper via OpenRouter** — Free tier has rate limits. For high volume, self-host Whisper or use Deepgram.

3. **Hinglish Accuracy** — While Whisper handles Hinglish reasonably well, code-switching (mid-sentence language changes) can produce occasional errors. The transcription prompt is optimized for this but not perfect.

4. **4K Export Speed** — 4K rendering is CPU-intensive. For production, add GPU acceleration (VAAPI on Linux, VideoToolbox on macOS).

5. **Blurred Background** — The blurred background effect uses FFmpeg `gblur`, which requires an additional processing pass. This doubles render time.

6. **No Real-Time Preview** — The canvas-based preview approximates the final render but may differ slightly due to browser font rendering vs FFmpeg's fontconfig.

7. **Authentication** — Currently simplified (anonymous user support). Full Supabase Auth integration (login/signup) requires minimal additional work.

8. **Concurrent Jobs** — No job queue. Long exports block the event loop. For production, integrate Bull/BullMQ with Redis.

---

## Libraries Used

### Backend
- `express` — HTTP framework
- `@supabase/supabase-js` — Supabase client
- `fluent-ffmpeg` — FFmpeg wrapper
- `multer` — Multipart file uploads
- `cors` — Cross-origin support
- `dotenv` — Environment configuration
- `uuid` — Unique ID generation

### Frontend
- `react` + `react-dom` — UI library
- `react-router-dom` — Client-side routing
- `@supabase/supabase-js` — Supabase client
- `vite` — Build tool
- `tailwindcss` — Utility CSS framework

---

## Walkthrough

### 1. Upload a Video
Navigate to the Dashboard, drag-and-drop an MP4 file. The upload progress bar shows real-time progress. The system auto-detects orientation (landscape/portrait) and resolution.

### 2. Generate Captions
Click "Generate Captions" to trigger Whisper transcription. The API extracts audio, sends it to OpenRouter's Whisper endpoint, and returns word-level timestamps.

### 3. Customize Style
Use the right sidebar Style Panel:
- **Font**: Type any font name or upload `.ttf`/`.otf` files
- **Size**: Drag slider from 24px to 96px
- **Color**: Use the color picker
- **Background**: Choose none, solid, semi-transparent, or blurred
- **Animation**: Word highlight makes each word pop as it's spoken
- **Position**: Place captions at top, center, or bottom

### 4. Use Templates
Click on any template (Bold Yellow, Minimal White, Neon Glow, Clean Dark, Cinematic) to instantly apply its style. Save your current style as a custom template.

### 5. Remove Silence
Set the minimum silence duration (default 0.5s) and click "Remove Silence". The tool analyzes the audio track, detects gaps, and concatenates non-silent segments. Results show original vs trimmed durations.

### 6. Export
Click "Export", choose:
- **Orientation**: Landscape (16:9) or Portrait (9:16)
- **Resolution**: 1080p or 4K
- **Subtitles**: Toggle SRT/VTT file generation

Download the final video with captions burned in.

---

## License

MIT

---

*Built with React, Node.js, FFmpeg, and Supabase.*
