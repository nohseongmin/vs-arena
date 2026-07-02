"use strict";

/* ---------- Weapon roster ---------- */
const WEAPONS = {
  pickaxe: { emoji: "⛏️", name: "PICKAXE", dmg: 13, spin: 2.6, len: 50, growth: 7,
             gimmick: "3rd hit crits ×2",   snd: { freq: 220, type: "square" } },
  angler:  { emoji: "🎣", name: "ANGLER",  dmg: 9,  spin: 3.4, len: 58, growth: 6,
             gimmick: "hook pulls enemy",   snd: { freq: 520, type: "triangle" } },
  sword:   { emoji: "🗡️", name: "SWORD",  dmg: 11, spin: 3.0, len: 52, growth: 7,
             gimmick: "combo until hit",    snd: { freq: 340, type: "sawtooth" } },
  axe:     { emoji: "🪓", name: "AXE",     dmg: 17, spin: 2.0, len: 46, growth: 9,
             gimmick: "rages when hurt",    snd: { freq: 150, type: "square" } },
  hammer:  { emoji: "🔨", name: "HAMMER",  dmg: 20, spin: 1.6, len: 44, growth: 10,
             gimmick: "smash stuns enemy",  snd: { freq: 85,  type: "sine" } },
  trident: { emoji: "🔱", name: "TRIDENT", dmg: 10, spin: 2.8, len: 60, growth: 5,
             gimmick: "heals on hit",       snd: { freq: 270, type: "triangle" } },
};
const WEAPON_KEYS = Object.keys(WEAPONS);
const MAX_LEN = 130;

/* ---------- Sound (procedural WebAudio, no assets) ---------- */
const SFX = (() => {
  let ctx = null;
  let muted = localStorage.getItem("vsarena_muted") === "1";
  function ac() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function blip(freq, dur, type, vol, slide) {
    if (muted || document.hidden) return;
    try {
      const c = ac();
      const o = c.createOscillator(), g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), c.currentTime + dur);
      g.gain.setValueAtTime(vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      o.connect(g).connect(c.destination);
      o.start();
      o.stop(c.currentTime + dur);
    } catch { /* audio not available: keep the sim silent */ }
  }
  return {
    unlock() { if (!muted) try { ac(); } catch {} },
    hit(w) { blip(w.snd.freq, 0.09, w.snd.type, 0.14, 0.45); },
    crit(w) { blip(w.snd.freq * 1.5, 0.14, w.snd.type, 0.2, 0.3); blip(w.snd.freq * 2.2, 0.1, "square", 0.12, 0.6); },
    bounce() { blip(70, 0.04, "sine", 0.05, 0.7); },
    win() { [440, 554, 659, 880].forEach((f, i) => setTimeout(() => blip(f, 0.16, "triangle", 0.16, 1), i * 110)); },
    toggle() {
      muted = !muted;
      localStorage.setItem("vsarena_muted", muted ? "1" : "0");
      return muted;
    },
    get muted() { return muted; },
  };
})();
document.addEventListener("pointerdown", () => SFX.unlock(), { once: true });

/* ---------- Seeded RNG (mulberry32) — same seed, same battle ---------- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- Config (validated from URL) ---------- */
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function readConfig() {
  const p = new URLSearchParams(location.search);
  const pick = (v, fallback) => (WEAPON_KEYS.includes(v) ? v : fallback);
  return {
    a: pick(p.get("a"), "pickaxe"),
    b: pick(p.get("b"), "angler"),
    hp: clamp(parseInt(p.get("hp"), 10) || 100, 50, 300),
    spd: clamp(parseFloat(p.get("spd")) || 1, 0.5, 2),
    seed: (parseInt(p.get("seed"), 10) >>> 0) || ((Math.random() * 4294967296) >>> 0),
    auto: p.has("a") || p.has("b") || p.has("seed"),
  };
}

/* ---------- DOM ---------- */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;
const ARENA_TOP = 96; // space for HP bars

const el = (id) => document.getElementById(id);
const overlay = el("overlay");
const toast = el("toast");

/* ---------- Game state ---------- */
const state = {
  cfg: readConfig(),
  fighters: [],
  particles: [],
  floats: [],
  shake: 0,
  running: false,
  over: false,
  winner: null,
  time: 0,
};

class Fighter {
  constructor(key, side, cfg, rng) {
    const w = WEAPONS[key];
    this.key = key;
    this.w = w;
    this.side = side; // 0 = red (top), 1 = blue (bottom)
    this.color = side === 0 ? "#ff5d5d" : "#5da9ff";
    this.r = 30;
    this.hp = cfg.hp;
    this.maxHp = cfg.hp;
    this.baseSpeed = 205 * cfg.spd;
    this.x = W * (0.3 + rng() * 0.4);
    this.y = side === 0 ? ARENA_TOP + 90 + rng() * 60 : H - 120 - rng() * 60;
    const ang = rng() * Math.PI * 2;
    this.vx = Math.cos(ang) * this.baseSpeed;
    this.vy = Math.sin(ang) * this.baseSpeed;
    this.wAngle = rng() * Math.PI * 2;
    this.spinDir = rng() < 0.5 ? -1 : 1;
    this.spin = w.spin;
    this.wLen = w.len;
    this.cooldown = 0;
    this.flash = 0;
    // gimmick state
    this.hitCount = 0;      // pickaxe: every 3rd hit crits
    this.combo = 0;         // sword: stacks per landed hit, breaks when hit
    this.stunTimer = 0;     // hammer victim: weapon frozen
  }

  tip() {
    return {
      x: this.x + Math.cos(this.wAngle) * (this.r + this.wLen),
      y: this.y + Math.sin(this.wAngle) * (this.r + this.wLen),
    };
  }

  update(dt, spd) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    // walls
    if (this.x < this.r) { this.x = this.r; this.vx = Math.abs(this.vx); }
    if (this.x > W - this.r) { this.x = W - this.r; this.vx = -Math.abs(this.vx); }
    if (this.y < ARENA_TOP + this.r) { this.y = ARENA_TOP + this.r; this.vy = Math.abs(this.vy); }
    if (this.y > H - this.r) { this.y = H - this.r; this.vy = -Math.abs(this.vy); }
    // relax speed back to base after knockbacks
    const sp = Math.hypot(this.vx, this.vy) || 1;
    const target = this.baseSpeed;
    const k = 1 + (target / sp - 1) * Math.min(1, dt * 2);
    this.vx *= k; this.vy *= k;

    if (this.stunTimer > 0) {
      this.stunTimer = Math.max(0, this.stunTimer - dt);
    } else {
      this.wAngle += this.spin * this.spinDir * spd * dt;
    }
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.flash = Math.max(0, this.flash - dt * 3);
  }
}

/* ---------- Battle setup ---------- */
function startBattle(cfg) {
  state.cfg = cfg;
  const rng = mulberry32(cfg.seed);
  state.fighters = [new Fighter(cfg.a, 0, cfg, rng), new Fighter(cfg.b, 1, cfg, rng)];
  state.rng = rng;
  state.particles = [];
  state.floats = [];
  state.shake = 0;
  state.running = true;
  state.over = false;
  state.winner = null;
  state.time = 0;
  overlay.classList.add("hidden");
  syncUrl(cfg);
}

function syncUrl(cfg) {
  const p = new URLSearchParams({ a: cfg.a, b: cfg.b, hp: cfg.hp, spd: cfg.spd, seed: cfg.seed });
  history.replaceState(null, "", location.pathname + "?" + p.toString());
}

/* ---------- Physics ---------- */
function segPointDist(ax, ay, bx, by, px, py) {
  const abx = bx - ax, aby = by - ay;
  const t = clamp(((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby || 1), 0, 1);
  const cx = ax + abx * t, cy = ay + aby * t;
  return Math.hypot(px - cx, py - cy);
}

function step(dt) {
  const spd = state.cfg.spd;
  const [f1, f2] = state.fighters;
  f1.update(dt, spd);
  f2.update(dt, spd);
  state.time += dt;

  // ball-ball elastic bounce
  const dx = f2.x - f1.x, dy = f2.y - f1.y;
  const dist = Math.hypot(dx, dy) || 1;
  const minDist = f1.r + f2.r;
  if (dist < minDist) {
    const nx = dx / dist, ny = dy / dist;
    const push = (minDist - dist) / 2;
    f1.x -= nx * push; f1.y -= ny * push;
    f2.x += nx * push; f2.y += ny * push;
    const v1n = f1.vx * nx + f1.vy * ny;
    const v2n = f2.vx * nx + f2.vy * ny;
    f1.vx += (v2n - v1n) * nx; f1.vy += (v2n - v1n) * ny;
    f2.vx += (v1n - v2n) * nx; f2.vy += (v1n - v2n) * ny;
    SFX.bounce();
  }

  // weapon hits
  tryHit(f1, f2);
  tryHit(f2, f1);

  // particles
  for (const pt of state.particles) {
    pt.x += pt.vx * dt; pt.y += pt.vy * dt;
    pt.vy += 300 * dt;
    pt.life -= dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
  for (const fl of state.floats) { fl.y -= 34 * dt; fl.life -= dt; }
  state.floats = state.floats.filter((f) => f.life > 0);
  state.shake = Math.max(0, state.shake - dt * 30);

  if (!state.over) {
    if (f1.hp <= 0 || f2.hp <= 0) {
      state.over = true;
      state.winner = f1.hp <= 0 ? f2 : f1;
      state.running = false;
      SFX.win();
      setTimeout(showWinner, 600);
    }
  }
}

function addFloat(x, y, text, color, big) {
  state.floats.push({ x, y, text, color, life: big ? 1.1 : 0.8, big: !!big });
}

function tryHit(atk, def) {
  if (atk.cooldown > 0 || atk.stunTimer > 0) return;
  const sx = atk.x + Math.cos(atk.wAngle) * atk.r;
  const sy = atk.y + Math.sin(atk.wAngle) * atk.r;
  const t = atk.tip();
  if (segPointDist(sx, sy, t.x, t.y, def.x, def.y) >= def.r) return;

  /* --- per-weapon gimmicks --- */
  let dmg = atk.w.dmg;
  let crit = false;
  let knock = 320;   // push away from weapon tip
  let pull = false;  // angler reverses knockback

  switch (atk.key) {
    case "pickaxe":
      atk.hitCount++;
      if (atk.hitCount % 3 === 0) {
        dmg *= 2;
        crit = true;
        addFloat(def.x, def.y - def.r - 26, "CRIT!", "#ffcc33", true);
      }
      break;
    case "sword":
      // combo stacks with every landed hit; resets when the sword itself gets hit
      dmg += atk.combo * 3;
      if (atk.combo >= 1) addFloat(atk.x, atk.y - atk.r - 26, "COMBO ×" + (atk.combo + 1), "#f9c74f", atk.combo >= 3);
      atk.combo = Math.min(atk.combo + 1, 4);
      break;
    case "axe": {
      const rage = 1 + (1 - atk.hp / atk.maxHp) * 0.8;
      dmg = Math.round(dmg * rage);
      if (rage >= 1.4) addFloat(atk.x, atk.y - atk.r - 26, "RAGE!", "#f8961e", true);
      break;
    }
    case "hammer":
      def.stunTimer = 0.9;
      knock = 480;
      addFloat(def.x, def.y - def.r - 26, "STUN!", "#ffffff", true);
      break;
    case "trident": {
      const heal = Math.round(dmg * 0.35);
      atk.hp = Math.min(atk.maxHp, atk.hp + heal);
      addFloat(atk.x, atk.y - atk.r - 26, "+" + heal, "#7ae582", false);
      break;
    }
    case "angler":
      pull = true;
      knock = 400;
      addFloat(def.x, def.y - def.r - 26, "HOOKED!", "#90be6d", true);
      break;
  }

  def.hp = Math.max(0, def.hp - dmg);
  def.combo = 0; // taking a hit breaks the sword's combo
  def.flash = 1;
  atk.cooldown = 0.35;
  addFloat(def.x + 18, def.y - 6, "-" + dmg, crit ? "#ffcc33" : "#ff8f8f", crit);

  // knockback: away from weapon tip — or toward the attacker for angler's hook
  const kx = pull ? atk.x - def.x : def.x - t.x;
  const ky = pull ? atk.y - def.y : def.y - t.y;
  const kd = Math.hypot(kx, ky) || 1;
  def.vx += (kx / kd) * knock;
  def.vy += (ky / kd) * knock;

  // the meme mechanic: weapon grows on every hit
  atk.wLen = Math.min(MAX_LEN, atk.wLen + atk.w.growth);
  atk.spin = Math.min(atk.spin * 1.03, atk.w.spin * 1.8);
  state.shake = crit ? 11 : 7;
  if (crit) SFX.crit(atk.w); else SFX.hit(atk.w);
  const burst = crit ? 18 : 10;
  for (let i = 0; i < burst; i++) {
    const a = state.rng() * Math.PI * 2;
    const sp2 = 60 + state.rng() * 160;
    state.particles.push({
      x: t.x, y: t.y,
      vx: Math.cos(a) * sp2, vy: Math.sin(a) * sp2 - 60,
      life: 0.4 + state.rng() * 0.3,
      color: def.color,
    });
  }
}

/* ---------- Rendering ---------- */
function draw() {
  ctx.save();
  if (state.shake > 0) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }
  ctx.clearRect(-10, -10, W + 20, H + 20);

  // arena background
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#12152a");
  g.addColorStop(1, "#0a0c16");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  for (let y = ARENA_TOP; y < H; y += 48) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  drawHpBars();

  for (const f of state.fighters) drawFighter(f);

  for (const pt of state.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / 0.6);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // floating combat text
  for (const fl of state.floats) {
    ctx.globalAlpha = Math.min(1, fl.life * 2);
    ctx.font = (fl.big ? "900 22px" : "700 15px") + " system-ui";
    ctx.textAlign = "center";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.strokeText(fl.text, fl.x, fl.y);
    ctx.fillStyle = fl.color;
    ctx.fillText(fl.text, fl.x, fl.y);
  }
  ctx.globalAlpha = 1;

  // seed tag
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.font = "11px monospace";
  ctx.textAlign = "right";
  ctx.fillText("seed " + state.cfg.seed, W - 8, H - 8);
  ctx.restore();
}

function drawHpBars() {
  const [f1, f2] = state.fighters;
  const pad = 12, barH = 16, half = (W - pad * 3) / 2;
  ctx.textAlign = "left";
  ctx.font = "700 13px system-ui";

  const bars = [
    { f: f1, x: pad, align: "left" },
    { f: f2, x: pad * 2 + half, align: "right" },
  ];
  for (const { f, x } of bars) {
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    roundRect(x, 40, half, barH, 8);
    ctx.fill();
    const ratio = f.hp / f.maxHp;
    ctx.fillStyle = f.color;
    if (ratio > 0) { roundRect(x, 40, half * ratio, barH, 8); ctx.fill(); }
    ctx.fillStyle = "#e8eaf6";
    ctx.fillText(f.w.emoji + " " + f.w.name, x, 32);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "600 11px system-ui";
    ctx.fillText(Math.ceil(f.hp) + " HP", x, 70);
    ctx.font = "700 13px system-ui";
  }
  ctx.fillStyle = "#ffcc33";
  ctx.font = "900 15px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("VS", W / 2, 54);
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFighter(f) {
  // handle line
  const t = f.tip();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(f.x + Math.cos(f.wAngle) * f.r, f.y + Math.sin(f.wAngle) * f.r);
  ctx.lineTo(t.x, t.y);
  ctx.stroke();

  // weapon emoji at tip
  const size = 22 + f.wLen * 0.28;
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.rotate(f.wAngle + Math.PI / 4);
  ctx.font = size + "px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(f.w.emoji, 0, 0);
  ctx.restore();

  // ball
  const grad = ctx.createRadialGradient(f.x - 8, f.y - 10, 4, f.x, f.y, f.r);
  grad.addColorStop(0, "#ffffff33");
  grad.addColorStop(1, f.color);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
  ctx.fill();
  if (f.flash > 0) {
    ctx.strokeStyle = `rgba(255,255,255,${f.flash})`;
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  if (f.stunTimer > 0) {
    ctx.font = "20px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("💫", f.x, f.y - f.r - 10);
  }
}

/* ---------- Main loop (fixed timestep = deterministic) ---------- */
const DT = 1 / 60;
let last = performance.now(), acc = 0;
function tick(now) {
  acc += Math.min(0.1, (now - last) / 1000);
  last = now;
  while (acc >= DT) {
    if (state.running) step(DT);
    acc -= DT;
  }
  draw();
}
function loop(now) {
  tick(now);
  requestAnimationFrame(loop);
}
// rAF stops in hidden tabs; keep the sim alive at 30fps so shared battles
// still progress while the viewer is on another tab
setInterval(() => {
  if (document.hidden) tick(performance.now());
}, 33);

/* ---------- UI ---------- */
function buildPickers() {
  for (const [gridId, side] of [["gridA", "a"], ["gridB", "b"]]) {
    const grid = el(gridId);
    for (const key of WEAPON_KEYS) {
      const w = WEAPONS[key];
      const btn = document.createElement("button");
      btn.className = "weapon-btn";
      btn.dataset.key = key;
      const em = document.createElement("span");
      em.className = "emoji";
      em.textContent = w.emoji;
      const nm = document.createElement("span");
      nm.textContent = w.name;
      const gm = document.createElement("span");
      gm.className = "gimmick";
      gm.textContent = w.gimmick;
      btn.append(em, nm, gm);
      btn.addEventListener("click", () => {
        state.cfg[side] = key;
        refreshPickers();
      });
      grid.appendChild(btn);
    }
  }
}

function refreshPickers() {
  for (const [gridId, side] of [["gridA", "a"], ["gridB", "b"]]) {
    for (const btn of el(gridId).children) {
      btn.classList.toggle("selected", btn.dataset.key === state.cfg[side]);
    }
  }
  el("hp").value = state.cfg.hp;
  el("hpVal").textContent = state.cfg.hp;
  el("spd").value = state.cfg.spd;
  el("spdVal").textContent = state.cfg.spd.toFixed(1);
  el("seed").value = state.cfg.seed;
}

function currentConfig() {
  return {
    a: state.cfg.a,
    b: state.cfg.b,
    hp: clamp(parseInt(el("hp").value, 10) || 100, 50, 300),
    spd: clamp(parseFloat(el("spd").value) || 1, 0.5, 2),
    seed: (parseInt(el("seed").value, 10) >>> 0) || 1,
  };
}

function showWinner() {
  const w = state.winner;
  el("winnerEmoji").textContent = w.w.emoji;
  el("winnerText").textContent = w.w.name + " WINS!";
  overlay.classList.remove("hidden");
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.add("hidden"), 1800);
}

async function copyLink() {
  syncUrl(state.cfg);
  const url = location.href;
  try {
    await navigator.clipboard.writeText(url);
    showToast("Link copied! Same seed = same battle 🔗");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    showToast("Link copied! 🔗");
  }
}

function bindUI() {
  el("hp").addEventListener("input", () => (el("hpVal").textContent = el("hp").value));
  el("spd").addEventListener("input", () => (el("spdVal").textContent = parseFloat(el("spd").value).toFixed(1)));
  el("btnDice").addEventListener("click", () => (el("seed").value = (Math.random() * 4294967296) >>> 0));
  el("btnFight").addEventListener("click", () => {
    startBattle(currentConfig());
    // analytics: count matchups as events (no-op if GoatCounter isn't loaded)
    if (window.goatcounter && window.goatcounter.count) {
      window.goatcounter.count({ path: "fight/" + state.cfg.a + "-vs-" + state.cfg.b, title: "FIGHT", event: true });
    }
  });
  const muteBtn = el("btnMute");
  muteBtn.textContent = SFX.muted ? "🔇" : "🔊";
  muteBtn.addEventListener("click", () => {
    muteBtn.textContent = SFX.toggle() ? "🔇" : "🔊";
  });
  el("btnShare").addEventListener("click", copyLink);
  el("btnShareOverlay").addEventListener("click", copyLink);
  el("btnReplay").addEventListener("click", () => startBattle(state.cfg));
  el("btnRematch").addEventListener("click", () => {
    const cfg = { ...state.cfg, seed: (Math.random() * 4294967296) >>> 0 };
    refreshPickersAfter(cfg);
    startBattle(cfg);
  });
}

function refreshPickersAfter(cfg) {
  state.cfg = cfg;
  refreshPickers();
}

/* ---------- Boot ---------- */
buildPickers();
refreshPickers();
bindUI();
startBattle({ ...state.cfg });
if (!state.cfg.auto) {
  // fresh visit: show the arena idle with fighters placed, don't auto-run
  state.running = false;
}
requestAnimationFrame((t) => { last = t; loop(t); });
