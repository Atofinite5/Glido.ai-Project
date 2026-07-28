import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../utils/supabase.js';
import { getVideoMetadata } from '../utils/ffmpeg.js';

export const uploadRouter = Router();

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'video/mp4' && !file.originalname.endsWith('.mp4')) {
      cb(new Error('Only MP4 files are supported'), false);
      return;
    }
    cb(null, true);
  },
});

uploadRouter.post('/', upload.single('video'), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No video file provided' });

    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    const storagePath = `videos/${req.user?.id || 'anonymous'}/${fileName}`;

    const fileBuffer = await fs.readFile(file.path);
    const { error: uploadError } = await supabase.storage.from('glido-media').upload(storagePath, fileBuffer);
    await fs.unlink(file.path);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('glido-media').getPublicUrl(storagePath);

    const tempPath = file.path;
    await fs.writeFile(tempPath, fileBuffer);
    const metadata = await getVideoMetadata(tempPath);
    await fs.unlink(tempPath);

    const { data: videoRecord, error: dbError } = await supabase
      .from('videos')
      .insert({
        user_id: req.user?.id || 'anonymous',
        filename: file.originalname,
        original_url: publicUrl,
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
        orientation: metadata.orientation,
      })
      .select()
      .single();

    if (dbError) throw dbError;
    if (!videoRecord) throw new Error('Database insert returned no record');

    res.json({
      videoId: videoRecord.id,
      url: publicUrl,
      metadata,
    });
  } catch (err) {
    if (err.message?.includes('Only MP4')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});
