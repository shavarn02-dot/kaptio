# Kaptio media credits

## Interactive demo footage

- Files: `public/media/demo.mp4`, `public/media/demo-poster.jpg`
- Work: **Turquoise blue water bay from above**
- Creator: [marcolopez on Mixkit](https://mixkit.co/@marcolopez/)
- Source: [Mixkit item 5008](https://mixkit.co/free-stock-video/turquoise-blue-water-bay-from-above-5008/)
- License: [Mixkit Stock Video Free License](https://mixkit.co/license/#videoFree). The source item explicitly permits commercial and personal use under this license.
- Downloaded on 16 October 2026 from the source's official asset links.
- Video asset: <https://assets.mixkit.co/videos/5008/5008-720.mp4>
- Matching poster: <https://assets.mixkit.co/videos/5008/5008-thumb-720-0.jpg>

This footage is used as the built-in editing demonstration. Demo captions are written for the product demonstration and are not a transcript of speech in the stock clip. Uploaded user media is separate from this bundled example.

The stock footage remains subject to its original license. Do not represent it as original Kaptio footage or redistribute it as a standalone stock media library.

## Use-case photography

The following photographs are used as illustrative editorial imagery, not testimonials or endorsements. They are downloaded as optimized 800 × 600 JPEG crops and are covered by the [Pexels License](https://www.pexels.com/license/), which permits website and app use.

| Local file | Photographer | Original photograph |
| --- | --- | --- |
| `public/media/creator.jpg` | Ali Alcántara | [Female Photographer Posing in Scenic Mountain Landscape](https://www.pexels.com/photo/female-photographer-posing-in-scenic-mountain-landscape-35746749/) |
| `public/media/educator.jpg` | George Milton | [Smiling ethnic woman with microphone and laptop creating podcast in studio](https://www.pexels.com/photo/smiling-ethnic-woman-with-microphone-and-laptop-creating-podcast-in-studio-6953869/) |
| `public/media/business.jpg` | masudar rahman | [Woman Making Pottery](https://www.pexels.com/photo/woman-making-pottery-18247238/) |

Downloaded on 16 October 2026 from `images.pexels.com` with its resize/compression parameters. People shown have not been identified as Kaptio users and do not endorse the product.


## Typography and local transcription model

- The interface loads the design-system families from Google Fonts: [Manrope](https://fonts.google.com/specimen/Manrope), [Instrument Sans](https://fonts.google.com/specimen/Instrument+Sans), and language-aware Noto Sans families including [Devanagari](https://fonts.google.com/noto/specimen/Noto+Sans+Devanagari) and [Japanese](https://fonts.google.com/noto/specimen/Noto+Sans+JP). Additional families are listed in `public/fonts/fonts.css`. The stylesheet is remotely served by Google Fonts; system sans-serif fallbacks remain available when offline.
- Transcription uses the timestamp-enabled ONNX conversion of [OpenAI Whisper base](https://huggingface.co/openai/whisper-base), published for Transformers.js as [`onnx-community/whisper-base_timestamped`](https://huggingface.co/onnx-community/whisper-base_timestamped). Its repository includes quantized CPU model files and the cross-attention outputs needed for word timestamps. The model is fetched once by the Kaptio server and cached; user audio is not sent to Hugging Face.
- Runtime and ASR references: [Transformers.js](https://huggingface.co/docs/transformers.js/en/index), [automatic speech recognition](https://huggingface.co/docs/transformers.js/en/tasks/automatic_speech_recognition), and the [timestamp-enabled Whisper model card](https://huggingface.co/onnx-community/whisper-base_timestamped).
