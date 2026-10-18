export type CaptionWord = { word: string; start: number; end: number };
export type Caption = { id: string; start: number; end: number; text: string; words?: CaptionWord[] };
export type CaptionAnimation = 'none' | 'pop' | 'fade' | 'typewriter' | 'highlight';
export type CaptionStyle = { fontFamily: string; fontSize: number; color: string; highlightColor: string; strokeColor: string; strokeWidth: number; shadow: boolean; backgroundColor: string; backgroundOpacity: number; opacity: number; animation: CaptionAnimation; x: number; y: number };
export type Language = { code: string; name: string; native: string; dir: 'ltr' | 'rtl'; font: string };
