import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy — Kaptio',
  description: 'How Kaptio stores projects and handles video transcription and export.',
};

export default function PrivacyPage() {
  return <div className="privacy-page">
    <header className="privacy-header"><Link href="/" className="wordmark" aria-label="Kaptio home"><span className="brand-symbol" aria-hidden="true"><i /><i /><i /></span>kaptio<span className="logo-period">.</span></Link><Link href="/editor" className="button button-small button-dark">Open studio <ArrowUpRight size={14} /></Link></header>
    <main className="privacy-content">
      <Link className="privacy-back" href="/"><ArrowLeft size={14} /> Back to Kaptio</Link>
      <p className="eyebrow"><span /> A CLEAR NOTE ABOUT YOUR WORK</p>
      <h1>Your stories stay yours.</h1>
      <p className="privacy-lede">Kaptio keeps your project library in this browser. Video processing happens only when you ask for transcription or export.</p>
      <section><h2>Projects and uploads</h2><p>Project text, timing, and style settings are autosaved in your browser. Uploaded video files are held in browser storage when available. Clearing browser storage removes those local copies. The interface requests its font files from Google Fonts, which may receive routine connection metadata; system sans-serif fallbacks are used when fonts are unavailable.</p></section>
      <section><h2>Local Whisper transcription</h2><p>When you request transcription, the selected video is uploaded temporarily to the Kaptio server so FFmpeg can extract its audio. The server runs the open-source Whisper model on its own CPU; your audio is not sent to a paid transcription API. The model weights are downloaded from the Hugging Face model repository the first time the server needs them and are cached on that server.</p></section>
      <section><h2>Video exports</h2><p>Video exports are rendered temporarily on the Kaptio server. Temporary input and intermediate files are deleted after processing. Completed export files are available for download for up to one hour, after which they are cleaned up.</p></section>
      <section><h2>What “local” means here</h2><p>Inference is self-hosted by the Kaptio server, not performed on your device. If you run Kaptio on your own machine, the model and processing remain on that machine. If you use a hosted Kaptio deployment, its operator provides the server. You can also add captions manually without transcription.</p></section>
      <aside><ShieldCheck size={18} /><span>No provider transcription key. No per-use transcription fee. The speed and capacity depend on the server running Kaptio.</span></aside>
    </main>
    <footer className="privacy-footer"><span>© {new Date().getFullYear()} Kaptio</span><Link href="/editor">Make something <ArrowUpRight size={13} /></Link></footer>
  </div>;
}
