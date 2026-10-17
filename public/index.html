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
.eover p{font-family:"Space Mono",monospace;font-size:.75rem;color:var(--muted);text-align:center;line-height:1.8}
.eover .ec{color:var(--accent);background:var(--surface2);padding:.35rem .8rem;border-radius:6px;font-size:.78rem;display:inline-block;margin-top:.2rem}
.npbar{display:flex;align-items:center;gap:.75rem;position:relative;z-index:2}
.npi{flex:1;min-width:0}
.nplbl{font-family:"Space Mono",monospace;font-size:.6rem;color:var(--accent);letter-spacing:.18em;text-transform:uppercase;margin-bottom:.2rem}
.nptitle{font-size:1rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.npuser{font-family:"Space Mono",monospace;font-size:.7rem;color:var(--muted)}
.npuser b{color:#a78bfa;font-weight:400}
.ctrls{display:flex;gap:1rem;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:1rem 1.25rem;margin:1rem 0;position:relative;z-index:2}
.apanel{background:var(--surface);border:1px solid rgba(123,108,240,.25);border-radius:10px;padding:1rem 1.25rem;display:flex;flex-direction:column;gap:.75rem;position:relative;z-index:2}
.aptitle{font-family:"Space Mono",monospace;font-size:.6rem;color:var(--accent);letter-spacing:.15em;text-transform:uppercase}
.aprow{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap}
.cbtn{background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:.45rem .9rem;border-radius:7px;font-family:"Space Mono",monospace;font-size:.72rem;cursor:pointer;transition:.2s;display:flex;align-items:center;gap:.35rem;white-space:nowrap}
.cbtn:hover{background:var(--accent);border-color:var(--accent);color:#fff}
.cbtn.red:hover{background:#7b6cf0;border-color:#7b6cf0}
.volrow{display:flex;align-items:center;gap:.5rem;flex:1;min-width:140px}
.volrow label{font-family:"Space Mono",monospace;font-size:.68rem;color:var(--muted)}
.volrow input[type=range]{flex:1;accent-color:var(--accent);cursor:pointer}
.volnum{font-family:"Space Mono",monospace;font-size:.68rem;min-width:30px;text-align:right}
.madd{border-top:1px solid var(--border);padding-top:.7rem;display:flex;flex-direction:column;gap:.4rem}
.maddt{font-family:"Space Mono",monospace;font-size:.6rem;color:var(--muted);letter-spacing:.1em;text-transform:uppercase}
.cfg-row{display:flex;align-items:center;gap:1rem;flex-wrap:wrap;background:rgba(0,0,0,.2);padding:.6rem .8rem;border-radius:8px;border:1px solid rgba(255,255,255,.03)}
.cfg-row label{font-family:"Space Mono",monospace;font-size:.65rem;color:var(--text);display:flex;align-items:center;gap:.4rem;cursor:pointer}
.cfg-row input[type=number]{background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:4px;padding:.2rem .4rem;width:45px;font-family:"Space Mono",monospace;font-size:.65rem;outline:none}
.cfg-row input[type=checkbox]{accent-color:var(--accent);width:14px;height:14px;cursor:pointer}
.qside{display:flex;flex-direction:column;height:calc(100vh - var(--hh));position:sticky;top:var(--hh);overflow:hidden}
.qhead{padding:1rem 1.25rem .7rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.qtitle{font-size:.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
.qcount{background:var(--accent);color:#fff;font-family:"Space Mono",monospace;font-size:.62rem;font-weight:700;padding:.12rem .45rem;border-radius:20px}
.user-add-box{display:flex;padding:.7rem 1.25rem;background:var(--surface);border-bottom:1px solid var(--border);gap:.4rem;flex-shrink:0}
.user-add-box input{flex:1;background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:.5rem .65rem;color:var(--text);font-family:"Space Mono",monospace;font-size:.7rem;outline:none;transition:.2s}
.user-add-box input:focus{border-color:var(--accent)}
.user-add-box button{background:var(--accent);border:none;color:#fff;padding:.5rem .9rem;border-radius:6px;font-weight:700;cursor:pointer;transition:.2s}
.user-add-box button:hover{background:#c45f5f}
.qlist-wrap{flex:1;position:relative;display:flex;flex-direction:column;overflow:hidden}
#qlistBg{position:absolute;inset:0;background-size:cover;background-position:center;opacity:.1;z-index:0;pointer-events:none;transition:background-image .5s ease}
.qlist{flex:1;overflow-y:auto;padding:.7rem;display:flex;flex-direction:column;gap:.45rem;position:relative;z-index:1}
.qlist::-webkit-scrollbar{width:0;height:0;display:none}
.qlist{scrollbar-width:none;-ms-overflow-style:none}
.qi{background:#000;border:1px solid var(--border);border-radius:8px;padding:.6rem .7rem;display:flex;align-items:center;gap:.65rem;transition:border-color .2s;animation:qs .25s ease;position:relative;z-index:1}
@keyframes qs{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
.qi:hover{border-color:rgba(255,255,255,.12)}
.qi.cur{border-color:var(--accent)}
.qithumb{width:68px;height:40px;border-radius:5px;background:var(--surface2);overflow:hidden;flex-shrink:0;position:relative}
.qithumb img{width:100%;height:100%;object-fit:cover;display:block}
.qibody{flex:1;min-width:0}
.qititle{font-size:.78rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3}
.qiuser{font-family:"Space Mono",monospace;font-size:.62rem;color:#a78bfa;margin-top:.1rem}
.qinum{font-family:"Space Mono",monospace;font-size:.68rem;color:var(--muted);flex-shrink:0}
.qidel,.qisave{background:none;border:none;color:var(--muted);cursor:pointer;font-size:.75rem;padding:.15rem .3rem;border-radius:4px;transition:.2s;flex-shrink:0;display:none}
.qi:hover .qidel,.qi:hover .qisave{display:flex}
.qidel:hover{color:var(--accent);background:rgba(123,108,240,.1)}
.qisave:hover{color:#5de89a;background:rgba(50,200,100,.1)}
.qempty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.5rem;color:var(--muted);text-align:center;padding:2rem}
.qempty .qei{font-size:2rem;opacity:.2}
.qempty p{font-family:"Space Mono",monospace;font-size:.7rem;line-height:1.8}
.log-ticker{flex:1;min-width:0;max-width:100%;height:28px;overflow:hidden;position:relative;margin:0 1rem;border:1px solid var(--border);border-radius:20px;background:rgba(0,0,0,.35)}
.log-ticker-inner{position:relative;width:100%;height:100%;overflow:hidden}
.cm{font-family:"Space Mono",monospace;font-size:.68rem;line-height:1;display:inline-flex;align-items:center;gap:.35rem;position:absolute;top:50%;left:0;white-space:nowrap;will-change:transform,opacity;pointer-events:none;opacity:0}
.cmu{color:#a78bfa;font-weight:700}
.cmt{color:var(--muted)}
.header-mid{flex:1;min-width:0;display:flex;align-items:center;justify-content:center;padding:0 .5rem}
.ovl{position:fixed;inset:0;background:rgba(0,0,0,.9);display:none;align-items:center;justify-content:center;z-index:999}
.ovl.open{display:flex}
.modal{background:var(--surface);border:1px solid rgba(123,108,240,.25);border-radius:14px;padding:2rem;width:320px;text-align:center}
.modal h2{font-size:1.15rem;font-weight:800;margin-bottom:.25rem}
.modal p{font-family:"Space Mono",monospace;font-size:.7rem;color:var(--muted);margin-bottom:1.1rem;line-height:1.7}
.toasts{position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;gap:.4rem;align-items:center;pointer-events:none}
.toast{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:.5rem 1.1rem;font-family:"Space Mono",monospace;font-size:.72rem;color:var(--text);white-space:nowrap;animation:tin .3s ease,tout .3s ease 2.4s forwards}
.toast.ok{border-color:rgba(50,200,100,.4);color:#5de89a}
.toast.err{border-color:rgba(255,60,60,.4);color:#ff7070}
@keyframes tin{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes tout{to{opacity:0}}
.bok{background:var(--accent);color:#fff;padding:.6rem;border-radius:7px;border:none;font-family:"Space Mono",monospace;font-size:.75rem;font-weight:700;cursor:pointer;transition:.2s;width:100%}
.bok:hover{background:#c45f5f}
.u-item{display:flex;justify-content:space-between;align-items:center;padding:.5rem;border-bottom:1px solid rgba(255,255,255,.05)}
.u-item:last-child{border-bottom:none}
.u-name{font-family:"Space Mono";font-size:.75rem;color:#a78bfa;font-weight:700}
.u-btn{background:none;border:1px solid #7b6cf0;color:#7b6cf0;font-family:"Space Mono";font-size:.6rem;padding:.2rem .5rem;border-radius:4px;cursor:pointer;transition:.2s}
.u-btn:hover{background:rgba(123,108,240,.2)}
.u-btn.unban{border-color:#5de89a;color:#5de89a}
.u-btn.unban:hover{background:rgba(50,200,100,.2)}
.ban-form{display:flex;gap:.4rem;margin-bottom:.8rem}
.ban-form input{flex:1;background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:.5rem .65rem;color:var(--text);font-family:"Space Mono",monospace;font-size:.7rem;outline:none}
@media (max-width:760px){main{grid-template-columns:1fr}.qside{height:auto;position:static;max-height:420px}}
body::after{content:"";position:fixed;inset:0;opacity:.02;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");pointer-events:none;z-index:9998}

body.zw-active{animation:zwBodyShake .05s linear infinite,zwBodyHue 1.2s linear infinite}
@keyframes zwBodyShake{0%,100%{transform:translate(0,0)}25%{transform:translate(1px,-1px)}50%{transform:translate(-1px,1px)}75%{transform:translate(1px,1px)}}
@keyframes zwBodyHue{0%{filter:hue-rotate(0deg) saturate(1) contrast(1)}50%{filter:hue-rotate(180deg) saturate(1.9) contrast(1.3)}100%{filter:hue-rotate(360deg) saturate(1) contrast(1)}}
.zw-overlay{position:fixed;inset:0;z-index:999999;pointer-events:none;opacity:0;background:radial-gradient(circle at 50% 50%,rgba(94,108,255,.35),rgba(255,221,87,.28) 35%,rgba(167,139,250,.3) 60%,rgba(10,10,15,.92) 100%);mix-blend-mode:screen}
.zw-overlay.active{opacity:1;animation:zwFlash 1s ease-in-out infinite}
@keyframes zwFlash{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:.95;transform:scale(1.03)}}
.zw-float{animation:zwFloat 2.2s ease-in-out infinite}
@keyframes zwFloat{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-14px) rotate(.6deg)}}
.zw-particle{position:fixed;bottom:-10px;border-radius:50%;pointer-events:none;z-index:999998;will-change:transform,opacity}
@keyframes zwRise{0%{transform:translateY(0) scale(1);opacity:1}100%{transform:translateY(-110vh) scale(.3);opacity:0}}

.egg-canvas{position:fixed;inset:0;z-index:999997;pointer-events:none}
body.egg-disco{animation:eggDiscoHue .6s linear infinite}
@keyframes eggDiscoHue{0%{filter:hue-rotate(0deg) saturate(1.6)}100%{filter:hue-rotate(360deg) saturate(1.6)}}
.egg-disco-overlay{position:fixed;inset:0;z-index:999996;pointer-events:none;opacity:.9;mix-blend-mode:color-dodge;background:conic-gradient(from 0deg,#ff5e5e,#ffdd57,#5de89a,#7b6cf0,#a78bfa,#ff5e5e);animation:eggDiscoSpin 2.5s linear infinite}
@keyframes eggDiscoSpin{from{transform:rotate(0deg) scale(2)}to{transform:rotate(360deg) scale(2)}}
.egg-disco-spin{display:inline-block;animation:eggLogoSpin .7s linear infinite}
@keyframes eggLogoSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.egg-confetti{position:fixed;top:-20px;pointer-events:none;z-index:999998;will-change:transform,opacity}
@keyframes eggConfettiFall{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(115vh) rotate(540deg);opacity:.9}}
body.egg-flip{animation:eggFlip 3s ease-in-out;transform-origin:center center}
@keyframes eggFlip{0%{transform:rotate(0deg)}15%{transform:rotate(190deg)}20%{transform:rotate(175deg)}50%{transform:rotate(180deg)}80%{transform:rotate(175deg)}85%{transform:rotate(190deg)}100%{transform:rotate(360deg)}}
body.egg-glitch{animation:eggGlitchShift .15s steps(2) infinite}
@keyframes eggGlitchShift{0%{transform:translate(0,0);filter:hue-rotate(0deg)}20%{transform:translate(-3px,2px);filter:hue-rotate(60deg)}40%{transform:translate(3px,-2px);filter:hue-rotate(-60deg)}60%{transform:translate(-2px,-1px);filter:hue-rotate(30deg)}80%{transform:translate(2px,1px);filter:hue-rotate(-30deg)}100%{transform:translate(0,0);filter:hue-rotate(0deg)}}
.egg-glitch-overlay{position:fixed;inset:0;z-index:999996;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(255,255,255,.05) 0,rgba(255,255,255,.05) 1px,transparent 2px,transparent 4px);mix-blend-mode:overlay}
.egg-toast{position:fixed;top:70px;left:50%;transform:translateX(-50%);z-index:999999;background:var(--surface2);border:1px solid var(--accent);color:var(--text);padding:.6rem 1.2rem;border-radius:20px;font-family:"Space Mono",monospace;font-size:.75rem;opacity:0;animation:eggToastPop 3s ease forwards;pointer-events:none}
@keyframes eggToastPop{0%{opacity:0;transform:translateX(-50%) translateY(-10px)}10%{opacity:1;transform:translateX(-50%) translateY(0)}85%{opacity:1}100%{opacity:0;transform:translateX(-50%) translateY(-10px)}}
</style>
</head>
<body>
<header>
  <div class="logo" id="logo">Simp<span>.</span> <span id="roleBadge" class="role-badge role-off">Conectando...</span></div>
  <div class="header-mid">
    <div class="log-ticker" id="chatbox">
      <div class="log-ticker-inner" id="logInner"></div>
    </div>
  </div>
  <div class="hright">
    <button class="abtn" id="usersBtn">Banidos</button>
    <div class="dropdown">
      <button class="abtn" id="dropBtn">Playlist</button>
      <div class="dropdown-content" id="dropContent"></div>
    </div>
    <button class="abtn" id="simpsBtn">Simps</button>
    <div class="tp"><div class="tdot"></div><span id="chanTag">—</span></div>
  </div>
</header>
<main>
  <div class="theater">
    <div class="theater-stage">
      <div id="playerGlow" class="player-glow"></div>
      <div class="player-wrap">
        <div id="ytFrame"></div>
        <audio id="rawAudio" controls></audio>
        <div class="eover" id="eover">
          <div class="ei">🎬</div>
          <p id="eoverText">Conectando ao servidor...</p>
          <span class="ec">Links MP3 / YouTube</span>
        </div>
      </div>
    </div>
    <div class="npbar" id="npbar" style="display:none">
      <div class="npi">
        <div class="nplbl">▶ tocando agora</div>
        <div class="nptitle" id="npTitle">—</div>
        <div class="npuser">pedido por <b id="npUser">—</b></div>
      </div>
    </div>
    <div class="ctrls">
      <div class="volrow" style="flex:1">
        <label>POSIÇÃO</label>
        <input type="range" min="0" max="100" value="0" id="seekSlider" />
        <span class="volnum" id="seekTime" style="min-width:80px">0:00/--:--</span>
      </div>
      <div class="volrow" style="flex:1">
        <label>VOL</label>
        <input type="range" min="0" max="100" value="80" id="volSlider" />
        <span class="volnum" id="volNum">80%</span>
      </div>
    </div>
    <div class="apanel">
      <div class="aptitle">⚙ controles do admin</div>
      <div class="aprow">
        <button class="cbtn" id="pauseBtn">⏸ Pausar</button>
        <button class="cbtn" id="skipBtn">⏭ Pular</button>
        <button class="cbtn red" id="clearBtn">🗑 Limpar fila</button>
      </div>
      <div class="madd">
        <div class="maddt">configurações</div>
        <div class="cfg-row">
          <label>Palavras GIF: <input type="number" id="cfgGifWords" min="1" max="5" value="3" /></label>
          <label><input type="checkbox" id="cfgGlow" /> Glow</label>
          <label><input type="checkbox" id="cfgBpm" /> Som ao adicionar</label>
          <label><input type="checkbox" id="cfgEmptySound" /> Som de fila vazia</label>
          <label><input type="checkbox" id="cfgAutoSkip" /> Pulo Automático</label>
          <label>Max dur.(min): <input type="number" id="cfgMaxDur" min="1" value="5" /></label>
          <label>Máx. vídeos/viewer: <input type="number" id="cfgMaxPerViewer" min="1" max="20" value="5" /></label>
        </div>
      </div>
    </div>
  </div>
  <div class="qside">
    <div class="qhead"><span class="qtitle">Fila de vídeos</span><span class="qcount" id="qcount">0</span></div>
    <div class="user-add-box">
      <input type="text" id="userUrl" placeholder="Link YouTube ou Pesquisa..." autocomplete="off" />
      <button id="userAddBtn">Add</button>
    </div>
    <div class="qlist-wrap">
      <div id="qlistBg"></div>
      <div class="qlist" id="qlist">
        <div class="qempty" id="qempty"><div class="qei">📺</div><p>Fila vazia</p></div>
      </div>
    </div>
  </div>
</main>

<div class="ovl" id="simpsOvl">
  <div class="modal" style="width:380px">
    <h2>Simps</h2>
    <div id="simpsContent" style="font-family:Space Mono;font-size:.75rem;line-height:1.6;max-height:400px;overflow-y:auto;text-align:left"></div>
    <div style="margin-top:1rem"><button class="bok" id="simpsClose">Fechar</button></div>
  </div>
</div>
<div class="ovl" id="usersOvl">
  <div class="modal" style="width:380px;padding:1.5rem">
    <h2>Usuários banidos</h2>
    <div class="ban-form" style="margin-top:.8rem">
      <input type="text" id="banInput" placeholder="usuário da Twitch" autocomplete="off" />
      <button class="u-btn" id="banBtn">BANIR</button>
    </div>
    <div id="bannedUsersContent" style="max-height:200px;overflow-y:auto;border:1px solid rgba(123,108,240,.2);border-radius:8px;padding:.5rem;background:#000"></div>
    <div style="margin-top:1rem"><button class="bok" id="usersClose">Fechar</button></div>
  </div>
</div>
<div class="toasts" id="toasts"></div>

<script>
var EMPTY_SOUNDS = ["https://files.catbox.moe/d5u8m3.mp3","https://files.catbox.moe/hxhg2l.mp3","https://files.catbox.moe/xjed0e.mp3","https://files.catbox.moe/szy7ht.mp3","https://files.catbox.moe/sf07ho.mp3","https://files.catbox.moe/petnkc.mp3"];
var AUDIO_RE = /\.(mp3|wav|ogg|m4a)$/i;
var S = { queue: [], paused: false, gifUrl: "", config: { gifWords: 3, glow: true, bpm: true, vol: 80, emptySound: true, autoSkip: true, maxDuration: 5, maxPerViewer: 5 }, points: {}, banned: [], playlist: [], botOnline: false, time: 0, channel: "" };
var ws = null, ytPlayer = null, ytReady = false, loadedId = null, emptyAudio = null, dragging = false, tick = 0, toolSent = null;
var lastQueueJson = "", lastGif = "";

function $(id) { return document.getElementById(id); }
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function sanitizeColor(c) { if (!c) return ""; if (/^#[0-9a-fA-F]{3,8}$/.test(c) || /^[a-zA-Z]+$/.test(c)) return c; return "#a78bfa"; }
function toast(msg, type) {
  var t = document.createElement("div");
  t.className = "toast " + (type || "");
  t.textContent = msg;
  $("toasts").appendChild(t);
  setTimeout(function () { t.remove(); }, 3000);
}

function send(o) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); }
function connect() {
  ws = new WebSocket((location.protocol === "https:" ? "wss://" : "ws://") + location.host);
  ws.onopen = function () { setBadge(true); };
  ws.onclose = function () { setBadge(false, "Servidor offline"); setTimeout(connect, 2000); };
  ws.onmessage = function (e) {
    var d = JSON.parse(e.data);
    if (d.type === "state") { S = d; renderAll(); }
    else if (d.type === "log") logChat(d.user, d.text, d.color, d.isMod, d.points);
    else if (d.type === "toast") toast(d.msg, d.kind);
    else if (d.type === "beep") beep();
    else if (d.type === "seek") doSeek(d.time);
    else if (d.type === "empty") playEmptySound();
    else if (d.type === "stopempty") stopEmptySound();
  };
}
function setBadge(ok, txt) {
  var b = $("roleBadge");
  if (!ok) { b.textContent = txt || "Conectando..."; b.className = "role-badge role-off"; return; }
  b.textContent = S.botOnline ? "BOT ONLINE" : "BOT OFFLINE";
  b.className = "role-badge " + (S.botOnline ? "role-client" : "role-off");
}

function renderAll() {
  setBadge(true);
  $("chanTag").textContent = "#" + S.channel;
  renderQueue(); renderConfig(); renderPlaylist(); renderBanned(); renderGif(); renderPlayback();
  $("pauseBtn").textContent = S.paused ? "▶ Retomar" : "⏸ Pausar";
}
function renderQueue() {
  var j = JSON.stringify(S.queue);
  $("qcount").textContent = S.queue.length;
  if (j === lastQueueJson) return;
  lastQueueJson = j;
  var list = $("qlist"), empty = $("qempty");
  [].slice.call(list.querySelectorAll(".qi")).forEach(function (n) { n.remove(); });
  if (!S.queue.length) { empty.style.display = "flex"; return; }
  empty.style.display = "none";
  S.queue.forEach(function (item, i) {
    var d = document.createElement("div");
    d.className = "qi" + (i === 0 ? " cur" : "");
    d.innerHTML = '<div class="qithumb"><img src="' + esc(item.thumb) + '" loading="lazy"></div>' +
      '<div class="qibody"><div class="qititle" title="' + esc(item.title) + '">' + esc(item.title) + '</div>' +
      '<div class="qiuser" style="' + (item.color ? "color:" + sanitizeColor(item.color) : "") + '">' + esc(item.user) + '</div></div>' +
      (i > 0 ? '<span class="qinum">#' + i + '</span>' : "") +
      '<button class="qisave" title="Salvar">💾</button>' +
      (i > 0 ? '<button class="qidel" title="Remover">✕</button>' : "");
    d.querySelector(".qisave").addEventListener("click", function () { send({ type: "save", index: i }); });
    var del = d.querySelector(".qidel");
    if (del) del.addEventListener("click", function () { send({ type: "remove", index: i }); });
    list.appendChild(d);
  });
}
function setVal(id, v) { var el = $(id); if (document.activeElement !== el) el.value = v; }
function renderConfig() {
  var c = S.config;
  $("cfgGlow").checked = c.glow; $("cfgBpm").checked = c.bpm; $("cfgEmptySound").checked = c.emptySound; $("cfgAutoSkip").checked = c.autoSkip;
  setVal("cfgGifWords", c.gifWords); setVal("cfgMaxDur", c.maxDuration); setVal("cfgMaxPerViewer", c.maxPerViewer || 5);
  if (!dragging) { setVal("volSlider", c.vol); }
  $("volNum").textContent = c.vol + "%";
  applyVol();
}
function renderPlaylist() {
  var c = $("dropContent");
  c.innerHTML = "";
  if (!S.playlist.length) { c.innerHTML = '<div style="padding:15px;font-size:.75rem;color:var(--muted);text-align:center;">Playlist vazia</div>'; return; }
  S.playlist.forEach(function (item, i) {
    var d = document.createElement("div");
    d.className = "plist-item";
    d.innerHTML = '<img class="plist-thumb" src="' + esc(item.thumb) + '" loading="lazy"><div class="plist-title">' + esc(item.title) + '</div><button class="plist-del">✕</button>';
    d.addEventListener("click", function (e) {
      if (e.target.classList.contains("plist-del")) { send({ type: "playlistDel", index: i }); return; }
      send({ type: "playlistPlay", index: i });
      c.classList.remove("show");
    });
    c.appendChild(d);
  });
}
function renderBanned() {
  var div = $("bannedUsersContent");
  div.innerHTML = "";
  if (!S.banned.length) { div.innerHTML = '<div style="color:var(--muted);font-size:.7rem;text-align:center;">Ninguém banido.</div>'; return; }
  S.banned.forEach(function (u) {
    var row = document.createElement("div");
    row.className = "u-item";
    row.innerHTML = '<span class="u-name" style="color:#7b6cf0;">' + esc(u) + '</span> <button class="u-btn unban">UNBAN</button>';
    row.querySelector("button").addEventListener("click", function () { send({ type: "unban", target: u }); });
    div.appendChild(row);
  });
}
function renderGif() {
  if (S.gifUrl === lastGif) return;
  lastGif = S.gifUrl;
  var bg = $("qlistBg");
  if (S.gifUrl) { bg.style.backgroundImage = 'url("' + S.gifUrl + '")'; bg.style.opacity = "0.3"; }
  else bg.style.backgroundImage = "";
}

function applyVol() {
  var v = S.config.vol;
  try { if (ytReady && ytPlayer.setVolume) ytPlayer.setVolume(v); } catch (e) {}
  $("rawAudio").volume = v / 100;
}
function stopMedia() {
  try { if (ytReady && ytPlayer.stopVideo) ytPlayer.stopVideo(); } catch (e) {}
  var ra = $("rawAudio"); ra.pause(); ra.style.display = "none";
}
function renderPlayback() {
  var cur = S.queue[0], gl = $("playerGlow");
  if (!cur) {
    loadedId = null; stopMedia();
    $("eover").classList.remove("gone");
    $("eoverText").innerHTML = "Nenhum vídeo<br>Use o chat";
    $("npbar").style.display = "none";
    gl.classList.remove("active");
    return;
  }
  $("eover").classList.add("gone");
  $("npbar").style.display = "flex";
  $("npTitle").textContent = cur.title;
  $("npUser").textContent = cur.user;
  $("npUser").style.color = sanitizeColor(cur.color) || "";
  gl.style.backgroundImage = 'url("' + cur.thumb + '")';
  if (S.config.glow) gl.classList.add("active"); else gl.classList.remove("active");
  var isAudio = AUDIO_RE.test(cur.videoId);
  if (loadedId !== cur.videoId) { loadedId = cur.videoId; toolSent = null; loadMedia(cur, isAudio, S.time || 0); }
  syncPause(isAudio);
}
function loadMedia(cur, isAudio, t) {
  var yf = $("ytFrame"), ra = $("rawAudio");
  if (isAudio) {
    try { if (ytReady && ytPlayer.stopVideo) ytPlayer.stopVideo(); } catch (e) {}
    yf.style.display = "none"; ra.style.display = "block";
    ra.src = cur.videoId; ra.volume = S.config.vol / 100;
    if (t > 0) ra.onloadedmetadata = function () { ra.currentTime = t; ra.onloadedmetadata = null; };
    if (!S.paused) ra.play().catch(function () {});
  } else {
    ra.pause(); ra.style.display = "none"; yf.style.display = "block";
    if (ytReady) {
      ytPlayer.loadVideoById({ videoId: cur.videoId, startSeconds: t });
      if (S.paused) ytPlayer.pauseVideo();
      else try { ytPlayer.playVideo(); } catch (e) {}
    }
  }
}
function syncPause(isAudio) {
  if (isAudio) {
    var ra = $("rawAudio");
    if (S.paused && !ra.paused) ra.pause();
    else if (!S.paused && ra.paused && !ra.ended) ra.play().catch(function () {});
  } else if (ytReady) {
    try {
      var st = ytPlayer.getPlayerState();
      if (S.paused && st === 1) ytPlayer.pauseVideo();
      else if (!S.paused && st !== 1) ytPlayer.playVideo();
    } catch (e) {}
  }
}
function doSeek(t) {
  var c = S.queue[0];
  if (!c) return;
  if (AUDIO_RE.test(c.videoId)) $("rawAudio").currentTime = t;
  else if (ytReady && ytPlayer.seekTo) ytPlayer.seekTo(t, true);
}
function curId() { return S.queue[0] ? S.queue[0].videoId : null; }
$("rawAudio").onended = function () { if (curId()) send({ type: "ended", videoId: curId() }); };

(function () { var s = document.createElement("script"); s.src = "https://www.youtube.com/iframe_api"; document.head.appendChild(s); })();
window.onYouTubeIframeAPIReady = function () {
  ytPlayer = new YT.Player("ytFrame", {
    playerVars: { autoplay: 1, controls: 0, disablekb: 1, rel: 0, playsinline: 1, modestbranding: 1 },
    events: {
      onReady: function () { ytReady = true; applyVol(); loadedId = null; renderPlayback(); },
      onError: function () { if (curId()) send({ type: "error", videoId: curId() }); },
      onStateChange: function (e) {
        if (e.data === YT.PlayerState.PLAYING) {
          var dur = ytPlayer.getDuration ? ytPlayer.getDuration() : 0;
          if (dur > S.config.maxDuration * 60 && toolSent !== curId()) { toolSent = curId(); send({ type: "toolong", videoId: curId() }); }
        }
        if ((e.data === YT.PlayerState.CUED || e.data === 5 || e.data === -1) && !S.paused && curId()) {
          try { ytPlayer.playVideo(); } catch (err) {}
        }
        if (e.data === YT.PlayerState.ENDED && curId()) send({ type: "ended", videoId: curId() });
      }
    }
  });
};

function tryResumePlayback() {
  var c = S.queue[0];
  if (!c || S.paused) return;
  if (AUDIO_RE.test(c.videoId)) {
    var ra = $("rawAudio");
    if (ra.paused && !ra.ended) ra.play().catch(function () {});
  } else if (ytReady) {
    try { if (ytPlayer.getPlayerState() !== 1) ytPlayer.playVideo(); } catch (e) {}
  }
}
document.addEventListener("click", tryResumePlayback);
document.addEventListener("keydown", tryResumePlayback);
setInterval(tryResumePlayback, 2000);

var seek = $("seekSlider");
function fmt(t) { return Math.floor(t / 60) + ":" + Math.floor(t % 60).toString().padStart(2, "0"); }
setInterval(function () {
  var cur = 0, dur = 0, c = S.queue[0];
  if (c) {
    if (AUDIO_RE.test(c.videoId)) { var ra = $("rawAudio"); cur = ra.currentTime || 0; dur = isFinite(ra.duration) ? ra.duration : 0; }
    else if (ytReady && ytPlayer.getCurrentTime) { try { cur = ytPlayer.getCurrentTime() || 0; dur = ytPlayer.getDuration ? ytPlayer.getDuration() || 0 : 0; } catch (e) {} }
  }
  if (!dragging) { seek.max = dur || 100; seek.value = cur; }
  $("seekTime").textContent = fmt(cur) + "/" + (dur > 0 ? fmt(dur) : "--:--");
  tick++;
  if (c && tick % 4 === 0) send({ type: "time", videoId: c.videoId, cur: cur, dur: dur });
}, 500);
["mousedown", "touchstart"].forEach(function (ev) { seek.addEventListener(ev, function () { dragging = true; }); });
["mouseup", "touchend", "change"].forEach(function (ev) { seek.addEventListener(ev, function () { dragging = false; }); });
seek.addEventListener("input", function () { send({ type: "seek", time: parseFloat(this.value) }); });
$("volSlider").addEventListener("input", function () {
  S.config.vol = parseInt(this.value, 10);
  $("volNum").textContent = S.config.vol + "%";
  applyVol();
  send({ type: "config", patch: { vol: S.config.vol } });
});

var ADD_SOUNDS = [
  "https://user.uploads.dev/file/e73225c881fb859fb35f030a8f207696.mp3",
  "https://user.uploads.dev/file/c703c231e59ac6d670b45468a84831a5.mp3",
  "https://user.uploads.dev/file/809183ff60aa24a5c814009881715c54.mp3"
];
function beep() {
  try {
    var a = new Audio(ADD_SOUNDS[Math.floor(Math.random() * ADD_SOUNDS.length)]);
    a.volume = 0.55;
    a.play().catch(function () {});
  } catch (e) {}
}
function playEmptySound() {
  if (!S.config.emptySound) return;
  stopEmptySound();
  emptyAudio = new Audio(EMPTY_SOUNDS[Math.floor(Math.random() * EMPTY_SOUNDS.length)]);
  emptyAudio.volume = 0.5;
  emptyAudio.play().catch(function () {});
}
function stopEmptySound() { if (emptyAudio) { emptyAudio.pause(); emptyAudio = null; } }

var logQueue = [];
var logBusy = false;
function logChat(user, text, color, isMod, points) {
  logQueue.push({ user: user, text: text, color: color, isMod: isMod, points: points });
  processLogQueue();
}
function processLogQueue() {
  if (logBusy || !logQueue.length) return;
  var inner = $("logInner");
  if (!inner) return;
  logBusy = true;
  var item = logQueue.shift();
  var d = document.createElement("div");
  d.className = "cm";
  d.innerHTML = '<span class="cmu" style="color:' + sanitizeColor(item.color) + '">' + esc(item.user) + (item.isMod ? ' <span style="color:#7b6cf0">[MOD]</span>' : "") +
    ' <span style="color:#7b6cf0"> (' + (item.points || 0) + ' Simps)</span></span>: <span class="cmt">' + esc(item.text) + '</span>';
  inner.appendChild(d);
  requestAnimationFrame(function () {
    var boxW = inner.clientWidth || 300;
    var msgW = d.offsetWidth || 120;
    var startX = -msgW;
    var endX = boxW + 8;
    var dist = endX - startX;
    var dur = Math.min(10, Math.max(4, dist / 55));
    d.style.transform = "translateY(-50%) translateX(" + startX + "px)";
    d.style.opacity = "0";
    void d.offsetWidth;
    d.style.transition = "transform " + dur + "s linear, opacity 0.3s ease";
    d.style.transform = "translateY(-50%) translateX(" + endX + "px)";
    d.style.opacity = "1";
    var releaseAt = Math.max(1.2, dur * 0.55) * 1000;
    setTimeout(function () {
      logBusy = false;
      processLogQueue();
    }, releaseAt);
    setTimeout(function () { d.style.opacity = "0"; }, (dur - 0.35) * 1000);
    setTimeout(function () {
      if (d.parentNode) d.parentNode.removeChild(d);
    }, (dur + 0.25) * 1000);
  });
}

function cfg(patch) { send({ type: "config", patch: patch }); }
$("pauseBtn").addEventListener("click", function () { send({ type: "pause" }); });
$("skipBtn").addEventListener("click", function () { send({ type: "skip" }); });
$("clearBtn").addEventListener("click", function () { send({ type: "clear" }); });
$("cfgGlow").addEventListener("change", function (e) { cfg({ glow: e.target.checked }); });
$("cfgBpm").addEventListener("change", function (e) { cfg({ bpm: e.target.checked }); });
$("cfgEmptySound").addEventListener("change", function (e) { cfg({ emptySound: e.target.checked }); });
$("cfgAutoSkip").addEventListener("change", function (e) { cfg({ autoSkip: e.target.checked }); });
$("cfgGifWords").addEventListener("change", function (e) { cfg({ gifWords: e.target.value }); });
$("cfgMaxDur").addEventListener("change", function (e) { cfg({ maxDuration: e.target.value }); });
$("cfgMaxPerViewer").addEventListener("change", function (e) { cfg({ maxPerViewer: e.target.value }); });
$("userAddBtn").addEventListener("click", function () {
  var raw = $("userUrl").value.trim();
  $("userUrl").value = "";
  if (raw) send({ type: "add", url: raw });
});
$("userUrl").addEventListener("keydown", function (e) { if (e.key === "Enter") $("userAddBtn").click(); });
$("dropBtn").addEventListener("click", function () { $("dropContent").classList.toggle("show"); });
window.onclick = function (e) {
  if (!e.target.matches("#dropBtn") && !e.target.closest(".dropdown-content")) $("dropContent").classList.remove("show");
};

$("usersBtn").addEventListener("click", function () { renderBanned(); $("usersOvl").classList.add("open"); });
$("usersClose").addEventListener("click", function () { $("usersOvl").classList.remove("open"); });
$("banBtn").addEventListener("click", function () {
  var t = $("banInput").value.trim();
  $("banInput").value = "";
  if (t) send({ type: "ban", target: t });
});
$("banInput").addEventListener("keydown", function (e) { if (e.key === "Enter") $("banBtn").click(); });
$("simpsBtn").addEventListener("click", function () {
  var html = "<b>Rank Simps</b><br>";
  Object.keys(S.points).map(function (k) { return [k, S.points[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 30)
    .forEach(function (it) { html += esc(it[0]) + " — " + it[1] + " Simps<br>"; });
  html += "<br><b>Comandos:</b><br>";
  [
    "%s / %simp ajuda → Lista de comandos",
    "%s give (quantidade) @usuario → Dá pontos",
    "%s ban @usuario → Banir usuário (streamer/mods)",
    "%s pontos / %s pontos @usuario → Ver pontos",
    "%s rank → Top 10 Simps",
    "%s skip → Pular música (-25 Simps, grátis p/ mods)",
    "%s trocar → Embaralhar fila (-25 Simps, grátis p/ mods)",
    "%s atual → Mostra a música tocando agora e quem pediu",
    "%s lista → Mostra quantas músicas estão na fila e a próxima",
    "%s gif (nome) → Mudar GIF (-10 Simps, grátis p/ mods)",
    "%s (url/busca) → Adiciona à fila"
  ].forEach(function (l) { html += esc(l) + "<br><br>"; });
  $("simpsContent").innerHTML = html;
  $("simpsOvl").classList.add("open");
});
$("simpsClose").addEventListener("click", function () { $("simpsOvl").classList.remove("open"); });

(function () {
  var ZW_AUDIO_URL = "https://files.catbox.moe/2n1tae.mp3";
  var ZW_DELAY_MS = 2300;
  var logoEl = document.querySelector(".logo");
  var eggActive = false, lastEggKey = null;

  function eggToast(msg) {
    var t = document.createElement("div");
    t.className = "egg-toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.remove(); }, 3000);
  }

  var zwAudio = null, zwTimer = null, zwParticleInterval = null;
  function zwSpawnParticle() {
    var p = document.createElement("div");
    p.className = "zw-particle";
    var size = 4 + Math.random() * 9;
    p.style.width = size + "px"; p.style.height = size + "px";
    p.style.left = Math.random() * 100 + "vw";
    var colors = ["#7b6cf0", "#ffdd57", "#a78bfa", "#5de89a", "#ff7070", "#ffffff"];
    var color = colors[Math.floor(Math.random() * colors.length)];
    p.style.background = color;
    p.style.boxShadow = "0 0 8px " + color;
    var dur = 0.5 + Math.random() * 0.7;
    p.style.animation = "zwRise " + dur + "s linear forwards";
    document.body.appendChild(p);
    setTimeout(function () { if (p.parentNode) p.remove(); }, dur * 1000 + 60);
  }
  function runZaWarudo(done) {
    if (zwAudio && !zwAudio.paused) return;
    try { zwAudio = new Audio(ZW_AUDIO_URL); } catch (e) { done(); return; }
    function start() {
      document.body.classList.add("zw-active");
      var overlay = document.createElement("div");
      overlay.className = "zw-overlay active"; overlay.id = "zwOverlay";
      document.body.appendChild(overlay);
      document.querySelectorAll("header, .theater, .qside, .abtn, .tp, .logo, .npbar, #npbar").forEach(function (el) { el.classList.add("zw-float"); });
      zwParticleInterval = setInterval(function () { zwSpawnParticle(); zwSpawnParticle(); zwSpawnParticle(); }, 55);
    }
    function stop() {
      document.body.classList.remove("zw-active");
      var overlay = document.getElementById("zwOverlay");
      if (overlay) overlay.remove();
      document.querySelectorAll(".zw-float").forEach(function (el) { el.classList.remove("zw-float"); });
      if (zwParticleInterval) { clearInterval(zwParticleInterval); zwParticleInterval = null; }
      done();
    }
    zwAudio.play().then(function () { zwTimer = setTimeout(start, ZW_DELAY_MS); }).catch(function () { done(); });
    zwAudio.addEventListener("ended", function () { if (zwTimer) clearTimeout(zwTimer); stop(); });
    zwAudio.addEventListener("pause", function () { if (zwAudio && zwAudio.currentTime === 0) { if (zwTimer) clearTimeout(zwTimer); stop(); } });
  }

  function runMatrixRain(done) {
    eggToast("Wake up, Simp...");
    var canvas = document.createElement("canvas");
    canvas.className = "egg-canvas";
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    var chars = "SIMPꓘΞ01アイウエオ$€¥#@%&*";
    var fontSize = 16, cols = Math.floor(canvas.width / fontSize), drops = new Array(cols).fill(1);
    var interval = setInterval(function () {
      ctx.fillStyle = "rgba(10, 10, 15, 0.15)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#5de89a";
      ctx.font = fontSize + "px monospace";
      for (var i = 0; i < drops.length; i++) {
        ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    }, 40);
    setTimeout(function () {
      clearInterval(interval);
      canvas.style.transition = "opacity 0.6s"; canvas.style.opacity = "0";
      setTimeout(function () { if (canvas.parentNode) canvas.remove(); done(); }, 600);
    }, 4000);
  }

  function runDiscoParty(done) {
    eggToast("🪩 MODO DISCO ATIVADO 🪩");
    document.body.classList.add("egg-disco");
    var overlay = document.createElement("div");
    overlay.className = "egg-disco-overlay";
    document.body.appendChild(overlay);
    if (logoEl) logoEl.classList.add("egg-disco-spin");
    var colors = ["#ff5e5e", "#ffdd57", "#5de89a", "#7b6cf0", "#a78bfa", "#ffffff"];
    var confettiInterval = setInterval(function () {
      var p = document.createElement("div");
      p.className = "egg-confetti";
      p.style.width = 6 + Math.random() * 6 + "px";
      p.style.height = 10 + Math.random() * 8 + "px";
      p.style.left = Math.random() * 100 + "vw";
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      var dur = 1.5 + Math.random() * 1.5;
      p.style.animation = "eggConfettiFall " + dur + "s linear forwards";
      document.body.appendChild(p);
      setTimeout(function () { if (p.parentNode) p.remove(); }, dur * 1000 + 60);
    }, 70);
    setTimeout(function () {
      clearInterval(confettiInterval);
      document.body.classList.remove("egg-disco");
      if (logoEl) logoEl.classList.remove("egg-disco-spin");
      if (overlay.parentNode) overlay.remove();
      done();
    }, 4000);
  }

  function runGravityFlip(done) {
    eggToast("🙃 A gravidade sumiu por um instante...");
    document.body.classList.add("egg-flip");
    setTimeout(function () { document.body.classList.remove("egg-flip"); done(); }, 3000);
  }

  function runGlitch(done) {
    eggToast("⚠ FALHA NA TRANSMISSÃO ⚠");
    document.body.classList.add("egg-glitch");
    var overlay = document.createElement("div");
    overlay.className = "egg-glitch-overlay";
    document.body.appendChild(overlay);
    setTimeout(function () {
      document.body.classList.remove("egg-glitch");
      if (overlay.parentNode) overlay.remove();
      done();
    }, 3000);
  }

  var eggs = [
    { key: "zw", run: runZaWarudo }, { key: "matrix", run: runMatrixRain }, { key: "disco", run: runDiscoParty },
    { key: "flip", run: runGravityFlip }, { key: "glitch", run: runGlitch }
  ];
  function pickEgg() {
    var choice;
    do { choice = eggs[Math.floor(Math.random() * eggs.length)]; } while (eggs.length > 1 && choice.key === lastEggKey);
    lastEggKey = choice.key;
    return choice;
  }
  if (logoEl) logoEl.addEventListener("click", function () {
    if (eggActive) return;
    eggActive = true;
    pickEgg().run(function () { eggActive = false; });
  });
})();

connect();
</script>
</body>
</html>`;

const app = express();
app.get("/", (req, res) => res.type("html").send(PAGE));
const server = http.createServer(app);
const wss = new WebSocketServer({
  server,
  verifyClient: ({ origin }) => !origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin),
});
wss.on("connection", (ws) => {
  ws.send(JSON.stringify(snapshot()));
  ws.on("message", (raw) => {
    let m;
    try { m = JSON.parse(raw); } catch (e) { return; }
    if (m && typeof m.type === "string") {
      try { handleAdmin(m); } catch (e) { console.error("Erro em comando da página:", e); }
    }
  });
});

function openBrowser(url) {
  const { exec } = require("child_process");
  const cmd = process.platform === "win32" ? 'start "" "' + url + '"'
    : process.platform === "darwin" ? 'open "' + url + '"'
    : 'xdg-open "' + url + '"';
  exec(cmd, () => {});
}
server.listen(PORT, "127.0.0.1", () => {
  console.log("▶ Simp. rodando em http://localhost:" + PORT + "  (canal #" + CHANNEL + ")");
  startBot();
  if (queue.length) {
    const item = queue[0];
    if (AUDIO_RE.test(item.videoId)) { gifUrl = AUDIO_GIF; }
    else setGif(item.title);
    pushState();
  }
  if (String(process.env.OPEN_BROWSER).toLowerCase() !== "false") openBrowser("http://localhost:" + PORT);
});
