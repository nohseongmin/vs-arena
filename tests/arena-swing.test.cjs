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
