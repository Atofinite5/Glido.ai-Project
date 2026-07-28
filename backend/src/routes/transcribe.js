import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { supabase } from '../utils/supabase.js';
import { extractAudio } from '../utils/ffmpeg.js';

export const transcribeRouter = Router();

transcribeRouter.post('/', async (req, res, next) => {
  try {
    const { videoId } = req.body;
    if (!videoId) return res.status(400).json({ error: 'videoId is required' });

    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select()
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const tempDir = os.tmpdir();
    const tempVideo = path.join(tempDir, `${videoId}-input.mp4`);
    const tempAudio = path.join(tempDir, `${videoId}-audio.wav`);

    let fileBuffer;
    if (supabase.storage?.read) {
      const storagePath = video.original_url.replace('/storage/', '');
      fileBuffer = await supabase.storage.read(storagePath);
    } else {
      const resp = await fetch(video.original_url);
      fileBuffer = Buffer.from(await resp.arrayBuffer());
    }

    if (!fileBuffer) return res.status(404).json({ error: 'Video file not found' });
    await fs.writeFile(tempVideo, fileBuffer);

    await extractAudio(tempVideo, tempAudio);
    await fs.unlink(tempVideo);

    const audioBuffer = await fs.readFile(tempAudio);
    const blob = new Blob([audioBuffer], { type: 'audio/wav' });

    const formData = new FormData();
    formData.append('file', blob, 'audio.wav');
    formData.append('model', 'whisper-large-v3');
    formData.append('response_format', 'verbose_json');
    formData.append('language', 'hi');
    formData.append('temperature', '0.0');

    const groqResponse = await fetch(
      'https://api.groq.com/openai/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: formData,
      }
    );

    await fs.unlink(tempAudio);

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      throw new Error(`Groq Whisper API error: ${groqResponse.status} ${errText}`);
    }

    const groqData = await groqResponse.json();
    const segments = groqData.segments || [];

    const formattedSegments = segments.map(seg => ({
      start: seg.start,
      end: seg.end,
      text: seg.text.trim(),
      words: seg.words?.map(w => ({
        word: w.word,
        start: w.start,
        end: w.end,
      })) || generateWordTimestamps(seg.text, seg.start, seg.end),
    }));

    const { data: captionRecord, error: captionError } = await supabase
      .from('captions')
      .insert({
        video_id: videoId,
        language: 'hi',
        segments: formattedSegments,
      })
      .select()
      .single();

    if (captionError) throw captionError;

    res.json({
      captionId: captionRecord.id,
      segments: formattedSegments,
      wordCount: formattedSegments.reduce((sum, s) => sum + s.words.length, 0),
      duration: formattedSegments[formattedSegments.length - 1]?.end || 0,
    });
  } catch (err) {
    next(err);
  }
});

function generateWordTimestamps(text, start, end) {
  const words = text.split(/\s+/);
  const duration = end - start;
  const perWord = duration / words.length;
  return words.map((word, i) => ({
    word,
    start: start + i * perWord,
    end: start + (i + 1) * perWord,
  }));
}

transcribeRouter.get('/:id', async (req, res, next) => {
  try {
    const { data: captions, error } = await supabase
      .from('captions')
      .select()
      .eq('video_id', req.params.id)
      .single();

    if (error || !captions) {
      return res.status(404).json({ error: 'Captions not found' });
    }

    res.json(captions);
  } catch (err) {
    next(err);
  }
});
