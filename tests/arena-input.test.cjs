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

const context = vm.createContext({
  document: { getElementById: (id) => elements.get(id) },
  localStorage: { getItem: () => "1" },
  performance: { now: () => 0 },
  addEventListener() {},
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

for (const end of ["pointerup", "pointercancel"]) {
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
