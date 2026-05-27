# Typing Platformer

A Phaser + TypeScript endless platformer for practicing keyboard precision.

## Core loop
- Each level is a real word.
- One platform per character.
- Press the expected key to safely advance.
- Wrong key: drop to previous platform.
- Multiple mistakes in a short window: drop to previous level.

## Run

```bash
npm install
npm run dev
```

## Test

```bash
npm test
```

## Controls
- Press letter keys to attempt next jump.
- Correct key triggers jump progression.

## Notes
- Level generation is deterministic from a seed.
- Themes rotate by level.
- Endless mode difficulty ramps by level index.
