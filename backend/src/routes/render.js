import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { supabase } from '../utils/supabase.js';
import { renderCaptions } from '../utils/ffmpeg.js';

export const renderRouter = Router();

renderRouter.post('/', async (req, res, next) => {
  try {
    const { videoId, style } = req.body;
    if (!videoId || !style) {
      return res.status(400).json({ error: 'videoId and style are required' });
    }

    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const { data: captionData } = await supabase
      .from('captions')
      .select('segments')
      .eq('video_id', videoId)
      .single();

    if (!captionData?.segments) {
      return res.status(400).json({ error: 'No captions found. Transcribe first.' });
    }

    const tempDir = os.tmpdir();
    const tempInput = path.join(tempDir, `${videoId}-render-input.mp4`);
    const tempOutput = path.join(tempDir, `${videoId}-render-output.mp4`);

    const response = await fetch(video.original_url);
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(tempInput, buffer);

    let fontPath = null;
    if (style.font_url) {
      const fontResponse = await fetch(style.font_url);
      const fontBuffer = Buffer.from(await fontResponse.arrayBuffer());
      const fontExt = style.font_url.endsWith('.ttf') ? '.ttf' : '.otf';
      fontPath = path.join(tempDir, `${videoId}-font${fontExt}`);
      await fs.writeFile(fontPath, fontBuffer);
    }

    await renderCaptions(tempInput, tempOutput, captionData.segments, style, fontPath);

    await fs.unlink(tempInput);
    if (fontPath) await fs.unlink(fontPath);

    const outputBuffer = await fs.readFile(tempOutput);
    const fileName = `rendered/${videoId}-captioned.mp4`;
    
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
      .update({ processed_url: publicUrl })
      .eq('id', videoId);

    res.json({ processedUrl: publicUrl });
  } catch (err) {
    next(err);
  }
});
