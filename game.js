"use strict";

/* ---------- Fighter roster: body + movement personality + attack gimmick ---------- */
const FIGHTERS = {
  pickaxe: { emoji: "⛏️", face: "😠", name: "PICKAXE", color: "#8ecae6", body: "circle", r: 34,
             dmg: 9, spin: 2.6, len: 50, growth: 5, gim: "crit3",
             gimmick: "3rd hit crits ×2", snd: { freq: 220, type: "square" } },
  angler:  { emoji: "🎣", face: "😏", name: "ANGLER", color: "#90be6d", body: "circle", r: 34,
             dmg: 7, spin: 3.4, len: 58, growth: 4, gim: "hook",
             gimmick: "hook pulls enemy", snd: { freq: 520, type: "triangle" } },
  sword:   { emoji: "🗡️", face: "😎", name: "SWORD", color: "#f9c74f", body: "circle", r: 34,
             dmg: 7, spin: 3.0, len: 52, growth: 5, gim: "combo",
             gimmick: "combo until hit", snd: { freq: 340, type: "sawtooth" } },
  axe:     { emoji: "🪓", face: "🤬", name: "AXE", color: "#f8961e", body: "tri", r: 34,
             dmg: 10, spin: 2.0, len: 46, growth: 6, gim: "rage",
             gimmick: "rage: dmg+speed when hurt", snd: { freq: 150, type: "square" } },
  hammer:  { emoji: "🔨", face: "😤", name: "HAMMER", color: "#adb5bd", body: "square", r: 38,
             dmg: 14, spin: 1.6, len: 44, growth: 7, knockMul: 0.4, gim: "stun",
             gimmick: "stuns; too heavy to knock", snd: { freq: 85, type: "sine" } },
  trident: { emoji: "🔱", face: "🤩", name: "TRIDENT", color: "#b5179e", body: "circle", r: 34,
             dmg: 7, spin: 2.8, len: 60, growth: 4, gim: "heal",
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
             dmg: 6, spin: 2.2, len: 50, growth: 5, gim: "charge",
             gimmick: "charges up while untouched", snd: { freq: 300, type: "square" } },
  knight:  { emoji: "🛡️", face: "😤", name: "KNIGHT", color: "#8d99ae", body: "circle", r: 34,
             dmg: 11, spin: 2.6, len: 48, growth: 6, knockMul: 0.6, gim: "reflect",
             gimmick: "reflects shots at sender", snd: { freq: 250, type: "triangle" } },
  // --- novel-mechanic fighters (ball-fight-shorts inspired) ---
  phantom: { emoji: "🔮", face: "😈", name: "PHANTOM", color: "#7b2cbf", body: "diamond", r: 32,
             dmg: 8, spin: 3.2, len: 50, growth: 5, gim: "blink",
             gimmick: "blinks — teleports around the arena", snd: { freq: 380, type: "sine" } },
  frost:   { emoji: "❄️", face: "🥶", name: "FROST", color: "#4cc9f0", body: "circle", r: 32,
             attack: "frost", dmg: 5, rate: 1.8,
             gimmick: "ice shards — hits slow the enemy", snd: { freq: 640, type: "sine" } },
  boomer:  { emoji: "🪃", face: "🤠", name: "BOOMERANG", color: "#f4a259", body: "circle", r: 32,
             attack: "boomerang", dmg: 7, rate: 2.0,
             gimmick: "throws that curve back — hits both ways", snd: { freq: 300, type: "triangle" } },
  vampire: { emoji: "🦇", face: "🧛", name: "VAMPIRE", color: "#9d0208", body: "diamond", r: 32,
             attack: "bat", dmg: 6, rate: 1.9,
             gimmick: "bats that heal it for a share of the hit", snd: { freq: 210, type: "sawtooth" } },
};
const FIGHTER_KEYS = Object.keys(FIGHTERS);
const MAX_LEN = 110;
// distinct ring colors for battle royale (index 0/1 also used for 1v1 = red/blue)
const SIDE_COLORS = ["#ff5d5d", "#5da9ff", "#ffd166", "#06d6a0", "#c77dff", "#fb8500"];
const UINT32 = 0x100000000; // 2^32 — full uint32 range for seed/RNG normalization
// --- novel-mechanic tuning (phantom/frost/boomerang/vampire) ---
const SLOW_FACTOR = 0.45;      // frost 에 맞은 대상의 이동속도 배수
const FROST_SLOW_SEC = 1.5;    // 감속 지속시간(초)
const BAT_LIFESTEAL = 0.6;     // vampire 가 가한 피해 중 회복 비율
const BLINK_INTERVAL = 3.4;    // phantom 순간이동 기본 주기(초)
const BOOMERANG_RETURN = 0.55; // 이 시간 뒤 부메랑이 주인에게 되돌아온다
const BOOMERANG_PULL = 950;    // 되돌아오는 조향력
// --- combat tuning ---
const IFRAMES_HIT = 0.85;      // 피격 후 무적시간(초) — 전투 템포를 좌우한다
const IFRAMES_SHURIKEN = 0.4;  // 수리검은 연사라 무적시간이 짧다
const IFRAMES_SHOT = 0.8;
const KNOCK_MELEE = 390;       // 근접 타격 기본 넉백
const CHARGE_RATE = 0.28;      // 초당 충전량 (1.0 = 만충)
const CHARGE_MAX_BONUS = 2.4;  // 만충 시 추가 데미지 배수
const POWER_CAP = 8;           // 투척무기 성장 상한

/* ---------- Gimmicks: data-driven so custom fighters can pick one ----------
   onHit(atk, def, c) tweaks the hit context c = { dmg, crit, knock, pull }.
   Passive ids (charge/reflect/blink) are read directly where they apply.     */
const GIMMICKS = {
  none:   { label: "None", desc: "no special effect" },
  crit3:  { label: "Triple Crit", desc: "every 3rd hit deals ×2",
            onHit(atk, def, c) {
              atk.hitCount++;
              if (atk.hitCount % 3 !== 0) return;
              c.dmg *= 2; c.crit = true;
              addFloat(def.x, def.y - def.r - 26, "CRIT!", "#ffcc33", true);
            } },
  combo:  { label: "Combo", desc: "damage stacks until you get hit",
            onHit(atk, def, c) {
              c.dmg += atk.combo * 4;
              if (atk.combo >= 1) addFloat(atk.x, atk.y - atk.r - 26, "COMBO ×" + (atk.combo + 1), "#f9c74f", atk.combo >= 3);
              atk.combo = Math.min(atk.combo + 1, 4);
            } },
  rage:   { label: "Rage", desc: "hits harder and moves faster when hurt",
            onHit(atk, def, c) {
              const rage = 1 + (1 - atk.hp / atk.maxHp) * 0.8;
              c.dmg = Math.round(c.dmg * rage);
              if (rage >= 1.4) addFloat(atk.x, atk.y - atk.r - 26, "RAGE!", "#f8961e", true);
            } },
  stun:   { label: "Stun", desc: "freezes the enemy weapon on hit",
            onHit(atk, def, c) {
              def.stunTimer = 0.7; c.knock = 480;
              addFloat(def.x, def.y - def.r - 26, "STUN!", "#ffffff", true);
            } },
  heal:   { label: "Lifesteal", desc: "heals for part of the damage dealt",
            onHit(atk, def, c) {
              const heal = Math.round(c.dmg * 0.45);
              atk.hp = Math.min(atk.maxHp, atk.hp + heal);
              addFloat(atk.x, atk.y - atk.r - 26, "+" + heal, "#7ae582", false);
            } },
  hook:   { label: "Hook", desc: "drags the enemy in instead of away",
            onHit(atk, def, c) {
              c.pull = true; c.knock = 400;
              addFloat(def.x, def.y - def.r - 26, "HOOKED!", "#90be6d", true);
            } },
  charge: { label: "Charge", desc: "powers up while untouched, resets when hit",
            onHit(atk, def, c) {
              c.dmg = Math.round(c.dmg * (1 + atk.charge * CHARGE_MAX_BONUS));
              if (atk.charge <= 0.6) return;
              c.crit = true;
              addFloat(atk.x, atk.y - atk.r - 26, "CHARGED!", "#3a86ff", true);
            } },
  reflect: { label: "Reflect", desc: "bounces incoming shots back at the sender" },
  blink:  { label: "Blink", desc: "teleports around the arena" },
};
const GIMMICK_KEYS = Object.keys(GIMMICKS);

/* ---------- Thrown-weapon table: one row per projectile kind ----------
   Straight shots share a lead-aimed spawn; bomb/boomerang flag their own arc. */
const SHOTS = {
  arrow:     { speed: 460, r: 5, life: 3 },
  shuriken:  { speed: 430, r: 6, life: 3, spread: [-0.3, 0, 0.3], spin: true,
               iframes: IFRAMES_SHURIKEN, knock: 70 },
  frost:     { speed: 420, r: 6, life: 3,
               onHit(o, foe) {
                 foe.slowTimer = FROST_SLOW_SEC;
                 addFloat(foe.x, foe.y - foe.r - 26, "SLOW!", "#4cc9f0", true);
               } },
  bat:       { speed: 400, r: 7, life: 3,
               onHit(o, foe, dmg) {
                 if (!o.alive) return;
                 const heal = Math.round(dmg * BAT_LIFESTEAL);
                 o.hp = Math.min(o.maxHp, o.hp + heal);
                 addFloat(o.x, o.y - o.r - 24, "+" + heal, "#ff5d8f", false);
               } },
  boomerang: { speed: 430, r: 8, life: 3.2, curve: true, pointBlank: true },
  bomb:      { lob: true, pointBlank: true },
};

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

/* ---------- Custom fighters: built in the editor, saved locally,
   and carried inside share links so a friend sees the same roster ---------- */
const CUSTOM_STORE = "vsarena_customs";
const CUSTOM_MAX = 12;
const CUSTOM_LINK_MAX = 4000; // refuse absurd payloads from a crafted link
const NAME_MAX = 14;
const BODIES = ["circle", "square", "tri", "diamond"];
const ATTACKS = ["orbit", "spike", "arrow", "shuriken", "bomb", "frost", "bat", "boomerang"];
const CUSTOM_RANGES = { d: [3, 20], s: [1.2, 4], l: [30, 70], w: [0, 10], t: [1.2, 3.2] };
const CUSTOM = {};

const b64 = {
  enc: (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s))),
  dec: (s) => new TextDecoder().decode(Uint8Array.from(atob(s), (c) => c.charCodeAt(0))),
};

// A custom fighter can arrive from anyone's share link, so nothing is trusted:
// ids come from fixed lists, numbers are clamped, text is capped and stripped.
function sanitizeCustom(raw) {
  if (!raw || typeof raw !== "object") return null;
  const txt = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);
  const num = (v, [lo, hi], dflt) => { const n = Number(v); return Number.isFinite(n) ? clamp(n, lo, hi) : dflt; };
  const oneOf = (v, list, dflt) => (list.includes(v) ? v : dflt);
  // strip any existing prefix first so re-sanitizing keeps the id stable
  const id = txt(raw.k, 16).replace(/^c_/, "").replace(/[^a-zA-Z0-9]/g, "");
  return {
    k: "c_" + (id || Math.random().toString(36).slice(2, 8)),
    n: txt(raw.n, NAME_MAX).toUpperCase() || "CUSTOM",
    e: txt(raw.e, 4) || "⭐",
    f: txt(raw.f, 4) || "🙂",
    c: /^#[0-9a-fA-F]{6}$/.test(raw.c) ? raw.c : "#7ae582",
    b: oneOf(raw.b, BODIES, "circle"),
    a: oneOf(raw.a, ATTACKS, "orbit"),
    g: oneOf(raw.g, GIMMICK_KEYS, "none"),
    d: Math.round(num(raw.d, CUSTOM_RANGES.d, 8)),
    s: num(raw.s, CUSTOM_RANGES.s, 2.6),
    l: Math.round(num(raw.l, CUSTOM_RANGES.l, 50)),
    w: Math.round(num(raw.w, CUSTOM_RANGES.w, 5)),
    t: num(raw.t, CUSTOM_RANGES.t, 1.9),
  };
}

// compact record -> the same shape the built-in roster uses, so everything
// downstream (battle, pickers, share links) treats it like any other fighter
function expandCustom(cf) {
  const ranged = cf.a !== "orbit" && cf.a !== "spike";
  const d = {
    emoji: cf.e, face: cf.f, name: cf.n, color: cf.c, body: cf.b, r: 33,
    dmg: cf.d, gim: cf.g, custom: cf,
    gimmick: (GIMMICKS[cf.g] || GIMMICKS.none).desc,
    snd: { freq: clamp(560 - cf.d * 16, 70, 700), type: ranged ? "triangle" : "square" },
  };
  if (cf.a === "spike") Object.assign(d, { attack: "spike", contact: Math.max(3, Math.round(cf.d * 0.5)), spikeGrow: 1, prickCd: 0.72 });
  else if (ranged) Object.assign(d, { attack: cf.a, rate: cf.t });
  else Object.assign(d, { spin: cf.s, len: cf.l, growth: cf.w });
  return d;
}

function registerCustom(cf) { CUSTOM[cf.k] = expandCustom(cf); }
function customRecords() { return Object.values(CUSTOM).map((d) => d.custom); }
function fighterDef(key) { return FIGHTERS[key] || CUSTOM[key]; }
function allKeys() { return [...FIGHTER_KEYS, ...Object.keys(CUSTOM)]; }

function saveCustoms() {
  try { localStorage.setItem(CUSTOM_STORE, JSON.stringify(customRecords())); } catch { /* storage full or blocked */ }
}

function adoptCustoms(list) {
  if (!Array.isArray(list)) return;
  for (const raw of list.slice(0, CUSTOM_MAX)) {
    const cf = sanitizeCustom(raw);
    if (cf) registerCustom(cf);
  }
}

function loadCustoms() {
  try { adoptCustoms(JSON.parse(localStorage.getItem(CUSTOM_STORE) || "[]")); } catch { /* ignore bad store */ }
}

function decodeCustoms(s) {
  if (!s || s.length > CUSTOM_LINK_MAX) return;
  try { adoptCustoms(JSON.parse(b64.dec(s))); } catch { /* ignore bad link */ }
}

// only the customs a battle actually uses ride along in its link
function encodeCustoms(keys) {
  const used = [...new Set(keys)].filter((k) => CUSTOM[k]).map((k) => CUSTOM[k].custom);
  return used.length ? b64.enc(JSON.stringify(used)) : null;
}

function readConfig() {
  const p = new URLSearchParams(location.search);
  loadCustoms();
  decodeCustoms(p.get("cf"));
  const pick = (v, fallback) => (fighterDef(v) ? v : fallback);
  const mode = p.get("mode") === "br" ? "br" : "duel";
  let roster = (p.get("roster") || "").split(",").filter((k) => fighterDef(k));
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
const RANGED_ATTACKS = new Set(["arrow", "shuriken", "bomb", "frost", "boomerang", "bat"]);
function isRanged(f) { return RANGED_ATTACKS.has(f.w.attack || "orbit"); }
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
    const w = fighterDef(key);
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
    this.blinkTimer = BLINK_INTERVAL; // phantom: time to next teleport
    this.slowTimer = 0;    // frost victim: reduced movement while > 0
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
    if (this.w.gim === "charge") {
      // charger powers up while it isn't taking hits (reset happens on damage)
      this.charge = Math.min(1, this.charge + dt * CHARGE_RATE);
    }
    if (this.key === "axe") {
      speedTarget *= 1 + (1 - this.hp / this.maxHp) * 0.5; // rage: faster when hurt
    }
    if (this.slowTimer > 0) speedTarget *= SLOW_FACTOR; // frost: chilled and sluggish
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

    if (this.w.gim === "blink") {
      // phantom: periodically vanish and reappear somewhere random (novel movement)
      this.blinkTimer -= dt;
      if (this.blinkTimer <= 0) {
        this.blinkTimer = BLINK_INTERVAL + state.rng() * 1.6;
        blinkPoof(this.x, this.y, this.w.color);
        this.x = AR.l + this.r + state.rng() * (AR.r - AR.l - this.r * 2);
        this.y = AR.t + this.r + state.rng() * (AR.b - AR.t - this.r * 2);
        blinkPoof(this.x, this.y, this.w.color);
        this.iframes = Math.max(this.iframes, 0.2); // brief mercy on arrival
        SFX.whoosh();
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
    this.slowTimer = Math.max(0, this.slowTimer - dt);
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
  const keys = cfg.mode === "br" ? cfg.roster : [cfg.a, cfg.b];
  const params = cfg.mode === "br"
    ? { mode: "br", roster: cfg.roster.join(","), hp: cfg.hp, spd: cfg.spd, seed: cfg.seed }
    : { a: cfg.a, b: cfg.b, hp: cfg.hp, spd: cfg.spd, seed: cfg.seed };
  const cf = encodeCustoms(keys); // homemade fighters travel with the link
  if (cf) params.cf = cf;
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
    const shot = SHOTS[mode];
    if (!shot) continue;
    // shooters can't fire at melee range — but in a royale swarm the lockout is
    // looser so they still contribute instead of just dying. Lobs ignore it.
    const blockRange = state.cfg.mode === "br" ? 60 : 130;
    if (!shot.pointBlank && d < blockRange) {
      me.fireTimer = 0.4;
      continue;
    }
    me.fireTimer = me.w.rate;
    const jitter = () => (state.rng() - 0.5) * 0.5; // imperfect aim — misses happen
    if (shot.lob) {
      // arcs toward where the enemy is heading, then falls under gravity
      const t = Math.max(0.45, d / 330);
      const tx = foe.x + foe.vx * t * 0.5 + jitter() * 260;
      const ty = foe.y + foe.vy * t * 0.5 + jitter() * 260;
      state.projectiles.push({ kind: mode, owner: me, x: me.x, y: me.y - me.r,
        vx: (tx - me.x) / t, vy: (ty - me.y) / t - 160, g: 520, fuse: 1.15, r: 9 * scale, life: 5 });
    } else {
      const sp = shot.speed, t = d / sp;
      // curved throws fly straight at the target; the rest lead it
      const base = shot.curve
        ? Math.atan2(dy, dx) + jitter() * 0.4
        : Math.atan2(foe.y + foe.vy * t * 0.7 - me.y, foe.x + foe.vx * t * 0.7 - me.x) + jitter();
      for (const off of shot.spread || [0]) {
        const a = base + off;
        const proj = { kind: mode, owner: me, x: me.x + Math.cos(a) * (me.r + 8),
          y: me.y + Math.sin(a) * (me.r + 8), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          r: shot.r * scale, life: shot.life };
        if (shot.spin || shot.curve) proj.spin = 0;
        if (shot.curve) proj.age = 0;
        state.projectiles.push(proj);
      }
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
    burst(f.x, f.y, { n: 22, color: f.w.color, spMin: 80, spRand: 200, lifeMin: 0.4, lifeRand: 0.3, vy: 60 });
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

/* Spray of particles — the one place that makes them.
   Draws rng() in a fixed order (angle, speed, life) so seeds stay reproducible;
   `ring` lays particles out evenly instead and skips the angle draw. */
function burst(x, y, o) {
  for (let i = 0; i < o.n; i++) {
    const a = o.ring ? (i / o.n) * Math.PI * 2 : state.rng() * Math.PI * 2;
    const sp = o.spMin + state.rng() * o.spRand;
    const life = o.lifeMin + state.rng() * o.lifeRand;
    state.particles.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - (o.vy || 0),
      life,
      color: typeof o.color === "function" ? o.color(i) : o.color,
    });
  }
}

// phantom teleport puff — a ring of particles at a blink point
function blinkPoof(x, y, color) {
  burst(x, y, { n: 12, ring: true, color, spMin: 90, spRand: 120, lifeMin: 0.3, lifeRand: 0.2 });
}

// any hit that lands resets a charger's build-up
function breakCharge(f) { if (f.w.gim === "charge") f.charge = 0; }

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
  burst(v.x, v.y, { n: 8, color: v.w.color, spMin: 60, spRand: 140, lifeMin: 0.35, lifeRand: 0.25, vy: 50 });
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
    if (p.kind === "boomerang") {
      p.age += dt; p.spin += dt * 20;
      if (p.age > BOOMERANG_RETURN && p.owner && p.owner.alive) {
        const ax = p.owner.x - p.x, ay = p.owner.y - p.y, ad = Math.hypot(ax, ay) || 1;
        const spB = Math.hypot(p.vx, p.vy) || 1;
        p.vx += (ax / ad) * BOOMERANG_PULL * dt;
        p.vy += (ay / ad) * BOOMERANG_PULL * dt;
        const ns = Math.hypot(p.vx, p.vy) || 1;
        p.vx = p.vx / ns * spB; p.vy = p.vy / ns * spB;
      }
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.kind === "shuriken") p.spin += dt * 16;
    const foe = projectileTarget(p);
    let dead = false;
    // KNIGHT reflects incoming shots straight back at whoever fired them
    if (foe && foe.w.gim === "reflect" && foe.stunTimer <= 0 && p.owner !== foe && !p.reflected) {
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
        burst(p.x, p.y, { n: 7, color: "#a8dadc", spMin: 70, spRand: 130, lifeMin: 0.3, lifeRand: 0.2, vy: 40 });
        alive.push(p);
        continue;
      }
    }
    // a nearby spinning weapon acts as a shield: deflect shots, bat bombs back
    if (foe && (foe.w.attack || "orbit") === "orbit" && foe.w.gim !== "reflect" && foe.stunTimer <= 0) {
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
        burst(p.x, p.y, { n: 5, color: "#e8eaf6", spMin: 60, spRand: 120, lifeMin: 0.3, lifeRand: 0.2, vy: 40 });
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
      const hit = foe && Math.hypot(foe.x - p.x, foe.y - p.y) < foe.r + p.r;
      const oob = p.x < AR.l || p.x > AR.r || p.y < AR.t || p.y > AR.b;
      if (hit) { projectileHit(p, foe); dead = true; }
      else if (p.kind === "boomerang") {
        // boomerang doesn't die at the wall — it curves back; caught by owner = gone
        if (oob) { p.x = clamp(p.x, AR.l, AR.r); p.y = clamp(p.y, AR.t, AR.b); }
        if (p.age > BOOMERANG_RETURN && p.owner && p.owner.alive &&
            Math.hypot(p.owner.x - p.x, p.owner.y - p.y) < p.owner.r + p.r) dead = true;
      } else if (oob) dead = true;
    }
    if (p.life <= 0) dead = true;
    if (!dead) alive.push(p);
  }
  state.projectiles = alive;
}

// a thrown weapon's raw damage: base + growth from landed hits, scaled by royale
// level. Left unrounded so callers can apply falloff before rounding once.
function thrownDmg(o) {
  return (o.w.dmg + Math.min(4, Math.floor(o.power / 2))) * o.dmgMul;
}

function projectileHit(p, foe) {
  if (foe.iframes > 0) return; // fizzles on an invulnerable target
  if (dodged(foe)) return;
  const o = p.owner;
  const shot = SHOTS[p.kind] || {};
  let dmg = Math.round(thrownDmg(o));
  if (p.reflected) dmg = Math.round(dmg * 1.5); // a reflected shot bites harder
  foe.hp = Math.max(0, foe.hp - dmg);
  foe.combo = 0;
  breakCharge(foe);
  foe.iframes = shot.iframes || IFRAMES_SHOT;
  foe.flash = 1;
  foe.lastAttacker = o;
  addFloat(foe.x + 18, foe.y - 6, "-" + dmg, "#ff8f8f", false);
  const kn = (shot.knock || 90) * (foe.w.knockMul || 1);
  const kd = Math.hypot(p.vx, p.vy) || 1;
  foe.vx += (p.vx / kd) * kn;
  foe.vy += (p.vy / kd) * kn;
  o.power = Math.min(o.power + 1, POWER_CAP); // thrown weapons grow stronger per hit
  if (shot.onHit) shot.onHit(o, foe, dmg);
  state.shake = 6;
  SFX.hit(o.w);
  burst(p.x, p.y, { n: 8, color: foe.w.color, spMin: 50, spRand: 140, lifeMin: 0.35, lifeRand: 0.25, vy: 50 });
}

function explode(p) {
  state.shake = 13;
  SFX.boom();
  addFloat(p.x, p.y - 12, "BOOM!", "#ef476f", true);
  burst(p.x, p.y, { n: 26, spMin: 90, spRand: 240, lifeMin: 0.45, lifeRand: 0.35, vy: 60,
    color: (i) => (i % 3 ? "#f8961e" : "#ffcc33") });
  // the blast catches everyone in range — the owner just takes it lighter
  const o = p.owner;
  const R = 85;
  for (const f of state.fighters) {
    if (!f.alive || f.iframes > 0) continue;
    const d = Math.hypot(f.x - p.x, f.y - p.y);
    if (d > R + f.r) continue;
    if (dodged(f)) continue;
    const fall = 1 - (Math.max(0, d - f.r) / R) * 0.5; // full damage center, half at edge
    let dmg = Math.round(thrownDmg(o) * fall);
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

  // whatever gimmick this fighter carries shapes the blow
  const c = { dmg: atk.w.dmg, crit: false, knock: KNOCK_MELEE, pull: false };
  const gim = GIMMICKS[atk.w.gim];
  if (gim && gim.onHit) gim.onHit(atk, def, c);

  const dmg = Math.round(c.dmg * atk.dmgMul); // royale level-up multiplier
  const { crit, knock, pull } = c;
  def.hp = Math.max(0, def.hp - dmg);
  def.combo = 0; // taking a hit breaks the sword's combo
  breakCharge(def); // getting hit drains a charger's build-up
  def.iframes = IFRAMES_HIT;
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
  burst(t.x, t.y, { n: crit ? 18 : 10, color: def.w.color, spMin: 60, spRand: 160,
    lifeMin: 0.4, lifeRand: 0.3, vy: 60 });
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
  if (f.w.gim === "charge" && f.charge > 0.05) {
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
    } else if (p.kind === "frost") {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.vy, p.vx));
      ctx.fillStyle = "#a8e8ff";
      ctx.strokeStyle = "#4cc9f0";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(p.r * 1.6, 0); ctx.lineTo(0, -p.r * 0.7);
      ctx.lineTo(-p.r, 0); ctx.lineTo(0, p.r * 0.7);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    } else if (p.kind === "bat") {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.fillStyle = "#141018";
      ctx.beginPath();
      ctx.arc(-p.r * 0.5, 0, p.r * 0.7, 0, Math.PI * 2);
      ctx.arc(p.r * 0.5, 0, p.r * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (p.kind === "boomerang") {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin || 0);
      ctx.strokeStyle = "#f4a259";
      ctx.lineWidth = p.r * 0.7;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-p.r, p.r); ctx.lineTo(0, -p.r); ctx.lineTo(p.r, p.r);
      ctx.stroke();
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
  // rebuilt whenever the custom roster changes, so wipe before filling
  for (const [gridId, side] of [["gridA", "a"], ["gridB", "b"]]) {
    const grid = el(gridId);
    grid.textContent = "";
    for (const key of allKeys()) {
      grid.appendChild(makeChip(key, () => { state.cfg[side] = key; refreshPickers(); }));
    }
  }
  const rg = el("gridRoyale");
  rg.textContent = "";
  for (const key of allKeys()) {
    rg.appendChild(makeChip(key, () => toggleRoster(key)));
  }
}

function makeChip(key, onClick) {
  const w = fighterDef(key);
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
}

function setMode(mode) {
  state.cfg.mode = mode;
  refreshPickers();
}

/* ---------- Fighter editor ---------- */
const ATTACK_LABELS = {
  orbit: "Spinning weapon", spike: "Body spikes (ram)", arrow: "Arrows",
  shuriken: "Shuriken fan", bomb: "Lobbed bombs", frost: "Ice shards",
  bat: "Bats", boomerang: "Boomerang",
};
const BODY_LABELS = { circle: "● Circle", square: "■ Square", tri: "▲ Triangle", diamond: "◆ Diamond" };
let editingKey = null; // which saved fighter the form is editing, if any

function fillSelect(sel, entries) {
  sel.textContent = "";
  for (const [value, label] of entries) {
    const o = document.createElement("option");
    o.value = value;
    o.textContent = label;
    sel.appendChild(o);
  }
}

// read the form into a compact record — sanitizeCustom decides what's legal
function formRecord() {
  return sanitizeCustom({
    k: editingKey ? editingKey.replace(/^c_/, "") : "",
    n: el("edName").value, e: el("edEmoji").value, f: el("edFace").value,
    c: el("edColor").value, b: el("edBody").value, a: el("edAttack").value, g: el("edGim").value,
    d: el("edDmg").value, s: el("edSpin").value, l: el("edLen").value,
    w: el("edGrow").value, t: el("edRate").value,
  });
}

function loadForm(cf) {
  el("edName").value = cf.n === "CUSTOM" ? "" : cf.n;
  el("edEmoji").value = cf.e;
  el("edFace").value = cf.f;
  el("edColor").value = cf.c;
  el("edBody").value = cf.b;
  el("edAttack").value = cf.a;
  el("edGim").value = cf.g;
  el("edDmg").value = cf.d;
  el("edSpin").value = cf.s;
  el("edLen").value = cf.l;
  el("edGrow").value = cf.w;
  el("edRate").value = cf.t;
  refreshEditor();
}

function refreshEditor() {
  const cf = formRecord();
  el("edPrevEmoji").textContent = cf.f + cf.e;
  el("edPrevName").textContent = cf.n;
  el("edPrevGim").textContent = (GIMMICKS[cf.g] || GIMMICKS.none).desc;
  el("edDmgVal").textContent = cf.d;
  el("edSpinVal").textContent = cf.s.toFixed(1);
  el("edLenVal").textContent = cf.l;
  el("edGrowVal").textContent = cf.w;
  el("edRateVal").textContent = cf.t.toFixed(1);
  // spinning weapons and rammers use different stats than shooters
  const melee = cf.a === "orbit";
  el("edMeleeStats").classList.toggle("hidden", !melee);
  el("edRangedStats").classList.toggle("hidden", melee || cf.a === "spike");
  el("edDelete").classList.toggle("hidden", !editingKey);
  // saved fighters, plus a "new" slot
  const row = el("edSaved");
  row.textContent = "";
  for (const rec of customRecords()) {
    const b = document.createElement("button");
    b.className = "saved-chip" + (rec.k === editingKey ? " active" : "");
    b.textContent = rec.f + rec.e + " " + rec.n;
    b.addEventListener("click", () => { editingKey = rec.k; loadForm(rec); });
    row.appendChild(b);
  }
  const nb = document.createElement("button");
  nb.className = "saved-chip" + (editingKey ? "" : " active");
  nb.textContent = "+ New";
  nb.addEventListener("click", () => { editingKey = null; loadForm(sanitizeCustom({})); });
  row.appendChild(nb);
}

function openEditor() {
  el("editor").classList.remove("hidden");
  el("controls").classList.add("hidden");
  el("editor").scrollIntoView({ block: "nearest" });
  editingKey = null;
  loadForm(sanitizeCustom({}));
}

function closeEditor() {
  el("editor").classList.add("hidden");
  el("controls").classList.remove("hidden");
}

function saveFighter() {
  if (!editingKey && customRecords().length >= CUSTOM_MAX) {
    showToast("You can keep " + CUSTOM_MAX + " custom fighters");
    return;
  }
  const cf = formRecord();
  registerCustom(cf);
  saveCustoms();
  editingKey = cf.k;
  buildPickers();
  refreshPickers();
  refreshEditor();
  showToast(cf.n + " saved — pick it in the roster ⚔️");
}

function deleteFighter() {
  if (!editingKey) return;
  const gone = editingKey;
  delete CUSTOM[gone];
  saveCustoms();
  // drop it from any selection so a battle can't reference a missing fighter
  if (state.cfg.a === gone) state.cfg.a = FIGHTER_KEYS[0];
  if (state.cfg.b === gone) state.cfg.b = FIGHTER_KEYS[1];
  state.cfg.roster = state.cfg.roster.filter((k) => k !== gone);
  while (state.cfg.roster.length < 2) state.cfg.roster.push(FIGHTER_KEYS[state.cfg.roster.length]);
  editingKey = null;
  buildPickers();
  refreshPickers();
  loadForm(sanitizeCustom({}));
  showToast("Fighter deleted");
}

function bindEditor() {
  fillSelect(el("edBody"), BODIES.map((b) => [b, BODY_LABELS[b]]));
  fillSelect(el("edAttack"), ATTACKS.map((a) => [a, ATTACK_LABELS[a]]));
  fillSelect(el("edGim"), GIMMICK_KEYS.map((g) => [g, GIMMICKS[g].label]));
  el("btnCreate").addEventListener("click", openEditor);
  el("edClose").addEventListener("click", closeEditor);
  el("edSave").addEventListener("click", saveFighter);
  el("edDelete").addEventListener("click", deleteFighter);
  for (const id of ["edName", "edEmoji", "edFace", "edColor", "edBody", "edAttack", "edGim",
                    "edDmg", "edSpin", "edLen", "edGrow", "edRate"]) {
    el(id).addEventListener("input", refreshEditor);
  }
}

function bindUI() {
  el("hp").addEventListener("input", () => (el("hpVal").textContent = el("hp").value));
  el("spd").addEventListener("input", () => (el("spdVal").textContent = parseFloat(el("spd").value).toFixed(1)));
  el("btnDice").addEventListener("click", () => (el("seed").value = (Math.random() * UINT32) >>> 0));
  el("tabDuel").addEventListener("click", () => setMode("duel"));
  el("tabRoyale").addEventListener("click", () => setMode("br"));
  el("btnRandomRoster").addEventListener("click", () => {
    const n = 3 + Math.floor(Math.random() * 4); // 3..6
    const pool = allKeys();
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
bindEditor();
startBattle({ ...state.cfg, roster: [...state.cfg.roster] });
if (!state.cfg.auto) {
  // fresh visit: show the arena idle with fighters placed, don't auto-run
  state.running = false;
}
requestAnimationFrame((t) => { last = t; loop(t); });
