# Glido.ai — Low-Level Design Document

## 1. Frontend Component Tree

```
App
├── AuthProvider (Supabase Auth context)
├── Router
│   ├── / → LandingPage
│   │   ├── HeroSection
│   │   └── FeatureGrid
│   ├── /dashboard → DashboardPage
│   │   ├── ProjectList
│   │   │   └── ProjectCard (x N)
│   │   └── UploadButton → UploadModal
│   ├── /editor/:id → EditorPage
│   │   ├── TopBar
│   │   │   ├── ProjectTitle
│   │   │   ├── UndoRedoButtons
│   │   │   └── ExportButton
│   │   ├── MainWorkspace
│   │   │   ├── VideoPreview (canvas overlay)
│   │   │   │   ├── VideoPlayer
│   │   │   │   └── CaptionOverlay (absolute positioned)
│   │   │   └── Timeline
│   │   │       └── CaptionTrack
│   │   │           └── CaptionSegment (x N, draggable)
│   │   └── RightSidebar
│   │       ├── StylePanel
│   │       │   ├── FontSelector (with custom upload)
│   │       │   ├── TextColorPicker
│   │       │   ├── BackgroundControls
│   │       │   ├── AnimationSelector
│   │       │   └── PositionControls (draggable preview)
│   │       ├── TemplateGallery
│   │       │   ├── TemplateCard (pre-built)
│   │       │   └── SaveTemplateButton
│   │       └── SilenceRemover
│   │           ├── ThresholdSlider
│   │           ├── DetectButton
│   │           ├── RemoveButton
│   │           └── SummaryDisplay
│   └── /templates → TemplatesPage
│       ├── MyTemplates
│       └── CommunityTemplates
```

## 2. Backend Module Design

### 2.1 Module: upload.js

```
POST /api/upload
Input: multipart/form-data with video file
Flow:
  1. Validate file type (MP4) and size (< 2GB)
  2. Generate unique filename: {userId}/{uuid}.mp4
  3. Upload to Supabase Storage bucket 'videos'
  4. Extract video metadata via FFprobe (duration, width, height)
  5. Determine orientation (16:9 vs 9:16)
  6. Insert record into `videos` table
  7. Return { videoId, url, metadata }

Implementation:
  - multer for multipart handling
  - fluent-ffmpeg/ffprobe for metadata
  - @supabase/supabase-js for storage
```

### 2.2 Module: transcription.js

```
POST /api/transcribe
Input: { videoId }
Flow:
  1. Fetch video from Supabase Storage
  2. Extract audio via FFmpeg: ffmpeg -i input.mp4 -vn -acodec pcm_s16le audio.wav
  3. Split audio into 25MB chunks (Whisper limit)
  4. For each chunk, call OpenRouter Whisper API:
     POST https://openrouter.ai/api/v1/chat/completions
     Model: openai/whisper-1
     Response includes word-level timestamps
  5. Merge chunk results, align timestamps
  6. Apply punctuation normalization for Hinglish
  7. Store segments in `captions` table
  8. Return { captionId, segments, wordCount, duration }

Word-level timestamp format:
  {
    segments: [{
      start: 0.5,
      end: 2.3,
      text: "Hello world",
      words: [
        { word: "Hello", start: 0.5, end: 1.2 },
        { word: "world", start: 1.3, end: 2.3 }
      ]
    }]
  }

Hinglish Handling Strategy:
  - Prompt engineering: include "Transcribe Hinglish (Hindi+English mix) accurately"
  - Post-process: normalize Hindi transliteration variations
  - Fallback: if confidence < 0.6, flag segment for manual review
```

### 2.3 Module: caption-renderer.js

```
POST /api/render-captions
Input: { videoId, style: StyleConfig }
Flow:
  1. Fetch video and captions from DB
  2. Generate intermediate SRT file (for reference)
  3. Build FFmpeg drawtext filter chain:
     - For each segment, create filter with:
       - fontfile (path to uploaded/selected font)
       - fontsize, fontcolor, border
       - box (background): 1 for colored, 0 for none
       - boxcolor, boxborderw
       - x, y (position)
       - enable='between(t,start,end)' for timing
     - For word-highlight animation:
       - Split into word-level drawtext filters
       - Highlight color for current word
       - Fade transition between words
  4. Execute FFmpeg: ffmpeg -i input.mp4 -vf drawtext=... output.mp4
  5. Upload processed video to Supabase
  6. Return { processedUrl }

Caption position formula:
  - Bottom: y = main_h - text_h - 50
  - Center: y = (main_h - text_h) / 2
  - Top: y = 50
  - Custom: y = custom_y

Background types:
  - none: no box
  - solid: box=1, boxcolor=COLOR@1.0
  - semi-transparent: box=1, boxcolor=BLACK@0.6
  - blurred: Use separate FFmpeg pass with gblur filter behind text
```

### 2.4 Module: silence-remover.js

```
POST /api/remove-silence
Input: { videoId, threshold: float (default 0.5) }
Flow:
  1. Run FFmpeg silencedetect:
     ffmpeg -i input.mp4 -af silencedetect=noise=-30dB:d=threshold \
       -f null output.txt
  2. Parse output to get silence periods:
     [silence_start: 10.5, silence_end: 12.0, duration: 1.5]
  3. Generate concat filter to remove detected gaps
     - Build filter_complex with trimmed segments
     - Concat video and audio streams
  4. Execute: ffmpeg -i input.mp4 -filter_complex [concat] trimmed.mp4
  5. Calculate total removed: sum(silence durations)
  6. Update video record with new duration
  7. Return { originalDuration, newDuration, removedDuration }

Silence detection algorithm:
  - noise threshold: configurable (-20dB to -40dB)
  - min silence duration: configurable (0.3s to 2.0s)
  - Detect both start/middle/end silence
  - Keep 0.15s padding on each side of cuts for natural flow
```

### 2.5 Module: exporter.js

```
POST /api/export
Input: { videoId, orientation, resolution, includeSubtitles }
Flow:
  1. Fetch processed video from storage
  2. Determine scale dimensions:
     - 1080p landscape: 1920x1080
     - 1080p portrait: 1080x1920
     - 4K landscape: 3840x2160
     - 4K portrait: 2160x3840
  3. Build FFmpeg command:
     ffmpeg -i input.mp4 \
       -vf "scale=W:H:force_original_aspect_ratio=decrease,pad=W:H:(ow-iw)/2:(oh-ih)/2" \
       -c:v libx264 -preset medium -crf 23 \
       -c:a aac -b:a 192k \
       output.mp4
  4. If orientation change (landscape→portrait or vice versa):
     - Add padding (letterbox/pillarbox)
  5. Generate SRT/VTT subtitle file from caption data
  6. Upload both to Supabase Storage
  7. Insert record in `export_jobs` table
  8. Return { downloadUrl, subtitleUrl }

Resolution mapping:
  - 1080p: 1920x1080 (16:9), 1080x1920 (9:16)
  - 4K: 3840x2160 (16:9), 2160x3840 (9:16)

SRT format:
  1
  00:00:01,000 --> 00:00:04,000
  Hello world

VTT format:
  WEBVTT
  00:00:01.000 --> 00:00:04.000
  Hello world
```

## 3. State Management (Frontend)

```typescript
// React Contexts

// VideoContext
interface VideoState {
  videoId: string | null;
  url: string | null;
  metadata: VideoMetadata | null;
  isUploading: boolean;
  uploadProgress: number;
}

// CaptionContext
interface CaptionState {
  segments: CaptionSegment[];
  currentTime: number;
  isPlaying: boolean;
  currentWord: number | null;
  isTranscribing: boolean;
}

// StyleContext
interface StyleState {
  fontFamily: string;
  fontUrl: string | null;
  fontSize: number;
  fontColor: string;
  fontBold: boolean;
  fontItalic: boolean;
  backgroundType: 'none' | 'solid' | 'semi-transparent' | 'blurred';
  backgroundColor: string;
  animationStyle: 'none' | 'word-highlight' | 'fade' | 'slide' | 'typewriter';
  position: 'top' | 'center' | 'bottom' | 'custom';
  customPosition: { x: number; y: number };
}
```

## 4. Error Handling Strategy

| Scenario | Response | User Feedback |
|----------|----------|---------------|
| Upload fails | 500 + error message | Toast notification |
| Transcription timeout | 503 + retry option | Warning + retry button |
| FFmpeg processing fails | 500 + FFmpeg logs | Error modal with details |
| Export fails mid-way | 500 + cleanup job | Partial download option |
| Invalid file format | 400 + supported formats | Inline validation error |
| Rate limit exceeded | 429 + retry-after | Countdown timer |

## 5. Environment Variables

```
# Backend .env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxx
PORT=3001
CORS_ORIGIN=http://localhost:5173
MAX_FILE_SIZE=2097152000

# Frontend .env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3001/api
```

## 6. Testing Strategy

| Layer | Tool | Focus |
|-------|------|-------|
| Backend Unit | Jest | Module logic, FFmpeg command generation |
| Backend Integration | Supertest | API endpoints, file upload/download |
| Frontend Unit | Vitest + React Testing Library | Component rendering, state logic |
| E2E | Playwright | Full pipeline: upload → transcribe → style → export |
| FFmpeg | Manual | Output quality, timing accuracy, format compliance |
