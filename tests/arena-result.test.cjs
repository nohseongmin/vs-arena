"use strict";
// Run with: node tests/arena-result.test.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const elements = new Map(["game", "overlay", "btnRestart", "btnAttack", "btnMute", "pad",
  "resultTitle", "resultTime", "resultAwards"]
  .map((id) => [id, new EventTarget()]));
elements.get("game").getContext = () => ({});
elements.get("overlay").classList = { add() {}, remove() {} };
elements.get("resultTitle").style = {};
elements.get("resultAwards").appendChild = () => {};

const context = vm.createContext({
  document: { getElementById: (id) => elements.get(id), createElement: () => ({}) },
  localStorage: { getItem: () => "1" },
  performance: { now: () => 0 },
  addEventListener() {},
  requestAnimationFrame() {},
});
vm.runInContext("Math.random = () => 0.5;", context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "arena.js"), "utf8"), context);

for (const loser of ["angler", "player"]) {
  context.loser = loser;
  vm.runInContext(`
    {
      begin();
      readyTimer = 0;
      keys.d = true;
      player.stick = "charging";
      player.timer = 10;
      const defeated = loser === "angler" ? angler : player;
      hurt(defeated, defeated.maxHp);
      tick();
    }
  `, context);
  assert.equal(vm.runInContext("over", context), true, loser);
  assert.equal(vm.runInContext("won", context), loser === "angler", loser);
  const result = vm.runInContext("JSON.stringify({ player, angler, won, clearMs, awards })", context);

  vm.runInContext(`
    particles = [{ x: 0, y: 0, dx: 1, dy: 0, life: 2 }];
    trails = [{ life: 1 }];
    tick();
  `, context);
  assert.equal(vm.runInContext("particles[0].x", context), 1, loser);
  assert.equal(vm.runInContext("particles[0].life", context), 1, loser);
  assert.equal(vm.runInContext("trails.length", context), 0, loser);
  vm.runInContext("tick();", context);
  assert.equal(vm.runInContext("particles.length", context), 0, loser);
  assert.equal(vm.runInContext("JSON.stringify({ player, angler, won, clearMs, awards })", context),
    result, loser);

  vm.runInContext("restart(); readyTimer = 0; keys.d = true;", context);
  assert.equal(vm.runInContext("over", context), false, loser);
  const startX = vm.runInContext("player.x", context);
  vm.runInContext("tick();", context);
  assert.ok(vm.runInContext("player.x", context) > startX, loser);
}
