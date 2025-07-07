const videoPresets = [
  {
    name: "MP4 720p H.264",
    ffmpegOptions: ["-vf", "scale=-2:720", "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "aac", "-b:a", "128k"],
    extension: "mp4",
    description: "Convert video to MP4 with 720p resolution using H.264 codec. Balanced quality and file size."
  },
  {
    name: "MP4 1080p H.264",
    ffmpegOptions: ["-vf", "scale=-2:1080", "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "aac", "-b:a", "192k"],
    extension: "mp4",
    description: "Convert video to MP4 with 1080p resolution using H.264 codec with good quality."
  },
  {
    name: "WebM VP9 720p",
    ffmpegOptions: ["-vf", "scale=-2:720", "-c:v", "libvpx-vp9", "-b:v", "2M", "-c:a", "libopus", "-b:a", "128k"],
    extension: "webm",
    description: "Convert video to WebM format with VP9 codec at 720p resolution."
  },
  {
    name: "GIF from Video (max 5s)",
    ffmpegOptions: ["-t", "5", "-vf", "fps=15,scale=320:-1:flags=lanczos", "-gifflags", "+transdiff", "-y"],
    extension: "gif",
    description: "Convert first 5 seconds of video to GIF with 15 fps and scale width to 320px."
  }
];

const audioPresets = [
  {
    name: "MP3 128 kbps",
    ffmpegOptions: ["-codec:a", "libmp3lame", "-b:a", "128k"],
    extension: "mp3",
    description: "Convert audio to MP3 format with 128 kbps bitrate."
  },
  {
    name: "AAC 128 kbps",
    ffmpegOptions: ["-codec:a", "aac", "-b:a", "128k"],
    extension: "m4a",
    description: "Convert audio to AAC format with 128 kbps bitrate."
  },
  {
    name: "OGG Vorbis 128 kbps",
    ffmpegOptions: ["-codec:a", "libvorbis", "-qscale:a", "5"],
    extension: "ogg",
    description: "Convert audio to OGG Vorbis format at quality 5 (~128 kbps)."
  }
];

const imagePresets = [
  {
    name: "JPEG 80% Quality",
    ffmpegOptions: ["-q:v", "4"], // q:v 2-31 (lower is better quality, 4~80%)
    extension: "jpg",
    description: "Convert image to JPEG with 80% quality."
  },
  {
    name: "PNG Compression",
    ffmpegOptions: ["-compression_level", "9"],
    extension: "png",
    description: "Convert image to PNG with maximum compression."
  },
  {
    name: "WebP Lossy 75 Quality",
    ffmpegOptions: ["-c:v", "libwebp", "-q:v", "75"],
    extension: "webp",
    description: "Convert image to WebP lossy format at 75 quality."
  }
];

export { videoPresets, audioPresets, imagePresets };
