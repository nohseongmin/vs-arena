"use strict";
// Run with: node tests/arena-input.test.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const elements = new Map(["game", "overlay", "btnRestart", "btnAttack", "btnMute", "pad"]
  .map((id) => [id, new EventTarget()]));
elements.get("game").getContext = () => ({});
elements.get("overlay").classList = { add() {} };
const pad = elements.get("pad");
const captures = [];
pad.setPointerCapture = (id) => captures.push(id);
pad.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 });

const windowEvents = new EventTarget();
const context = vm.createContext({
  document: { getElementById: (id) => elements.get(id) },
  localStorage: { getItem: () => "1" },
  performance: { now: () => 0 },
  addEventListener: (...args) => windowEvents.addEventListener(...args),
  requestAnimationFrame() {},
});
vm.runInContext("Math.random = () => 0.5;", context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "arena.js"), "utf8"), context);

function pointer(type, pointerId, clientX) {
  const event = new Event(type);
  Object.assign(event, { pointerId, clientX, clientY: 50 });
  pad.dispatchEvent(event);
}
function assertDirection(direction) {
  assert.equal(vm.runInContext("updatePlayer(); Math.sign(player.dx)", context), direction);
  assert.equal(vm.runInContext("player.dy", context), 0);
}

for (const end of ["pointerup", "pointercancel", "lostpointercapture"]) {
  captures.length = 0;
  pointer("pointerdown", 0, 100);
  assertDirection(1);

  // Another finger must neither take over nor stop the active drag.
  pointer("pointerdown", 1, 0);
  assertDirection(1);
  assert.deepEqual(captures, [0]);
  pointer("pointermove", 1, 0);
  assertDirection(1);
  pointer(end, 1, 0);
  assertDirection(1);

  pointer("pointermove", 0, 0);
  assertDirection(-1);
  pointer(end, 0, 0);
  assertDirection(0);
  pointer("pointermove", 0, 100);
  assertDirection(0);

  // Releasing the active finger must allow a fresh drag.
  pointer("pointerdown", 2, 100);
  assertDirection(1);
  assert.deepEqual(captures, [0, 2]);
  pointer(end, 2, 100);
  assertDirection(0);
}

// Focus loss must stop a drag even when its release event never arrives.
pointer("pointerdown", 0, 100);
assertDirection(1);
windowEvents.dispatchEvent(new Event("blur"));
assertDirection(0);
pointer("pointermove", 0, 0);
assertDirection(0);
pointer("pointerdown", 1, 0);
assertDirection(-1);
pointer("pointerup", 0, 100);
assertDirection(-1);
pointer("pointerup", 1, 0);
assertDirection(0);

// Holding restart must not keep resetting the match between fresh key presses.
for (const repeat of [false, true, false]) {
  vm.runInContext("hurt(player, 1);", context);
  const health = vm.runInContext("player.hp", context);
  const event = new Event("keydown");
  Object.assign(event, { code: "KeyR", repeat });
  windowEvents.dispatchEvent(event);
  assert.equal(vm.runInContext("player.hp", context),
    repeat ? health : vm.runInContext("PLAYER_HP", context));
}

function key(type, code) {
  const event = new Event(type);
  Object.assign(event, { code, repeat: false });
  windowEvents.dispatchEvent(event);
}

// Either binding must keep moving until the last key for that direction is released.
for (const [wasd, arrow, axis, direction] of [
  ["KeyW", "ArrowUp", "dy", -1],
  ["KeyA", "ArrowLeft", "dx", -1],
  ["KeyS", "ArrowDown", "dy", 1],
  ["KeyD", "ArrowRight", "dx", 1],
]) {
  const velocity = () => vm.runInContext(`updatePlayer(); Math.sign(player.${axis})`, context);
  for (const [first, second] of [[wasd, arrow], [arrow, wasd]]) {
    vm.runInContext("restart();", context);
    key("keydown", first);
    key("keydown", first);
    key("keydown", second);
    assert.equal(velocity(), direction);
    key("keyup", first);
    assert.equal(velocity(), direction);
    key("keyup", second);
    assert.equal(velocity(), 0);
  }
}

// Reset paths must discard held keys so a later release cannot revive stale input.
for (const reset of [() => key("keydown", "KeyR"),
  () => windowEvents.dispatchEvent(new Event("blur"))]) {
  key("keydown", "KeyD");
  reset();
  assertDirection(0);
  key("keydown", "ArrowRight");
  assertDirection(1);
  key("keyup", "ArrowRight");
  assertDirection(0);
  key("keyup", "KeyD");
}
