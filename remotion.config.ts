import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');      // más rápido que PNG; el video final es H.264 de todos modos
Config.setJpegQuality(92);
Config.setCodec('h264');
Config.setPixelFormat('yuv420p');        // compatible con TikTok / Reels / Shorts / móviles
Config.setOverwriteOutput(true);
Config.setChromiumOpenGlRenderer('swangle');   // WebGL por software (CPU); no hay GPU en los runners
