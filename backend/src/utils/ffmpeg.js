import ffmpeg from 'fluent-ffmpeg';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

export function getVideoMetadata(inputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) return reject(err);

      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

      resolve({
        duration: metadata.format.duration,
        width: videoStream?.width,
        height: videoStream?.height,
        codec: videoStream?.codec_name,
        audioCodec: audioStream?.codec_name,
        hasAudio: !!audioStream,
        size: metadata.format.size,
        orientation: videoStream?.width > videoStream?.height ? 'landscape' : 'portrait',
      });
    });
  });
}

export function extractAudio(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo()
      .audioCodec('pcm_s16le')
      .audioChannels(1)
      .audioFrequency(16000)
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

export function renderCaptions(inputPath, outputPath, segments, style, fontPath) {
  return new Promise((resolve, reject) => {
    let filterComplex = '';

    const {
      font_size = 48, font_color = '#FFFFFF', background_type = 'semi-transparent',
      background_color = '#000000', font_bold = false, font_italic = false,
      position = 'bottom', animation_style = 'word-highlight', custom_position_x, custom_position_y
    } = style;

    const fontFile = fontPath || '/System/Library/Fonts/Helvetica.ttc';

    let box = 0;
    let boxColor = 'black@0';
    if (background_type === 'solid') {
      box = 1; boxColor = `${background_color}@1.0`;
    } else if (background_type === 'semi-transparent') {
      box = 1; boxColor = `${background_color}@0.6`;
    }

    let posY;
    if (position === 'bottom') posY = 'h-text_h-50';
    else if (position === 'center') posY = '(h-text_h)/2';
    else if (position === 'top') posY = '50';
    else posY = custom_position_y || '(h-text_h)/2';

    if (animation_style === 'word-highlight' || animation_style === 'none') {
      const drawTextFilters = segments.map(seg => {
        const escapedText = seg.text
          .replace(/'/g, "'\\\\\\''")
          .replace(/:/g, '\\:')
          .replace(/[{}\\]/g, '\\$&');

        const boldStr = font_bold ? ':fontweight=700' : '';
        const italicStr = font_italic ? ':italic=1' : '';

        return `drawtext=text='${escapedText}':fontfile=${fontFile}:fontsize=${font_size}:fontcolor=${font_color}:box=${box}:boxcolor=${boxColor}:boxborderw=12:x=(w-text_w)/2:y=${posY}:enable='between(t,${seg.start},${seg.end})'${boldStr}${italicStr}`;
      });

      filterComplex = drawTextFilters.join(',');
    } else {
      const drawTextFilters = segments.flatMap(seg => {
        return seg.words.map((word, wi) => {
          const escapedWord = word.word
            .replace(/'/g, "'\\\\\\''")
            .replace(/:/g, '\\:')
            .replace(/[{}\\]/g, '\\$&');

          const isFirst = wi === 0;
          const isLast = wi === seg.words.length - 1;
          const wordStart = word.start;
          const wordEnd = word.end;

          const highlightColor = font_color;
          const dimColor = `${font_color}@0.4`;

          const fullText = seg.words.map(w => w.word).join(' ');
          const escapedFull = fullText
            .replace(/'/g, "'\\\\\\''")
            .replace(/:/g, '\\:')
            .replace(/[{}\\]/g, '\\$&');

          const boldStr = font_bold ? ':fontweight=700' : '';
          const italicStr = font_italic ? ':italic=1' : '';

          return `drawtext=text='${escapedFull}':fontfile=${fontFile}:fontsize=${font_size}:fontcolor=${dimColor}:box=${box}:boxcolor=${boxColor}:boxborderw=12:x=(w-text_w)/2:y=${posY}:enable='between(t,${seg.start},${seg.end})'${boldStr}${italicStr},drawtext=text='${escapedWord}':fontfile=${fontFile}:fontsize=${font_size}:fontcolor=${highlightColor}:box=${box}:boxcolor=${boxColor}:boxborderw=12:x=(w-text_w)/2+${computeWordOffset(seg.words, wi, font_size)}:y=${posY}:enable='between(t,${wordStart},${wordEnd})'${boldStr}${italicStr}`;
        });
      });

      filterComplex = drawTextFilters.join(',');
    }

    let command = ffmpeg(inputPath)
      .outputOptions(['-vf', filterComplex])
      .outputOptions(['-c:a', 'copy'])
      .output(outputPath);

    if (background_type === 'blurred') {
      const blurFilter = `gblur=sigma=20:enable='between(t,0,${segments[segments.length-1]?.end || 10})'`;
      command = ffmpeg(inputPath)
        .outputOptions(['-vf', `${blurFilter},${filterComplex}`])
        .outputOptions(['-c:a', 'copy'])
        .output(outputPath);
    }

    command
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

function computeWordOffset(words, wordIndex, fontSize) {
  let offset = 0;
  for (let i = 0; i < words.length; i++) {
    if (i === wordIndex) break;
    const charWidth = fontSize * 0.55;
    offset += words[i].word.length * charWidth + charWidth;
  }
  const totalWidth = words.reduce((sum, w) => sum + w.word.length * fontSize * 0.55 + fontSize * 0.55, 0);
  const halfText = totalWidth / 2;
  return -(halfText - offset);
}

export function removeSilence(inputPath, outputPath, minSilenceDuration = 0.5) {
  return new Promise((resolve, reject) => {
    const silenceLog = `${outputPath}.silence.log`;

    ffmpeg(inputPath)
      .audioFilters(`silencedetect=noise=-30dB:d=${minSilenceDuration}`)
      .outputOptions(['-f', 'null'])
      .output(silenceLog)
      .on('end', async () => {
        try {
          const log = await fs.readFile(silenceLog, 'utf8');
          const silences = parseSilenceDetect(log);
          await fs.unlink(silenceLog);

          if (silences.length === 0) {
            await fs.copyFile(inputPath, outputPath);
            return resolve({ removedDuration: 0, segments: [] });
          }

          const totalDuration = await getDuration(inputPath);
          const concatSegments = buildConcatSegments(silences, totalDuration);
          await concatVideo(inputPath, outputPath, concatSegments);

          const removedDuration = silences.reduce((sum, s) => sum + s.duration, 0);
          resolve({ removedDuration, segments: silences });
        } catch (err) {
          reject(err);
        }
      })
      .on('error', reject)
      .run();
  });
}

function parseSilenceDetect(log) {
  const lines = log.split('\n');
  const silences = [];
  let current = {};

  for (const line of lines) {
    const startMatch = line.match(/silence_start: ([\d.]+)/);
    const endMatch = line.match(/silence_end: ([\d.]+)/);
    const durMatch = line.match(/silence_duration: ([\d.]+)/);

    if (startMatch) current.start = parseFloat(startMatch[1]);
    if (endMatch) current.end = parseFloat(endMatch[1]);
    if (durMatch) {
      current.duration = parseFloat(durMatch[1]);
      if (current.start !== undefined && current.end !== undefined) {
        silences.push({ ...current });
        current = {};
      }
    }
  }

  return silences;
}

function buildConcatSegments(silences, totalDuration) {
  const segments = [];
  let lastEnd = 0;

  for (const silence of silences) {
    if (lastEnd < silence.start) {
      segments.push({ start: lastEnd, end: silence.start });
    }
    lastEnd = silence.end;
  }

  if (lastEnd < totalDuration) {
    segments.push({ start: lastEnd, end: totalDuration });
  }

  return segments;
}

function concatVideo(inputPath, outputPath, segments) {
  return new Promise((resolve, reject) => {
    if (segments.length === 1) {
      return ffmpeg(inputPath)
        .outputOptions(['-ss', segments[0].start.toString(), '-to', segments[0].end.toString()])
        .outputOptions(['-c', 'copy'])
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    }

    const filterParts = segments.map((seg, i) => {
      const start = seg.start;
      const end = seg.end;
      return `[0:v]trim=${start}:${end},setpts=PTS-STARTPTS[v${i}];[0:a]atrim=${start}:${end},asetpts=PTS-STARTPTS[a${i}]`;
    });

    const videoInputs = segments.map((_, i) => `[v${i}]`).join('');
    const audioInputs = segments.map((_, i) => `[a${i}]`).join('');
    const filterComplex = filterParts.join('') + `${videoInputs}concat=n=${segments.length}:v=1:a=0[outv];${audioInputs}concat=n=${segments.length}:v=0:a=1[outa]`;

    ffmpeg(inputPath)
      .complexFilter([filterComplex], ['outv', 'outa'])
      .output(outputPath)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });
}

function getDuration(inputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, data) => {
      if (err) return reject(err);
      resolve(data.format.duration);
    });
  });
}

export function exportVideo(inputPath, outputPath, orientation, resolution) {
  return new Promise((resolve, reject) => {
    const dimensions = {
      '1080p': { landscape: { w: 1920, h: 1080 }, portrait: { w: 1080, h: 1920 } },
      '4K': { landscape: { w: 3840, h: 2160 }, portrait: { w: 2160, h: 3840 } },
    };

    const dim = dimensions[resolution]?.[orientation];
    if (!dim) return reject(new Error(`Invalid resolution/orientation: ${resolution}/${orientation}`));

    ffmpeg(inputPath)
      .videoFilter([
        `scale=${dim.w}:${dim.h}:force_original_aspect_ratio=decrease`,
        `pad=${dim.w}:${dim.h}:(ow-iw)/2:(oh-ih)/2:color=black`,
      ])
      .outputOptions(['-c:v', 'libx264', '-preset', 'medium', '-crf', '23'])
      .outputOptions(['-c:a', 'aac', '-b:a', '192k'])
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
}

export function generateSRT(segments) {
  let srt = '';
  segments.forEach((seg, i) => {
    const startTime = formatSRTTime(seg.start);
    const endTime = formatSRTTime(seg.end);
    srt += `${i + 1}\n${startTime} --> ${endTime}\n${seg.text}\n\n`;
  });
  return srt;
}

export function generateVTT(segments) {
  let vtt = 'WEBVTT\n\n';
  segments.forEach(seg => {
    const startTime = formatVTTTime(seg.start);
    const endTime = formatVTTTime(seg.end);
    vtt += `${startTime} --> ${endTime}\n${seg.text}\n\n`;
  });
  return vtt;
}

function formatSRTTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function formatVTTTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}
