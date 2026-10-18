'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { get, set, del } from 'idb-keyval';
import { ArrowDownToLine, ArrowRight, AudioLines, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, CloudCheck, FileVideo, Film, FolderOpen, Languages, LoaderCircle, Maximize2, Moon, MousePointer2, Pause, Play, Plus, Redo2, RotateCcw, Settings2, Sparkles, Sun, Trash2, Undo2, Upload, Volume2, VolumeX, X } from 'lucide-react';
import type { Caption, CaptionStyle } from '@/lib/types';
import { DEFAULT_STYLE, DEMO_CAPTIONS, LANGUAGES, SAMPLE_VIDEO, SAMPLE_POSTER } from '@/lib/constants';
import { toSrt } from '@/lib/engine/captions';

type Project = { id: string; title: string; language: string; captions: Caption[]; style: CaptionStyle; sample: boolean; hasVideo: boolean; updated: number };
type ExportJob = { status: 'queued' | 'processing' | 'complete' | 'failed'; progress: number; error?: string; downloadUrl?: string };
type DragState = { kind: 'position' | 'resize'; pointer: number; originX: number; originY: number; x: number; y: number; size: number; width: number; height: number };
const PROJECT_KEY = 'kaptio-projects-v1';
const MAX_FILE = 150 * 1024 * 1024;
const fonts = ['Manrope', 'Instrument Sans', 'DM Sans', 'Space Grotesk', 'Bebas Neue', 'Noto Sans Devanagari', 'Noto Sans Tamil', 'Noto Sans Telugu', 'Noto Sans Bengali', 'Noto Sans Gujarati', 'Noto Sans Gurmukhi', 'Noto Nastaliq Urdu', 'Noto Sans Arabic', 'Noto Sans JP', 'Noto Sans KR'];
const swatches = ['#ffffff', '#efff88', '#ffd95e', '#ff704f', '#80c8ff', '#282b29'];
const presets: { name: string; className: string; patch: Partial<CaptionStyle> }[] = [
  { name: 'Clean', className: 'clean', patch: { color: '#ffffff', backgroundOpacity: 0, strokeWidth: 0, shadow: true, fontFamily: 'Manrope', animation: 'none' } },
  { name: 'Spotlight', className: 'spotlight', patch: { color: '#ffffff', highlightColor: '#efff88', backgroundOpacity: 0, strokeWidth: 2, strokeColor: '#20211f', shadow: false, animation: 'highlight' } },
  { name: 'Editorial', className: 'editorial', patch: { color: '#20211f', backgroundColor: '#efff88', backgroundOpacity: 100, strokeWidth: 0, shadow: false, animation: 'fade' } },
  { name: 'Subtle', className: 'subtle', patch: { color: '#ffffff', backgroundColor: '#20211f', backgroundOpacity: 65, strokeWidth: 0, shadow: false, animation: 'none' } },
];
function id() { return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2); }
function blank(sample = false): Project { return { id: id(), title: sample ? 'A little further, a little freer' : 'Untitled story', language: 'en', captions: sample ? DEMO_CAPTIONS.map(c => ({ ...c })) : [], style: { ...DEFAULT_STYLE }, sample, hasVideo: sample, updated: Date.now() }; }
function clock(t: number) { const s = Math.max(0, Number.isFinite(t) ? t : 0); return `${Math.floor(s / 60).toString().padStart(2, '0')}:${Math.floor(s % 60).toString().padStart(2, '0')}`; }
function decimal(t: number) { return Number(t.toFixed(2)); }
function rgba(hex: string, opacity: number) { const h = hex.replace('#', ''); return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${opacity / 100})`; }
function readProjects(): Project[] { try { return JSON.parse(localStorage.getItem(PROJECT_KEY) ?? '[]'); } catch { return []; } }
function download(content: string, filename: string, type: string) { const url = URL.createObjectURL(new Blob([content], { type })); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }

export default function Editor() {
  const [project, setProject] = useState<Project>(() => blank());
  const [ready, setReady] = useState(false);
  const [source, setSource] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<'captions' | 'style'>('captions');
  const [dark, setDark] = useState(true);
  const [saved, setSaved] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [helpOpen, setHelpOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [resolution, setResolution] = useState('1080');
  const [exportJob, setExportJob] = useState<ExportJob | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dropActive, setDropActive] = useState(false);
  const [snap, setSnap] = useState<{ x?: number; y?: number }>({});
  const [dragging, setDragging] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [videoAspect, setVideoAspect] = useState(16 / 9);
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const drag = useRef<DragState | null>(null);
  const undoStack = useRef<Project[]>([]);
  const redoStack = useRef<Project[]>([]);
  const projectRef = useRef(project);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileUrl = useRef<string | null>(null);
  const transcribeController = useRef<AbortController | null>(null);
  const sessionRef = useRef(0);
  const language = LANGUAGES.find(l => l.code === project.language) ?? LANGUAGES[0];
  const active = project.captions.find(c => time >= c.start && time < c.end);
  const currentCaption = active ?? (!playing ? project.captions.find(c => c.id === selected) : undefined);
  useEffect(() => { projectRef.current = project; }, [project]);
  const syncHistory = useCallback(() => { setCanUndo(undoStack.current.length > 0); setCanRedo(redoStack.current.length > 0); }, []);

  const checkpoint = useCallback(() => { undoStack.current = [...undoStack.current.slice(-79), structuredClone(projectRef.current)]; redoStack.current = []; syncHistory(); }, [syncHistory]);
  const change = useCallback((patch: Partial<Project>, record = true) => { if (record) checkpoint(); setProject(p => ({ ...p, ...patch, updated: Date.now() })); setSaved(false); }, [checkpoint]);
  const changeStyle = useCallback((patch: Partial<CaptionStyle>, record = true) => { if (record) checkpoint(); setProject(p => ({ ...p, style: { ...p.style, ...patch }, updated: Date.now() })); setSaved(false); }, [checkpoint]);
  const undo = useCallback(() => { const last = undoStack.current.pop(); if (!last) return; redoStack.current.push(structuredClone(projectRef.current)); setProject(last); syncHistory(); setSaved(false); }, [syncHistory]);
  const redo = useCallback(() => { const next = redoStack.current.pop(); if (!next) return; undoStack.current.push(structuredClone(projectRef.current)); setProject(next); syncHistory(); setSaved(false); }, [syncHistory]);

  const loadProject = useCallback(async (p: Project, file?: File) => {
    sessionRef.current += 1; const session = sessionRef.current;
    transcribeController.current?.abort(); setTranscribing(false); video.current?.pause();
    if (fileUrl.current) URL.revokeObjectURL(fileUrl.current);
    setSource(''); setVideoFile(null); setTime(0); setDuration(0); setPlaying(false); setSelected(null); setError(''); setProject(p);
    undoStack.current = []; redoStack.current = []; syncHistory();
    if (p.sample) setSource(SAMPLE_VIDEO);
    else if (p.hasVideo) {
      const restored = file ?? await get<File>(`kaptio-video-${p.id}`);
      if (session !== sessionRef.current) return;
      if (restored) { fileUrl.current = URL.createObjectURL(restored); setSource(fileUrl.current); setVideoFile(restored); }
      else setError('This video is no longer in browser storage. Upload it again to continue this project.');
    }
    setHistoryOpen(false); setSaved(false);
  }, [syncHistory]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const existing = readProjects(); setProjects(existing);
      const isDemo = new URLSearchParams(window.location.search).get('demo') === '1';
      void loadProject(isDemo ? blank(true) : existing[0] ?? blank());
      setDark(localStorage.getItem('kaptio-theme') !== 'light'); setReady(true);
    }, 0);
    return () => { window.clearTimeout(timer); if (fileUrl.current) URL.revokeObjectURL(fileUrl.current); if (pollRef.current) clearTimeout(pollRef.current); transcribeController.current?.abort(); };
  }, [loadProject]);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      try { const list = [project, ...readProjects().filter(p => p.id !== project.id)].slice(0, 20); localStorage.setItem(PROJECT_KEY, JSON.stringify(list)); setProjects(list); setSaved(true); }
      catch { setSaved(false); setError('Browser storage is full. Download your SRT before leaving this page.'); }
    }, 650);
    return () => clearTimeout(timer);
  }, [project, ready]);

  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 3800); return () => clearTimeout(timer); }, [notice]);
  useEffect(() => {
    if (!playing) return;
    let frame: number;
    const tick = () => { if (video.current) setTime(video.current.currentTime); frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame);
  }, [playing]);

  const seek = useCallback((value: number) => { const t = Math.max(0, Math.min(duration || Infinity, value)); if (video.current) video.current.currentTime = t; setTime(t); }, [duration]);
  const togglePlayback = useCallback(() => { if (!video.current || !source) return; if (video.current.paused) void video.current.play().catch(() => setError('This video could not play. Try an MP4 with H.264 video.')); else video.current.pause(); }, [source]);

  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.matches('input, textarea, select, [contenteditable="true"]') || exportOpen || helpOpen || historyOpen) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
      else if (e.code === 'Space' && !target.closest('.canvas-caption')) { e.preventDefault(); togglePlayback(); }
      else if (e.key === 'ArrowLeft' && !target.closest('.canvas-caption')) { e.preventDefault(); seek(time - 1); }
      else if (e.key === 'ArrowRight' && !target.closest('.canvas-caption')) { e.preventDefault(); seek(time + 1); }
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') { e.preventDefault(); setExportOpen(true); }
      else if (e.key === '?' || (e.key === '/' && e.shiftKey)) setHelpOpen(true);
    };
    window.addEventListener('keydown', keydown); return () => window.removeEventListener('keydown', keydown);
  }, [togglePlayback, seek, time, undo, redo, exportOpen, helpOpen, historyOpen]);

  async function upload(file?: File) {
    if (!file) return;
    if (!/\.(mp4|mov|webm|m4v)$/i.test(file.name)) { setError('Choose an MP4, MOV, M4V, or WebM video.'); return; }
    if (file.size > MAX_FILE) { setError('This video is over 150 MB. Compress it or upload a shorter clip.'); return; }
    setError(''); setUploadProgress(0);
    const reader = new FileReader();
    reader.onprogress = e => { if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 95)); };
    reader.onerror = () => { setUploadProgress(null); setError('We couldn’t read this video. Please try uploading it again.'); };
    reader.onload = async () => {
      const p = blank(); p.title = file.name.replace(/\.[^.]+$/, ''); p.hasVideo = true;
      try { await set(`kaptio-video-${p.id}`, file); setUploadProgress(100); await loadProject(p, file); setNotice('Video ready. Choose a language and generate captions.'); }
      catch { await loadProject(p, file); setNotice('Video ready. Browser storage is unavailable; this video will need to be reuploaded next time.'); }
      finally { setUploadProgress(null); }
    };
    reader.readAsArrayBuffer(file);
  }

  async function transcribe() {
    if (!source) { fileInput.current?.click(); return; }
    if (project.sample) { change({ captions: DEMO_CAPTIONS.map(c => ({ ...c })), language: 'en' }); setNotice('Sample captions restored. Upload your own video to generate a transcript.'); return; }
    if (!videoFile) return;
    const session = sessionRef.current; const controller = new AbortController(); transcribeController.current = controller;
    setTranscribing(true); setError('');
    try {
      const data = new FormData(); data.append('video', videoFile); data.append('language', project.language);
      const response = await fetch('/api/transcribe', { method: 'POST', body: data, signal: controller.signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Transcription failed. Please try again.');
      if (session !== sessionRef.current) return;
      change({ captions: result.captions }); setNotice(`${result.captions.length} captions ready. Make them your own.`);
    } catch (e) { if (e instanceof Error && e.name !== 'AbortError') setError(e.message); }
    finally { if (session === sessionRef.current) setTranscribing(false); }
  }

  function updateCaption(captionId: string, patch: Partial<Caption>) { change({ captions: project.captions.map(c => c.id === captionId ? { ...c, ...patch } : c) }); }
  function addCaption() { const start = decimal(time); const c: Caption = { id: id(), start, end: decimal(Math.min(duration || start + 3, start + 3)), text: 'Your next line starts here.' }; change({ captions: [...project.captions, c].sort((a, b) => a.start - b.start) }); setSelected(c.id); setTab('captions'); }
  function selectLanguage(code: string) { const l = LANGUAGES.find(item => item.code === code); change({ language: code, style: { ...project.style, fontFamily: l?.font ?? 'Manrope' } }); }

  function pointerDown(e: React.PointerEvent, kind: 'position' | 'resize') {
    if (!canvas.current) return; e.preventDefault(); e.stopPropagation(); checkpoint();
    const rect = canvas.current.getBoundingClientRect();
    drag.current = { kind, pointer: e.pointerId, originX: e.clientX, originY: e.clientY, x: project.style.x, y: project.style.y, size: project.style.fontSize, width: rect.width, height: rect.height };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); setDragging(true);
  }
  function pointerMove(e: React.PointerEvent) {
    const d = drag.current; if (!d) return;
    if (d.kind === 'resize') { const delta = ((e.clientX - d.originX) / d.width) * 14; changeStyle({ fontSize: Math.max(2, Math.min(12, d.size + delta)) }, false); return; }
    const rawX = Math.max(5, Math.min(95, d.x + ((e.clientX - d.originX) / d.width) * 100));
    const rawY = Math.max(8, Math.min(92, d.y + ((e.clientY - d.originY) / d.height) * 100));
    const sx = [10, 100 / 3, 50, 200 / 3, 90].find(v => Math.abs(v - rawX) < 1.5);
    const sy = [10, 100 / 3, 50, 200 / 3, 90].find(v => Math.abs(v - rawY) < 1.5);
    setSnap({ x: sx, y: sy }); changeStyle({ x: sx ?? rawX, y: sy ?? rawY }, false);
  }
  function pointerUp() { drag.current = null; setSnap({}); setDragging(false); }
  function captionKey(e: React.KeyboardEvent) {
    const delta = e.shiftKey ? 5 : 1;
    const updates: Record<string, Partial<CaptionStyle>> = { ArrowLeft: { x: Math.max(5, project.style.x - delta) }, ArrowRight: { x: Math.min(95, project.style.x + delta) }, ArrowUp: { y: Math.max(8, project.style.y - delta) }, ArrowDown: { y: Math.min(92, project.style.y + delta) } };
    if (updates[e.key]) { e.preventDefault(); e.stopPropagation(); changeStyle(updates[e.key]); }
  }

  function exportSrt() { download(toSrt(project.captions), `${project.title || 'kaptio'}.srt`, 'application/x-subrip;charset=utf-8'); setNotice('SRT downloaded. Ready for wherever you publish.'); }
  async function exportVideo() {
    setExportBusy(true); setExportJob({ status: 'queued', progress: 0 });
    try {
      const data = new FormData();
      if (project.sample) data.append('sample', 'true'); else if (videoFile) data.append('video', videoFile); else throw new Error('Upload your video before exporting.');
      data.append('captions', JSON.stringify(project.captions)); data.append('style', JSON.stringify(project.style)); data.append('resolution', resolution); data.append('language', project.language);
      const response = await fetch('/api/export', { method: 'POST', body: data }); const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The export could not start. Please try again.');
      let consecutiveErrors = 0;
      const poll = async () => {
        try { const r = await fetch(`/api/export/${result.jobId}`); const job: ExportJob = await r.json(); if (!r.ok) throw new Error(job.error || 'Could not check export status.'); consecutiveErrors = 0; setExportJob(job); if (job.status === 'complete' || job.status === 'failed') { setExportBusy(false); return; } }
        catch (err) { consecutiveErrors++; if (consecutiveErrors >= 5) { setExportJob({ status: 'failed', progress: 0, error: err instanceof Error ? err.message : 'Connection lost. Try your export again.' }); setExportBusy(false); return; } }
        pollRef.current = setTimeout(poll, 1400);
      }; await poll();
    } catch (err) { setExportJob({ status: 'failed', progress: 0, error: err instanceof Error ? err.message : 'Export failed. Please try again.' }); setExportBusy(false); }
  }

  const style = project.style;
  const progress = currentCaption ? Math.max(0, Math.min(1, (time - currentCaption.start) / Math.max(0.1, currentCaption.end - currentCaption.start))) : 0;
  const visibleText = currentCaption && style.animation === 'typewriter' ? currentCaption.text.slice(0, Math.max(1, Math.ceil(progress * currentCaption.text.length * 1.7))) : currentCaption?.text;
  const captionAnimation = style.animation === 'pop' ? `scale(${Math.min(1, 0.82 + progress * 3)})` : undefined;

  return <div className={`kaptio-editor ${dark ? 'is-dark' : 'is-light'}`}>
    <input ref={fileInput} type="file" accept="video/mp4,video/webm,video/quicktime,.mov,.m4v" className="ed-sr-only" aria-label="Upload a video" onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }} />
    <header className="studio-header">
      <Link href="/" className="studio-brand" aria-label="Kaptio home"><span className="brand-mark"><i /><i /><i /></span><span>kaptio<span className="brand-dot">.</span></span></Link>
      <span className="header-divider" />
      <div className="project-title"><input aria-label="Project name" value={project.title} onChange={e => change({ title: e.target.value }, false)} maxLength={80} /><ChevronDown size={13} aria-hidden="true" /><button className="title-history-target" onClick={() => setHistoryOpen(true)} aria-label="Open project history" /></div>
      <span className="save-status">{saved ? <CloudCheck size={14} /> : <LoaderCircle size={14} className="spin" />}<span>{saved ? 'All changes saved' : 'Saving…'}</span></span>
      <div className="header-spacer" />
      <div className="history-tools"><IconButton label="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo}><Undo2 size={17} /></IconButton><IconButton label="Redo (Ctrl+Shift+Z)" onClick={redo} disabled={!canRedo}><Redo2 size={17} /></IconButton></div>
      <IconButton label="Project history" onClick={() => setHistoryOpen(true)}><FolderOpen size={18} /></IconButton>
      <IconButton label={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => { setDark(!dark); localStorage.setItem('kaptio-theme', dark ? 'light' : 'dark'); }}>{dark ? <Sun size={18} /> : <Moon size={18} />}</IconButton>
      <button className="ed-button export-trigger" onClick={() => setExportOpen(true)} disabled={!source || !project.captions.length}><ArrowDownToLine size={16} /> Export <span className="export-count">↗</span></button>
    </header>

    <div className="mobile-tabs"><button className={tab === 'captions' ? 'active' : ''} onClick={() => setTab('captions')}><AudioLines size={16} /> Captions</button><button className={tab === 'style' ? 'active' : ''} onClick={() => setTab('style')}><Settings2 size={16} /> Style</button></div>

    <main className="studio-workspace">
      <aside className={`transcript-panel ${tab === 'captions' ? 'mobile-active' : ''}`} aria-label="Transcript editor">
        <div className="panel-heading"><h1><AudioLines size={18} /> Captions</h1><span className="mini-label">{project.captions.length.toString().padStart(2, '0')} LINES</span></div>
        <div className="transcript-settings">
          <label className="field-label" htmlFor="caption-language">Spoken language <Languages size={13} /></label>
          <div className="select-wrap"><select id="caption-language" value={project.language} onChange={e => selectLanguage(e.target.value)}>{LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name} · {l.native}</option>)}</select><ChevronDown size={14} /></div>
          <button className="generate-button" onClick={() => void transcribe()} disabled={transcribing || !source}>{transcribing ? <LoaderCircle size={15} className="spin" /> : <Sparkles size={15} />}{transcribing ? 'Transcribing on this server…' : project.captions.length ? 'Regenerate captions' : 'Generate captions'}</button>
          {project.sample ? <p className="sample-note">Sample transcript · upload your video to run local Whisper; no API key needed.</p> : <p className="sample-note">Open-source Whisper runs on this server. First use downloads and caches about 80 MB; no transcription API key or per-use fee.</p>}
          {transcribing && <button className="quiet-button cancel-transcribe" onClick={() => transcribeController.current?.abort()}>Cancel transcription</button>}
        </div>
        <div className="transcript-list-label"><span>TRANSCRIPT</span><button className="quiet-button" onClick={addCaption} disabled={!source} aria-label="Add caption"><Plus size={14} /> Add line</button></div>
        <div className="transcript-list">
          {!project.captions.length && <div className="empty-transcript"><span className="empty-icon"><AudioLines size={23} /></span><h3>Every word belongs.</h3><p>{source ? 'Choose the spoken language, then generate your captions. Or write the first line yourself.' : 'Upload your video and we’ll turn the conversation into captions.'}</p>{source && <button className="quiet-button" onClick={addCaption}>Write the first line <ArrowRight size={14} /></button>}</div>}
          {project.captions.map((c, index) => <div key={c.id} className={`caption-row ${selected === c.id ? 'selected' : ''} ${active?.id === c.id ? 'playing' : ''}`} onClick={() => { if (selected !== c.id) { setSelected(c.id); seek(c.start); } }}>
            <div className="caption-row-top"><span className="caption-number">{(index + 1).toString().padStart(2, '0')}</span><button className="caption-time" onClick={e => { e.stopPropagation(); setSelected(c.id); seek(c.start); }}>{clock(c.start)} <span>→</span> {clock(c.end)}</button><button className="row-delete" aria-label={`Delete caption ${index + 1}`} onClick={e => { e.stopPropagation(); change({ captions: project.captions.filter(item => item.id !== c.id) }); if (selected === c.id) setSelected(null); }}><Trash2 size={12} /></button></div>
            <textarea dir={language.dir} aria-label={`Caption ${index + 1}`} value={c.text} rows={Math.max(2, Math.ceil(c.text.length / 28))} onFocus={() => { setSelected(c.id); }} onChange={e => updateCaption(c.id, { text: e.target.value })} spellCheck={false} />
            {selected === c.id && <div className="caption-timing"><label>In <input aria-label={`Caption ${index + 1} start in seconds`} type="number" min={0} step={0.1} max={c.end - 0.05} value={decimal(c.start)} onChange={e => { const n = Number(e.target.value); if (n >= 0 && n < c.end) updateCaption(c.id, { start: n }); }} /></label><label>Out <input aria-label={`Caption ${index + 1} end in seconds`} type="number" min={c.start + 0.05} step={0.1} max={duration || undefined} value={decimal(c.end)} onChange={e => { const n = Number(e.target.value); if (n > c.start && (!duration || n <= duration)) updateCaption(c.id, { end: n }); }} /></label><span>seconds</span></div>}
          </div>)}
        </div>
        <div className="transcript-footer"><span className="status-dot" /><span>Made for the way you speak.</span><button onClick={() => setHelpOpen(true)} aria-label="Keyboard shortcuts"><CircleHelp size={15} /></button></div>
      </aside>

      <section className="canvas-panel" aria-label="Video preview and timeline">
        <div className="canvas-toolbar"><span><span className="status-dot" /> YOUR CANVAS</span><div><span>{videoAspect < 1 ? '9:16' : Math.abs(videoAspect - 1) < .1 ? '1:1' : '16:9'}</span><span className="toolbar-divider" /><button className="quiet-button" onClick={() => fileInput.current?.click()}><Upload size={13} /> {source ? 'New video' : 'Upload video'}</button></div></div>
        {error && <div className="studio-error" role="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error"><X size={14} /></button></div>}
        <div className={`canvas-surround ${dropActive ? 'drop-active' : ''}`} onDragOver={e => { e.preventDefault(); setDropActive(true); }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropActive(false); }} onDrop={e => { e.preventDefault(); setDropActive(false); void upload(e.dataTransfer.files[0]); }}>
          {source ? <div className={`video-stage ${videoAspect < 1 ? 'portrait' : ''}`} ref={canvas} style={{ aspectRatio: videoAspect }}>
            <video ref={video} src={source} poster={project.sample ? SAMPLE_POSTER : undefined} playsInline muted={muted} preload="metadata" onLoadedMetadata={e => { setDuration(e.currentTarget.duration); setVideoAspect(e.currentTarget.videoWidth / e.currentTarget.videoHeight || 16 / 9); }} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onTimeUpdate={e => { if (!playing) setTime(e.currentTarget.currentTime); }} onEnded={() => setPlaying(false)} onClick={togglePlayback} onError={() => setError('This video format could not be previewed. Try an MP4 with H.264 video.')} />
            <div className={`safe-guide ${dragging ? 'visible' : ''}`} />
            {snap.x !== undefined && <div className="snap-line vertical" style={{ left: `${snap.x}%` }} />}{snap.y !== undefined && <div className="snap-line horizontal" style={{ top: `${snap.y}%` }} />}
            {currentCaption && <div className={`canvas-caption ${dragging ? 'is-dragging' : ''}`} role="button" aria-label="Drag caption to reposition. Use arrow keys to move, Shift for larger steps." tabIndex={0} dir={language.dir} onKeyDown={captionKey} onPointerDown={e => pointerDown(e, 'position')} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} style={{ left: `${style.x}%`, top: `${style.y}%`, fontFamily: `"${style.fontFamily}", sans-serif`, fontSize: `${style.fontSize}cqw`, color: style.color, opacity: style.opacity / 100 * (style.animation === 'fade' ? Math.min(1, progress * 8 + .15) : 1), textShadow: style.shadow ? '0 .05em .16em rgba(0,0,0,.8)' : 'none', WebkitTextStroke: `${style.strokeWidth * .07}em ${style.strokeColor}`, backgroundColor: rgba(style.backgroundColor, style.backgroundOpacity), transform: `translate(-50%, -50%) ${captionAnimation ?? ''}` }}>
              <span className="caption-render-text">{style.animation === 'highlight' ? currentCaption.text.split(/\s+/).map((word, i, words) => { const timed = currentCaption.words?.[i]; const highlighted = timed ? time >= timed.start && time < timed.end : i === Math.min(words.length - 1, Math.floor(progress * words.length)); return <span key={i} style={{ color: highlighted ? style.highlightColor : style.color }}>{word}{i < words.length - 1 ? ' ' : ''}</span>; }) : visibleText}</span>
              <span className="caption-selection-border" /><span className="caption-drag-label"><MousePointer2 size={9} /> DRAG TO POSITION</span>
              <button className="caption-resize-handle" aria-label="Resize caption by dragging" onPointerDown={e => pointerDown(e, 'resize')} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onKeyDown={e => { if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); changeStyle({ fontSize: Math.min(12, style.fontSize + .2) }); } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); changeStyle({ fontSize: Math.max(2, style.fontSize - .2) }); } }} />
            </div>}
            {!playing && !project.captions.length && <button className="stage-play" onClick={togglePlayback} aria-label="Play video"><Play size={27} fill="currentColor" /></button>}
          </div> : <div className="upload-empty"><div className="upload-orbit"><span /><FileVideo size={37} strokeWidth={1.2} /></div><span className="mini-label">BIG STORIES START SMALL</span><h2>A video. A voice.<br />A place to begin.</h2><p>Drop your video here, or bring one in.<br />We’ll help every word find its place.</p><button className="ed-button" onClick={() => fileInput.current?.click()}><Upload size={16} /> Choose a video</button><span className="upload-formats">MP4, MOV, M4V or WebM · up to 150 MB</span><button className="try-demo-button" onClick={() => void loadProject(blank(true))}>Just looking? Try the sample <ArrowRight size={13} /></button></div>}
          {dropActive && <div className="drop-overlay"><Upload size={30} /><strong>Drop your next story.</strong></div>}
          {uploadProgress !== null && <div className="drop-overlay upload-progress"><LoaderCircle className="spin" size={30} /><strong>Bringing your video in…</strong><progress value={uploadProgress} max={100} aria-label="Video upload progress" /><span>{uploadProgress}%</span></div>}
        </div>
        <div className="canvas-tip"><MousePointer2 size={12} /><span>Drag your captions. Make yourself at home.</span><button className="quiet-button" aria-label="Center caption position" onClick={() => changeStyle({ x: 50, y: 78 })} disabled={!source}><RotateCcw size={12} /> Reset position</button></div>
        <div className="playback-bar"><div><IconButton label={muted ? 'Unmute video' : 'Mute video'} onClick={() => setMuted(!muted)}>{muted ? <VolumeX size={16} /> : <Volume2 size={16} />}</IconButton><span className="playback-time">{clock(time)} <i>/</i> {clock(duration)}</span></div><div className="playback-main"><IconButton label="Previous caption" disabled={!source} onClick={() => seek([...project.captions].reverse().find(c => c.start < time - .1)?.start ?? 0)}><ChevronLeft size={19} /></IconButton><button className="play-button" onClick={togglePlayback} aria-label={playing ? 'Pause' : 'Play'} disabled={!source}>{playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}</button><IconButton label="Next caption" disabled={!source} onClick={() => seek(project.captions.find(c => c.start > time + .1)?.start ?? duration)}><ChevronRight size={19} /></IconButton></div><div><span className="preview-label">FIT</span><IconButton label="Fullscreen video preview" disabled={!source} onClick={() => { void canvas.current?.requestFullscreen().catch(() => setNotice('Fullscreen is unavailable in this browser.')); }}><Maximize2 size={15} /></IconButton></div></div>
        <div className="timeline-area"><div className="timeline-ruler">{Array.from({ length: 7 }, (_, i) => <span key={i}>{clock(duration * i / 6)}</span>)}</div><div className="timeline-track"><div className="video-track"><Film size={13} />{source ? project.title : 'Your video will appear here'}</div><div className="captions-track">{project.captions.map(c => <button key={c.id} aria-label={`Seek to caption: ${c.text}`} onClick={() => { setSelected(c.id); seek(c.start); }} className={active?.id === c.id ? 'active' : ''} style={{ left: `${c.start / (duration || 1) * 100}%`, width: `${Math.max(.5, (c.end - c.start) / (duration || 1) * 100)}%` }}>{c.text}</button>)}</div><div className="playhead" style={{ left: `${time / (duration || 1) * 100}%` }}><span /></div><input className="timeline-scrubber" type="range" aria-label="Video playhead" min={0} max={duration || 1} step={.01} value={Math.min(time, duration || 1)} onChange={e => seek(Number(e.target.value))} disabled={!source} /></div><div className="timeline-footer"><span><span className="track-dot" /> VIDEO <span className="track-dot caption-track-dot" /> CAPTIONS</span><span><kbd>space</kbd> to play</span></div></div>
      </section>

      <aside className={`inspector-panel ${tab === 'style' ? 'mobile-active' : ''}`} aria-label="Caption style inspector">
        <div className="panel-heading"><h2><Settings2 size={17} /> Make it yours</h2><button className="quiet-button" aria-label="Reset caption style" onClick={() => { changeStyle({ ...DEFAULT_STYLE, fontFamily: language.font }); setNotice('Back to a clean canvas.'); }}><RotateCcw size={14} /></button></div>
        <div className="inspector-scroll"><section className="inspector-section"><div className="section-label">START WITH A STYLE <span>01</span></div><div className="style-presets">{presets.map(p => <button key={p.name} className={`style-preset ${p.className}`} onClick={() => changeStyle({ ...p.patch, fontFamily: language.code === 'en' ? p.patch.fontFamily ?? style.fontFamily : language.font })}><span>Aa</span><small>{p.name}</small></button>)}</div></section>
          <section className="inspector-section"><div className="section-label">TYPOGRAPHY <span>02</span></div><label className="field-label" htmlFor="font-family">Font family</label><div className="select-wrap font-select"><select id="font-family" value={style.fontFamily} onChange={e => changeStyle({ fontFamily: e.target.value })}>{Array.from(new Set([language.font, style.fontFamily, ...fonts])).map(font => <option key={font} value={font}>{font}</option>)}</select><ChevronDown size={14} /></div><div className="font-script-note">{language.native} <span>Script-aware font support</span></div><Range label="Font size" value={style.fontSize} min={2} max={12} step={.1} unit="%" onChange={value => changeStyle({ fontSize: value })} /><div className="field-label color-label">Text color <span>{style.color.toUpperCase()}</span></div><div className="color-swatches">{swatches.map(color => <button key={color} aria-label={`Text color ${color}`} className={style.color.toLowerCase() === color ? 'selected' : ''} style={{ background: color }} onClick={() => changeStyle({ color })}>{style.color.toLowerCase() === color && <Check size={12} style={{ color: color === '#282b29' ? '#fff' : '#20211f' }} />}</button>)}<label className="custom-color" title="Choose a custom text color"><Plus size={12} /><input type="color" aria-label="Custom text color" value={style.color} onChange={e => changeStyle({ color: e.target.value })} /></label></div></section>
          <section className="inspector-section"><div className="section-label">THE FINISHING TOUCHES <span>03</span></div><div className="switch-row"><span>Text shadow</span><Toggle label="Text shadow" checked={style.shadow} onChange={checked => changeStyle({ shadow: checked })} /></div><div className="switch-row"><span>Outline</span><div className="inline-controls"><input aria-label="Outline color" type="color" value={style.strokeColor} onChange={e => changeStyle({ strokeColor: e.target.value })} /><Toggle label="Text outline" checked={style.strokeWidth > 0} onChange={checked => changeStyle({ strokeWidth: checked ? 1 : 0 })} /></div></div>{style.strokeWidth > 0 && <Range label="Outline width" min={.25} max={3} step={.25} value={style.strokeWidth} onChange={value => changeStyle({ strokeWidth: value })} />}
            <div className="switch-row"><span>Background box</span><div className="inline-controls"><input aria-label="Background color" type="color" value={style.backgroundColor} onChange={e => changeStyle({ backgroundColor: e.target.value })} /><Toggle label="Caption background" checked={style.backgroundOpacity > 0} onChange={checked => changeStyle({ backgroundOpacity: checked ? 70 : 0 })} /></div></div>{style.backgroundOpacity > 0 && <Range label="Box opacity" min={0} max={100} value={style.backgroundOpacity} unit="%" onChange={value => changeStyle({ backgroundOpacity: value })} />}<Range label="Opacity" min={10} max={100} value={style.opacity} unit="%" onChange={value => changeStyle({ opacity: value })} />
          </section>
          <section className="inspector-section"><div className="section-label">A LITTLE MOVEMENT <span>04</span></div><div className="animation-options">{([{ value: 'none', label: 'None', icon: 'Aa' }, { value: 'pop', label: 'Pop', icon: 'Aa↗' }, { value: 'fade', label: 'Fade', icon: 'Aa' }, { value: 'typewriter', label: 'Typewriter', icon: 'A|' }, { value: 'highlight', label: 'Highlight', icon: 'Aa' }] as const).map(a => <button className={`${style.animation === a.value ? 'active' : ''} anim-${a.value}`} key={a.value} onClick={() => { changeStyle({ animation: a.value }); if (currentCaption) seek(currentCaption.start); }}><span>{a.icon}</span>{a.label}</button>)}</div>{style.animation === 'highlight' && <label className="switch-row highlight-color">Highlight color<input type="color" value={style.highlightColor} onChange={e => changeStyle({ highlightColor: e.target.value })} /></label>}</section>
          <section className="inspector-section position-section"><div className="section-label">POSITION <span>05</span></div><div className="position-inputs"><label>X <input aria-label="Horizontal caption position in percent" type="number" min={5} max={95} step={1} value={decimal(style.x)} onChange={e => changeStyle({ x: Math.max(5, Math.min(95, Number(e.target.value))) })} /><span>%</span></label><label>Y <input aria-label="Vertical caption position in percent" type="number" min={8} max={92} step={1} value={decimal(style.y)} onChange={e => changeStyle({ y: Math.max(8, Math.min(92, Number(e.target.value))) })} /><span>%</span></label></div><p>Position stays true at every resolution.</p></section>
        </div><div className="inspector-footer"><span className="brand-mark mini"><i /><i /><i /></span><span>Your words. Your signature.</span></div>
      </aside>
    </main>
    <footer className="studio-bottom"><span><span className="status-dot" /> YOUR LITTLE CAPTION STUDIO</span><span>Words travel further with Kaptio.</span><button onClick={() => setHelpOpen(true)}><span>Keyboard shortcuts</span><kbd>?</kbd></button></footer>
    {notice && <div className="studio-toast" role="status"><Check size={15} />{notice}</div>}

    {historyOpen && <Dialog title="Your stories, in progress." eyebrow="PROJECT LIBRARY" onClose={() => setHistoryOpen(false)}><div className="project-library">{projects.map(p => <div key={p.id} className="library-row"><button onClick={() => void loadProject(p)}><span className="library-icon"><Film size={19} /></span><span><strong>{p.title}</strong><small>{p.captions.length} captions · {new Date(p.updated).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{p.sample ? ' · sample' : ''}</small></span>{p.id === project.id ? <span className="current-project">OPEN</span> : <ArrowRight size={16} />}</button><button className="library-delete" aria-label={`Delete project ${p.title}`} onClick={async () => { const remaining = readProjects().filter(item => item.id !== p.id); localStorage.setItem(PROJECT_KEY, JSON.stringify(remaining)); setProjects(remaining); await del(`kaptio-video-${p.id}`); if (p.id === project.id) await loadProject(blank()); }}><Trash2 size={15} /></button></div>)}</div><p className="dialog-note">Projects and videos are saved in this browser. Clearing browser data removes them.</p><button className="ed-button dialog-primary" onClick={() => { void loadProject(blank()); fileInput.current?.click(); }}><Plus size={16} /> Start a new story</button></Dialog>}
    {helpOpen && <Dialog title="A few little shortcuts." eyebrow="STAY IN YOUR FLOW" onClose={() => setHelpOpen(false)}><div className="shortcut-list">{[['Play / pause', 'Space'], ['Seek one second', '← / →'], ['Undo', 'Ctrl / ⌘ + Z'], ['Redo', 'Ctrl / ⌘ + Shift + Z'], ['Open export', 'Ctrl / ⌘ + E'], ['Move focused caption', 'Arrow keys'], ['Move caption further', 'Shift + Arrow'], ['Close dialog', 'Esc']].map(([label, key]) => <div key={label}><span>{label}</span><kbd>{key}</kbd></div>)}</div><p className="dialog-note">Click a caption on the canvas, then use your arrow keys to place it precisely. Focus its corner handle to resize with arrow keys.</p></Dialog>}
    {exportOpen && <Dialog title={exportJob?.status === 'complete' ? 'Your story is ready.' : 'Let your words travel.'} eyebrow="THE FINAL CUT" onClose={() => setExportOpen(false)}><p className="export-intro">Beautiful captions, right where you put them.</p><div className="export-summary"><span className="export-video-icon"><Film size={23} /></span><div><strong>{project.title}</strong><span>{clock(duration)} · {project.captions.length} captions · {language.name}</span></div><span className="mp4-pill">MP4</span></div><div className="export-fields"><label>Resolution<div className="select-wrap"><select value={resolution} onChange={e => setResolution(e.target.value)} disabled={exportBusy}><option value="source">Original resolution</option><option value="1080">1080p · Full HD</option><option value="720">720p · HD</option><option value="480">480p · Compact</option></select><ChevronDown size={14} /></div></label><div><span>Format</span><div className="format-value">MP4 <span>H.264 + AAC</span><Check size={14} /></div></div></div><p className="dialog-note">Your captions are burned into the video. Rendering runs on this app’s server; keep this tab open to collect your download.</p>
      {exportJob && <div className={`export-progress ${exportJob.status}`} role="status">{exportJob.status === 'failed' ? <><strong>That export needs another take.</strong><p>{exportJob.error}</p></> : exportJob.status === 'complete' ? <><Check size={18} /><span>Captioned and ready to share.</span></> : <><div><LoaderCircle size={15} className="spin" /><span>{exportJob.status === 'queued' ? 'Preparing your video…' : 'Putting every word in place…'}</span><strong>{Math.round(exportJob.progress)}%</strong></div><progress value={exportJob.progress} max={100} /></>}</div>}
      {exportJob?.status === 'complete' && exportJob.downloadUrl ? <a href={exportJob.downloadUrl} download className="ed-button dialog-primary"><ArrowDownToLine size={17} /> Download video</a> : <button className="ed-button dialog-primary" onClick={() => void exportVideo()} disabled={exportBusy || !source || !project.captions.length}>{exportBusy ? <LoaderCircle size={17} className="spin" /> : <ArrowRight size={17} />}{exportBusy ? 'Exporting your story…' : exportJob?.status === 'failed' ? 'Try export again' : 'Export captioned video'}</button>}<button className="srt-download" onClick={exportSrt} disabled={!project.captions.length}><ArrowDownToLine size={14} /> Just the subtitles? Download SRT <ArrowRight size={14} /></button>
    </Dialog>}
  </div>;
}

function IconButton({ label, children, onClick, disabled = false }: { label: string; children: React.ReactNode; onClick: () => void; disabled?: boolean }) { return <button className="icon-button" aria-label={label} title={label} onClick={onClick} disabled={disabled}>{children}</button>; }
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) { return <button className={`ed-toggle ${checked ? 'on' : ''}`} role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}><span /></button>; }
function Range({ label, value, min, max, step = 1, unit = '', onChange }: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (n: number) => void }) { return <label className="ed-range"><span>{label}<output>{Number(value.toFixed(1))}<small>{unit}</small></output></span><input type="range" aria-label={label} min={min} max={max} step={step} value={value} style={{ '--range-progress': `${(value - min) / (max - min) * 100}%` } as React.CSSProperties} onChange={e => onChange(Number(e.target.value))} /></label>; }
function Dialog({ title, eyebrow, children, onClose }: { title: string; eyebrow: string; children: React.ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null); const onCloseRef = useRef(onClose); useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => { const previous = document.activeElement as HTMLElement; ref.current?.focus(); const originalOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = originalOverflow; previous?.focus(); }; }, []);
  return <div className="studio-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}><div className="studio-dialog" role="dialog" aria-modal="true" aria-label={title} ref={ref} tabIndex={-1} onKeyDown={e => { if (e.key === 'Escape') onCloseRef.current(); if (e.key === 'Tab') { const targets = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input, select, [tabindex="0"]') ?? []); const first = targets[0]; const last = targets[targets.length - 1]; if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } } }}><button className="dialog-close icon-button" onClick={onClose} aria-label="Close dialog"><X size={19} /></button><span className="dialog-eyebrow">{eyebrow}</span><h2>{title}</h2>{children}</div></div>;
}
