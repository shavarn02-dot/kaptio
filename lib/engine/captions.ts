import type { Caption, CaptionStyle, CaptionWord } from '../types';

/** Shared, dependency-free subtitle helpers. All times are in seconds. */
export function srtTime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds * 1000));
  const ms = total % 1000;
  const sec = Math.floor(total / 1000) % 60;
  const min = Math.floor(total / 60000) % 60;
  const hour = Math.floor(total / 3600000);
  return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

export function toSrt(captions: Caption[]): string {
  return captions.filter(c => c.text.trim()).map((c, i) =>
    `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text.trim().replace(/\r\n/g, '\n')}\n`
  ).join('\n');
}

export function activeCaption(captions: Caption[], time: number): Caption | undefined {
  return captions.find(caption => time >= caption.start && time < caption.end);
}

export function estimatedWords(caption: Caption): CaptionWord[] {
  if (caption.words?.length && caption.words.map(word => word.word.trim()).join(' ') === caption.text.trim()) return caption.words;
  const parts = caption.text.trim().split(/\s+/u).filter(Boolean);
  const step = (caption.end - caption.start) / Math.max(1, parts.length);
  return parts.map((word, i) => ({ word, start: caption.start + i * step, end: caption.start + (i + 1) * step }));
}

function assTime(seconds: number): string {
  return srtTime(Math.round(seconds * 100) / 100).replace(/^(\d+):/, (_, hours: string) => `${Number(hours)}:`).replace(/,(\d{2})\d$/, '.$1');
}

/** ASS commands must never be allowed through user caption text. */
export function escapeAss(text: string): string {
  return text.replace(/\\/g, '\uFF3C').replace(/\{/g, '\uFF5B').replace(/\}/g, '\uFF5D').replace(/\r?\n/g, '\\N');
}

function assColor(hex: string, opacity = 1): string {
  const alpha = Math.round((1 - opacity) * 255).toString(16).padStart(2, '0');
  return `&H${alpha}${hex.slice(5, 7)}${hex.slice(3, 5)}${hex.slice(1, 3)}&`.toUpperCase();
}

/** Coordinates and font size use percentages of the real (unletterboxed) video. */
export function toAss(captions: Caption[], style: CaptionStyle, width: number, height: number, rtl = false): string {
  const fontSize = width * style.fontSize / 100;
  const stroke = style.strokeWidth * width / 1080;
  const shadow = style.shadow ? width / 540 : 0;
  const opacity = style.opacity / 100;
  const background = assColor(style.backgroundColor, (style.backgroundOpacity / 100) * opacity);
  const textColor = assColor(style.color, opacity);
  const highlight = assColor(style.highlightColor, opacity);
  const outline = assColor(style.strokeColor, opacity);
  const shadowColor = assColor('#000000', opacity * 0.65);
  const margin = Math.round(width * 0.06);
  const position = `\\an5\\pos(${(width * style.x / 100).toFixed(2)},${(height * style.y / 100).toFixed(2)})`;
  const direction = rtl ? '\u200F' : '';
  const header = `[Script Info]\nScriptType: v4.00+\nPlayResX: ${width}\nPlayResY: ${height}\nWrapStyle: 0\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Caption,${style.fontFamily},${fontSize.toFixed(2)},${textColor},${textColor},${outline},${shadowColor},-1,0,0,0,100,100,0,0,1,${stroke.toFixed(2)},${shadow.toFixed(2)},5,${margin},${margin},0,1\nStyle: Box,${style.fontFamily},${fontSize.toFixed(2)},&HFF000000,&HFF000000,${background},${background},-1,0,0,0,100,100,0,0,3,${(fontSize * 0.16).toFixed(2)},0,5,${margin},${margin},0,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
  const events: string[] = [];
  const event = (caption: Caption, text: string, tags: string, name = 'Caption', layer = 1, start = caption.start, end = caption.end) => {
    events.push(`Dialogue: ${layer},${assTime(start)},${assTime(end)},${name},,0,0,0,,{${position}${tags}}${direction}${text}`);
  };
  for (const caption of captions) {
    if (!caption.text.trim()) continue;
    const duration = Math.max(1, Math.round((caption.end - caption.start) * 1000));
    let animation = '';
    if (style.animation === 'fade') animation = `\\fad(${Math.min(180, Math.floor(duration / 4))},${Math.min(140, Math.floor(duration / 4))})`;
    if (style.animation === 'pop') animation = '\\fscx85\\fscy85\\t(0,160,\\fscx100\\fscy100)';
    if (style.backgroundOpacity > 0) event(caption, escapeAss(caption.text), animation, 'Box', 0);
    if (style.animation === 'typewriter') {
      const graphemes = Array.from(new Intl.Segmenter(undefined, {granularity: 'grapheme'}).segment(caption.text), segment => segment.segment);
      const revealDuration = Math.min((caption.end - caption.start) * 0.65, graphemes.length * 0.045);
      // Transparent unrevealed text preserves the final line width and center.
      graphemes.forEach((_, i) => {
        const before = escapeAss(graphemes.slice(0, i + 1).join(''));
        const after = escapeAss(graphemes.slice(i + 1).join(''));
        const start = caption.start + revealDuration * i / Math.max(1, graphemes.length);
        const end = i === graphemes.length - 1 ? caption.end : caption.start + revealDuration * (i + 1) / graphemes.length;
        if (end - start >= 0.01) event(caption, `${before}{\\alpha&HFF&}${after}`, '', 'Caption', 1, start, end);
      });
    } else if (style.animation === 'highlight') {
      // One event per word preserves absolute word timestamps, including pauses.
      const words = estimatedWords(caption);
      const boundaries = [...new Set([caption.start, caption.end, ...words.flatMap(word => [word.start, word.end])])].filter(t => t >= caption.start && t <= caption.end).sort((a, b) => a - b);
      for (let i = 0; i < boundaries.length - 1; i++) {
        const time = boundaries[i];
        const text = words.map(word => `{\\1c${time >= word.start && time < word.end ? highlight : textColor}}${escapeAss(word.word)}`).join(' ');
        event(caption, text, '', 'Caption', 1, time, boundaries[i + 1]);
      }
    } else event(caption, escapeAss(caption.text), animation);
  }
  return header + events.join('\n') + '\n';
}
