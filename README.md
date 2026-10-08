# VS Arena

A browser simulator for weapon-ball battles. Choose fighters, run a match, and share a link that reproduces the same fight.

## Running locally

```bash
cd vs-arena
python -m http.server 8317
```

Open `http://localhost:8317`. The project is a static site and can run on GitHub Pages without a build step.

## Features

- One-on-one duels and battle royale matches with two to six fighters. Battle royale kills increase size, health, and damage.
- Eighteen automated fighters. Weapons and projectiles grow as they land hits.
- A fighter editor for names, icons, colors, bodies, attacks, mechanics, and stats. Up to twelve custom fighters are saved locally, and shared links include their definitions.
- Adjustable health, simulation speed, and seed. A fixed seed reproduces the match.
- Synthesized WebAudio effects with a mute control.
- A mobile layout with a vertical 9:16 arena and reserved ad slots.

| Type | Fighters and mechanics |
|---|---|
| Melee | Pickaxe: critical hit every third strike; fishing rod: pull; sword: combos; axe: rage and acceleration; hammer: stun and knockback resistance; trident: life steal; drunk guy: staggering and evasion; gravity guy: gravity field. |
| Ranged | Archer: predictive shots and kiting; ninja: three-shot bursts; bomber: arcing bombs, area damage, and self-damage risk. |
| Specialized | Spiker: contact damage and vulnerability to ranged attacks; charger: damage builds up to 3x until hit; knight: reflects projectiles at the shooter with 50% extra damage. |
| Additional | Phantom: teleportation; frost: slowing and freezing; boomerang: outbound and return hits; vampire: life-stealing bats. |

Rotating weapons can block projectiles and return bombs. Ranged fighters cannot fire at close range.

Example replay URL: `/?a=hammer&b=trident&hp=100&spd=1&seed=7`.

## Implementation

Vanilla JavaScript and Canvas 2D. No framework, build step, or backend.

```text
index.html   Interface
style.css    Styles
game.js      Physics, game loop, and interface bindings
BLUEPRINT.md Project scope and design notes
```

`GIMMICKS` defines hit behavior, and `SHOTS` defines projectile behavior. The editor uses those tables directly. `burst()` handles particles; its random calls must stay in angle, speed, then lifetime order to preserve reproducible matches.

## Input handling

URL parameters use allowlists and range checks. Custom fighters pass through `sanitizeCustom`, which checks identifiers, clamps numbers, removes control characters, and limits text lengths, fighter count, and payload size. User text is rendered with `textContent`.

The game collects no accounts, personal information, cookies, or analytics.
