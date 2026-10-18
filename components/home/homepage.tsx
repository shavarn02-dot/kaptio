'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowDownToLine, ArrowRight, ArrowUpRight, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Expand, Globe2, Languages, Menu, Minus, MousePointer2, Move, Pause, Play, Plus, ShieldCheck, Sparkles, Type, Upload, Volume2, VolumeX, X, Zap } from 'lucide-react';
import { LANGUAGES, SAMPLE_POSTER, SAMPLE_VIDEO } from '@/lib/constants';
import { MotionEffects } from './motion-effects';

const demoCopy: Record<string, [string, string]> = {
  en: ['A little further.', 'A little freer.'], hi: ['थोड़ा और आगे।', 'थोड़ा और आज़ाद।'], hinglish: ['Thoda aur aage.', 'Thoda aur azaad.'], ta: ['இன்னும் கொஞ்சம் தூரம்.', 'இன்னும் கொஞ்சம் சுதந்திரம்.'], te: ['మరికొంచెం ముందుకు.', 'మరికొంచెం స్వేచ్ఛగా.'], bn: ['আরও একটু দূরে।', 'আরও একটু স্বাধীন।'], mr: ['थोडे आणखी पुढे.', 'थोडे आणखी मुक्त.'], gu: ['થોડું વધુ આગળ.', 'થોડું વધુ મુક્ત.'], pa: ['ਥੋੜ੍ਹਾ ਹੋਰ ਅੱਗੇ।', 'ਥੋੜ੍ਹਾ ਹੋਰ ਆਜ਼ਾਦ।'], ur: ['تھوڑا اور آگے۔', 'تھوڑا اور آزاد۔'], es: ['Un poco más lejos.', 'Un poco más libre.'], fr: ['Un peu plus loin.', 'Un peu plus libre.'], de: ['Ein Stück weiter.', 'Ein Stück freier.'], ar: ['أبعد قليلاً.', 'أكثر حرية.'], ja: ['もう少し遠くへ。', 'もう少し自由に。'], ko: ['조금 더 멀리.', '조금 더 자유롭게.'], pt: ['Um pouco mais longe.', 'Um pouco mais livre.'], it: ['Un po’ più lontano.', 'Un po’ più liberi.'], zh: ['再远一点。', '再自由一点。'], ru: ['Немного дальше.', 'Немного свободнее.'],
};

export function Logo({ inverse = false }: { inverse?: boolean }) {
  return <Link href="/" className={`wordmark${inverse ? ' inverse' : ''}`} aria-label="Kaptio home"><span className="brand-symbol" aria-hidden="true"><i /><i /><i /></span>kaptio<span className="logo-period">.</span></Link>;
}

function DemoCanvas() {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(15);
  const [language, setLanguage] = useState('en');
  const [langOpen, setLangOpen] = useState(false);
  const [style, setStyle] = useState('highlight');
  const [position, setPosition] = useState({ x: 50, y: 66 });
  const [dragging, setDragging] = useState(false);
  const [showHelp, setShowHelp] = useState(true);
  const selected = LANGUAGES.find(l => l.code === language)!;
  const lines = demoCopy[language] ?? demoCopy.en;

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) video.current?.pause();
  }, []);

  const togglePlay = () => {
    if (!video.current) return;
    if (video.current.paused) void video.current.play().catch(() => setPlaying(false)); else video.current.pause();
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || !canvas.current) return;
    const r = canvas.current.getBoundingClientRect();
    const x = Math.max(15, Math.min(85, (e.clientX - r.left - drag.current.dx) / r.width * 100));
    const y = Math.max(20, Math.min(83, (e.clientY - r.top - drag.current.dy) / r.height * 100));
    setPosition({ x: Math.abs(x - 50) < 2 ? 50 : x, y: Math.abs(y - 66.67) < 2 ? 66.67 : y });
  };
  const format = (n: number) => `0:${Math.floor(n).toString().padStart(2, '0')}`;

  return <div className="demo-stage">
    <div className="demo-corner-note"><span className="live-dot" /> A LITTLE PREVIEW. A LOT OF POSSIBILITY.</div>
    <div className="demo-canvas" ref={canvas}>
      <video ref={video} src={SAMPLE_VIDEO} poster={SAMPLE_POSTER} autoPlay loop muted={muted} playsInline preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onTimeUpdate={e => setTime(e.currentTarget.currentTime)} onLoadedMetadata={e => setDuration(e.currentTarget.duration)} aria-label="Aerial footage of a turquoise bay and green coastal islands" />
      <div className="film-label"><span className="film-dot" /> FIELD NOTES — THAILAND <span>01 / 04</span></div>
      <div className="demo-language-wrap">
        <button className="demo-language" onClick={() => setLangOpen(!langOpen)} aria-expanded={langOpen}><Globe2 size={14} /> {selected.name} <ChevronDown size={13} /></button>
        <AnimatePresence>{langOpen && <motion.div className="demo-language-menu" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {LANGUAGES.map(lang => <button key={lang.code} onClick={() => { setLanguage(lang.code); setLangOpen(false); }}><span>{lang.name}</span><span lang={lang.code} dir={lang.dir}>{lang.native}</span>{language === lang.code && <Check size={13} />}</button>)}
        </motion.div>}</AnimatePresence>
      </div>
      {dragging && <><div className="demo-guide vertical" /><div className="demo-guide horizontal" /></>}
      <div className={`interactive-caption caption-${style}${dragging ? ' is-dragging' : ''}`} role="slider" aria-label="Drag demo caption or use arrow keys to move" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(position.y)} aria-valuetext={`Position ${Math.round(position.x)} percent from left, ${Math.round(position.y)} percent from top`} tabIndex={0} dir={selected.dir} lang={selected.code} style={{ left: `${position.x}%`, top: `${position.y}%`, fontFamily: selected.font }} onPointerDown={e => { if (!canvas.current) return; const r = canvas.current.getBoundingClientRect(); drag.current = { dx: e.clientX - r.left - position.x * r.width / 100, dy: e.clientY - r.top - position.y * r.height / 100 }; e.currentTarget.setPointerCapture(e.pointerId); setDragging(true); setShowHelp(false); }} onPointerMove={move} onPointerUp={() => { drag.current = null; setDragging(false); }} onPointerCancel={() => { drag.current = null; setDragging(false); }} onKeyDown={e => { const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']; if (!keys.includes(e.key)) return; e.preventDefault(); setShowHelp(false); setPosition(p => ({ x: Math.max(15, Math.min(85, p.x + (e.key === 'ArrowLeft' ? -2 : e.key === 'ArrowRight' ? 2 : 0))), y: Math.max(20, Math.min(83, p.y + (e.key === 'ArrowUp' ? -2 : e.key === 'ArrowDown' ? 2 : 0))) })); }}>
        <span className="caption-line">{lines[0]}</span><span className="caption-line accent-line">{lines[1]}</span>
        <i className="selection-dot tl" /><i className="selection-dot tr" /><i className="selection-dot bl" /><i className="selection-dot br" />
        <span className="drag-label"><Move size={10} /> DRAG TO MAKE IT YOURS</span>
      </div>
      {showHelp && <div className="demo-cursor" aria-hidden="true"><MousePointer2 fill="var(--accent)" stroke="#fff" size={27} /><span>You’re in control</span></div>}
      <div className="demo-bottom">
        <button className="video-play" onClick={togglePlay} aria-label={playing ? 'Pause demo video' : 'Play demo video'}>{playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}</button>
        <span className="video-time">{format(time)} <span>/ {format(duration)}</span></span>
        <input className="demo-scrubber" type="range" min="0" max={duration} step="0.1" value={time} onChange={e => { if (video.current) video.current.currentTime = Number(e.target.value); setTime(Number(e.target.value)); }} aria-label="Demo video position" style={{ '--progress': `${time / duration * 100}%` } as React.CSSProperties} />
        <button className="video-play" aria-label={muted ? 'Unmute demo video' : 'Mute demo video'} onClick={() => setMuted(!muted)}>{muted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>
        <Link href="/editor?demo=1" className="video-play" aria-label="Open demo in full editor"><Expand size={15} /></Link>
      </div>
    </div>
    <div className="floating-style"><span>MAKE IT YOU</span><div className="style-buttons"><button aria-label="Highlight caption style" aria-pressed={style === 'highlight'} className={style === 'highlight' ? 'selected' : ''} onClick={() => setStyle('highlight')}><span className="style-preview highlight">Aa</span></button><button aria-label="Clean caption style" aria-pressed={style === 'clean'} className={style === 'clean' ? 'selected' : ''} onClick={() => setStyle('clean')}><span className="style-preview clean">Aa</span></button><button aria-label="Boxed caption style" aria-pressed={style === 'boxed'} className={style === 'boxed' ? 'selected' : ''} onClick={() => setStyle('boxed')}><span className="style-preview boxed">Aa</span></button></div><span className="style-footer"><Type size={10} /> YOUR WORDS, YOUR WAY</span></div>
    <div className="demo-footnote"><span><MousePointer2 size={13} /> Go on. Drag the caption.</span><Link href="/editor?demo=1">Open the playground <ArrowUpRight size={14} /></Link></div>
  </div>;
}

const features = [
  { number: '01', title: 'Fluent in your world.', body: 'Hindi, Hinglish, Tamil, English, and beyond. Captions that make room for your language, your script, and your audience.', label: '20 LANGUAGES. ONE CREATIVE SPACE.', icon: Languages },
  { number: '02', title: 'Put words in their place.', body: 'Drag your captions right onto the frame. Find the sweet spot with smart guides, then resize until everything feels just right.', label: 'DRAG. RESIZE. MAKE IT YOURS.', icon: Move },
  { number: '03', title: 'A style that sounds like you.', body: 'Expressive fonts. Just-right colors. A little motion. Build a signature look with highlights, strokes, shadows, and background boxes.', label: 'ALL THE DETAILS. ALL YOURS.', icon: Type },
];

function Features() {
  const [active, setActive] = useState(0);
  return <section id="features" className="features-section section-shell">
    <div className="section-heading" data-reveal><span className="eyebrow"><span /> SMALL DETAILS. BIG DIFFERENCE.</span><h2>More than subtitles.<br /><span className="muted-heading">A part of your story.</span></h2><p>Everything you need to make your words<br className="desktop-break" /> look as good as they sound.</p></div>
    <div className="feature-layout" data-reveal>
      <div className="feature-accordion">{features.map((feature, index) => <div className={`feature-item ${active === index ? 'active' : ''}`} key={feature.number}><button onClick={() => setActive(index)} aria-expanded={active === index} aria-controls={`feature-panel-${index}`}><span className="feature-number">{feature.number}</span><h3>{feature.title}</h3><span className="feature-toggle">{active === index ? <Minus size={18} /> : <Plus size={18} />}</span></button><div className="feature-description" id={`feature-panel-${index}`} hidden={active !== index}><p>{feature.body}</p><Link href="/editor">Give it a try <ArrowUpRight size={15} /></Link></div></div>)}</div>
      <div className={`feature-visual feature-visual-${active}`}>
        <AnimatePresence mode="wait"><motion.div className="feature-visual-inner" key={active} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: .25 }}>
          {active === 0 ? <><div className="language-orbit"><span className="orbit-small">Hello</span><span lang="hi" className="orbit-hindi">नमस्ते</span><span lang="ta" className="orbit-tamil">வணக்கம்</span><span lang="ar" dir="rtl" className="orbit-arabic">مرحباً</span><span lang="ko" className="orbit-korean">안녕하세요</span><span className="orbit-french">Bonjour</span><span className="orbit-spanish">Hola.</span><div className="orbit-center"><Globe2 size={31} strokeWidth={1.3} /></div></div><span className="visual-caption"><span className="live-dot" /> EVERY VOICE BELONGS HERE</span></> : active === 1 ? <><div className="mini-video"><Image src={SAMPLE_POSTER} width={1280} height={720} unoptimized alt="Coastal landscape with caption positioning guides" loading="lazy" /><div className="mini-guide v" /><div className="mini-guide h" /><span className="mini-caption">Right where you belong.<i /><i /><i /><i /></span><span className="mini-pointer"><MousePointer2 size={23} fill="var(--accent)" /> You</span></div><div className="position-readout"><span>X <strong>50%</strong></span><span>Y <strong>66.7%</strong></span><span><Check size={12} /> Snapped to thirds</span></div></> : <><div className="type-specimen"><span className="type-small">FIND YOUR TYPE</span><span className="type-big">Make it <em>move.</em></span><div className="type-samples"><span>Bold.</span><span>Your way.</span><span>Unmissable.</span></div><div className="swatches"><i style={{ background: '#e7f76f' }} /><i style={{ background: '#eb5036' }} /><i style={{ background: '#b9c8e4' }} /><i style={{ background: '#fff' }} /><i style={{ background: '#20211f' }} /></div></div></>}
        </motion.div></AnimatePresence>
      </div>
    </div>
    <div className="feature-specs" data-reveal><div><Sparkles size={20} /><strong>A little motion goes a long way.</strong><span>Pop, fade, type, or highlight each word.</span></div><div><ArrowDownToLine size={20} /><strong>Ready for the next screen.</strong><span>Burned-in MP4 and editable SRT exports.</span></div><div><ShieldCheck size={20} /><strong>Your ideas stay yours.</strong><span>Local projects. No account needed.</span></div><div><Zap size={20} /><strong>Less editing. More creating.</strong><span>Automatic timestamps, editable to the word.</span></div></div>
  </section>;
}

const steps = [
  { name: 'Drop your video.', copy: 'That camera-roll gem, your next lesson, or a big announcement. Bring it here.', label: '01 / UPLOAD' },
  { name: 'Speak your language.', copy: 'Choose the language spoken in your video. We’ll turn the audio into editable, timed captions.', label: '02 / TRANSCRIBE' },
  { name: 'Find your signature.', copy: 'Move, resize, and style your words. Preview every little detail as your video plays.', label: '03 / MAKE IT YOURS' },
  { name: 'Let it travel.', copy: 'Export your captioned video or download an SRT. Your story is ready for its next audience.', label: '04 / EXPORT' },
];

function HowItWorks() {
  const [step, setStep] = useState(0);
  return <section id="how-it-works" className="workflow-section"><div className="section-shell"><div className="workflow-header" data-reveal><span className="eyebrow"><span /> FROM CAMERA ROLL TO READY TO ROLL.</span><h2>Good things don’t<br />have to take forever.</h2><p>Four small steps.<br />A whole new way to be heard.</p></div><div className="workflow-body" data-reveal><div className="workflow-art"><AnimatePresence mode="wait"><motion.div key={step} initial={{ opacity: 0, scale: .95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .95 }} transition={{ duration: .3 }} className={`step-art step-art-${step}`}>
    {step === 0 ? <><div className="upload-art"><div className="upload-clip"><Image src={SAMPLE_POSTER} width={1280} height={720} unoptimized alt="Your next video, ready to upload" loading="lazy" /><Play size={22} fill="white" /><span>a-little-further.mp4</span></div><span className="upload-target"><Upload size={26} /><strong>Your next story goes here.</strong><span>Drop it like it’s yours.</span></span></div><div className="art-note"><Check size={13} /> MP4, MOV, WEBM · UP TO 150 MB</div></> : step === 1 ? <><div className="transcribe-art"><div><Languages size={19} /><span>Language of your story</span><ChevronDown size={16} /></div><strong>Hindi <span lang="hi">हिन्दी</span><Check size={17} /></strong><p><span>00:00 – 00:03</span><span lang="hi">हर कहानी एक नई शुरुआत है।</span></p><p><span>00:03 – 00:06</span><span lang="hi">अपनी आवाज़ को दुनिया तक पहुँचाओ।</span></p><div className="waveform">{Array.from({ length: 34 }, (_, i) => <i key={i} style={{ height: `${12 + (Math.sin(i * 1.7) + 1) * 14}px` }} />)}</div></div><div className="art-note"><Check size={13} /> WORDS FOUND. TIMESTAMPS SORTED.</div></> : step === 2 ? <><div className="styling-art"><span>Make it <mark>yours.</mark><i /><i /><i /><i /></span><div><span><Type size={16} /> Manrope <ChevronDown size={12} /></span><span>Bold <ChevronDown size={12} /></span><span><i /> Color</span></div></div><div className="art-note"><Move size={13} /> THE FRAME IS YOUR PLAYGROUND.</div></> : <><div className="export-art"><span className="export-check"><Check size={29} /></span><h3>One for the world.</h3><p>Your story, with every word in place.</p><div><span>MP4 video</span><span>1080p <Check size={12} /></span></div><div><span>Subtitle file</span><span>.srt <Check size={12} /></span></div><span className="art-download">Ready when you are <ArrowDownToLine size={15} /></span></div><div className="art-note"><Check size={13} /> NO WATERMARK. JUST YOUR WORK.</div></>}
    </motion.div></AnimatePresence></div><div className="workflow-steps">{steps.map((item, i) => <button key={item.name} className={step === i ? 'active' : ''} onClick={() => setStep(i)} aria-pressed={step === i}><span className="step-index">0{i + 1}</span><span><strong>{item.name}</strong>{step === i && <motion.span initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="step-copy">{item.copy}</motion.span>}</span><ArrowUpRight size={20} /></button>)}</div></div><Link href="/editor" className="workflow-cta">Enough reading. Let’s make something. <ArrowRight size={18} /></Link></div></section>;
}

function Comparison() {
  const [split, setSplit] = useState(48);
  return <section className="comparison-section section-shell"><div className="comparison-copy" data-reveal><span className="eyebrow"><span /> SAME STORY. MORE CONNECTION.</span><h2>Make them<br /><em>stop scrolling.</em></h2><p>For the quiet commute. The sound-off scroll. The words worth remembering. Give your story a way to connect, even without the sound.</p><span className="comparison-hint"><ChevronLeft size={15} /> Slide to see the difference <ChevronRight size={15} /></span></div><div className="comparison-media" data-reveal><Image src={SAMPLE_POSTER} width={1280} height={720} unoptimized alt="Compare the original coastal video with a captioned version" loading="lazy" /><span className="compare-label before">THE ORIGINAL</span><div className="comparison-after" style={{ clipPath: `inset(0 0 0 ${split}%)` }}><span className="compare-label after">THE KAPTIO EFFECT</span><div className="comparison-caption">This is your sign.<br /><mark>Take the scenic route.</mark></div></div><div className="compare-divider" style={{ left: `${split}%` }}><span><ChevronLeft size={14} /><ChevronRight size={14} /></span></div><input type="range" min="5" max="95" value={split} onChange={e => setSplit(Number(e.target.value))} aria-label="Before and after caption comparison" /></div></section>;
}

const faqs = [
  ['Which languages can I caption in?', 'Kaptio supports 20 language options, including English, Hindi, Hinglish, Tamil, Telugu, Bengali, Marathi, Gujarati, Punjabi, Urdu, Arabic, Spanish, French, German, Japanese, and Korean. Script-aware fonts and right-to-left layouts help every language feel at home.'],
  ['Will this translate my video into another language?', 'The language selector tells the transcription engine what language is spoken in your video. It does not automatically translate speech. You can edit the resulting captions into any language, or translate the text with another tool and edit the result here.'],
  ['Can I make the captions look like my brand?', 'Absolutely. Choose your font, colors, stroke, shadow, background, and animation. Drag captions into position and resize them directly on your video. Your style is saved with your project.'],
  ['What happens to the videos I upload?', 'Projects stay in your browser. For transcription, your video is sent to your Kaptio server, where FFmpeg extracts audio and open-source Whisper runs locally; no transcription API receives it. Temporary processing files are removed, and completed exports expire after one hour. The server downloads and caches model weights on first use.'],
  ['What can I export?', 'Download an MP4 with your captions burned directly into the picture, or an SRT subtitle file for another editor or video platform. MP4 exports support original, 1080p, 720p, and 480p resolution. SRT files contain text and timestamps, without visual styling.'],
  ['Do I need an account to get started?', 'No account is needed. Open the editor, try the sample project, or upload a video and add captions manually. Automatic transcription uses the open-source Whisper model on the app server, with no provider API key or per-use charge. The first use downloads and caches the model; processing speed depends on the server. Your projects autosave on this device.'],
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return <section id="faq" className="faq-section section-shell"><div data-reveal><span className="eyebrow"><span /> A FEW THINGS, CLEARED UP.</span><h2>Glad you<br />asked.</h2><span className="faq-doodle" aria-hidden="true"><CircleHelp size={84} strokeWidth={.8} /></span></div><div className="faq-list" data-reveal>{faqs.map(([question, answer], i) => <div className="faq-item" key={question}><button aria-expanded={open === i} aria-controls={`answer-${i}`} onClick={() => setOpen(open === i ? null : i)}>{question}<span>{open === i ? <Minus size={18} /> : <Plus size={18} />}</span></button><div id={`answer-${i}`} hidden={open !== i}><p>{answer}</p></div></div>)}</div></section>;
}

export function Homepage() {
  const [menuOpen, setMenuOpen] = useState(false);
  return <div className="homepage"><MotionEffects /><a className="skip-link" href="#main">Skip to content</a><header className="site-header"><div className="header-inner"><Logo /><nav className={menuOpen ? 'mobile-open' : ''} aria-label="Main navigation"><a href="#features" onClick={() => setMenuOpen(false)}>The possibilities</a><a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a><a href="#faq" onClick={() => setMenuOpen(false)}>A few questions</a></nav><div className="nav-actions"><Link className="nav-editor" href="/editor?demo=1">Open studio <ArrowUpRight size={15} /></Link><Link className="button button-small button-dark" href="/editor" data-magnetic>Start creating <ArrowUpRight size={15} /></Link><button className="mobile-menu" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button></div></div></header>
    <main id="main"><section className="hero section-shell"><div className="hero-copy"><div className="hero-eyebrow"><span className="little-star" aria-hidden="true">✳</span> EVERY WORD DESERVES TO BE SEEN.</div><h1>Your story.<br />In every<br /><span className="hero-last-word">language<svg viewBox="0 0 430 20" aria-hidden="true"><path d="M3 11C95 1 224 2 425 8M40 17C145 9 280 10 377 14" /></svg></span><span className="accent-period">.</span></h1><p>Big ideas don’t need language barriers.<br className="desktop-break" /> Create beautiful, perfectly placed captions.<br className="desktop-break" /> Let your words go a little further.</p><div className="hero-actions"><Link className="button button-primary" href="/editor" data-magnetic>Caption your first video <ArrowUpRight size={18} /></Link><Link href="/editor?demo=1" className="demo-link"><span><Play size={12} fill="currentColor" /></span>Try the studio</Link></div><div className="hero-promises"><span><Check size={12} /> No sign-up needed</span><span><Check size={12} /> No watermark</span><span><Check size={12} /> Yours to create</span></div></div><DemoCanvas /><a className="hero-scroll" href="#languages"><ArrowDown size={15} /><span>GOOD STORIES TRAVEL</span></a><span className="hero-edition">MADE FOR EVERY VOICE. / EST. 2026</span></section>
    <section className="language-strip" id="languages" aria-label="Supported languages"><div className="language-strip-label"><Globe2 size={17} /><span>YOUR WORLD.<br /><strong>YOUR WORDS.</strong></span></div><div className="language-marquee"><div className="marquee-track">{[0, 1].map(copy => <div className="marquee-group" key={copy} aria-hidden={copy === 1}>{[['हिन्दी', 'hi'], ['English', 'en'], ['தமிழ்', 'ta'], ['Español', 'es'], ['বাংলা', 'bn'], ['العربية', 'ar'], ['Français', 'fr'], ['日本語', 'ja'], ['తెలుగు', 'te'], ['한국어', 'ko']].map(([name, lang]) => <span key={lang} lang={lang}>{name}<i>✳</i></span>)}</div>)}</div></div><span className="language-count">20 languages.<br /><strong>Endless possibilities.</strong></span></section>
    <Features /><HowItWorks /><Comparison />
    <section className="usecases-section section-shell"><div className="usecases-heading" data-reveal><span className="eyebrow"><span /> MADE FOR WHAT YOU MAKE.</span><h2>Different voices.<br /><span className="muted-heading">One shared possibility.</span></h2><p>Whatever you have to say,<br />make sure it gets through.</p></div><div className="usecases"><article data-reveal><Link href="/editor?demo=1" className="usecase-image"><Image src="/media/creator.jpg" width={800} height={600} unoptimized alt="Creative filmmaker capturing an outdoor story" loading="lazy" /><span>FOR THE STORYTELLERS <ArrowUpRight size={16} /></span></Link><div><span>01</span><h3>Keep the scroll waiting.</h3></div><p>From a day-in-the-life to your next big idea. Make videos that feel unmistakably you.</p><span className="usecase-tags">CREATORS & FILMMAKERS</span></article><article data-reveal><Link href="/editor" className="usecase-image"><Image src="/media/educator.jpg" width={800} height={600} unoptimized alt="Educator sharing ideas in a creative workspace" loading="lazy" /><span>FOR THE MIND OPENERS <ArrowUpRight size={16} /></span></Link><div><span>02</span><h3>Make every lesson land.</h3></div><p>Give the important bits another way to be understood. Help more learners follow along.</p><span className="usecase-tags">EDUCATORS & EXPLAINERS</span></article><article data-reveal><Link href="/editor" className="usecase-image"><Image src="/media/business.jpg" width={800} height={600} unoptimized alt="Independent maker bringing a product story to life" loading="lazy" /><span>FOR THE IDEA BUILDERS <ArrowUpRight size={16} /></span></Link><div><span>03</span><h3>Talk their language.</h3></div><p>A product launch. A team update. A story behind the brand. Make every message feel closer.</p><span className="usecase-tags">BRANDS & SMALL BUSINESSES</span></article></div></section>
    <FAQ />
    <section className="closing-cta"><div className="section-shell"><div className="closing-note" data-reveal><span className="little-star">✳</span><span>YOU HAVE SOMETHING TO SAY.</span></div><h2 data-reveal>Let’s make it<br /><em>understood.</em><span className="closing-asterisk" aria-hidden="true">✳</span></h2><div className="closing-bottom" data-reveal><p>Your next story is already in your camera roll.<br />Give it the words it deserves.</p><Link href="/editor" className="button button-light" data-magnetic>Make your first Kaptio <ArrowUpRight size={20} /></Link><span>NO SIGN-UP.<br />JUST A LITTLE CREATIVITY.</span></div></div></section>
    </main><footer className="site-footer section-shell"><div className="footer-top"><div><Logo /><p>A little more seen.<br />A little more understood.</p></div><div><span>THE GOOD STUFF</span><a href="#features">The possibilities</a><a href="#how-it-works">How it works</a><Link href="/editor?demo=1">The playground <ArrowUpRight size={12} /></Link></div><div><span>BEFORE YOU GO</span><a href="#faq">Questions, answered</a><Link href="/privacy">Your privacy</Link><Link href="/editor">Start a project <ArrowUpRight size={12} /></Link></div><div className="footer-world"><Globe2 size={50} strokeWidth={.8} /><span>MADE HERE.<br />MEANT FOR EVERYWHERE.</span></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Kaptio. Every voice belongs.</span><span>Thoughtfully made for a world of stories. <span className="footer-spark">✳</span></span><a href="#main">Back to the top <ArrowUpRight size={13} /></a></div></footer></div>;
}
