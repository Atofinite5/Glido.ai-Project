import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { supabase } from '../utils/supabase.js';
import { removeSilence, getVideoMetadata } from '../utils/ffmpeg.js';

export const silenceRouter = Router();

silenceRouter.post('/', async (req, res, next) => {
  try {
    const { videoId, threshold = 0.5 } = req.body;
    if (!videoId) return res.status(400).json({ error: 'videoId is required' });

    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const sourceUrl = video.processed_url || video.original_url;

    const tempDir = os.tmpdir();
    const tempInput = path.join(tempDir, `${videoId}-silence-input.mp4`);
    const tempOutput = path.join(tempDir, `${videoId}-silence-output.mp4`);

    const response = await fetch(sourceUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(tempInput, buffer);

    const originalMetadata = await getVideoMetadata(tempInput);
    const result = await removeSilence(tempInput, tempOutput, threshold);

    await fs.unlink(tempInput);

    const outputBuffer = await fs.readFile(tempOutput);
    const fileName = `silence-removed/${videoId}-trimmed.mp4`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('glido-media')
      .upload(fileName, outputBuffer, {
        contentType: 'video/mp4',
        upsert: true,
      });

    await fs.unlink(tempOutput);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('glido-media')
      .getPublicUrl(fileName);

    await supabase
      .from('videos')
      .update({
        processed_url: publicUrl,
        duration: originalMetadata.duration - result.removedDuration,
      })
      .eq('id', videoId);

    res.json({
      originalDuration: originalMetadata.duration,
      newDuration: originalMetadata.duration - result.removedDuration,
      removedDuration: result.removedDuration,
      processedUrl: publicUrl,
      silenceSegments: result.segments,
    });
  } catch (err) {
    next(err);
  }
});
