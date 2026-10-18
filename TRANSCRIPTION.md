# Local transcription

Kaptio runs transcription with the open-source `onnx-community/whisper-base_timestamped` ONNX checkpoint through Transformers.js. This export includes the cross-attention outputs needed for word-level timestamps. Transcription does not require an OpenAI key or a paid transcription API.

## First use

- On the first transcription, the Kaptio server downloads the model weights from the Hugging Face model repository. The quantized model is roughly 80 MB; the exact size can vary with the selected model/runtime.
- The server caches the weights in `.cache/huggingface` by default. Set `KAPTIO_MODEL_CACHE` to a persistent writable directory if the deployment filesystem is ephemeral.
- `KAPTIO_WHISPER_MODEL` can select another Transformers.js-compatible **timestamp-enabled** Whisper model repository. The default is `onnx-community/whisper-base_timestamped`; ordinary Whisper ONNX exports may not include the cross-attention tensors required for word timing.
- FFmpeg is used to extract 16 kHz mono audio from the video. The app then runs inference on the Kaptio server's CPU. Video and audio are stored temporarily for processing and removed when the request finishes.

## What “unlimited” means

There is no provider API key, per-minute transcription charge, or external transcription request. Usage is limited by the Kaptio server's compute, memory, disk, and network availability. The first model download needs internet access; later transcriptions use the cached weights. The app accepts clips up to 30 minutes and allows one local transcription at a time to protect server memory.

If a deployment is serverless or has no persistent writable storage, configure a persistent model cache or use a host that keeps local files between requests. The current model weights are not bundled into the source repository.
