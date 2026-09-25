"use strict";
/* Stick vs Angler — a playable duel in the style of the ooosimulation shorts.
   You drive the stick; the angler is CPU. Mechanics are modelled on the
   creator's own browser demo: a slow committed charge-swing that sends the
   loser pinballing off the walls, against a hook that ricochets around the
   arena and reels you back along its own zigzag. */

/* ---------- tuning ---------- */
const ARENA = 550;              // square play field, in world units
const R = 45;                   // both fighters are this big
const SPEED = 2.5;              // baseline movement per frame
const PLAYER_HP = 100;
const ANGLER_HP = 300;          // the boss soaks a lot; you have to land swings
const BODY_DMG = 0.7;           // bumping hurts them both a little
const BODY_CD = 5;
const HOOK_HOME_BODY_CD = 15;   // longer breather after the hook reels you in

const CHARGE_FRAMES = 180;      // 3s wind-up — the whole risk of attacking
const SWING_FRAMES = 12;
const SWING_HIT_FRAME = 6;      // the blow lands mid-arc
const SWING_REACH = 165;
const SWING_DMG = 15;
const SWING_LAUNCH = 35;        // knockback speed — this is the spectacle
const SWING_BOUNCES = 7;        // walls to ricochet off before recovering
const SWING_COOLDOWN = 600;     // 10s before you can wind up again
const WALL_DMG = 2;             // per ricochet while airborne

const HOOK_ORBIT = 75;
const HOOK_SPEED = 8;
const HOOK_REEL = 15;
const HOOK_RETRACT = 18;
const HOOK_NODE_DMG = 7;        // damage each time you're yanked round a corner
const HOOK_HOME_DMG = 2;
const HOOK_LIFE = 450;
const HOOK_CD_START = 120;
const HOOK_CD_AFTER = 600;
const HOOK_CD_MISS = 480;

const GAME_SPEED = 1.6;         // whole-sim time scale — keeps a match short enough to finish
const READY_FRAMES = 250;
const HITSTOP_SWING = 25;       // freeze frames sell the impact
const HITSTOP_HEAVY = 15;
const HITSTOP_LIGHT = 10;

const COL = {
  player: "#22CC44", playerDark: "#147A28",
  angler: "#88CCFF", anglerDark: "#4488CC",
  charge: "#B040FF", hook: "#FF4444", wall: "#FF5555",
};

/* ---------- canvas ---------- */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const el = (id) => document.getElementById(id);

/* ---------- audio: synthesised, no asset files ---------- */
const SFX = (() => {
  let ac = null, muted = localStorage.getItem("ooo_muted") === "1";
  let chargeOsc = null, chargeGain = null;
  const ctxOf = () => {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === "suspended") ac.resume();
    return ac;
  };
  function tone(f1, f2, dur, type, vol) {
    if (muted) return;
    try {
      const c = ctxOf(), o = c.createOscillator(), g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f1, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), c.currentTime + dur);
      g.gain.setValueAtTime(vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      o.connect(g).connect(c.destination);
      o.start();
      o.stop(c.currentTime + dur);
    } catch { /* audio unavailable — stay silent */ }
  }
  return {
    unlock() { if (!muted) try { ctxOf(); } catch {} },
    // rising whine that tracks the wind-up, so you hear the swing coming
    chargeStart() {
      if (muted || chargeOsc) return;
      try {
        const c = ctxOf();
        chargeOsc = c.createOscillator();
        chargeGain = c.createGain();
        chargeOsc.type = "sawtooth";
        chargeOsc.frequency.setValueAtTime(90, c.currentTime);
        chargeOsc.frequency.linearRampToValueAtTime(760, c.currentTime + CHARGE_FRAMES / (60 * GAME_SPEED));
        chargeGain.gain.setValueAtTime(0.0001, c.currentTime);
        chargeGain.gain.linearRampToValueAtTime(0.09, c.currentTime + CHARGE_FRAMES / (60 * GAME_SPEED));
        chargeOsc.connect(chargeGain).connect(c.destination);
        chargeOsc.start();
      } catch { chargeOsc = null; }
    },
    chargeStop() {
      if (!chargeOsc) return;
      try { chargeOsc.stop(); } catch {}
      chargeOsc = null; chargeGain = null;
    },
    swing() { tone(700, 180, 0.16, "sawtooth", 0.1); },
    hit() { tone(340, 60, 0.22, "square", 0.18); tone(70, 40, 0.3, "sine", 0.26); },
    heavy() { tone(180, 45, 0.3, "square", 0.2); tone(55, 30, 0.4, "sine", 0.3); },
    bounce() { tone(220, 120, 0.06, "triangle", 0.08); },
    cast() { tone(520, 900, 0.12, "triangle", 0.09); },
    ready() { tone(440, 440, 0.12, "square", 0.1); },
    fight() { [523, 784].forEach((f, i) => setTimeout(() => tone(f, f, 0.18, "square", 0.14), i * 130)); },
    win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, f, 0.2, "triangle", 0.15), i * 120)); },
    lose() { [400, 300, 200].forEach((f, i) => setTimeout(() => tone(f, f * 0.7, 0.35, "sawtooth", 0.14), i * 180)); },
    toggle() {
      muted = !muted;
      localStorage.setItem("ooo_muted", muted ? "1" : "0");
      if (muted) this.chargeStop();
      return muted;
    },
    get muted() { return muted; },
  };
})();

/* ---------- state ---------- */
const keys = { w: false, a: false, s: false, d: false };
let player, angler, particles, trails;
let frame, hitStop, bodyCd, readyTimer, started, over, won, clearMs, awards;

class Fighter {
  constructor(x, y, isAngler) {
    this.x = x; this.y = y;
    this.isAngler = isAngler;
    this.r = R;
    this.hp = this.maxHp = isAngler ? ANGLER_HP : PLAYER_HP;
    this.dx = 0; this.dy = 0;
    this.angle = 0;
    this.aim = 0;
    this.dead = false;
    this.knocked = false;
    this.bounces = 0;
    // stick
    this.stick = "idle";
    this.timer = 0;
    this.offset = Math.PI / 4;
    this.wantAttack = false;
    if (isAngler) {
      this.hookAngle = Math.random() * Math.PI * 2;
      this.hook = { state: 0, x, y, dx: 0, dy: 0, path: [], pause: 0, life: 0, cd: HOOK_CD_START };
    }
  }
  get chargeRatio() { return this.stick === "charging" ? this.timer / CHARGE_FRAMES : 0; }
}

function reset() {
  player = new Fighter(100, 275, false);
  angler = new Fighter(450, 275, true);
  // stagger their starting lanes so no two rounds open the same way
  const yOff = (Math.random() - 0.5) * 350;
  const a = (Math.random() - 0.5) * Math.PI * 0.8;
  player.y = 275 + yOff;
  angler.y = 275 - yOff;
  player.angle = a;
  angler.angle = a + Math.PI;
  angler.dx = Math.cos(angler.angle) * SPEED;
  angler.dy = Math.sin(angler.angle) * SPEED;

  particles = []; trails = [];
  frame = 0; hitStop = 0; bodyCd = 0;
  readyTimer = READY_FRAMES;
  over = false; won = false; clearMs = 0; awards = [];
  keys.w = keys.a = keys.s = keys.d = false;
  SFX.chargeStop();
  SFX.ready();
  el("overlay").classList.add("hidden");
}

/* ---------- effects ---------- */
function spark(x, y, color, scale = 1) {
  const n = Math.round(10 * scale);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = (1 + Math.random() * 4) * scale;
    particles.push({ x, y, dx: Math.cos(a) * sp, dy: Math.sin(a) * sp,
      life: 18 + Math.random() * 14, size: 2 + Math.random() * 4 * scale, color });
  }
}
function deathBurst(x, y, color) {
  for (let i = 0; i < 60; i++) {
    const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 9;
    particles.push({ x, y, dx: Math.cos(a) * sp, dy: Math.sin(a) * sp,
      life: 30 + Math.random() * 30, size: 2 + Math.random() * 6, color });
  }
}

/* ---------- damage ---------- */
function hurt(f, amount) {
  f.hp -= amount;
  if (f.hp <= 0 && !f.dead) {
    f.hp = 0;
    f.dead = true;
    if (f === player) SFX.chargeStop();
    deathBurst(f.x, f.y, f === player ? COL.player : COL.angler);
  }
}

// a landed swing launches the victim into a multi-wall ricochet
function launch(victim, angle) {
  victim.knocked = true;
  victim.bounces = SWING_BOUNCES;
  victim.dx = Math.cos(angle) * SWING_LAUNCH;
  victim.dy = Math.sin(angle) * SWING_LAUNCH;
}

/* ---------- player ---------- */
function updatePlayer() {
  const p = player;
  if (p.dead) return;
  const pulled = angler.hook && angler.hook.state === 2;

  if (!p.knocked && !pulled) {
    // WASD drives velocity directly — no inertia, so the arena feels tight
    let ax = 0, ay = 0;
    if (keys.w) ay -= SPEED;
    if (keys.s) ay += SPEED;
    if (keys.a) ax -= SPEED;
    if (keys.d) ax += SPEED;
    if (ax && ay) {
      const len = Math.hypot(ax, ay);
      ax = ax / len * SPEED; ay = ay / len * SPEED;
    }
    p.dx = ax; p.dy = ay;
    if (ax || ay) p.aim = Math.atan2(ay, ax);
    else if (!angler.dead) p.aim = Math.atan2(angler.y - p.y, angler.x - p.x);
  }

  let diff = p.aim - p.angle;
  while (diff < -Math.PI) diff += Math.PI * 2;
  while (diff > Math.PI) diff -= Math.PI * 2;
  if (!p.knocked) p.angle += diff * (p.stick === "charging" ? 0.3 : 0.15);

  // being reeled in rips you out of a wind-up
  if (pulled && (p.stick === "charging")) {
    p.stick = "idle"; p.timer = 0; p.wantAttack = false;
    SFX.chargeStop();
  }

  if (p.stick === "idle") {
    if (p.wantAttack && !p.knocked && !pulled) {
      p.stick = "charging"; p.timer = 0; p.wantAttack = false;
      SFX.chargeStart();
    } else {
      p.offset += (0 - p.offset) * 0.1;
    }
  } else if (p.stick === "charging") {
    p.timer++;
    const cr = p.timer / CHARGE_FRAMES;
    // the stick rears back and shakes harder the closer it gets to release
    p.offset += (-Math.PI * 0.75 - p.offset) * 0.05 + (Math.random() - 0.5) * 0.15 * cr;
    if (p.timer >= CHARGE_FRAMES) {
      p.stick = "swinging"; p.timer = 0;
      SFX.chargeStop(); SFX.swing();
    }
  } else if (p.stick === "swinging") {
    p.timer++;
    const prog = p.timer / SWING_FRAMES;
    p.offset = -Math.PI * 0.75 + Math.PI * 1.35 * Math.sin(prog * Math.PI / 2);
    trails.push({ angle: p.angle + p.offset, x: p.x, y: p.y, life: 15 });
    if (p.timer === SWING_HIT_FRAME && !angler.dead && !angler.knocked) {
      const reach = Math.hypot(angler.x - p.x, angler.y - p.y) < p.r + SWING_REACH;
      const facing = Math.abs(diff) < Math.PI / 2;
      if (reach && facing) {
        hurt(angler, SWING_DMG);
        launch(angler, p.angle);
        spark(angler.x, angler.y, COL.charge, 3);
        SFX.hit();
        hitStop = HITSTOP_SWING;
      }
    }
    if (p.timer >= SWING_FRAMES) { p.stick = "cooldown"; p.timer = 0; }
  } else if (p.stick === "cooldown") {
    p.timer++;
    if (p.timer > 30) p.offset += (0 - p.offset) * 0.05;
    if (p.timer > SWING_COOLDOWN) { p.stick = "idle"; p.timer = 0; }
  }
}

/* ---------- angler AI: the bouncing hook ---------- */
function updateAngler() {
  const a = angler;
  if (a.dead) return;
  if (!player.dead) a.aim = Math.atan2(player.y - a.y, player.x - a.x);
  let diff = a.aim - a.angle;
  while (diff < -Math.PI) diff += Math.PI * 2;
  while (diff > Math.PI) diff -= Math.PI * 2;
  if (!a.knocked) a.angle += diff * 0.15;

  const h = a.hook;
  if (player.dead) { h.state = 0; h.path = []; a.hookAngle += 0.025; return; }
  const tipX = () => a.x + Math.cos(a.hookAngle - 0.25) * HOOK_ORBIT;
  const tipY = () => a.y + Math.sin(a.hookAngle - 0.25) * HOOK_ORBIT;

  if (h.state === 0) {                       // winding up, hook orbiting
    if (h.cd > 0) h.cd--;
    a.hookAngle += 0.025;
    h.x = tipX(); h.y = tipY();
    if (h.cd <= 0) {
      h.state = 1; h.life = 0; h.pause = 0; h.path = [];
      h.dx = Math.cos(a.hookAngle) * HOOK_SPEED;
      h.dy = Math.sin(a.hookAngle) * HOOK_SPEED;
      SFX.cast();
    }
  } else if (h.state === 1) {                // flying, ricocheting off walls
    h.x += h.dx; h.y += h.dy; h.life++;
    let wall = false;
    if (h.x <= 0) { h.x = 0; h.dx *= -1; wall = true; }
    else if (h.x >= ARENA) { h.x = ARENA; h.dx *= -1; wall = true; }
    if (h.y <= 0) { h.y = 0; h.dy *= -1; wall = true; }
    else if (h.y >= ARENA) { h.y = ARENA; h.dy *= -1; wall = true; }
    if (wall) {
      h.path.push({ x: h.x, y: h.y });       // remembered so the reel retraces it
      spark(h.x, h.y, "#AAAAAA", 0.6);
      SFX.bounce();
    } else if (Math.hypot(h.x - player.x, h.y - player.y) < player.r) {
      h.state = 2; SFX.hit();
    } else if (h.life > HOOK_LIFE) h.state = 3;
  } else if (h.state === 2) {                // hooked: dragged back along the path
    if (h.pause > 0) {
      h.pause--;
      if (h.pause % 3 === 0) spark(player.x, player.y, "#FF3333", 0.5);
    } else {
      const tx = h.path.length ? h.path[h.path.length - 1].x : tipX();
      const ty = h.path.length ? h.path[h.path.length - 1].y : tipY();
      const ang = Math.atan2(ty - h.y, tx - h.x);
      const dist = Math.hypot(tx - h.x, ty - h.y);
      if (dist <= HOOK_REEL) {
        if (h.path.length) {
          h.x = tx; h.y = ty; h.path.pop();
          hurt(player, HOOK_NODE_DMG);        // every corner costs you
          h.pause = 10;
          spark(h.x, h.y, COL.hook, 2);
          SFX.heavy();
          hitStop = HITSTOP_HEAVY;
        } else {
          h.x += Math.cos(ang) * dist; h.y += Math.sin(ang) * dist;
          if (Math.hypot(a.x - h.x, a.y - h.y) < a.r + player.r + 15) {
            h.state = 0; h.cd = HOOK_CD_AFTER;
            hurt(player, HOOK_HOME_DMG);
            spark(player.x, player.y, "#FF3333", 1.5);
            SFX.hit();
            const push = Math.atan2(player.y - a.y, player.x - a.x);
            player.dx = Math.cos(push) * 12; player.dy = Math.sin(push) * 12;
            a.dx = Math.cos(push + Math.PI) * 4; a.dy = Math.sin(push + Math.PI) * 4;
            hitStop = HITSTOP_LIGHT; bodyCd = HOOK_HOME_BODY_CD;
          }
        }
      } else { h.x += Math.cos(ang) * HOOK_REEL; h.y += Math.sin(ang) * HOOK_REEL; }
      // the player rides the hook while reeled
      player.x = Math.min(ARENA - player.r, Math.max(player.r, h.x));
      player.y = Math.min(ARENA - player.r, Math.max(player.r, h.y));
    }
  } else if (h.state === 3) {                // missed: retracting, can still snag
    const tx = h.path.length ? h.path[h.path.length - 1].x : tipX();
    const ty = h.path.length ? h.path[h.path.length - 1].y : tipY();
    const ang = Math.atan2(ty - h.y, tx - h.x);
    const dist = Math.hypot(tx - h.x, ty - h.y);
    if (dist <= HOOK_RETRACT) {
      h.x = tx; h.y = ty;
      if (h.path.length) h.path.pop();
      else { h.state = 0; h.cd = HOOK_CD_MISS; }
    } else {
      h.x += Math.cos(ang) * HOOK_RETRACT; h.y += Math.sin(ang) * HOOK_RETRACT;
      if (Math.hypot(h.x - player.x, h.y - player.y) < player.r) { h.state = 2; SFX.hit(); }
    }
  }
}

/* ---------- shared physics ---------- */
function movement(f) {
  if (f.dead) return;
  if (f === player && angler.hook && angler.hook.state === 2) return; // riding the hook
  f.x += f.dx; f.y += f.dy;

  let wall = false;
  if (f.x + f.r >= ARENA) { f.x = ARENA - f.r; f.dx = -Math.abs(f.dx); wall = true; }
  if (f.x - f.r <= 0) { f.x = f.r; f.dx = Math.abs(f.dx); wall = true; }
  if (f.y + f.r >= ARENA) { f.y = ARENA - f.r; f.dy = -Math.abs(f.dy); wall = true; }
  if (f.y - f.r <= 0) { f.y = f.r; f.dy = Math.abs(f.dy); wall = true; }

  if (wall && f.knocked) {
    f.bounces--;
    hurt(f, WALL_DMG);
    spark(f.x, f.y, COL.wall, 1.5);
    SFX.heavy();
    hitStop = HITSTOP_HEAVY;
    if (f.bounces <= 0 || f.dead) {
      f.knocked = false;
      const sp = Math.hypot(f.dx, f.dy);
      if (sp > 0) { f.dx = f.dx / sp * SPEED * 6; f.dy = f.dy / sp * SPEED * 6; }
    }
  }

  // the angler cruises at a steady clip; the player stops dead when you let go
  if (f.isAngler && !f.knocked) {
    const sp = Math.hypot(f.dx, f.dy);
    if (sp === 0) { f.dx = Math.cos(f.angle) * SPEED; f.dy = Math.sin(f.angle) * SPEED; }
    else if (sp > SPEED) { f.dx *= 0.95; f.dy *= 0.95; }
    else if (sp < SPEED - 0.2) { f.dx *= 1.05; f.dy *= 1.05; }
  }
}

function bodyCollision() {
  if (angler.hook && angler.hook.state === 2) return;
  if (player.knocked || angler.knocked) return;
  if (bodyCd > 0) { bodyCd--; return; }
  if (player.dead || angler.dead) return;
  const dx = angler.x - player.x, dy = angler.y - player.y;
  const d = Math.hypot(dx, dy) || 1;
  if (d >= player.r + angler.r) return;
  const ov = player.r + angler.r - d, nx = dx / d, ny = dy / d;
  player.x -= nx * ov / 2; player.y -= ny * ov / 2;
  angler.x += nx * ov / 2; angler.y += ny * ov / 2;
  const van = (player.dx - angler.dx) * nx + (player.dy - angler.dy) * ny;
  if (van > 0) {
    player.dx -= van * nx; player.dy -= van * ny;
    angler.dx += van * nx; angler.dy += van * ny;
    hurt(player, BODY_DMG); hurt(angler, BODY_DMG);
    spark(player.x, player.y, "#fff", 0.6);
    SFX.bounce();
    bodyCd = BODY_CD;
  }
}

/* ---------- tick ---------- */
function tick() {
  if (!started) return;
  if (readyTimer > 0) {
    readyTimer--;
    if (readyTimer === 0) { frame = 0; SFX.fight(); }
    return;
  }
  frame++;
  if (hitStop > 0) hitStop--;                 // world freezes, effects keep going
  else {
    updatePlayer();
    updateAngler();
    movement(player);
    movement(angler);
    bodyCollision();
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.dx; p.y += p.dy; p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
  for (let i = trails.length - 1; i >= 0; i--) if (--trails[i].life <= 0) trails.splice(i, 1);

  if ((player.dead || angler.dead) && !over) {
    over = true;
    clearMs = frame / (60 * GAME_SPEED) * 1000;
    won = angler.dead && !player.dead;
    awards = [];
    if (won) {
      const hp = Math.ceil(Math.max(player.hp, 0));
      if (hp === PLAYER_HP) awards.push("FLAWLESS — never got touched");
      if (hp === 1) awards.push("CLUTCH — 1 HP left");
      if (clearMs <= 60000) awards.push("SPEEDRUNNER — under a minute");
    }
    SFX.chargeStop();
    (won ? SFX.win : SFX.lose)();
    showResult();
  }
}

/* ---------- render ---------- */
function glow(color, blur, fn) {
  ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = blur; fn(); ctx.restore();
}

function draw() {
  ctx.save();
  if (hitStop > 0 && !over) {
    const s = hitStop / 3;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  ctx.fillStyle = "#000";
  ctx.fillRect(-20, -20, ARENA + 40, ARENA + 40);

  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 2;
  glow("#ffffff", 8, () => ctx.strokeRect(1, 1, ARENA - 2, ARENA - 2));

  if (!angler.dead) drawHook();
  drawTrails();
  if (!player.dead) drawPlayer();
  if (!angler.dead) drawAngler();
  drawParticles();
  ctx.restore();

  drawHud();
  if (!started) drawTitle();
  else if (readyTimer > 0) drawCountdown();
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 25));
    ctx.fillStyle = p.color;
    glow(p.color, 10, () => {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    });
  }
  ctx.globalAlpha = 1;
}

function drawTrails() {
  for (const t of trails) {
    ctx.globalAlpha = t.life / 15 * 0.35;
    ctx.strokeStyle = COL.charge;
    ctx.lineWidth = 8;
    glow(COL.charge, 12, () => {
      ctx.beginPath();
      ctx.moveTo(t.x + Math.cos(t.angle) * R, t.y + Math.sin(t.angle) * R);
      ctx.lineTo(t.x + Math.cos(t.angle) * (R + SWING_REACH), t.y + Math.sin(t.angle) * (R + SWING_REACH));
      ctx.stroke();
    });
  }
  ctx.globalAlpha = 1;
}

function body(f, color, dark) {
  glow(color, 24, () => {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
  });
  ctx.strokeStyle = dark; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.stroke();
  // eyes, facing the way it's pointed
  ctx.save();
  ctx.translate(f.x, f.y); ctx.rotate(f.angle);
  ctx.fillStyle = "#0a0a0a";
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.arc(f.r * 0.3, s * f.r * 0.32, f.r * 0.13, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  const hp = Math.ceil(Math.max(f.hp, 0));
  ctx.font = "900 " + Math.round(f.r * 0.7) + "px system-ui";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.lineWidth = 4; ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.strokeText(hp, f.x, f.y); ctx.fillStyle = "#fff"; ctx.fillText(hp, f.x, f.y);
  ctx.textBaseline = "alphabetic";
}

function drawPlayer() {
  const p = player;
  const a = p.angle + p.offset;
  const tipX = p.x + Math.cos(a) * (p.r + SWING_REACH * 0.62);
  const tipY = p.y + Math.sin(a) * (p.r + SWING_REACH * 0.62);
  // the stick itself
  ctx.strokeStyle = "#C89A6B"; ctx.lineWidth = 10; ctx.lineCap = "round";
  glow("#C89A6B", 8, () => {
    ctx.beginPath();
    ctx.moveTo(p.x + Math.cos(a) * p.r * 0.6, p.y + Math.sin(a) * p.r * 0.6);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
  });
  // charge orb + lightning converging on the tip
  if (p.stick === "charging") {
    const cr = p.chargeRatio;
    glow(COL.charge, 15 + cr * 30, () => {
      ctx.fillStyle = `rgba(180,64,255,${0.25 + cr * 0.55})`;
      ctx.beginPath(); ctx.arc(tipX, tipY, 10 + Math.random() * 22 * cr, 0, Math.PI * 2); ctx.fill();
    });
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const ea = Math.random() * Math.PI * 2, ed = 70 - cr * 50;
      ctx.strokeStyle = `rgba(220,100,255,${Math.random() * cr})`;
      ctx.beginPath();
      ctx.moveTo(tipX + Math.cos(ea) * ed, tipY + Math.sin(ea) * ed);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
    }
  }
  body(p, COL.player, COL.playerDark);
}

function drawAngler() { body(angler, COL.angler, COL.anglerDark); }

function drawHook() {
  const h = angler.hook;
  const anchorX = angler.x, anchorY = angler.y;
  // line follows the recorded bounce path, so you can read where it will drag you
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(anchorX, anchorY);
  for (const node of h.path) ctx.lineTo(node.x, node.y);
  ctx.lineTo(h.x, h.y);
  ctx.stroke();
  glow(COL.hook, 14, () => {
    ctx.fillStyle = COL.hook;
    ctx.beginPath(); ctx.arc(h.x, h.y, 9, 0, Math.PI * 2); ctx.fill();
  });
}

/* ---------- hud ---------- */
function bar(x, y, w, ratio, color) {
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(x, y, w, 12);
  ctx.fillStyle = color;
  glow(color, 8, () => ctx.fillRect(x, y, w * Math.max(0, ratio), 12));
}

function drawHud() {
  const w = ARENA / 2 - 30;
  bar(20, 14, w, player.hp / player.maxHp, COL.player);
  bar(ARENA - 20 - w, 14, w, angler.hp / angler.maxHp, COL.angler);
  ctx.font = "700 12px monospace";
  ctx.textAlign = "left";
  ctx.fillStyle = COL.player;
  ctx.fillText("STICK (YOU) " + Math.ceil(Math.max(player.hp, 0)), 20, 42);
  ctx.textAlign = "right";
  ctx.fillStyle = COL.angler;
  ctx.fillText(Math.ceil(Math.max(angler.hp, 0)) + " ANGLER (CPU)", ARENA - 20, 42);

  // attack readiness — the whole decision loop lives here
  ctx.textAlign = "center";
  let label, color;
  if (player.stick === "charging") { label = "CHARGING " + Math.round(player.chargeRatio * 100) + "%"; color = COL.charge; }
  else if (player.stick === "swinging") { label = "SWING!"; color = "#fff"; }
  else if (player.stick === "cooldown") {
    label = "RECOVERING " + (((SWING_COOLDOWN - player.timer) / (60 * GAME_SPEED)).toFixed(1)) + "s";
    color = "#8b90b3";
  } else { label = "[J] ATTACK READY"; color = "#8bd450"; }
  ctx.fillStyle = color;
  ctx.font = "700 13px monospace";
  glow(color, 8, () => ctx.fillText(label, ARENA / 2, ARENA - 16));
}

function drawTitle() {
  ctx.fillStyle = "rgba(0,0,0,0.72)";
  ctx.fillRect(0, 0, ARENA, ARENA);
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.font = "900 30px monospace";
  glow("#ffffff", 12, () => ctx.fillText("CLICK TO START", ARENA / 2, ARENA / 2 - 30));
  ctx.font = "700 16px monospace";
  ctx.fillStyle = "#8b90b3";
  ctx.fillText("Stick VS Angler", ARENA / 2, ARENA / 2 + 4);
}

function drawCountdown() {
  const secs = Math.ceil(readyTimer / 60);
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.font = "900 64px monospace";
  glow(COL.charge, 20, () => ctx.fillText(secs > 0 ? secs : "FIGHT", ARENA / 2, ARENA / 2));
}

function showResult() {
  el("resultTitle").textContent = won ? "YOU WIN" : "YOU LOSE";
  el("resultTitle").style.color = won ? COL.player : COL.hook;
  el("resultTime").textContent = "TIME  " + (clearMs / 1000).toFixed(2) + "s";
  const list = el("resultAwards");
  list.textContent = "";
  for (const a of awards) {
    const li = document.createElement("li");
    li.textContent = "★ " + a;
    list.appendChild(li);
  }
  el("overlay").classList.remove("hidden");
}

/* ---------- loop: fixed timestep so the feel is frame-rate independent ---- */
const DT = 1000 / 60;
let last = performance.now(), acc = 0;
function loop(now) {
  acc += Math.min(200, now - last) * GAME_SPEED;
  last = now;
  while (acc >= DT) { tick(); acc -= DT; }
  draw();
  requestAnimationFrame(loop);
}

/* ---------- input ---------- */
const KEYMAP = { KeyW: "w", KeyA: "a", KeyS: "s", KeyD: "d",
                 ArrowUp: "w", ArrowLeft: "a", ArrowDown: "s", ArrowRight: "d" };

addEventListener("keydown", (e) => {
  if (KEYMAP[e.code]) { keys[KEYMAP[e.code]] = true; e.preventDefault(); }
  if (e.code === "KeyJ" || e.code === "Space") { attack(); e.preventDefault(); }
  if (e.code === "KeyR") restart();
});
addEventListener("keyup", (e) => { if (KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; });
// alt-tab / focus loss eats the keyup, so the held direction would otherwise stick forever
addEventListener("blur", () => { keys.w = keys.a = keys.s = keys.d = false; });

function attack() {
  SFX.unlock();
  if (!started) { begin(); return; }
  if (!over) player.wantAttack = true;
}
function restart() { SFX.unlock(); reset(); started = true; }
function begin() { SFX.unlock(); started = true; reset(); }

canvas.addEventListener("pointerdown", () => { if (!started) begin(); });
el("btnRestart").addEventListener("click", restart);
el("btnAttack").addEventListener("click", attack);
const muteBtn = el("btnMute");
muteBtn.textContent = SFX.muted ? "🔇" : "🔊";
muteBtn.addEventListener("click", () => { muteBtn.textContent = SFX.toggle() ? "🔇" : "🔊"; });

/* touch: drag anywhere on the pad to steer, since the reference is PC-only */
const pad = el("pad");
let padId = null;
function steer(e) {
  const r = pad.getBoundingClientRect();
  const dx = e.clientX - (r.left + r.width / 2);
  const dy = e.clientY - (r.top + r.height / 2);
  const dead = r.width * 0.14;
  keys.a = dx < -dead; keys.d = dx > dead;
  keys.w = dy < -dead; keys.s = dy > dead;
}
pad.addEventListener("pointerdown", (e) => {
  padId = e.pointerId; pad.setPointerCapture(padId); SFX.unlock();
  if (!started) begin();
  steer(e);
});
pad.addEventListener("pointermove", (e) => { if (e.pointerId === padId) steer(e); });
for (const ev of ["pointerup", "pointercancel"]) {
  pad.addEventListener(ev, () => { padId = null; keys.w = keys.a = keys.s = keys.d = false; });
}

/* ---------- boot ---------- */
reset();
started = false;
requestAnimationFrame((t) => { last = t; loop(t); });
