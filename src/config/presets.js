const outputFormats = [
  // Video Formats
  {
    name: "MP4",
    extension: "mp4",
    type: "video",
    description: "Convert to MP4 format.",
    configurableOptions: [
      { id: "resolution", label: "Resolution", type: "select", values: ["Original", "480p", "720p", "1080p"], default: "720p" },
      { id: "videoQuality", label: "Video Quality (CRF)", type: "range", min: 18, max: 28, step: 1, default: 23, tooltip: "Constant Rate Factor. Lower values mean higher quality." },
      { id: "audioBitrate", label: "Audio Bitrate (kbps)", type: "number", default: 128, tooltip: "Sets the target audio bitrate." },
      { id: "speedPreset", label: "Encoding Speed", type: "select", values: ["ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow"], default: "medium", tooltip: "Affects encoding speed and compression efficiency." }
    ]
  },
  {
    name: "WebM",
    extension: "webm",
    type: "video",
    description: "Convert to WebM format.",
    configurableOptions: [
      { id: "resolution", label: "Resolution", type: "select", values: ["Original", "480p", "720p", "1080p"], default: "720p" },
      { id: "videoBitrate", label: "Video Bitrate (Mbps)", type: "number", default: 2, tooltip: "Sets the target video bitrate." },
      { id: "audioBitrate", label: "Audio Bitrate (kbps)", type: "number", default: 128, tooltip: "Sets the target audio bitrate." },
      { id: "speedPreset", label: "Encoding Speed", type: "select", values: ["ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow"], default: "medium", tooltip: "Affects encoding speed and compression efficiency." }
    ]
  },
  {
    name: "AVI",
    extension: "avi",
    type: "video",
    description: "Convert to AVI format.",
    configurableOptions: [
      { id: "resolution", label: "Resolution", type: "select", values: ["Original", "480p", "720p", "1080p"], default: "720p" },
      { id: "videoQuality", label: "Video Quality (CRF)", type: "range", min: 18, max: 28, step: 1, default: 23 },
      { id: "audioBitrate", label: "Audio Bitrate (kbps)", type: "number", default: 128 },
      { id: "speedPreset", label: "Encoding Speed", type: "select", values: ["ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow"], default: "medium", tooltip: "Affects encoding speed and compression efficiency." }
    ]
  },
  {
    name: "MOV",
    extension: "mov",
    type: "video",
    description: "Convert to MOV (QuickTime) format.",
    configurableOptions: [
      { id: "resolution", label: "Resolution", type: "select", values: ["Original", "480p", "720p", "1080p"], default: "720p" },
      { id: "videoQuality", label: "Video Quality (CRF)", type: "range", min: 18, max: 28, step: 1, default: 23 },
      { id: "audioBitrate", label: "Audio Bitrate (kbps)", type: "number", default: 128 },
      { id: "speedPreset", label: "Encoding Speed", type: "select", values: ["ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow"], default: "medium", tooltip: "Affects encoding speed and compression efficiency." }
    ]
  },
  
  {
    name: "MKV",
    extension: "mkv",
    type: "video",
    description: "Convert to MKV (Matroska) format.",
    configurableOptions: [
      { id: "resolution", label: "Resolution", type: "select", values: ["Original", "480p", "720p", "1080p"], default: "720p" },
      { id: "videoQuality", label: "Video Quality (CRF)", type: "range", min: 18, max: 28, step: 1, default: 23 },
      { id: "audioBitrate", label: "Audio Bitrate (kbps)", type: "number", default: 128 },
      { id: "speedPreset", label: "Encoding Speed", type: "select", values: ["ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow"], default: "medium", tooltip: "Affects encoding speed and compression efficiency." }
    ]
  },
  {
    name: "WMV",
    extension: "wmv",
    type: "video",
    description: "Convert to WMV (Windows Media Video) format.",
    configurableOptions: [
      { id: "resolution", label: "Resolution", type: "select", values: ["Original", "480p", "720p", "1080p"], default: "720p" },
      { id: "videoQuality", label: "Video Quality (CRF)", type: "range", min: 18, max: 28, step: 1, default: 23 },
      { id: "audioBitrate", label: "Audio Bitrate (kbps)", type: "number", default: 128 },
      { id: "speedPreset", label: "Encoding Speed", type: "select", values: ["ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow"], default: "medium", tooltip: "Affects encoding speed and compression efficiency." }
    ]
  },
  {
    name: "MPEG",
    extension: "mpeg",
    type: "video",
    description: "Convert to MPEG format.",
    configurableOptions: [
      { id: "resolution", label: "Resolution", type: "select", values: ["Original", "480p", "720p", "1080p"], default: "720p" },
      { id: "videoQuality", label: "Video Quality (CRF)", type: "range", min: 18, max: 28, step: 1, default: 23 },
      { id: "audioBitrate", label: "Audio Bitrate (kbps)", type: "number", default: 128 },
      { id: "speedPreset", label: "Encoding Speed", type: "select", values: ["ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow"], default: "medium", tooltip: "Affects encoding speed and compression efficiency." }
    ]
  },
  {
    name: "3GP",
    extension: "3gp",
    type: "video",
    description: "Convert to 3GP format (for mobile devices).",
    configurableOptions: [
      { id: "resolution", label: "Resolution", type: "select", values: ["Original", "176x144", "320x240"], default: "176x144" },
      { id: "videoQuality", label: "Video Quality (CRF)", type: "range", min: 18, max: 28, step: 1, default: 23 },
      { id: "audioBitrate", label: "Audio Bitrate (kbps)", type: "number", default: 64 },
      { id: "speedPreset", label: "Encoding Speed", type: "select", values: ["ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow"], default: "medium", tooltip: "Affects encoding speed and compression efficiency." }
    ]
  },
  {
    name: "GIF",
    extension: "gif",
    type: "video", // GIF is treated as video for conversion purposes
    description: "Convert video to GIF.",
    configurableOptions: [
      { id: "fps", label: "Frames Per Second", type: "number", default: 15, tooltip: "Higher FPS means smoother animation but larger file size." },
      { id: "startTime", label: "Start Time (HH:MM:SS)", type: "text", default: "00:00:00", tooltip: "Start conversion from this timestamp." },
      { id: "endTime", label: "End Time (HH:MM:SS)", type: "text", default: "00:00:05", tooltip: "End conversion at this timestamp." },
      { id: "resolution", label: "Resolution", type: "select", values: ["Original", "320p", "480p"], default: "320p" },
      { id: "speedPreset", label: "Encoding Speed", type: "select", values: ["ultrafast", "superfast", "veryfast", "faster", "fast", "medium", "slow", "slower", "veryslow"], default: "medium", tooltip: "Affects encoding speed and compression efficiency." }
    ]
  },

  // Audio Formats
  {
    name: "MP3",
    extension: "mp3",
    type: "audio",
    description: "Convert to MP3 format.",
    configurableOptions: [
      { id: "audioBitrate", label: "Audio Bitrate (kbps)", type: "select", values: ["64", "128", "192", "256", "320"], default: "128", tooltip: "Higher bitrate means better audio quality." }
    ]
  },
  {
    name: "WAV",
    extension: "wav",
    type: "audio",
    description: "Convert to WAV (Waveform Audio File Format).",
    configurableOptions: []
  },
  {
    name: "FLAC",
    extension: "flac",
    type: "audio",
    description: "Convert to FLAC (Free Lossless Audio Codec).",
    configurableOptions: []
  },
  {
    name: "AAC",
    extension: "aac",
    type: "audio",
    description: "Convert to AAC (Advanced Audio Coding).",
    configurableOptions: [
      { id: "audioBitrate", label: "Audio Bitrate (kbps)", type: "select", values: ["64", "128", "192", "256", "320"], default: "128" }
    ]
  },
  {
    name: "OGG",
    extension: "ogg",
    type: "audio",
    description: "Convert to OGG Vorbis format.",
    configurableOptions: [
      { id: "audioQuality", label: "Audio Quality (qscale)", type: "range", min: 0, max: 10, step: 1, default: 5, tooltip: "Quality scale for OGG. Higher values mean better quality." }
    ]
  },
  {
    name: "WMA",
    extension: "wma",
    type: "audio",
    description: "Convert to WMA (Windows Media Audio) format.",
    configurableOptions: [
      { id: "audioBitrate", label: "Audio Bitrate (kbps)", type: "select", values: ["64", "128", "192", "256"], default: "128" }
    ]
  },
  {
    name: "AIFF",
    extension: "aiff",
    type: "audio",
    description: "Convert to AIFF (Audio Interchange File Format).",
    configurableOptions: []
  },
  {
    name: "M4A",
    extension: "m4a",
    type: "audio",
    description: "Convert to M4A (MPEG-4 Audio) format.",
    configurableOptions: [
      { id: "audioBitrate", label: "Audio Bitrate (kbps)", type: "select", values: ["64", "128", "192", "256", "320"], default: "128" }
    ]
  },

  // Image Formats
  {
    name: "JPG",
    extension: "jpg",
    type: "image",
    description: "Convert to JPEG format.",
    configurableOptions: [
      { id: "quality", label: "Quality (%)", type: "range", min: 1, max: 100, step: 1, default: 80, tooltip: "JPEG quality. Lower values mean more compression and smaller file size." }
    ]
  },
  {
    name: "PNG",
    extension: "png",
    type: "image",
    description: "Convert to PNG format.",
    configurableOptions: [
      { id: "compressionLevel", label: "Compression Level", type: "range", min: 0, max: 9, step: 1, default: 6, tooltip: "PNG compression level. Higher values mean more compression." }
    ]
  },
  {
    name: "BMP",
    extension: "bmp",
    type: "image",
    description: "Convert to BMP (Bitmap) format.",
    configurableOptions: [
      { id: "quality", label: "Quality (%)", type: "range", min: 1, max: 100, step: 1, default: 100, tooltip: "BMP quality. Lower values mean more compression and smaller file size." }
    ]
  },
  {
    name: "TIFF",
    extension: "tiff",
    type: "image",
    description: "Convert to TIFF (Tagged Image File Format).",
    configurableOptions: [
      { id: "quality", label: "Quality (%)", type: "range", min: 1, max: 100, step: 1, default: 100, tooltip: "TIFF quality. Lower values mean more compression and smaller file size." }
    ]
  },
  {
    name: "WebP",
    extension: "webp",
    type: "image",
    description: "Convert to WebP format.",
    configurableOptions: [
      { id: "quality", label: "Quality (%)", type: "range", min: 1, max: 100, step: 1, default: 75, tooltip: "WebP quality. Lower values mean more compression and smaller file size." },
      { id: "lossless", label: "Lossless", type: "checkbox", default: false, tooltip: "Enable lossless compression. This will result in larger file sizes but no loss of image quality." }
    ]
  },
  {
    name: "ICO",
    extension: "ico",
    type: "image",
    description: "Convert to ICO (Windows Icon) format.",
    configurableOptions: [
      { id: "quality", label: "Quality (%)", type: "range", min: 1, max: 100, step: 1, default: 100, tooltip: "ICO quality. Lower values mean more compression and smaller file size." }
    ]
  },
  {
    name: "SVG",
    extension: "svg",
    type: "image",
    description: "Convert to SVG (Scalable Vector Graphics) format.",
    configurableOptions: [
      { id: "quality", label: "Quality (%)", type: "range", min: 1, max: 100, step: 1, default: 100, tooltip: "SVG quality. Lower values mean more compression and smaller file size." }
    ]
  }
];

export { outputFormats };