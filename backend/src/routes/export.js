import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { supabase } from '../utils/supabase.js';
import { exportVideo, generateSRT, generateVTT } from '../utils/ffmpeg.js';

export const exportRouter = Router();

exportRouter.post('/', async (req, res, next) => {
  try {
    const { videoId, orientation = 'landscape', resolution = '1080p', includeSubtitles = true } = req.body;

    if (!videoId) return res.status(400).json({ error: 'videoId is required' });
    if (!['landscape', 'portrait'].includes(orientation)) {
      return res.status(400).json({ error: 'Orientation must be landscape or portrait' });
    }
    if (!['1080p', '4K'].includes(resolution)) {
      return res.status(400).json({ error: 'Resolution must be 1080p or 4K' });
    }

    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const sourceUrl = video.processed_url || video.original_url;

    const { data: captionData } = await supabase
      .from('captions')
      .select('segments')
      .eq('video_id', videoId)
      .single();

    const tempDir = os.tmpdir();
    const tempInput = path.join(tempDir, `${videoId}-export-input.mp4`);
    const tempOutput = path.join(tempDir, `${videoId}-export-output-${orientation}-${resolution}.mp4`);

    const response = await fetch(sourceUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(tempInput, buffer);

    await exportVideo(tempInput, tempOutput, orientation, resolution);
    await fs.unlink(tempInput);

    const outputBuffer = await fs.readFile(tempOutput);
    const fileName = `exports/${videoId}/${orientation}_${resolution}_${Date.now()}.mp4`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('glido-media')
      .upload(fileName, outputBuffer, { contentType: 'video/mp4', upsert: true });

    await fs.unlink(tempOutput);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('glido-media')
      .getPublicUrl(fileName);

    let subtitleUrl = null;
    if (includeSubtitles && captionData?.segments) {
      const srtContent = generateSRT(captionData.segments);
      const srtFileName = `exports/${videoId}/subtitles_${Date.now()}.srt`;

      const { data: srtUpload, error: srtError } = await supabase.storage
        .from('glido-media')
        .upload(srtFileName, srtContent, { contentType: 'text/plain', upsert: true });

      if (!srtError) {
        subtitleUrl = supabase.storage.from('glido-media').getPublicUrl(srtFileName).data.publicUrl;

        const vttContent = generateVTT(captionData.segments);
        const vttFileName = `exports/${videoId}/subtitles_${Date.now()}.vtt`;
        await supabase.storage
          .from('glido-media')
          .upload(vttFileName, vttContent, { contentType: 'text/vtt', upsert: true });
      }
    }

    const { data: jobRecord, error: jobError } = await supabase
      .from('export_jobs')
      .insert({
        video_id: videoId,
        orientation,
        resolution,
        include_subtitles: includeSubtitles,
        status: 'completed',
        output_url: publicUrl,
        subtitle_url: subtitleUrl,
      })
      .select()
      .single();

    if (jobError) console.error('Failed to create export job record:', jobError);

    res.json({
      exportId: jobRecord?.id,
      downloadUrl: publicUrl,
      subtitleUrl,
      orientation,
      resolution,
    });
  } catch (err) {
    next(err);
  }
});

exportRouter.get('/:id/status', async (req, res, next) => {
  try {
    const { data: job, error } = await supabase
      .from('export_jobs')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !job) {
      return res.status(404).json({ error: 'Export job not found' });
    }

    res.json(job);
  } catch (err) {
    next(err);
  }
});
