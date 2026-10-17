const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, ".env") });
const http = require("http");
const express = require("express");
const { WebSocketServer } = require("ws");
const tmi = require("tmi.js");
const { resolveVideo, AUDIO_RE } = require("./youtube");

const PORT = parseInt(process.env.PORT || "3000", 10);
const CHANNEL = (process.env.CHANNEL || "daenil").toLowerCase().replace("#", "");
const BOT_NICK = (process.env.BOT_NICK || "").toLowerCase();
const BOT_OAUTH = process.env.BOT_OAUTH || "";
const GIPHY_KEY = process.env.GIPHY_KEY || "";
const ADMINS = (process.env.ADMINS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const FALLBACK_GIF = "https://media.giphy.com/media/3o7abB06u9bNzA8LC8/giphy.gif";
const AUDIO_GIF = "https://media.giphy.com/media/r50i0lZV4ijvzLcJKz/giphy.gif";
const AUDIO_THUMB = "https://i.giphy.com/blSTtZehjAZ8I.webp";

const DATA_FILE = path.join(__dirname, "dados.json");
const DEFAULTS = {
  points: {},
  banned: [],
  playlist: [],
  colors: {},
  config: { gifWords: 3, glow: true, bpm: true, vol: 80, emptySound: true, autoSkip: true, maxDuration: 5, maxPerViewer: 5 },
};
function loadDb() {
  try {
    const j = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    return { ...DEFAULTS, ...j, config: { ...DEFAULTS.config, ...(j.config || {}) } };
  } catch (e) {
    return JSON.parse(JSON.stringify(DEFAULTS));
  }
}
let db = loadDb();
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 300);
}
function flushSave() {
  clearTimeout(saveTimer);
  try {
    fs.writeFileSync(DATA_FILE + ".tmp", JSON.stringify(db, null, 2));
    fs.renameSync(DATA_FILE + ".tmp", DATA_FILE);
  } catch (e) {
    console.error("Erro ao salvar dados.json:", e.message);
  }
}
process.on("SIGINT", () => { flushSave(); flushQueueSave(); process.exit(0); });
process.on("SIGTERM", () => { flushSave(); flushQueueSave(); process.exit(0); });

let queue = [];
let paused = false;
let gifUrl = "";
let gifTok = 0;
let lastTime = 0;
let botOnline = false;
let tmiClient = null;
const mods = new Set();

const QUEUE_FILE = path.join(__dirname, "fila.tmp.json");
let queueSaveTimer = null;
function saveQueue() {
  clearTimeout(queueSaveTimer);
  queueSaveTimer = setTimeout(flushQueueSave, 400);
}
function flushQueueSave() {
  clearTimeout(queueSaveTimer);
  try {
    const data = JSON.stringify({ queue, lastTime, paused }, null, 2);
    fs.writeFileSync(QUEUE_FILE + ".tmp", data);
    fs.renameSync(QUEUE_FILE + ".tmp", QUEUE_FILE);
  } catch (e) {
    console.error("Erro ao salvar fila.tmp.json:", e.message);
  }
}
function loadQueue() {
  try {
    const j = JSON.parse(fs.readFileSync(QUEUE_FILE, "utf8"));
    if (Array.isArray(j.queue)) queue = j.queue.filter((it) => it && it.videoId && it.title);
    if (typeof j.lastTime === "number" && j.lastTime >= 0) lastTime = j.lastTime;
    if (typeof j.paused === "boolean") paused = j.paused;
    if (queue.length) console.log("▶ Fila restaurada:", queue.length, "vídeo(s)");
  } catch (e) {}
}
loadQueue();

function snapshot() {
  return {
    type: "state", queue, paused, gifUrl, config: db.config, points: db.points,
    banned: db.banned, playlist: db.playlist, botOnline, time: lastTime, channel: CHANNEL,
  };
}
function broadcast(o) {
  const s = JSON.stringify(o);
  wss.clients.forEach((c) => { if (c.readyState === 1) c.send(s); });
}
function pushState() { saveQueue(); broadcast(snapshot()); }
let pushTimer = null;
function schedulePush() { clearTimeout(pushTimer); pushTimer = setTimeout(pushState, 200); }
function toast(msg, kind) { broadcast({ type: "toast", msg, kind: kind || "" }); }
function log(user, text, color, isMod) {
  broadcast({ type: "log", user, text, color: color || "#a78bfa", isMod: !!isMod, points: getPts(user) });
}
function sys(text) { log("SISTEMA", text, "#ffdd57"); }

function getPts(u) { return db.points[u] || 0; }
function addPts(u, n) { if (!u) return; db.points[u] = getPts(u) + n; save(); schedulePush(); }
function spendPts(u, n) {
  if (getPts(u) < n) return false;
  db.points[u] -= n; save(); schedulePush(); return true;
}
function isBanned(u) { return db.banned.includes(String(u).toLowerCase()); }
function banUser(t) {
  t = String(t).toLowerCase().replace("@", "").trim();
  if (!t || t === CHANNEL || t === BOT_NICK || ADMINS.includes(t) || mods.has(t)) return false;
  if (!db.banned.includes(t)) { db.banned.push(t); save(); }
  pushState();
  return true;
}
function unbanUser(t) {
  t = String(t).toLowerCase().replace("@", "").trim();
  db.banned = db.banned.filter((u) => u !== t);
  save(); pushState();
}

const outbox = [];
let lastSend = 0;
function say(msg) {
  if (!tmiClient || !botOnline) return;
  if (outbox.length >= 5) outbox.shift();
  outbox.push(String(msg).slice(0, 450));
}
setInterval(() => {
  if (!outbox.length || Date.now() - lastSend < 1000) return;
  lastSend = Date.now();
  const m = outbox.shift();
  tmiClient.say(CHANNEL, m).catch(() => {});
  log("BOT", m, "#ffdd57");
}, 500);

function cleanTitleForGif(t) {
  return String(t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()
    .split(" ").slice(0, db.config.gifWords).join(" ");
}
async function setGif(term) {
  const tok = ++gifTok;
  const q = cleanTitleForGif(term) || "party";
  let url = FALLBACK_GIF;
  if (GIPHY_KEY) {
    try {
      const r = await fetch("https://api.giphy.com/v1/gifs/search?api_key=" + encodeURIComponent(GIPHY_KEY) +
        "&q=" + encodeURIComponent(q) + "&limit=10&rating=g");
      const j = await r.json();
      if (j.data && j.data.length) url = j.data[Math.floor(Math.random() * j.data.length)].images.original.url;
    } catch (e) {}
  }
  if (tok !== gifTok || !queue.length) return;
  gifUrl = url;
  pushState();
}

function startPlayback() {
  const item = queue[0];
  if (!item) return showEmpty();
  lastTime = 0;
  paused = false;
  broadcast({ type: "stopempty" });
  if (AUDIO_RE.test(item.videoId)) { gifTok++; gifUrl = AUDIO_GIF; } else setGif(item.title);
  pushState();
}
function showEmpty() {
  gifTok++;
  gifUrl = "";
  lastTime = 0;
  paused = false;
  pushState();
}
function nextVideo() {
  queue.shift();
  if (queue.length) startPlayback();
  else {
    showEmpty();
    if (db.config.emptySound) broadcast({ type: "empty" });
    say("Adicione uma musica usando %simp (link do youtube)");
  }
}
async function addToQueue(input, user, color, fromTwitch) {
  user = String(user || CHANNEL).toLowerCase();
  if (isBanned(user)) return;
  const reply = (m, kind) => { if (fromTwitch) say("@" + user + " " + m); else toast(m, kind || "err"); };
  if (!fromTwitch) sys('Buscando: "' + input + '"...');
  const v = await resolveVideo(input);
  if (!v) { sys("Nada encontrado para: " + input); return reply("Nada encontrado para sua busca."); }
  if (queue.some((q) => q.videoId === v.videoId)) return reply("Esse vídeo já está na fila!");
  const max = db.config.maxDuration;
  if (v.duration > 0 && v.duration > max * 60) {
    sys("Vídeo de duração acima de " + max + " pulado");
    return reply("Vídeo de duração acima de " + max + " pulado");
  }
  const maxPer = db.config.maxPerViewer || 5;
  if (fromTwitch && queue.filter((q) => q.user === user).length >= maxPer) {
    return reply("Você já tem o máximo de " + maxPer + " vídeos na fila!");
  }
  const col = color || db.colors[user] || null;
  queue.push({ videoId: v.videoId, title: v.title, user, color: col, thumb: v.thumb, duration: v.duration });
  addPts(user, 1);
  log(user, v.title, col || "#a78bfa");
  if (db.config.bpm) broadcast({ type: "beep" });
  if (fromTwitch) say("@" + user + ' adicionou o video "' + v.title + '" na posição ' + queue.length);
  else toast("Adicionado", "ok");
  if (queue.length === 1) startPlayback(); else pushState();
}
function savedUrl(item) { return AUDIO_RE.test(item.videoId) ? item.videoId : "https://youtu.be/" + item.videoId; }
function saveToPlaylist(item, by) {
  if (db.playlist.some((v) => v.videoId === item.videoId)) return false;
  db.playlist.push({ videoId: item.videoId, title: item.title, user: by || item.user, color: item.color, thumb: item.thumb });
  save(); pushState();
  return true;
}

async function handleChat(tags, message) {
  const user = (tags.username || "").toLowerCase();
  if (!user || isBanned(user)) return;
  const badges = tags.badges || {};
  const isOwner = user === CHANNEL || !!badges.broadcaster;
  const isMod = isOwner || tags.mod === true || tags.mod === "1" || !!badges.moderator || ADMINS.includes(user);
  if (isMod) mods.add(user);
  const color = tags.color || null;
  if (color && db.colors[user] !== color) { db.colors[user] = color; save(); }

  const cmdMatch = message.match(/^%(s|simp)\b\s*(.*)/i);
  if (!cmdMatch) { log(user, message, color || "#a78bfa", isMod); return; }

  const payload = (cmdMatch[2] || "").trim();
  if (!payload) return say("@" + user + " Uso: %s/%simp (link ou busca) | %s ajuda");
  const parts = payload.split(/\s+/);
  const action = parts[0].toLowerCase();
  const arg = parts.slice(1).join(" ");
  const at = "@" + user + " ";

  switch (action) {
    case "ajuda":
    case "help":
      return say(at + "%s/%simp ajuda | give | pontos | skip | trocar | gif | atual | lista | rank | (link/busca)");

    case "give": {
      const amount = parseInt(parts[1], 10);
      const target = (parts[parts.length - 1] || "").replace("@", "").toLowerCase();
      if (parts.length < 3 || !target || isNaN(amount) || amount <= 0) return say(at + "Uso: %s give (quantidade) @usuario");
      if (target === user) return say(at + "você não pode dar pontos a si mesmo besta.");
      if (getPts(user) < amount) return say(at + "pobre.");
      spendPts(user, amount);
      addPts(target, amount);
      return say(at + "deu " + amount + " Simps para @" + target + " finO");
    }

    case "ban": {
      if (!arg) return say(at + "Uso: %s ban @usuario");
      if (!isMod) return say(at + "seja mod primeiro besta.");
      const target = arg.split(/\s+/)[0].replace("@", "").toLowerCase();
      if (!banUser(target)) return say(at + "não dá pra banir @" + target + ".");
      sys("🔨 " + user + " BANIU o usuário " + target);
      return say(at + "baniu @" + target + " anga ");
    }

    case "pontos": {
      const target = arg ? arg.split(/\s+/)[0].replace("@", "").toLowerCase() : user;
      return say(at + target + " tem " + getPts(target) + " Simps");
    }

    case "atual": {
      if (!queue.length) return say(at + "Nenhum vídeo tocando no momento. EXPLAINING");
      return say(at + 'Tocando agora: "' + queue[0].title + '" pedido por ' + queue[0].user);
    }

    case "lista": {
      if (!queue.length) return say(at + "A fila está vazia.");
      const n = queue[1];
      return say(at + "Há " + queue.length + " músicas na fila." + (n ? ' Próxima: "' + n.title + '" pedido por ' + n.user : ""));
    }

    case "skip": {
      if (!queue.length) return say(at + "Não tem nada tocando pra pular.");
      if (!isMod && getPts(user) < 25) return say(at + "Seja mais rico SonicSafado");
      if (!isMod) spendPts(user, 25);
      sys("⏭️ " + user + " Pulou o vídeo atual");
      nextVideo();
      return say(at + "pulou o video Porvalo ");
    }

    case "trocar": {
      if (queue.length < 3) return say(at + "Tem pouca coisa na fila pra embaralhar.");
      if (!isMod && !spendPts(user, 25)) return say(at + "Tenha mais dinheiros");
      const rest = queue.slice(1);
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rest[i], rest[j]] = [rest[j], rest[i]];
      }
      queue = [queue[0], ...rest];
      pushState();
      sys("🔀 " + user + " trocou a fila");
      return say(at + "fila trocada");
    }

    case "gif": {
      if (!arg) return say(at + "Uso: %s gif (nome)");
      if (!isMod && !spendPts(user, 10)) return say(at + "bixo pobre");
      setGif(arg);
      return say(at + "trocou o gif pra " + arg);
    }

    case "rank": {
      const top = Object.keys(db.points).map((k) => [k, db.points[k]]).sort((a, b) => b[1] - a[1]).slice(0, 10);
      if (!top.length) return say(at + "Ninguém tem Simps ainda.");
      let s = top.map((it, i) => (i + 1) + ". " + it[0] + " (" + it[1] + ")").join(" | ");
      if (s.length > 380) s = s.slice(0, 377) + "...";
      return say(at + "Top Simps: " + s);
    }

    default:
      return addToQueue(payload, user, color, true);
  }
}

const CFG_NUM = { gifWords: [1, 5], vol: [0, 100], maxDuration: [1, 600], maxPerViewer: [1, 20] };
const CFG_BOOL = ["glow", "bpm", "emptySound", "autoSkip"];
function handleAdmin(m) {
  const cur = queue[0];
  const isCur = (id) => cur && id === cur.videoId;
  switch (m.type) {
    case "pause":
      if (!cur) return;
      paused = !paused;
      sys((paused ? "⏸️ Pausou" : "⏸️ Despausou") + " o player");
      return pushState();
    case "skip":
      if (!cur) return;
      sys("⏭️ Admin pulou o vídeo atual");
      return nextVideo();
    case "clear":
      queue = [];
      sys("🗑️ Admin limpou a fila");
      return showEmpty();
    case "remove": {
      const i = parseInt(m.index, 10);
      if (isNaN(i) || i < 0 || i >= queue.length) return;
      if (i === 0) return nextVideo();
      queue.splice(i, 1);
      return pushState();
    }
    case "save": {
      const it = queue[parseInt(m.index, 10)];
      if (!it) return;
      const ok = saveToPlaylist(it, CHANNEL);
      return toast(ok ? "Salvo!" : "Já está na playlist", ok ? "ok" : "err");
    }
    case "seek":
      if (typeof m.time !== "number") return;
      lastTime = m.time;
      return broadcast({ type: "seek", time: m.time });
    case "time":
      if (isCur(m.videoId) && typeof m.cur === "number") { lastTime = m.cur; saveQueue(); }
      return;
    case "ended":
      if (isCur(m.videoId) && db.config.autoSkip) nextVideo();
      return;
    case "toolong":
      if (!isCur(m.videoId)) return;
      sys("Vídeo pulado: muito longo (> " + db.config.maxDuration + " min).");
      return nextVideo();
    case "error":
      if (!isCur(m.videoId)) return;
      sys("Vídeo pulado: não pode ser reproduzido (incorporação bloqueada?).");
      return nextVideo();
    case "config": {
      const p = m.patch || {};
      let gifChanged = false;
      for (const k of Object.keys(p)) {
        if (CFG_BOOL.includes(k)) db.config[k] = !!p[k];
        else if (CFG_NUM[k]) {
          const n = parseInt(p[k], 10);
          if (!isNaN(n)) { db.config[k] = Math.min(CFG_NUM[k][1], Math.max(CFG_NUM[k][0], n)); if (k === "gifWords") gifChanged = true; }
        }
      }
      save();
      if (!db.config.emptySound) broadcast({ type: "stopempty" });
      if (gifChanged && cur && !AUDIO_RE.test(cur.videoId)) setGif(cur.title);
      return pushState();
    }
    case "add":
      if (typeof m.url === "string" && m.url.trim()) addToQueue(m.url.trim(), CHANNEL, null, false);
      return;
    case "playlistDel": {
      const i = parseInt(m.index, 10);
      if (isNaN(i) || i < 0 || i >= db.playlist.length) return;
      db.playlist.splice(i, 1);
      save();
      return pushState();
    }
    case "playlistPlay": {
      const it = db.playlist[parseInt(m.index, 10)];
      if (it) addToQueue(savedUrl(it), CHANNEL, null, false);
      return;
    }
    case "ban":
      if (!banUser(m.target || "")) return toast("Você não pode banir este usuário!", "err");
      return sys("🔨 Admin BANIU o usuário " + m.target);
    case "unban":
      unbanUser(m.target || "");
      return sys("Admin DESBANIU o usuário " + m.target);
  }
}

function startBot() {
  if (!BOT_NICK || !BOT_OAUTH) {
    console.warn("⚠️  BOT_NICK / BOT_OAUTH não definidos no .env — o bot do chat não vai conectar.");
    return;
  }
  tmiClient = new tmi.Client({
    connection: { reconnect: true, secure: true },
    identity: { username: BOT_NICK, password: BOT_OAUTH.startsWith("oauth:") ? BOT_OAUTH : "oauth:" + BOT_OAUTH },
    channels: [CHANNEL],
  });
  tmiClient.on("connected", () => { botOnline = true; sys("✅ Bot conectado ao chat de #" + CHANNEL); pushState(); });
  tmiClient.on("disconnected", (r) => { botOnline = false; sys("🔴 Twitch desconectado: " + r); pushState(); });
  tmiClient.on("message", (chan, tags, message, self) => {
    if (self) return;
    handleChat(tags, String(message).trim()).catch((e) => console.error("Erro no comando:", e));
  });
  tmiClient.connect().catch((e) => { console.error("Falha ao conectar na Twitch:", e); sys("❌ Falha ao conectar na Twitch."); });
}

const PAGE = String.raw`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Simp.</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;700;800&display=swap" rel="stylesheet" />
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#0c0c0c;--surface:#161616;--surface2:#1e1e1e;--border:rgba(255,255,255,.08);--accent:#7b6cf0;--text:#e8e8e8;--muted:#7a7a7a;--item:#1a1a1a;--hh:58px}
body{background:var(--bg);color:var(--text);font-family:"Syne",sans-serif;min-height:100vh;overflow-x:hidden;scrollbar-width:none;-ms-overflow-style:none}
body::-webkit-scrollbar,.dropdown-content::-webkit-scrollbar,#simpsContent::-webkit-scrollbar,#bannedUsersContent::-webkit-scrollbar{width:0;height:0;display:none}
.dropdown-content,#simpsContent,#bannedUsersContent{scrollbar-width:none;-ms-overflow-style:none}
header{height:var(--hh);display:flex;align-items:center;justify-content:space-between;padding:0 1.5rem;border-bottom:1px solid var(--border);position:sticky;top:0;z-index:200;background:rgba(10,10,15,.95);gap:.75rem}
.logo{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;display:flex;align-items:center;gap:10px;cursor:pointer;user-select:none}
.logo span{color:var(--accent)}
.role-badge{font-size:.65rem;font-family:"Space Mono",monospace;text-transform:uppercase;font-weight:700;letter-spacing:1px;background:none;border:none;padding:0;border-radius:0}
.role-host{background:none;border:none;color:#7b6cf0}
.role-client{background:none;border:none;color:#5de89a}
.role-off{background:none;border:none;color:#7a7a7a}
.hright{display:flex;align-items:center;gap:.75rem}
.abtn{background:none;border:1px solid var(--border);color:var(--muted);padding:.3rem .85rem;border-radius:20px;font-family:"Space Mono",monospace;font-size:.7rem;cursor:pointer;transition:.2s}
.abtn:hover{border-color:var(--accent);color:var(--accent)}
.dropdown{position:relative;display:inline-block}
.dropdown-content{display:none;position:absolute;right:0;top:120%;background-color:var(--surface);min-width:280px;box-shadow:0 8px 20px rgba(0,0,0,.8);z-index:300;border:1px solid var(--border);border-radius:8px;max-height:350px;overflow-y:auto}
.dropdown-content.show{display:block;animation:fdIn .2s ease}
@keyframes fdIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
.plist-item{padding:10px;border-bottom:1px solid rgba(255,255,255,.03);display:flex;align-items:center;gap:10px;cursor:pointer;transition:.2s}
.plist-item:hover{background-color:var(--surface2)}
.plist-thumb{width:45px;height:26px;border-radius:4px;object-fit:cover}
.plist-title{font-size:.75rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;color:var(--text)}
.plist-del{background:none;border:none;color:var(--muted);cursor:pointer;padding:5px;font-size:.8rem;border-radius:4px}
.plist-del:hover{color:var(--accent);background:rgba(123,108,240,.1)}
.tp{display:flex;align-items:center;gap:.4rem;background:rgba(123,108,240,.12);border:1px solid rgba(123,108,240,.3);border-radius:20px;padding:.28rem .75rem;font-family:"Space Mono",monospace;font-size:.7rem;color:#7b6cf0}
.tdot{width:6px;height:6px;border-radius:50%;background:#7b6cf0;animation:blink 2s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
main{display:grid;grid-template-columns:1fr 350px;min-height:calc(100vh - var(--hh))}
.theater{padding:1.5rem;border-right:1px solid var(--border);display:flex;flex-direction:column;gap:1rem}
.theater-stage{position:relative;width:100%}
.player-glow{position:absolute;inset:0;background-size:cover;background-position:center;filter:blur(50px) saturate(200%);opacity:0;transition:opacity .6s ease;z-index:0;pointer-events:none;border-radius:12px;transform:scale(1.05)}
.player-glow.active{opacity:.25}
.player-wrap{background:#000;border-radius:12px;overflow:hidden;position:relative;aspect-ratio:16/9;border:1px solid var(--border);width:100%;z-index:2;display:flex;align-items:center;justify-content:center}
#ytFrame{width:100%;height:100%;border:none;display:block;pointer-events:none}
#rawAudio{width:90%;margin:auto;display:none;z-index:5;position:relative}
.eover{position:absolute;inset:0;background:rgba(10,10,15,.93);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.75rem;transition:opacity .3s;z-index:3}
.eover.gone{opacity:0;pointer-events:none}
.eover .ei{font-size:2.5rem;opacity:.2}
.eover p{font-family:"Space 
