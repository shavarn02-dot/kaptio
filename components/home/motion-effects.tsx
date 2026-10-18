'use client';
import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function MotionEffects() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({ duration: 1.05, smoothWheel: true, anchors: true });
    const tick = (time: number) => lenis.raf(time * 1000);
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(tick);
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((element) => {
        gsap.fromTo(element, { y: 32, opacity: 0 }, { y: 0, opacity: 1, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: element, start: 'top 94%', once: true } });
      });
      gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((element) => {
        gsap.fromTo(element, { y: -24 }, { y: 24, ease: 'none', scrollTrigger: { trigger: element.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
    });
    const magnets = Array.from(document.querySelectorAll<HTMLElement>('[data-magnetic]'));
    const handlers = magnets.map(element => {
      const move = (event: PointerEvent) => {
        if (event.pointerType === 'touch') return;
        const r = element.getBoundingClientRect();
        gsap.to(element, { x: (event.clientX - r.left - r.width / 2) * .12, y: (event.clientY - r.top - r.height / 2) * .18, duration: .25 });
      };
      const leave = () => gsap.to(element, { x: 0, y: 0, duration: .4, ease: 'elastic.out(1,.5)' });
      element.addEventListener('pointermove', move); element.addEventListener('pointerleave', leave);
      return () => { element.removeEventListener('pointermove', move); element.removeEventListener('pointerleave', leave); };
    });
    return () => { handlers.forEach(fn => fn()); ctx.revert(); gsap.ticker.remove(tick); lenis.destroy(); };
  }, []);
  return null;
}
