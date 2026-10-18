'use client';
import { useEffect } from 'react';
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <main className="error-page"><span className="eyebrow">LET’S TRY THAT AGAIN</span><h1>A small interruption.</h1><p>Something went wrong loading this page. Your saved projects are still on this device.</p><button className="button button-primary" onClick={reset}>Try again</button></main>;
}
