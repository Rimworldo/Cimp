const YTmod = require("youtube-sr");
const YouTube = YTmod.YouTube || YTmod.default;

const AUDIO_RE = /\.(mp3|wav|ogg|m4a)$/i;
const AUDIO_THUMB = "https://i.giphy.com/blSTtZehjAZ8I.webp";

function extractId(url) {
  const m = String(url).match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|&v=)([^#&?]*).*/);
  return m && m[2].length === 11 ? m[2] : null;
}

function withTimeout(p, ms) {
  return Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);
}

async function resolveVideo(input) {
  input = String(input).trim();

  if (/^https?:\/\//i.test(input) && AUDIO_RE.test(input)) {
    let name = input.split("/").pop();
    try {
      name = decodeURIComponent(name);
    } catch (e) {}
    return {
      videoId: input,
      title: name,
      duration: 0,
      thumb: AUDIO_THUMB,
    };
  }

  const id = extractId(input);
  let v = null;

  try {
    if (id) {
      v = await withTimeout(
        YouTube.getVideo("https://www.youtube.com/watch?v=" + id),
        12000
      );
    } else {
      v = await withTimeout(YouTube.searchOne(input, "video", false), 12000);
    }
  } catch (e) {
    console.error("Erro na busca:", e.message);
  }

  if (!v && id) {
    return {
      videoId: id,
      title: "Vídeo " + id,
      duration: 0,
      thumb: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    };
  }

  if (!v || !v.id) return null;

  return {
    videoId: v.id,
    title: v.title || "Música",
    duration: Math.round((v.duration || 0) / 1000),
    thumb: `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`,
  };
}

module.exports = {
  resolveVideo,
  AUDIO_RE,
};
