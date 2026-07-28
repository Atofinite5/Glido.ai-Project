# Glido.ai — System Architecture

## Overview

```
                         ┌─────────────────────────────────────┐
                         │           GLIDO.AI                  │
                         │     AI Caption Studio Platform      │
                         └─────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────────┐
          │                         │                             │
          ▼                         ▼                             ▼
┌──────────────────┐   ┌──────────────────────┐   ┌────────────────────┐
│                  │   │                      │   │                    │
│   FRONTEND LAYER │   │   API GATEWAY LAYER  │   │   DATA LAYER       │
│   (React 18 +    │   │   (Express.js)       │   │   (Supabase)       │
│    Vite +        │   │                      │   │                    │
│    Tailwind CSS) │   │   ┌──────────────┐   │   │  ┌──────────────┐  │
│                  │   │   │  Upload API  │   │   │  │  PostgreSQL   │  │
│  ┌────────────┐  │   │   └──────────────┘   │   │  │  (Videos,     │  │
│  │ UploadView │  │   │   ┌──────────────┐   │   │  │   Captions,   │  │
│  └────────────┘  │   │   │ Transcribe   │   │   │  │   Templates)  │  │
│  ┌────────────┐  │   │   └──────────────┘   │   │  └──────────────┘  │
│  │ VideoPreview│ │   │   ┌──────────────┐   │   │  ┌──────────────┐  │
│  └────────────┘  │   │   │ Style Render │   │   │  │  Storage     │  │
│  ┌────────────┐  │   │   └──────────────┘   │   │  │  (Videos,     │  │
│  │ StylePanel │  │   │   ┌──────────────┐   │   │  │   Fonts,      │  │
│  └────────────┘  │   │   │  Silence     │   │   │  │   Exports)    │  │
│  ┌────────────┐  │   │   │  Remover     │   │   │  └──────────────┘  │
│  │ Timeline   │  │   │   └──────────────┘   │   │  ┌──────────────┐  │
│  └────────────┘  │   │   ┌──────────────┐   │   │  │  Auth        │  │
│  ┌────────────┐  │   │   │  Export API  │   │   │  │  (Supabase   │  │
│  │ ExportPanel│  │   │   └──────────────┘   │   │  │   Auth)      │  │
│  └────────────┘  │   │                      │   │  └──────────────┘  │
│  ┌────────────┐  │   └──────────────────────┘   └────────────────────┘
│  │ Templates  │  │
│  └────────────┘  │
└──────────────────┘
```

## Processing Pipeline (Sequential)

```
UPLOAD → TRANSCODE → TRANSCRIBE → STYLE → REMOVE_SILENCE → EXPORT
  │         │           │           │            │             │
  ▼         ▼           ▼           ▼            ▼             ▼
Validate  FFmpeg    OpenRouter  FFmpeg       FFmpeg        FFmpeg
.mp4      copy+     Whisper     drawtext     silencedetect  scale+
          normalize API         filter       + concat       encode
```

## Key Architecture Decisions

### Why not HyperFrames?
HyperFrames is designed for **generating** videos from HTML/CSS. Our use case is **annotating** existing videos with captions — which requires frame-accurate overlay of text onto video streams. FFmpeg's `drawtext` filter is the battle-tested approach for this, with 20+ years of production use.

### Why FFmpeg over Canvas/WebGL rendering?
- Server-side rendering ensures consistent output regardless of browser
- Supports unlimited font options via fontconfig
- Hardware acceleration available (VAAPI, CUDA) for 4K exports
- Frame-accurate subtitle burning with word-level timing

### Why OpenRouter for Whisper?
- No GPU required on server
- Access to multiple Whisper variants (OpenAI Whisper, Deepgram, etc.)
- Cost-effective for variable workloads
- Good Hinglish support with proper prompting

## Data Flow Diagram

```
┌──────┐   Upload    ┌──────────┐  Audio   ┌──────────┐  Captions  ┌──────────┐
│User  │──────────▶  │ Supabase │────────▶ │OpenRouter│──────────▶ │ Supabase │
│Browser│            │ Storage  │          │Whisper   │            │ Postgres │
│      │◀─────────── │          │          │API       │            │          │
└──────┘   Download  └──────────┘          └──────────┘            └──────────┘
   │                                                     
   │ Style Config                                           
   ▼                                                     
┌──────────┐  Captions + Style  ┌──────────┐  Rendered   ┌──────────┐
│ FFmpeg   │──────────────────▶ │ Supabase  │──────────▶ │  User    │
│ drawtext │                    │ Storage   │            │  Browser │
└──────────┘                    └──────────┘            └──────────┘
   │
   ▼
┌──────────┐  Trimmed Video     ┌──────────┐  Export     ┌──────────┐
│ FFmpeg   │──────────────────▶ │ Supabase │──────────▶ │  User    │
│ silence  │                    │ Storage  │            │  Browser │
│ detect   │                    └──────────┘            └──────────┘
└──────────┘
```

## Component Interaction

```
EditorPage
│
├── uses VideoContext → provides videoId, url, metadata
├── uses CaptionContext → provides segments, currentTime, currentWord
├── uses StyleContext → provides all style properties
│
├── VideoPreview
│   ├── reads: videoContext.url, captionContext.segments
│   ├── reads: styleContext (for preview overlay)
│   └── dispatches: onTimeUpdate → captionContext.setCurrentTime
│
├── Timeline
│   ├── reads: captionContext.segments
│   └── dispatches: onSeek → captionContext.setCurrentTime
│
├── StylePanel
│   ├── reads/writes: styleContext (full state)
│   └── dispatches: onStyleChange → styleContext methods
│
├── SilenceRemover
│   ├── calls: POST /api/remove-silence
│   └── updates: videoContext.metadata.duration
│
└── ExportPanel
    ├── calls: POST /api/export
    └── triggers: download flow
```

## Security Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    SECURITY BOUNDARIES                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🔒 Auth Layer: Supabase Auth (JWT-based)              │
│     - All API routes protected by auth middleware        │
│     - Row Level Security on all tables                  │
│     - User can only access own videos/templates         │
│                                                         │
│  🔒 Storage Layer: Supabase Storage                      │
│     - Videos bucket: user-isolated folders               │
│     - Exports bucket: user-isolated folders              │
│     - Signed URLs with expiration                        │
│                                                         │
│  🔒 API Layer: Rate Limiting                             │
│     - Transcribe: 10 req/min per user                    │
│     - Export: 5 req/min per user                         │
│     - Upload: 3 concurrent per user                      │
│                                                         │
│  🔒 Input Validation:                                    │
│     - File type whitelist (.mp4 only)                    │
│     - File size limit (2GB)                              │
│     - Caption text sanitization (XSS prevention)         │
│     - Font file validation (.ttf, .otf only)             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Performance Architecture

```
┌────────────────────────────────────────────────────────┐
│                  PERFORMANCE OPTIMIZATIONS             │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Upload:                                               │
│  - Direct-to-S3 upload (presigned URLs)                │
│  - Chunked upload for large files                      │
│  - Client-side compression option                      │
│                                                        │
│  Transcription:                                        │
│  - Parallel chunk processing                           │
│  - Cached results for identical audio                  │
│  - WebSocket progress updates                          │
│                                                        │
│  Rendering:                                            │
│  - FFmpeg with hardware acceleration when available    │
│  - Segment-level caching (re-render only changed parts)│
│                                                        │
│  Export:                                               │
│  - Queue-based processing (Bull/BullMQ)                │
│  - Resolution downscaling on server                    │
│  - Streaming download (don't wait for full encode)     │
│                                                        │
└────────────────────────────────────────────────────────┘
```
