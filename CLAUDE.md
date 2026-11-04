# Kamirty Anime — Claude Code project instructions

Browser-only Arabic RTL anime studio. Sister project of motion.kamirtyai.com; same stack and hosting.

## Non-negotiable rules
- Static deploy only: React, TypeScript, Vite, Canvas 2D, Mediabunny + WebCodecs. No server, paid API, accounts, telemetry or uploads.
- `renderFrame(project, frame, ctx, size)` is the single, pure source of truth for preview and export: no clocks, no Math.random (use the seeded `mulberry`).
- Anime timing: acting on twos (`onTwos`), holds are real holds, expensive moves use anticipation, smear drawings and a settle.
- Approved character design: frontal face with centred nose and mouth, tall embroidered kumma, straight dishdasha with an embroidered round collar, placket, button and a small white tassel high at the collar. Do not change it without the owner's approval; show stills before rendering videos.
- Never reverse Arabic text by hand; set `ctx.direction = 'rtl'` and let the canvas shape it.
- Pasted assistant output is data only: `src/domain/sanitize.ts` accepts enums, numbers, #rrggbb colours and SVG path data matching `PATH_D`. Never execute it or inject it as HTML.
- All audio is synthesised in `src/engine/audio`; no samples or third-party music.
- Run `npm run typecheck && npm test && npm run build` before every push.
