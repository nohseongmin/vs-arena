"use strict";

/* ---------- Fighter roster: body + movement personality + attack gimmick ---------- */
const FIGHTERS = {
  pickaxe: { emoji: "⛏️", face: "😠", name: "PICKAXE", color: "#8ecae6", body: "circle", r: 34,
             dmg: 9, spin: 2.6, len: 50, growth: 5,
             gimmick: "3rd hit crits ×2", snd: { freq: 220, type: "square" } },
  angler:  { emoji: "🎣", face: "😏", name: "ANGLER", color: "#90be6d", body: "circle", r: 34,
             dmg: 7, spin: 3.4, len: 58, growth: 4,
             gimmick: "hook pulls enemy", snd: { freq: 520, type: "triangle" } },
  sword:   { emoji: "🗡️", face: "😎", name: "SWORD", color: "#f9c74f", body: "circle", r: 34,
             dmg: 7, spin: 3.0, len: 52, growth: 5,
             gimmick: "combo until hit", snd: { freq: 340, type: "sawtooth" } },
  axe:     { emoji: "🪓", face: "🤬", name: "AXE", color: "#f8961e", body: "tri", r: 34,
             dmg: 10, spin: 2.0, len: 46, growth: 6,
             gimmick: "rage: dmg+speed when hurt", snd: { freq: 150, type: "square" } },
  hammer:  { emoji: "🔨", face: "😤", name: "HAMMER", color: "#adb5bd", body: "square", r: 38,
             dmg: 14, spin: 1.6, len: 44, growth: 7, knockMul: 0.4,
             gimmick: "stuns; too heavy to knock", snd: { freq: 85, type: "sine" } },
  trident: { emoji: "🔱", face: "🤩", name: "TRIDENT", color: "#b5179e", body: "circle", r: 34,
             dmg: 7, spin: 2.8, len: 60, growth: 4,
             gimmick: "heals on hit", snd: { freq: 270, type: "triangle" } },
  drunk:   { emoji: "🍾", face: "🥴", name: "DRUNK GUY", color: "#ffb703", body: "circle", r: 32,
             dmg: 8, spin: 2.4, len: 48, growth: 5,
             gimmick: "staggers; dodges hits", snd: { freq: 410, type: "sine" } },
  gravity: { emoji: "🌀", face: "🤯", name: "GRAVITY GUY", color: "#9d4edd", body: "diamond", r: 34,
             dmg: 11, spin: 2.6, len: 50, growth: 5,
             gimmick: "gravity well sucks you in", snd: { freq: 60, type: "sawtooth" } },
  archer:  { emoji: "🏹", face: "🤠", name: "ARCHER", color: "#06d6a0", body: "circle", r: 32,
             attack: "arrow", dmg: 6, rate: 1.7,
             gimmick: "snipes; keeps distance", snd: { freq: 700, type: "triangle" } },
  ninja:   { emoji: "✦", face: "🥷", name: "NINJA", color: "#4a4e69", body: "diamond", r: 30,
             attack: "shuriken", dmg: 5, rate: 2.2, speedMul: 1.15,
             gimmick: "triple shuriken fan", snd: { freq: 460, type: "square" } },
  bomber:  { emoji: "💣", face: "😈", name: "BOMBER", color: "#ef476f", body: "square", r: 34,
             attack: "bomb", dmg: 11, rate: 2.6,
             gimmick: "lobbed bombs go BOOM", snd: { freq: 110, type: "sine" } },
  // --- new mechanical archetypes (beyond melee/ranged) ---
  spiker:  { emoji: "🦔", face: "😡", name: "SPIKER", color: "#e07a5f", body: "circle", r: 34,
             attack: "spike", contact: 4, spikeGrow: 1.0, prickCd: 0.72,
             gimmick: "body spikes; rams & pricks", snd: { freq: 180, type: "sawtooth" } },
  charger: { emoji: "🔋", face: "😑", name: "CHARGER", color: "#3a86ff", body: "square", r: 34,
             dmg: 6, spin: 2.2, len: 50, growth: 5, charge: true,
             gimmick: "charges up while untouched", snd: { freq: 300, type: "square" } },
  knight:  { emoji: "🛡️", face: "😤", name: "KNIGHT", color: "#8d99ae", body: "circle", r: 34,
             dmg: 11, spin: 2.6, len: 48, growth: 6, reflect: true, knockMul: 0.6,
             gimmick: "reflects shots at sender", snd: { freq: 250, type: "triangle" } },
};
const FIGHTER_KEYS = Object.keys(FIGHTERS);
const MAX_LEN = 110;
// distinct ring colors for battle royale (index 0/1 also used for 1v1 = red/blue)
const SIDE_COLORS = ["#ff5d5d", "#5da9ff", "#ffd166", "#06d6a0", "#c77dff", "#fb8500"];
const UINT32 = 0x100000000; // 2^32 — full uint32 range for seed/RNG normalization

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
    whoosh() { blip(120, 0.35, "sawtooth", 0.08, 0.25); },
    miss() { blip(600, 0.07, "triangle", 0.1, 1.4); },
    bounce() { blip(70, 0.04, "sine", 0.05, 0.7); },
    shoot(w) { blip(w.snd.freq, 0.06, w.snd.type, 0.1, 1.6); },
    block() { blip(900, 0.05, "square", 0.08, 0.8); },
    boom() { blip(50, 0.4, "sawtooth", 0.22, 0.4); blip(130, 0.2, "square", 0.14, 0.3); },
    levelup() { [523, 659, 784].forEach((f, i) => setTimeout(() => blip(f, 0.12, "square", 0.13, 1.2), i * 60)); },
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
    return ((t ^ (t >>> 14)) >>> 0) / UINT32;
  };
}

/* ---------- Config (validated from URL) ---------- */
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function readConfig() {
  const p = new URLSearchParams(location.search);
  const pick = (v, fallback) => (FIGHTER_KEYS.includes(v) ? v : fallback);
  const mode = p.get("mode") === "br" ? "br" : "duel";
  let roster = (p.get("roster") || "").split(",").filter((k) => FIGHTER_KEYS.includes(k));
  if (roster.length < 2) roster = ["pickaxe", "hammer", "ninja", "bomber"];
  roster = roster.slice(0, 6);
  return {
    mode,
    a: pick(p.get("a"), "pickaxe"),
    b: pick(p.get("b"), "angler"),
    roster,
    hp: clamp(parseInt(p.get("hp"), 10) || 100, 50, 300),
    spd: clamp(parseFloat(p.get("spd")) || 1, 0.5, 3),
    seed: (parseInt(p.get("seed"), 10) >>> 0) || ((Math.random() * UINT32) >>> 0),
    auto: p.has("a") || p.has("b") || p.has("seed") || p.has("mode"),
  };
}

/* ---------- DOM ---------- */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;
// tight arena box — small field, high hit density
const AR = { l: 44, t: 150, r: W - 44, b: H - 80 };

const el = (id) => document.getElementById(id);
const overlay = el("overlay");
const toast = el("toast");

/* ---------- Game state ---------- */
const state = {
  cfg: readConfig(),
  fighters: [],
  particles: [],
  projectiles: [],
  floats: [],
  shake: 0,
  running: false,
  over: false,
  winner: null,
  time: 0,
};

/* helpers used everywhere once combat can have more than two bodies */
function living() { return state.fighters.filter((f) => f.alive); }
// "melee-like" = fights in close quarters (swings a weapon or rams with spikes),
// as opposed to the ranged shooters. Drives targeting/movement instincts.
function isMelee(f) { const a = f.w.attack || "orbit"; return a === "orbit" || a === "spike"; }
function isRanged(f) { const a = f.w.attack || "orbit"; return a === "arrow" || a === "shuriken" || a === "bomb"; }
function nearestEnemy(f) {
  let best = null, bd = Infinity;
  for (const o of state.fighters) {
    if (o === f || !o.alive) continue;
    const d = Math.hypot(o.x - f.x, o.y - f.y);
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}

class Fighter {
  constructor(key, idx, cfg, rng, total) {
    const w = FIGHTERS[key];
    this.key = key;
    this.w = w;
    this.idx = idx;
    this.sideColor = SIDE_COLORS[idx % SIDE_COLORS.length];
    this.alive = true;
    this.baseR = w.r;
    this.r = w.r;
    // ranged fighters are glass cannons: great in a 1v1 but get dogpiled in a
    // royale. Give them a survivability cushion in royale only so they're viable.
    const ranged = isRanged(this);
    const hpMul = cfg.mode === "br" && ranged ? 1.5 : 1;
    this.hp = Math.round(cfg.hp * hpMul);
    this.maxHp = this.hp;
    this.baseSpeed = 205 * cfg.spd * (w.speedMul || 1);
    if (total <= 2) {
      // 1v1: top vs bottom, matches the original layout
      this.x = AR.l + this.r + rng() * (AR.r - AR.l - this.r * 2);
      const third = (AR.b - AR.t) / 3;
      this.y = idx === 0 ? AR.t + this.r + rng() * third : AR.b - this.r - rng() * third;
    } else {
      // royale: spread around a ring so nobody starts on top of anyone
      const cx = (AR.l + AR.r) / 2, cy = (AR.t + AR.b) / 2;
      const rad = Math.min(AR.r - AR.l, AR.b - AR.t) * 0.34;
      const ang = (idx / total) * Math.PI * 2 + rng() * 0.4;
      this.x = cx + Math.cos(ang) * rad;
      this.y = cy + Math.sin(ang) * rad;
    }
    const ang = rng() * Math.PI * 2;
    this.vx = Math.cos(ang) * this.baseSpeed;
    this.vy = Math.sin(ang) * this.baseSpeed;
    this.wAngle = rng() * Math.PI * 2;
    this.spinDir = rng() < 0.5 ? -1 : 1;
    this.spin = w.spin || 0;
    this.wLen = w.len || 0;
    this.cooldown = 0;
    this.flash = 0;
    // gimmick state
    this.hitCount = 0;    // pickaxe: every 3rd hit crits
    this.combo = 0;       // sword: stacks per landed hit, breaks when hit
    this.stunTimer = 0;   // hammer victim: weapon frozen
    this.iframes = 0;     // post-hit invulnerability — paces the whole fight
    this.jerkTimer = 0;   // drunk: time to next stagger
    this.gravCycle = 0;   // gravity: time since last well
    this.gravActive = 0;  // gravity: well remaining
    this.fireTimer = (w.rate || 1) * 0.6; // ranged: time to next throw
    this.power = 0;       // ranged: grows per landed projectile
    this.charge = 0;      // charger: builds while untouched, resets when hit
    this.spikes = 0;      // spiker: contact damage grows per prick
    this.reflectFlash = 0; // knight: glow after a reflect
    // royale progression
    this.kills = 0;
    this.level = 1;
    this.dmgMul = 1;
    this.lastAttacker = null;
  }

  tip() {
    return {
      x: this.x + Math.cos(this.wAngle) * (this.r + this.wLen),
      y: this.y + Math.sin(this.wAngle) * (this.r + this.wLen),
    };
  }

  update(dt, spd) {
    // movement personality
    let speedTarget = this.baseSpeed;
    const foe = nearestEnemy(this);
    if (isMelee(this) && foe) {
      // melee instinct: drift toward the nearest enemy so kiters can't run forever.
      // the spiker is a rammer, so it charges in harder.
      const drift = this.key === "spiker" ? 210 : 150;
      const dx = foe.x - this.x, dy = foe.y - this.y;
      const d = Math.hypot(dx, dy) || 1;
      this.vx += (dx / d) * drift * dt;
      this.vy += (dy / d) * drift * dt;
    }
    if (this.w.charge) {
      // charger powers up while it isn't taking hits (reset happens on damage)
      this.charge = Math.min(1, this.charge + dt * 0.28);
    }
    if (this.key === "axe") {
      speedTarget *= 1 + (1 - this.hp / this.maxHp) * 0.5; // rage: faster when hurt
    }
    // kiting: shooters back off when an enemy closes in. Archer always kites
    // (its 1v1 identity); ninja only kites in a royale swarm so 1v1 is unchanged.
    const br = state.cfg.mode === "br";
    const kites = this.key === "archer" || (br && this.key === "ninja");
    if (kites && foe) {
      const range = br ? 150 : 110;
      const push = br ? 260 : 140;
      const dx = this.x - foe.x, dy = this.y - foe.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < range) { this.vx += (dx / d) * push * dt; this.vy += (dy / d) * push * dt; }
    }
    if (this.key === "drunk") {
      this.jerkTimer -= dt;
      if (this.jerkTimer <= 0) {
        this.jerkTimer = 0.35 + state.rng() * 0.7;
        const a = (state.rng() * 2 - 1) * 2.2; // stagger: lurch in a random direction
        const c = Math.cos(a), s = Math.sin(a);
        const nvx = this.vx * c - this.vy * s;
        this.vy = this.vx * s + this.vy * c;
        this.vx = nvx;
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    // arena walls
    if (this.x < AR.l + this.r) { this.x = AR.l + this.r; this.vx = Math.abs(this.vx); }
    if (this.x > AR.r - this.r) { this.x = AR.r - this.r; this.vx = -Math.abs(this.vx); }
    if (this.y < AR.t + this.r) { this.y = AR.t + this.r; this.vy = Math.abs(this.vy); }
    if (this.y > AR.b - this.r) { this.y = AR.b - this.r; this.vy = -Math.abs(this.vy); }
    // relax speed back to target after knockbacks
    const sp = Math.hypot(this.vx, this.vy) || 1;
    const k = 1 + (speedTarget / sp - 1) * Math.min(1, dt * 2);
    this.vx *= k; this.vy *= k;

    if (this.stunTimer > 0) {
      this.stunTimer = Math.max(0, this.stunTimer - dt);
    } else {
      this.wAngle += this.spin * this.spinDir * spd * dt;
    }
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.iframes = Math.max(0, this.iframes - dt);
    this.flash = Math.max(0, this.flash - dt * 3);
    this.reflectFlash = Math.max(0, this.reflectFlash - dt * 2);
  }
}

/* ---------- Battle setup ---------- */
function startBattle(cfg) {
  state.cfg = cfg;
  const rng = mulberry32(cfg.seed);
  state.rng = rng;
  const keys = cfg.mode === "br" ? cfg.roster : [cfg.a, cfg.b];
  state.fighters = keys.map((key, i) => new Fighter(key, i, cfg, rng, keys.length));
  state.particles = [];
  state.projectiles = [];
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
  const params = cfg.mode === "br"
    ? { mode: "br", roster: cfg.roster.join(","), hp: cfg.hp, spd: cfg.spd, seed: cfg.seed }
    : { a: cfg.a, b: cfg.b, hp: cfg.hp, spd: cfg.spd, seed: cfg.seed };
  history.replaceState(null, "", location.pathname + "?" + new URLSearchParams(params).toString());
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
  const fl = living();
  for (const f of fl) f.update(dt, spd);
  state.time += dt;

  // gravity guy: periodic well that drags the nearest enemy in
  for (const me of fl) {
    if (me.key !== "gravity") continue;
    me.gravCycle += dt;
    if (me.gravCycle >= 3.2) {
      me.gravCycle = 0;
      me.gravActive = 1.2;
      addFloat(me.x, me.y - me.r - 26, "GRAVITY WELL!", "#c77dff", true);
      SFX.whoosh();
    }
    if (me.gravActive > 0) {
      me.gravActive = Math.max(0, me.gravActive - dt);
      const foe = nearestEnemy(me);
      if (foe) {
        const dx = me.x - foe.x, dy = me.y - foe.y;
        const d = Math.hypot(dx, dy) || 1;
        foe.vx += (dx / d) * 520 * dt;
        foe.vy += (dy / d) * 520 * dt;
      }
    }
  }

  // ranged fighters: throw projectiles at the nearest enemy (with target leading)
  for (const me of fl) {
    const mode = me.w.attack || "orbit";
    if (mode === "orbit") continue;
    me.fireTimer -= dt;
    if (me.fireTimer > 0 || me.stunTimer > 0) continue;
    const foe = nearestEnemy(me);
    if (!foe) continue;
    const scale = 1 + me.power * 0.06;
    const dx = foe.x - me.x, dy = foe.y - me.y;
    const d = Math.hypot(dx, dy) || 1;
    // archers and ninjas can't shoot at melee range — but in a royale swarm the
    // lockout is looser so they can still contribute instead of just dying
    const blockRange = state.cfg.mode === "br" ? 60 : 130;
    if (mode !== "bomb" && d < blockRange) {
      me.fireTimer = 0.4;
      continue;
    }
    me.fireTimer = me.w.rate;
    const jitter = () => (state.rng() - 0.5) * 0.5; // imperfect aim — misses happen
    if (mode === "arrow") {
      const sp = 460, t = d / sp;
      const a = Math.atan2(foe.y + foe.vy * t * 0.7 - me.y, foe.x + foe.vx * t * 0.7 - me.x) + jitter();
      state.projectiles.push({ kind: "arrow", owner: me, x: me.x + Math.cos(a) * (me.r + 8),
        y: me.y + Math.sin(a) * (me.r + 8), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 5 * scale, life: 3 });
    } else if (mode === "shuriken") {
      const sp = 430, t = d / sp;
      const base = Math.atan2(foe.y + foe.vy * t * 0.7 - me.y, foe.x + foe.vx * t * 0.7 - me.x) + jitter();
      for (const off of [-0.3, 0, 0.3]) {
        const a = base + off;
        state.projectiles.push({ kind: "shuriken", owner: me, x: me.x + Math.cos(a) * (me.r + 8),
          y: me.y + Math.sin(a) * (me.r + 8), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 6 * scale, life: 3, spin: 0 });
      }
    } else if (mode === "bomb") {
      const t = Math.max(0.45, d / 330);
      const tx = foe.x + foe.vx * t * 0.5 + jitter() * 260, ty = foe.y + foe.vy * t * 0.5 + jitter() * 260;
      state.projectiles.push({ kind: "bomb", owner: me, x: me.x, y: me.y - me.r,
        vx: (tx - me.x) / t, vy: (ty - me.y) / t - 160, g: 520, fuse: 1.15, r: 9 * scale, life: 5 });
    }
    SFX.shoot(me.w);
  }
  updateProjectiles(dt);

  // body-body elastic bounce for every living pair
  for (let i = 0; i < fl.length; i++) {
    for (let j = i + 1; j < fl.length; j++) {
      const a = fl[i], b = fl[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 1;
      const minDist = a.r + b.r;
      if (dist >= minDist) continue;
      const nx = dx / dist, ny = dy / dist;
      const push = (minDist - dist) / 2;
      a.x -= nx * push; a.y -= ny * push;
      b.x += nx * push; b.y += ny * push;
      const van = a.vx * nx + a.vy * ny;
      const vbn = b.vx * nx + b.vy * ny;
      a.vx += (vbn - van) * nx; a.vy += (vbn - van) * ny;
      b.vx += (van - vbn) * nx; b.vy += (van - vbn) * ny;
      SFX.bounce();
      // spiker arms its own body: bumping into it pricks the other fighter
      if (a.w.attack === "spike") contactHit(a, b);
      if (b.w.attack === "spike") contactHit(b, a);
    }
  }

  // weapon hits: every living fighter can strike every other
  for (const atk of fl) {
    if ((atk.w.attack || "orbit") !== "orbit") continue;
    for (const def of fl) {
      if (def === atk) continue;
      tryHit(atk, def);
    }
  }

  // particles & floating text
  for (const pt of state.particles) {
    pt.x += pt.vx * dt; pt.y += pt.vy * dt;
    pt.vy += 300 * dt;
    pt.life -= dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
  for (const fx of state.floats) { fx.y -= 34 * dt; fx.life -= dt; }
  state.floats = state.floats.filter((f) => f.life > 0);
  state.shake = Math.max(0, state.shake - dt * 30);

  reap();
}

// mark the newly-dead, credit the killer, and end the match when one remains
function reap() {
  if (state.over) return;
  for (const f of state.fighters) {
    if (!f.alive || f.hp > 0) continue;
    f.alive = false;
    addFloat(f.x, f.y - f.r - 20, "OUT!", "#ff5d5d", true);
    for (let i = 0; i < 22; i++) {
      const a = state.rng() * Math.PI * 2;
      const sp = 80 + state.rng() * 200;
      state.particles.push({ x: f.x, y: f.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
        life: 0.4 + state.rng() * 0.3, color: f.w.color });
    }
    const killer = f.lastAttacker;
    if (killer && killer.alive && killer !== f) levelUp(killer);
  }
  const alive = living();
  if (alive.length <= 1) {
    state.over = true;
    state.running = false;
    state.winner = alive[0] || state.winner || state.fighters[state.fighters.length - 1];
    SFX.win();
    setTimeout(showWinner, 600);
  }
}

// killing an enemy in royale makes the victor grow — the snowball that makes it fun
function levelUp(k) {
  k.kills++;
  k.level++;
  k.dmgMul *= 1.15;
  k.maxHp += 25;
  k.hp = Math.min(k.maxHp, k.hp + 40);
  k.r = Math.min(k.baseR + 15, k.r + 3);
  addFloat(k.x, k.y - k.r - 30, "LEVEL UP!", "#ffcc33", true);
  SFX.levelup();
}

function addFloat(x, y, text, color, big) {
  state.floats.push({ x, y, text, color, life: big ? 1.1 : 0.8, big: !!big });
}

// any hit that lands resets a charger's build-up
function breakCharge(f) { if (f.w.charge) f.charge = 0; }

const DRUNK_DODGE_CHANCE = 0.22; // drunk guy's chance to stagger out of the way
// drunk fighter's dodge, centralized. Draws exactly one rng() and only when the
// target is the drunk — identical to the old inline checks, so seeds stay stable.
function dodged(f) {
  if (f.key !== "drunk" || state.rng() >= DRUNK_DODGE_CHANCE) return false;
  addFloat(f.x, f.y - f.r - 26, "MISS!", "#ffd166", true);
  SFX.miss();
  return true;
}

// spiker deals contact damage on body collision; its spikes grow per prick.
// a prick cooldown keeps it from shredding through constant collisions.
function contactHit(spk, v) {
  if (spk.cooldown > 0 || v.iframes > 0) return;
  spk.cooldown = spk.w.prickCd;
  if (dodged(v)) return;
  const dmg = Math.round((spk.w.contact + spk.spikes) * spk.dmgMul);
  v.hp = Math.max(0, v.hp - dmg);
  v.combo = 0;
  v.iframes = 0.85;
  v.flash = 1;
  v.lastAttacker = spk;
  breakCharge(v);
  addFloat(v.x + 18, v.y - 6, "-" + dmg, "#ff8f8f", false);
  const km = v.w.knockMul || 1;
  const dx = v.x - spk.x, dy = v.y - spk.y, kd = Math.hypot(dx, dy) || 1;
  v.vx += (dx / kd) * 300 * km;
  v.vy += (dy / kd) * 300 * km;
  spk.spikes = Math.min(6, spk.spikes + spk.w.spikeGrow); // spikes grow with use
  state.shake = 7;
  SFX.hit(spk.w);
  for (let i = 0; i < 8; i++) {
    const a = state.rng() * Math.PI * 2;
    const sp2 = 60 + state.rng() * 140;
    state.particles.push({ x: v.x, y: v.y, vx: Math.cos(a) * sp2, vy: Math.sin(a) * sp2 - 50,
      life: 0.35 + state.rng() * 0.25, color: v.w.color });
  }
}

/* ---------- Projectiles ---------- */
// find the closest living fighter (other than the owner) a projectile is touching
function projectileTarget(p) {
  let best = null, bd = Infinity;
  for (const f of state.fighters) {
    if (f === p.owner || !f.alive) continue;
    const d = Math.hypot(f.x - p.x, f.y - p.y);
    if (d < bd) { bd = d; best = f; }
  }
  return best;
}

function updateProjectiles(dt) {
  const alive = [];
  for (const p of state.projectiles) {
    if (p.g) { p.vy += p.g * dt; p.fuse -= dt; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.kind === "shuriken") p.spin += dt * 16;
    const foe = projectileTarget(p);
    let dead = false;
    // KNIGHT reflects incoming shots straight back at whoever fired them
    if (foe && foe.w.reflect && foe.stunTimer <= 0 && p.owner !== foe && !p.reflected) {
      if (Math.hypot(foe.x - p.x, foe.y - p.y) < foe.r + 18) {
        const sender = p.owner;
        const tx = sender ? sender.x : foe.x - p.vx;
        const ty = sender ? sender.y : foe.y - p.vy;
        const ang = Math.atan2(ty - foe.y, tx - foe.x);
        const sp = Math.hypot(p.vx, p.vy) * 1.15;
        p.owner = foe;
        p.reflected = true;
        if (p.g) { p.fuse = 1.15; p.vx = Math.cos(ang) * sp; p.vy = Math.sin(ang) * sp - 120; }
        else { p.vx = Math.cos(ang) * sp; p.vy = Math.sin(ang) * sp; }
        p.x = foe.x + Math.cos(ang) * (foe.r + p.r + 2);
        p.y = foe.y + Math.sin(ang) * (foe.r + p.r + 2);
        foe.reflectFlash = 1;
        addFloat(foe.x, foe.y - foe.r - 24, "REFLECT!", "#a8dadc", true);
        SFX.block();
        for (let i = 0; i < 7; i++) {
          const a = state.rng() * Math.PI * 2, sp2 = 70 + state.rng() * 130;
          state.particles.push({ x: p.x, y: p.y, vx: Math.cos(a) * sp2, vy: Math.sin(a) * sp2 - 40,
            life: 0.3 + state.rng() * 0.2, color: "#a8dadc" });
        }
        alive.push(p);
        continue;
      }
    }
    // a nearby spinning weapon acts as a shield: deflect shots, bat bombs back
    if (foe && (foe.w.attack || "orbit") === "orbit" && !foe.w.reflect && foe.stunTimer <= 0) {
      const bx = foe.x + Math.cos(foe.wAngle) * foe.r;
      const by = foe.y + Math.sin(foe.wAngle) * foe.r;
      const tp = foe.tip();
      if (segPointDist(bx, by, tp.x, tp.y, p.x, p.y) < p.r + 12) {
        if (p.kind === "bomb") {
          const d2 = Math.hypot(p.x - foe.x, p.y - foe.y) || 1;
          p.vx = ((p.x - foe.x) / d2) * 430;
          p.vy = ((p.y - foe.y) / d2) * 430 - 80;
        } else {
          dead = true;
        }
        SFX.block();
        for (let i = 0; i < 5; i++) {
          const a = state.rng() * Math.PI * 2;
          const sp2 = 60 + state.rng() * 120;
          state.particles.push({ x: p.x, y: p.y, vx: Math.cos(a) * sp2, vy: Math.sin(a) * sp2 - 40,
            life: 0.3 + state.rng() * 0.2, color: "#e8eaf6" });
        }
      }
    }
    if (dead) continue;
    if (p.kind === "bomb") {
      // bombs bounce around until the fuse runs out (or they touch an enemy)
      if (p.x < AR.l + p.r) { p.x = AR.l + p.r; p.vx = Math.abs(p.vx) * 0.55; }
      if (p.x > AR.r - p.r) { p.x = AR.r - p.r; p.vx = -Math.abs(p.vx) * 0.55; }
      if (p.y > AR.b - p.r) { p.y = AR.b - p.r; p.vy = -Math.abs(p.vy) * 0.5; p.vx *= 0.8; }
      if (p.y < AR.t + p.r) { p.y = AR.t + p.r; p.vy = Math.abs(p.vy); }
      if (p.fuse <= 0 || (foe && Math.hypot(foe.x - p.x, foe.y - p.y) < foe.r + p.r)) {
        explode(p);
        dead = true;
      }
    } else {
      if (p.x < AR.l || p.x > AR.r || p.y < AR.t || p.y > AR.b) dead = true;
      else if (foe && Math.hypot(foe.x - p.x, foe.y - p.y) < foe.r + p.r) {
        projectileHit(p, foe);
        dead = true;
      }
    }
    if (p.life <= 0) dead = true;
    if (!dead) alive.push(p);
  }
  state.projectiles = alive;
}

function projectileHit(p, foe) {
  if (foe.iframes > 0) return; // fizzles on an invulnerable target
  if (dodged(foe)) return;
  const o = p.owner;
  let dmg = Math.round((o.w.dmg + Math.min(4, Math.floor(o.power / 2))) * o.dmgMul);
  if (p.reflected) dmg = Math.round(dmg * 1.5); // a reflected shot bites harder
  foe.hp = Math.max(0, foe.hp - dmg);
  foe.combo = 0;
  breakCharge(foe);
  foe.iframes = p.kind === "shuriken" ? 0.4 : 0.8;
  foe.flash = 1;
  foe.lastAttacker = o;
  addFloat(foe.x + 18, foe.y - 6, "-" + dmg, "#ff8f8f", false);
  const kn = (p.kind === "shuriken" ? 70 : 90) * (foe.w.knockMul || 1);
  const kd = Math.hypot(p.vx, p.vy) || 1;
  foe.vx += (p.vx / kd) * kn;
  foe.vy += (p.vy / kd) * kn;
  o.power = Math.min(o.power + 1, 8); // thrown weapons grow stronger per hit
  state.shake = 6;
  SFX.hit(o.w);
  for (let i = 0; i < 8; i++) {
    const a = state.rng() * Math.PI * 2;
    const sp2 = 50 + state.rng() * 140;
    state.particles.push({ x: p.x, y: p.y, vx: Math.cos(a) * sp2, vy: Math.sin(a) * sp2 - 50,
      life: 0.35 + state.rng() * 0.25, color: foe.w.color });
  }
}

function explode(p) {
  state.shake = 13;
  SFX.boom();
  addFloat(p.x, p.y - 12, "BOOM!", "#ef476f", true);
  for (let i = 0; i < 26; i++) {
    const a = state.rng() * Math.PI * 2;
    const sp2 = 90 + state.rng() * 240;
    state.particles.push({ x: p.x, y: p.y, vx: Math.cos(a) * sp2, vy: Math.sin(a) * sp2 - 60,
      life: 0.45 + state.rng() * 0.35, color: i % 3 ? "#f8961e" : "#ffcc33" });
  }
  // the blast catches everyone in range — the owner just takes it lighter
  const o = p.owner;
  const R = 85;
  for (const f of state.fighters) {
    if (!f.alive || f.iframes > 0) continue;
    const d = Math.hypot(f.x - p.x, f.y - p.y);
    if (d > R + f.r) continue;
    if (dodged(f)) continue;
    const fall = 1 - (Math.max(0, d - f.r) / R) * 0.5; // full damage center, half at edge
    let dmg = Math.round((o.w.dmg + Math.min(4, Math.floor(o.power / 2))) * o.dmgMul * fall);
    if (f === o) dmg = Math.round(dmg * 0.6);
    f.hp = Math.max(0, f.hp - dmg);
    f.combo = 0;
    breakCharge(f);
    f.iframes = 0.8;
    f.flash = 1;
    if (f !== o) { f.lastAttacker = o; o.power = Math.min(o.power + 1, 8); }
    addFloat(f.x + 18, f.y - 6, "-" + dmg, "#ffcc33", true);
    const kd = d || 1;
    const km = f.w.knockMul || 1;
    f.vx += ((f.x - p.x) / kd) * 520 * km;
    f.vy += ((f.y - p.y) / kd) * 520 * km;
  }
}

function tryHit(atk, def) {
  if (atk.cooldown > 0 || atk.stunTimer > 0) return;
  const sx = atk.x + Math.cos(atk.wAngle) * atk.r;
  const sy = atk.y + Math.sin(atk.wAngle) * atk.r;
  const t = atk.tip();
  if (segPointDist(sx, sy, t.x, t.y, def.x, def.y) >= def.r) return;
  if (def.iframes > 0) return; // recently hit — untouchable until recovered

  // drunk guy staggers out of the way
  if (dodged(def)) { atk.cooldown = 0.45; return; }

  /* --- per-fighter attack gimmicks --- */
  let dmg = atk.w.dmg;
  let crit = false;
  let knock = 390;   // push away from weapon tip
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
      dmg += atk.combo * 4;
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
      def.stunTimer = 0.7;
      knock = 480;
      addFloat(def.x, def.y - def.r - 26, "STUN!", "#ffffff", true);
      break;
    case "trident": {
      const heal = Math.round(dmg * 0.45);
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

  if (atk.w.charge) {
    // an untouched charger releases everything it stored into this blow
    dmg = Math.round(dmg * (1 + atk.charge * 2.4));
    if (atk.charge > 0.6) {
      crit = true;
      addFloat(atk.x, atk.y - atk.r - 26, "CHARGED!", "#3a86ff", true);
    }
  }

  dmg = Math.round(dmg * atk.dmgMul); // royale level-up multiplier
  def.hp = Math.max(0, def.hp - dmg);
  def.combo = 0; // taking a hit breaks the sword's combo
  breakCharge(def); // getting hit drains a charger's build-up
  def.iframes = 0.85;
  def.flash = 1;
  def.lastAttacker = atk;
  addFloat(def.x + 18, def.y - 6, "-" + dmg, crit ? "#ffcc33" : "#ff8f8f", crit);

  // knockback: away from weapon tip — or toward the attacker for angler's hook.
  // heavy fighters (hammer) resist being knocked around.
  const km = def.w.knockMul || 1;
  const kx = pull ? atk.x - def.x : def.x - t.x;
  const ky = pull ? atk.y - def.y : def.y - t.y;
  const kd = Math.hypot(kx, ky) || 1;
  def.vx += (kx / kd) * knock * km;
  def.vy += (ky / kd) * knock * km;

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
      color: def.w.color,
    });
  }
}

/* ---------- Rendering ---------- */
function draw() {
  ctx.save();
  if (state.shake > 0) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }
  ctx.clearRect(-12, -12, W + 24, H + 24);

  // backdrop
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#12152a");
  g.addColorStop(1, "#0a0c16");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // arena box
  ctx.fillStyle = "#0d1020";
  roundRectPath(AR.l - 6, AR.t - 6, AR.r - AR.l + 12, AR.b - AR.t + 12, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 204, 51, 0.35)";
  ctx.lineWidth = 3;
  roundRectPath(AR.l - 6, AR.t - 6, AR.r - AR.l + 12, AR.b - AR.t + 12, 18);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  for (let y = AR.t + 40; y < AR.b; y += 44) {
    ctx.beginPath(); ctx.moveTo(AR.l, y); ctx.lineTo(AR.r, y); ctx.stroke();
  }

  drawHud();

  for (const f of state.fighters) if (f.alive) drawFighter(f);
  drawProjectiles();

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
  ctx.fillText("seed " + state.cfg.seed, W - 8, H - 10);
  ctx.restore();
}

function drawHud() {
  if (state.cfg.mode === "br") { drawRoyaleHud(); return; }
  const [f1, f2] = state.fighters;
  const pad = 12, barH = 16, half = (W - pad * 3) / 2;
  ctx.textAlign = "left";
  ctx.font = "700 13px system-ui";
  for (const { f, x } of [{ f: f1, x: pad }, { f: f2, x: pad * 2 + half }]) {
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    roundRectPath(x, 46, half, barH, 8);
    ctx.fill();
    const ratio = f.hp / f.maxHp;
    ctx.fillStyle = f.sideColor;
    if (ratio > 0) { roundRectPath(x, 46, half * ratio, barH, 8); ctx.fill(); }
    ctx.fillStyle = "#e8eaf6";
    ctx.fillText(f.w.face + " " + f.w.name, x, 38);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "600 11px system-ui";
    ctx.fillText(Math.ceil(Math.max(0, f.hp)) + " HP", x, 76);
    ctx.font = "700 13px system-ui";
  }
  ctx.fillStyle = "#ffcc33";
  ctx.font = "900 15px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("VS", W / 2, 60);
}

function drawRoyaleHud() {
  const n = living().length;
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffcc33";
  ctx.font = "900 26px system-ui";
  ctx.fillText(state.over ? "WINNER!" : n + " LEFT", W / 2, 44);
  // compact standings: emoji + hp pip per fighter, sorted by current hp
  const order = [...state.fighters].sort((a, b) => (b.alive - a.alive) || (b.hp - a.hp));
  const cols = order.length, cellW = Math.min(70, (W - 20) / cols), startX = (W - cellW * cols) / 2 + cellW / 2;
  ctx.font = "20px system-ui";
  for (let i = 0; i < order.length; i++) {
    const f = order[i], cx = startX + i * cellW;
    ctx.globalAlpha = f.alive ? 1 : 0.3;
    ctx.fillText(f.w.face + f.w.emoji, cx, 74);
    // hp pip
    const bw = cellW - 16;
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    roundRectPath(cx - bw / 2, 82, bw, 6, 3); ctx.fill();
    ctx.fillStyle = f.alive ? f.sideColor : "#555";
    const r = Math.max(0, f.hp / f.maxHp);
    if (r > 0) { roundRectPath(cx - bw / 2, 82, bw * r, 6, 3); ctx.fill(); }
    if (f.kills > 0) {
      ctx.fillStyle = "#ffcc33";
      ctx.font = "700 10px system-ui";
      ctx.fillText("💀" + f.kills, cx, 102);
      ctx.font = "20px system-ui";
    }
    ctx.globalAlpha = 1;
  }
}

function roundRectPath(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function bodyPath(f) {
  const { x, y, r } = f;
  ctx.beginPath();
  switch (f.w.body) {
    case "square":
      roundRectPath(x - r * 0.92, y - r * 0.92, r * 1.84, r * 1.84, 10);
      break;
    case "tri":
      ctx.moveTo(x, y - r * 1.1);
      ctx.lineTo(x + r, y + r * 0.75);
      ctx.lineTo(x - r, y + r * 0.75);
      ctx.closePath();
      break;
    case "diamond":
      ctx.moveTo(x, y - r * 1.15);
      ctx.lineTo(x + r * 1.15, y);
      ctx.lineTo(x, y + r * 1.15);
      ctx.lineTo(x - r * 1.15, y);
      ctx.closePath();
      break;
    default:
      ctx.arc(x, y, r, 0, Math.PI * 2);
  }
}

function drawFighter(f) {
  // gravity well ring
  if (f.gravActive > 0) {
    const pulse = 1 + Math.sin(state.time * 14) * 0.12;
    ctx.strokeStyle = "rgba(157, 78, 221, 0.55)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(f.x, f.y, (f.r + 22) * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(157, 78, 221, 0.25)";
    ctx.beginPath();
    ctx.arc(f.x, f.y, (f.r + 44) * pulse, 0, Math.PI * 2);
    ctx.stroke();
  }

  // charger: glow ring that brightens as it powers up
  if (f.w.charge && f.charge > 0.05) {
    const pulse = 1 + Math.sin(state.time * 16) * 0.08 * f.charge;
    ctx.strokeStyle = `rgba(58, 134, 255, ${0.25 + f.charge * 0.6})`;
    ctx.lineWidth = 2 + f.charge * 4;
    ctx.beginPath();
    ctx.arc(f.x, f.y, (f.r + 10) * pulse, 0, Math.PI * 2);
    ctx.stroke();
  }
  // knight: shield flash right after a reflect
  if (f.reflectFlash > 0) {
    ctx.strokeStyle = `rgba(168, 218, 220, ${f.reflectFlash})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r + 14, 0, Math.PI * 2);
    ctx.stroke();
  }

  const mode = f.w.attack || "orbit";
  if (mode === "spike") {
    // spiker: the body IS the weapon — draw spikes bristling around it
    const n = 12, len = 9 + f.spikes * 1.4;
    ctx.fillStyle = f.w.color;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + state.time * 0.6 * f.spinDir;
      const bx = f.x + Math.cos(a) * f.r, by = f.y + Math.sin(a) * f.r;
      const tx = f.x + Math.cos(a) * (f.r + len), ty = f.y + Math.sin(a) * (f.r + len);
      const px = Math.cos(a + 0.16) * (f.r - 2), py = Math.sin(a + 0.16) * (f.r - 2);
      const qx = Math.cos(a - 0.16) * (f.r - 2), qy = Math.sin(a - 0.16) * (f.r - 2);
      ctx.beginPath();
      ctx.moveTo(f.x + px, f.y + py);
      ctx.lineTo(tx, ty);
      ctx.lineTo(f.x + qx, f.y + qy);
      ctx.closePath();
      ctx.fill();
    }
  } else if (mode === "orbit") {
    // orbiting weapon: handle + emoji at the tip
    const t = f.tip();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(f.x + Math.cos(f.wAngle) * f.r, f.y + Math.sin(f.wAngle) * f.r);
    ctx.lineTo(t.x, t.y);
    ctx.stroke();

    const size = 22 + f.wLen * 0.3;
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(f.wAngle + Math.PI / 4);
    ctx.font = size + "px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(f.w.emoji, 0, 0);
    ctx.restore();
  } else {
    // ranged: hold the weapon aimed at the nearest enemy
    const foe = nearestEnemy(f);
    const a = foe ? Math.atan2(foe.y - f.y, foe.x - f.x) : 0;
    ctx.save();
    ctx.translate(f.x + Math.cos(a) * (f.r + 14), f.y + Math.sin(a) * (f.r + 14));
    ctx.rotate(a + Math.PI / 4);
    ctx.font = (22 + f.power * 2) + "px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#e8eaf6";
    ctx.fillText(f.w.emoji, 0, 0);
    ctx.restore();
  }

  // body: fighter color fill + side-colored ring
  const grad = ctx.createRadialGradient(f.x - 8, f.y - 10, 4, f.x, f.y, f.r * 1.2);
  grad.addColorStop(0, "#ffffff44");
  grad.addColorStop(1, f.w.color);
  ctx.fillStyle = grad;
  bodyPath(f);
  ctx.fill();
  ctx.strokeStyle = f.sideColor;
  ctx.lineWidth = 3.5;
  bodyPath(f);
  ctx.stroke();
  if (f.flash > 0) {
    ctx.strokeStyle = `rgba(255,255,255,${f.flash})`;
    ctx.lineWidth = 5;
    bodyPath(f);
    ctx.stroke();
  }

  // face
  ctx.font = Math.round(f.r * 1.05) + "px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const wob = f.key === "drunk" ? Math.sin(state.time * 6) * 4 : 0;
  ctx.fillText(f.w.face, f.x + wob, f.y + (f.w.body === "tri" ? 8 : 1));
  ctx.textBaseline = "alphabetic";

  // royale: floating HP bar + level crown above each head
  if (state.cfg.mode === "br") {
    const bw = f.r * 1.8, bx = f.x - bw / 2, by = f.y - f.r - 14;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    roundRectPath(bx, by, bw, 5, 2.5); ctx.fill();
    ctx.fillStyle = f.sideColor;
    const r = Math.max(0, f.hp / f.maxHp);
    if (r > 0) { roundRectPath(bx, by, bw * r, 5, 2.5); ctx.fill(); }
    if (f.level > 1) {
      ctx.font = "700 11px system-ui";
      ctx.fillStyle = "#ffcc33";
      ctx.textAlign = "center";
      ctx.fillText("Lv" + f.level, f.x, by - 4);
    }
  }

  if (f.stunTimer > 0) {
    ctx.font = "20px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("💫", f.x, f.y - f.r - 12);
  }
}

function drawProjectiles() {
  for (const p of state.projectiles) {
    if (p.kind === "arrow") {
      const a = Math.atan2(p.vy, p.vx);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(a);
      ctx.strokeStyle = "#e8eaf6";
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(6, 0); ctx.stroke();
      ctx.fillStyle = "#06d6a0";
      ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(3, -4.5); ctx.lineTo(3, 4.5); ctx.closePath(); ctx.fill();
      ctx.restore();
    } else if (p.kind === "shuriken") {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin);
      ctx.fillStyle = "#cdd3e0";
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        ctx.lineTo(Math.cos(a) * p.r * 1.7, Math.sin(a) * p.r * 1.7);
        ctx.lineTo(Math.cos(a + Math.PI / 4) * p.r * 0.55, Math.sin(a + Math.PI / 4) * p.r * 0.55);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else { // bomb
      ctx.font = Math.round(15 + p.r) + "px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("💣", p.x, p.y);
      ctx.textBaseline = "alphabetic";
      // fuse glow ramps up as it's about to blow
      if (p.fuse < 0.5) {
        ctx.strokeStyle = `rgba(255, 80, 80, ${0.9 - p.fuse})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + 8, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
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
  // 1v1 pickers
  for (const [gridId, side] of [["gridA", "a"], ["gridB", "b"]]) {
    const grid = el(gridId);
    for (const key of FIGHTER_KEYS) {
      grid.appendChild(makeChip(key, () => { state.cfg[side] = key; refreshPickers(); }));
    }
  }
  // royale roster multi-select
  const rg = el("gridRoyale");
  for (const key of FIGHTER_KEYS) {
    rg.appendChild(makeChip(key, () => toggleRoster(key)));
  }
}

function makeChip(key, onClick) {
  const w = FIGHTERS[key];
  const btn = document.createElement("button");
  btn.className = "weapon-btn";
  btn.dataset.key = key;
  const em = document.createElement("span");
  em.className = "emoji";
  em.textContent = w.face + w.emoji;
  const nm = document.createElement("span");
  nm.textContent = w.name;
  const gm = document.createElement("span");
  gm.className = "gimmick";
  gm.textContent = w.gimmick;
  btn.append(em, nm, gm);
  btn.addEventListener("click", onClick);
  return btn;
}

function toggleRoster(key) {
  const r = state.cfg.roster;
  const i = r.indexOf(key);
  if (i >= 0) {
    if (r.length > 2) r.splice(i, 1); // keep at least 2
  } else if (r.length < 6) {
    r.push(key);
  } else {
    showToast("Royale holds 6 fighters max");
    return;
  }
  refreshPickers();
}

function refreshPickers() {
  for (const [gridId, side] of [["gridA", "a"], ["gridB", "b"]]) {
    for (const btn of el(gridId).children) {
      btn.classList.toggle("selected", btn.dataset.key === state.cfg[side]);
    }
  }
  for (const btn of el("gridRoyale").children) {
    const on = state.cfg.roster.includes(btn.dataset.key);
    btn.classList.toggle("selected", on);
    const order = state.cfg.roster.indexOf(btn.dataset.key);
    btn.style.setProperty("--pick-ring", on ? SIDE_COLORS[order % SIDE_COLORS.length] : "transparent");
  }
  el("royaleCount").textContent = state.cfg.roster.length + " fighters";
  el("hp").value = state.cfg.hp;
  el("hpVal").textContent = state.cfg.hp;
  el("spd").value = state.cfg.spd;
  el("spdVal").textContent = state.cfg.spd.toFixed(1);
  el("seed").value = state.cfg.seed;
  // mode visibility
  const br = state.cfg.mode === "br";
  el("duelPickers").classList.toggle("hidden", br);
  el("royalePickers").classList.toggle("hidden", !br);
  el("tabDuel").classList.toggle("active", !br);
  el("tabRoyale").classList.toggle("active", br);
}

function currentConfig() {
  return {
    mode: state.cfg.mode,
    a: state.cfg.a,
    b: state.cfg.b,
    roster: [...state.cfg.roster],
    hp: clamp(parseInt(el("hp").value, 10) || 100, 50, 300),
    spd: clamp(parseFloat(el("spd").value) || 1, 0.5, 3),
    seed: (parseInt(el("seed").value, 10) >>> 0) || 1,
  };
}

function showWinner() {
  const w = state.winner;
  el("winnerEmoji").textContent = w.w.face + w.w.emoji;
  const suffix = state.cfg.mode === "br" && w.kills > 0 ? ` · ${w.kills} 💀` : "";
  el("winnerText").textContent = w.w.name + " WINS!" + suffix;
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

function fight() {
  startBattle(currentConfig());
  if (window.goatcounter && window.goatcounter.count) {
    const label = state.cfg.mode === "br" ? "royale/" + state.cfg.roster.join("-") : "fight/" + state.cfg.a + "-vs-" + state.cfg.b;
    window.goatcounter.count({ path: label, title: "FIGHT", event: true });
  }
}

function setMode(mode) {
  state.cfg.mode = mode;
  refreshPickers();
}

function bindUI() {
  el("hp").addEventListener("input", () => (el("hpVal").textContent = el("hp").value));
  el("spd").addEventListener("input", () => (el("spdVal").textContent = parseFloat(el("spd").value).toFixed(1)));
  el("btnDice").addEventListener("click", () => (el("seed").value = (Math.random() * UINT32) >>> 0));
  el("tabDuel").addEventListener("click", () => setMode("duel"));
  el("tabRoyale").addEventListener("click", () => setMode("br"));
  el("btnRandomRoster").addEventListener("click", () => {
    const n = 3 + Math.floor(Math.random() * 4); // 3..6
    const pool = [...FIGHTER_KEYS];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    state.cfg.roster = pool.slice(0, n);
    refreshPickers();
  });
  el("btnFight").addEventListener("click", fight);
  const muteBtn = el("btnMute");
  muteBtn.textContent = SFX.muted ? "🔇" : "🔊";
  muteBtn.addEventListener("click", () => {
    muteBtn.textContent = SFX.toggle() ? "🔇" : "🔊";
  });
  el("btnShare").addEventListener("click", copyLink);
  el("btnShareOverlay").addEventListener("click", copyLink);
  el("btnReplay").addEventListener("click", () => startBattle(state.cfg));
  el("btnRematch").addEventListener("click", () => {
    const cfg = { ...state.cfg, roster: [...state.cfg.roster], seed: (Math.random() * UINT32) >>> 0 };
    state.cfg = cfg;
    refreshPickers();
    startBattle(cfg);
  });
}

/* ---------- Boot ---------- */
buildPickers();
refreshPickers();
bindUI();
startBattle({ ...state.cfg, roster: [...state.cfg.roster] });
if (!state.cfg.auto) {
  // fresh visit: show the arena idle with fighters placed, don't auto-run
  state.running = false;
}
requestAnimationFrame((t) => { last = t; loop(t); });
