import type { NextConfig } from 'next';
const config: NextConfig = { serverExternalPackages: ['ffmpeg-static', 'ffprobe-static', '@huggingface/transformers', 'onnxruntime-node'], experimental: { proxyClientMaxBodySize: '200mb' }, poweredByHeader: false };
export default config;
