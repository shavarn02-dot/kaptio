import type { Metadata } from 'next';
import Editor from '@/components/editor/editor';
import './editor.css';

export const metadata: Metadata = { title: 'Caption studio — Kaptio', description: 'A little studio for every story. Edit, position, and export multilingual video captions.' };

export default function EditorPage() { return <Editor />; }
