import type { Caption, CaptionStyle, Language } from './types';
export const LANGUAGES: Language[] = [
  {code:'en',name:'English',native:'English',dir:'ltr',font:'Manrope'},
  {code:'hi',name:'Hindi',native:'हिन्दी',dir:'ltr',font:'Noto Sans Devanagari'},
  {code:'hinglish',name:'Hinglish',native:'Hinglish',dir:'ltr',font:'Manrope'},
  {code:'ta',name:'Tamil',native:'தமிழ்',dir:'ltr',font:'Noto Sans Tamil'},
  {code:'te',name:'Telugu',native:'తెలుగు',dir:'ltr',font:'Noto Sans Telugu'},
  {code:'bn',name:'Bengali',native:'বাংলা',dir:'ltr',font:'Noto Sans Bengali'},
  {code:'mr',name:'Marathi',native:'मराठी',dir:'ltr',font:'Noto Sans Devanagari'},
  {code:'gu',name:'Gujarati',native:'ગુજરાતી',dir:'ltr',font:'Noto Sans Gujarati'},
  {code:'pa',name:'Punjabi',native:'ਪੰਜਾਬੀ',dir:'ltr',font:'Noto Sans Gurmukhi'},
  {code:'ur',name:'Urdu',native:'اردو',dir:'rtl',font:'Noto Sans Arabic'},
  {code:'es',name:'Spanish',native:'Español',dir:'ltr',font:'Manrope'},
  {code:'fr',name:'French',native:'Français',dir:'ltr',font:'Manrope'},
  {code:'de',name:'German',native:'Deutsch',dir:'ltr',font:'Manrope'},
  {code:'ar',name:'Arabic',native:'العربية',dir:'rtl',font:'Noto Sans Arabic'},
  {code:'ja',name:'Japanese',native:'日本語',dir:'ltr',font:'Noto Sans JP'},
  {code:'ko',name:'Korean',native:'한국어',dir:'ltr',font:'Noto Sans KR'},
  {code:'pt',name:'Portuguese',native:'Português',dir:'ltr',font:'Manrope'},
  {code:'it',name:'Italian',native:'Italiano',dir:'ltr',font:'Manrope'},
  {code:'zh',name:'Chinese',native:'中文',dir:'ltr',font:'Noto Sans SC'},
  {code:'ru',name:'Russian',native:'Русский',dir:'ltr',font:'Noto Sans'},
];
export const DEFAULT_STYLE: CaptionStyle = {fontFamily:'Manrope',fontSize:5,color:'#ffffff',highlightColor:'#e7f76f',strokeColor:'#171a16',strokeWidth:1.5,shadow:true,backgroundColor:'#171a16',backgroundOpacity:0,opacity:100,animation:'highlight',x:50,y:76};
export const SAMPLE_VIDEO = '/media/demo.mp4';
export const SAMPLE_POSTER = '/media/demo-poster.jpg';
export const DEMO_CAPTIONS: Caption[] = [
  {id:'demo-1',start:0,end:3.5,text:'Take the road less ordinary.'},
  {id:'demo-2',start:3.5,end:7,text:'Find a little room to breathe.'},
  {id:'demo-3',start:7,end:11,text:'Some stories need to be seen.'},
  {id:'demo-4',start:11,end:15,text:'Make every word a part of yours.'},
];
