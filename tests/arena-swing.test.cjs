"use strict";
// Run with: node tests/arena-swing.test.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const elements = new Map(["game", "overlay", "btnRestart", "btnAttack", "btnMute", "pad"]
  .map((id) => [id, new EventTarget()]));
elements.get("game").getContext = () => ({});
elements.get("overlay").classList = { add() {} };

const context = vm.createContext({
  document: { getElementById: (id) => elements.get(id) },
  localStorage: { getItem: () => "1" },
  performance: { now: () => 0 },
  addEventListener() {},
  requestAnimationFrame() {},
});
vm.runInContext("Math.random = () => 0.5;", context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "arena.js"), "utf8"), context);

for (const [name, angle, key, offset, hit] of [
  ["target ahead", 0, "d", 0.5, true],
  ["target behind", 0, "d", -0.5, false],
  ["target at reach limit", 0, "d", 1, false],
  ["target beyond reach", 0, "d", 1.1, false],
  ["target ahead across angle wrap", Math.PI * 2, "d", 0.5, true],
  ["target behind across angle wrap", Math.PI * 2, "d", -0.5, false],
  ["target ahead facing left", -Math.PI, "a", 0.5, true],
  ["target behind facing left", -Math.PI, "a", -0.5, false],
]) {
  context.swingCase = { angle, key, offset };
  vm.runInContext(`
    reset();
    player.x = player.y = ARENA / 2;
    player.angle = swingCase.angle;
    keys[swingCase.key] = true;
    player.stick = "swinging";
    player.timer = SWING_HIT_FRAME - 1;
    angler.x = player.x + Math.cos(player.angle) * (player.r + SWING_REACH) * swingCase.offset;
    angler.y = player.y + Math.sin(player.angle) * (player.r + SWING_REACH) * swingCase.offset;
    updatePlayer();
  `, context);

  assert.equal(vm.runInContext("ANGLER_HP - angler.hp", context),
    hit ? vm.runInContext("SWING_DMG", context) : 0, name);
  assert.equal(vm.runInContext("angler.knocked", context), hit, name);
}

const { R, ARENA, SWING_LAUNCH, SWING_BOUNCES, WALL_DMG } = vm.runInContext(
  "({ R, ARENA, SWING_LAUNCH, SWING_BOUNCES, WALL_DMG })", context);

// Sliding along a wall must not spend ricochets; crossing it must still reflect and hurt.
for (const [name, x, y, dx, dy, hitDx, hitDy] of [
  ["left wall", R, ARENA / 2, 0, SWING_LAUNCH, -SWING_LAUNCH, 0],
  ["right wall", ARENA - R, ARENA / 2, 0, SWING_LAUNCH, SWING_LAUNCH, 0],
  ["top wall", ARENA / 2, R, SWING_LAUNCH, 0, 0, -SWING_LAUNCH],
  ["bottom wall", ARENA / 2, ARENA - R, SWING_LAUNCH, 0, 0, SWING_LAUNCH],
]) {
  context.wallCase = { x, y, dx, dy, hitDx, hitDy };
  vm.runInContext(`
    reset();
    launch(angler, 0);
    Object.assign(angler, wallCase);
    movement(angler);
  `, context);
  assert.equal(vm.runInContext("angler.hp", context), vm.runInContext("ANGLER_HP", context), name);
  assert.equal(vm.runInContext("angler.bounces", context), SWING_BOUNCES, name);
  assert.equal(vm.runInContext("angler.x", context), x + dx, name);
  assert.equal(vm.runInContext("angler.y", context), y + dy, name);

  vm.runInContext(`
    angler.dx = wallCase.hitDx; angler.dy = wallCase.hitDy;
    movement(angler);
  `, context);
  assert.equal(vm.runInContext("ANGLER_HP - angler.hp", context), WALL_DMG, name);
  assert.equal(vm.runInContext("angler.bounces", context), SWING_BOUNCES - 1, name);
  assert.equal(vm.runInContext("angler.x", context), x + dx, name);
  assert.equal(vm.runInContext("angler.y", context), y + dy, name);
  if (hitDx) assert.equal(vm.runInContext("angler.dx", context), -hitDx, name);
  if (hitDy) assert.equal(vm.runInContext("angler.dy", context), -hitDy, name);
}
