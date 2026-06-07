# Maré Pixel: Pesca da Nazaré

A simple classroom browser game made with HTML, CSS and JavaScript.

Students create pixel art for fish, sea objects, trash, backgrounds and UI.

## How to play

Move the mouse to control the fishing hook.

Catch fish to gain points.

Avoid jellyfish.

Trash gives no points.

Jellyfish shock the hook for 2 seconds and remove points.

After 200 points, one big fish can appear.

The big fish is worth 1000 points. It only bites if the hook is already carrying a fish. Small bait fish make the big fish very likely to escape, and it can still escape right before being collected. When it escapes, it returns to the sea instead of disappearing.

The shark is a very rare fast danger. If it hits a fish on the hook, it steals the fish and locks the hook for 1 second.

Difficulty increases with time:

- 0-24 seconds: mostly fish, little trash, very few jellyfish.
- 25-49 seconds: more trash and some jellyfish.
- 50+ seconds: many trash items and jellyfish.

## Technology

- HTML
- CSS
- JavaScript
- Canvas

No install, no local server, no accounts, no database.

## Student art placeholders

The game currently draws temporary placeholder art with Canvas.

Students can later create pixel-art files in the `assets` folder using names like:

- `fisherman.png`
- `cliffs.png`
- `sardinha.png`
- `carapau.png`
- `robalo.png`
- `polvo.png`
- `peixe_grande.png`
- `tubarao.png`
- `alforreca.png`
- `garrafa.png`
- `bota.png`
