# Glido.ai — High-Level Design Document

## 1. System Overview

Glido.ai is an AI-powered caption studio for video content. It enables users to upload videos, auto-generate captions via speech-to-text, customize caption appearance, remove silent gaps, and export final videos with burned-in captions.

## 2. Architecture Style

**Microservices-like Monolith** — A single backend service with clear module separation, deployed as one unit but logically divided:
- Upload Service
- Transcription Service  
- Caption Rendering Service
- Silence Removal Service
- Export Service

## 3. System Context Diagram

```
┌──────────────┐     ┌──────────────────────────────────────┐     ┌──────────────┐
│   Browser    │────▶│         Glido.ai Platform            │────▶│   Supabase   │
│  (React App) │     │                                      │     │ ─────────── │
│              │     │  ┌─────────┐  ┌──────────────────┐   │     │  Postgres    │
│  Video Upload│     │  │ React   │  │  Node.js Express │   │     │  Storage     │
│  Caption Edit│     │  │ Frontend│  │  Backend API     │   │     │  Auth        │
│  Preview     │     │  └─────────┘  └──────────────────┘   │     └──────────────┘
│  Export      │     │         │              │              │
└──────────────┘     └─────────┼──────────────┼──────────────┘
                               │              │
                               ▼              ▼
                        ┌──────────────┐  ┌──────────────────┐
                        │  FFmpeg      │  │  OpenRouter API   │
                        │  (Video Proc)│  │  (Whisper STT)    │
                        └──────────────┘  └──────────────────┘
```

## 4. Component Architecture

### 4.1 Frontend (React + Vite)

| Component | Responsibility |
|-----------|---------------|
| UploadPage | Video upload with drag-drop, progress indicator |
| VideoPreview | Canvas-based video playback with caption overlay |
| CaptionEditor | Timeline-based caption editing with word-level sync |
| StylePanel | Font, color, background, animation, position controls |
| TemplateGallery | Pre-made caption templates + save/load custom |
| SilenceRemover | One-click silence detection and removal with summary |
| ExportPanel | Export resolution/orientation selection + download |

### 4.2 Backend (Node.js + Express)

| Module | Responsibility |
|--------|---------------|
| upload.js | Multipart upload handling, Supabase storage |
| transcription.js | OpenRouter Whisper API calls, word-level timestamps |
| caption-renderer.js | FFmpeg drawtext filter for burning captions |
| silence-remover.js | FFmpeg silencedetect + concat for gap removal |
| exporter.js | Resolution/format conversion, SRT/VTT generation |
| templates.js | CRUD for caption templates (Supabase) |

### 4.3 Data Flow — Full Pipeline

```
Upload ──▶ Transcribe ──▶ Style ──▶ Remove Silence ──▶ Export
  │           │            │             │                │
  ▼           ▼            ▼             ▼                ▼
Supabase   OpenRouter   FFmpeg       FFmpeg           FFmpeg
Storage    Whisper API  drawtext     silencedetect     scale+encode
                        filter       + concat
```

## 5. Technology Decisions

| Concern | Choice | Rationale |
|---------|--------|-----------|
| STT Provider | OpenRouter Whisper API | Best Hinglish accuracy, no GPU needed, pay-per-use |
| Video Processing | FFmpeg (via fluent-ffmpeg) | Mature, supports all required operations |
| Database | Supabase Postgres | Managed, real-time, auth built-in |
| File Storage | Supabase Storage | Integrated with DB, CDN-backed |
| Auth | Supabase Auth | Email/password + OAuth ready |
| Frontend Framework | React 18 + Vite | Fast dev experience, rich ecosystem |
| Styling | Tailwind CSS | Rapid UI development |
| Caption Rendering | FFmpeg drawtext filter | Burn captions directly into video frames |

## 6. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/upload | Upload video file |
| POST | /api/transcribe | Generate captions from video |
| GET | /api/captions/:id | Get caption data |
| PUT | /api/captions/:id | Update caption text/timing |
| POST | /api/render-captions | Render styled captions onto video |
| POST | /api/remove-silence | Detect and remove silent gaps |
| POST | /api/export | Export final video |
| GET | /api/export/:id/status | Check export status |
| GET | /api/templates | Get caption templates |
| POST | /api/templates | Save custom template |

## 7. Database Schema (Supabase Postgres)

```sql
-- Users (managed by Supabase Auth)
-- Videos table
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
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
  segments JSONB NOT NULL, -- Array of {start, end, text, words: [{start, end, word}]}
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Caption styles table
CREATE TABLE caption_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  font_family TEXT DEFAULT 'Arial',
  font_url TEXT, -- Custom uploaded font
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
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  preview_url TEXT,
  style JSONB NOT NULL, -- Full style object
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

## 8. Deployment Architecture

```
                   Cloudflare CDN
                        │
                   ┌────▼────┐
                   │  Vercel  │ (Frontend)
                   └─────────┘
                        │
                   ┌────▼────┐
                   │ Railway  │ (Backend)
                   └─────────┘
                        │
               ┌────────┴────────┐
               ▼                  ▼
          Supabase           FFmpeg (Sidecar)
        (DB + Storage)       (Video Processing)
```

## 9. Security Considerations

- All uploads scanned for malware before processing
- User authentication required for all operations
- Files stored in user-isolated Supabase Storage buckets
- API rate limiting on transcription endpoint
- FFmpeg sandboxed with resource limits
- CORS restricted to frontend domain only
- Input sanitization on all user-submitted text (caption text, template names)

## 10. Performance Targets

| Operation | Target Time |
|-----------|-------------|
| Video Upload (100MB) | < 30s |
| Transcription (5min video) | < 2min |
| Silence Removal (5min video) | < 30s |
| Export 1080p (5min video) | < 5min |
| Export 4K (5min video) | < 15min |
