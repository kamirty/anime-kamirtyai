import { ASPECTS, FPS, type Character, type Project, type Shot, type Size } from '../../domain/types';
import { shotAt } from '../../domain/timeline';
import { cssFamily, fontById } from '../../design/fonts';
import { drawCharacter, rig } from '../art/body';
import { drawEffect } from '../art/effects';
import { INTERIOR, LAYERS, drawPlace, skyBody, type World } from '../art/places';
import { poseAt, type PoseResult } from '../art/poses';
import type { LipSyncTracks } from '../audio/lipsync';
import { INK, LINE, PRACTICAL, RED, type Ctx, clamp, easeInOut, easeOut, hash, mulberry } from '../art/paint';
import { drawProp } from '../art/props';
import { fitText } from './textLayout';

/**
 * The single source of truth for every frame, in preview and export alike.
 * Pure: the same project and frame index always produce the same pixels (no clocks, no randomness).
 */

export interface Layout {
  W: number;
  H: number;
  gY: number;
  /** Pixels per body unit. */
  unit: number;
}

export function layoutFor(project: Project): Layout {
  const { width: W, height: H } = ASPECTS[project.aspect].design;
  const portrait = H > W;
  const square = H === W;
  return { W, H, gY: H * (portrait ? 0.8 : square ? 0.82 : 0.85), unit: (H * (portrait ? 0.27 : square ? 0.34 : 0.4)) / 1000 };
}

interface ActorFrame {
  ch: Character;
  pr: PoseResult;
  wx: number;
}

interface Cam {
  z: number;
  P: { x: number; y: number };
  S: { x: number; y: number };
}

function layerTransform(cam: Cam, depth: number, L: Layout) {
  const zL = 1 + (cam.z - 1) * depth;
  const px = clamp(cam.P.x, cam.S.x / zL, L.W - (L.W - cam.S.x) / zL);
  const py = clamp(cam.P.y, cam.S.y / zL, L.H - (L.H - cam.S.y) / zL);
  return { zL, tx: cam.S.x - px * zL, ty: cam.S.y - py * zL };
}

function camera(shot: Shot, actors: ActorFrame[], t: number, dur: number, L: Layout): Cam {
  const S = { x: L.W / 2, y: L.H / 2 };
  let z = 1;
  let P = { ...S };
  const power = actors.some((a) => a.ch && shot.actors.some((x) => x.action === 'power'));
  const focusIdx = shot.dialogue && actors[shot.dialogue.actor] ? shot.dialogue.actor : 0;
  const f = actors[focusIdx];
  if (f && !power && shot.size !== 'wide') {
    const r = rig(f.ch);
    const hpx = r.H * L.unit;
    if (shot.size === 'medium') {
      z = clamp((0.62 * L.H) / hpx, 1, 3.2);
      P = { x: f.wx, y: L.gY - hpx * 0.5 };
      S.y = L.H * 0.5;
      if (actors.length > 1) {
        const xs = actors.map((a) => a.wx);
        const span = Math.max(...xs) - Math.min(...xs) + hpx * 0.9;
        z = Math.max(1, Math.min(z, (0.9 * L.W) / span));
        P.x = (Math.max(...xs) + Math.min(...xs)) / 2;
      }
    } else {
      const head = 585 * r.k * L.unit;
      z = clamp((0.3 * L.H) / head, 1, 9);
      P = { x: f.wx, y: L.gY + r.headCY * L.unit };
      S.y = L.H * 0.36;
    }
  }
  const p = clamp(t / Math.max(0.1, dur), 0, 1);
  if (shot.camera === 'push') z *= 1 + 0.07 * easeInOut(p);
  if (shot.camera === 'pan') P.x += ((easeInOut(p) - 0.5) * 0.14 * L.W) / z;
  return { z, P, S };
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCaption(ctx: Ctx, project: Project, shot: Shot, t: number, L: Layout) {
  if (!shot.text) return;
  const f = fontById(project.font);
  const fam = cssFamily(f);
  const appear = clamp((t - 0.3) / 0.4, 0, 1);
  if (appear <= 0) return;
  const rise = (1 - easeOut(appear)) * 24;
  const m = Math.min(L.W, L.H);
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (shot.text.style === 'caption') {
    const bandTop = L.H * (L.H > L.W ? 0.8 : 0.78);
    ctx.globalAlpha = 0.86 * appear;
    ctx.fillStyle = INK;
    ctx.fillRect(0, bandTop, L.W, L.H - bandTop);
    ctx.globalAlpha = appear;
    const main = fitText(ctx, fam, f.bold, shot.text.main, L.W * 0.88, 2, m * 0.105, m * 0.05);
    const sub = shot.text.sub ? fitText(ctx, '"Cairo", sans-serif', 700, shot.text.sub, L.W * 0.8, 1, m * 0.05, m * 0.03) : null;
    const total = main.height + (sub ? sub.height + m * 0.01 : 0);
    let y = bandTop + (L.H - bandTop - total) / 2 + rise;
    ctx.fillStyle = LINE;
    ctx.font = `${f.bold} ${Math.round(main.size)}px ${fam}`;
    for (const line of main.lines) {
      ctx.fillText(line, L.W / 2, y + main.lineHeight / 2);
      y += main.lineHeight;
    }
    if (sub) {
      ctx.fillStyle = PRACTICAL;
      ctx.font = `700 ${Math.round(sub.size)}px "Cairo", sans-serif`;
      ctx.fillText(sub.lines[0], L.W / 2, y + m * 0.01 + sub.lineHeight / 2);
    }
  } else {
    ctx.globalAlpha = appear;
    const main = fitText(ctx, fam, f.bold, shot.text.main, L.W * 0.86, 3, m * 0.14, m * 0.06, 1.35);
    let y = L.H * 0.3 - main.height / 2 + rise;
    ctx.font = `${f.bold} ${Math.round(main.size)}px ${fam}`;
    ctx.lineJoin = 'round';
    ctx.lineWidth = main.size * 0.14;
    ctx.strokeStyle = INK;
    for (const line of main.lines) {
      ctx.strokeText(line, L.W / 2, y + main.lineHeight / 2);
      ctx.fillStyle = LINE;
      ctx.fillText(line, L.W / 2, y + main.lineHeight / 2);
      y += main.lineHeight;
    }
    if (shot.text.sub) {
      const sub = fitText(ctx, '"Cairo", sans-serif', 700, shot.text.sub, L.W * 0.8, 2, m * 0.06, m * 0.035);
      ctx.font = `700 ${Math.round(sub.size)}px "Cairo", sans-serif`;
      ctx.lineWidth = sub.size * 0.16;
      for (const line of sub.lines) {
        ctx.strokeText(line, L.W / 2, y + sub.lineHeight / 2 + m * 0.01);
        ctx.fillStyle = PRACTICAL;
        ctx.fillText(line, L.W / 2, y + sub.lineHeight / 2 + m * 0.01);
        y += sub.lineHeight;
      }
    }
  }
  ctx.restore();
}

function drawBubble(ctx: Ctx, project: Project, text: string, ax: number, ay: number, t: number, L: Layout) {
  const appear = clamp((t - 0.2) / 0.25, 0, 1);
  if (appear <= 0) return;
  const m = Math.min(L.W, L.H);
  const f = fontById(project.font);
  const fam = cssFamily(f);
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fit = fitText(ctx, fam, f.bold, text, L.W * 0.62, 3, m * 0.066, m * 0.036, 1.4);
  const pad = m * 0.03;
  const bw = fit.width + pad * 2.2;
  const bh = fit.height + pad * 1.4;
  const bx = clamp(ax - bw / 2, m * 0.03, L.W - bw - m * 0.03);
  const by = clamp(ay - bh - m * 0.06, m * 0.04, L.H * 0.7);
  const s = 0.85 + 0.15 * easeOut(appear);
  ctx.translate(ax, ay);
  ctx.scale(s, s);
  ctx.translate(-ax, -ay);
  ctx.globalAlpha = appear;
  ctx.lineWidth = m * 0.006;
  ctx.strokeStyle = INK;
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, bx, by, bw, bh, m * 0.035);
  ctx.fill();
  ctx.stroke();
  // tail toward the speaker
  const tx = clamp(ax, bx + m * 0.06, bx + bw - m * 0.06);
  ctx.beginPath();
  ctx.moveTo(tx - m * 0.03, by + bh - ctx.lineWidth);
  ctx.lineTo(ax, Math.min(ay - m * 0.01, by + bh + m * 0.05));
  ctx.lineTo(tx + m * 0.03, by + bh - ctx.lineWidth);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(tx - m * 0.03, by + bh);
  ctx.lineTo(ax, Math.min(ay - m * 0.01, by + bh + m * 0.05));
  ctx.lineTo(tx + m * 0.03, by + bh);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = `${f.bold} ${Math.round(fit.size)}px ${fam}`;
  fit.lines.forEach((line, i) => ctx.fillText(line, bx + bw / 2, by + pad * 0.7 + fit.lineHeight * (i + 0.5)));
  ctx.restore();
}

/** Crescent wave, spin ring, impact frame and cracked target for the power move. */
function drawPowerFx(ctx: Ctx, a: ActorFrame, cam: Cam, L: Layout, target: { x: number; y: number; r: number }, handScreen: { x: number; y: number }, bodyScreen: { x: number; y: number }, t: number) {
  const st = a.pr.power!;
  const m = Math.min(L.W, L.H);
  if (st.phase === 'spin') {
    ctx.save();
    ctx.translate(bodyScreen.x, bodyScreen.y);
    ctx.rotate(Math.floor(t * 24) * 0.9);
    ctx.fillStyle = PRACTICAL;
    const R = m * 0.16 * cam.z;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 1.6);
    ctx.arc(R * 0.12, 0, R * 0.86, Math.PI * 1.6, 0, true);
    ctx.fill();
    ctx.restore();
  }
  if (st.phase === 'release') {
    const x = handScreen.x + (target.x - handScreen.x) * st.wave;
    const y = handScreen.y + (target.y - handScreen.y) * st.wave;
    const s = m * (0.09 + 0.08 * st.wave);
    const ang = Math.atan2(target.y - handScreen.y, target.x - handScreen.x) + Math.PI / 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = PRACTICAL;
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, s * 0.15);
    ctx.lineTo(0, s * 2.4);
    ctx.lineTo(s * 0.2, s * 0.15);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(-s, s * 0.1);
    ctx.bezierCurveTo(-s * 0.7, -s * 0.7, s * 0.7, -s * 0.7, s, s * 0.1);
    ctx.bezierCurveTo(s * 0.6, -s * 0.3, -s * 0.6, -s * 0.3, -s, s * 0.1);
    ctx.fill();
    ctx.strokeStyle = LINE;
    ctx.lineWidth = m * 0.004;
    ctx.stroke();
    ctx.restore();
  }
}

function drawImpactFrame(ctx: Ctx, project: Project, a: ActorFrame, flash: number, target: { x: number; y: number; r: number }, bodyT: { tx: number; ty: number; zL: number }, L: Layout) {
  const plate = flash % 2 ? RED : LINE;
  ctx.save();
  ctx.fillStyle = plate;
  ctx.fillRect(0, 0, L.W, L.H);
  ctx.fillStyle = INK;
  const R = Math.hypot(L.W, L.H);
  for (let i = 0; i < 18; i++) {
    const ang = (i / 18) * Math.PI * 2 + 0.1;
    ctx.beginPath();
    ctx.moveTo(target.x + Math.cos(ang - 0.05) * target.r * 1.2, target.y + Math.sin(ang - 0.05) * target.r * 1.2);
    ctx.lineTo(target.x + Math.cos(ang) * R, target.y + Math.sin(ang) * R);
    ctx.lineTo(target.x + Math.cos(ang + 0.05) * target.r * 1.2, target.y + Math.sin(ang + 0.05) * target.r * 1.2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(target.x, target.y, target.r * 1.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = plate;
  ctx.lineWidth = target.r * 0.06;
  ctx.beginPath();
  ctx.moveTo(target.x + target.r * 0.05, target.y + target.r * 0.15);
  ctx.lineTo(target.x - target.r * 0.3, target.y - target.r * 0.3);
  ctx.lineTo(target.x - target.r * 0.2, target.y - target.r * 0.7);
  ctx.moveTo(target.x + target.r * 0.05, target.y + target.r * 0.15);
  ctx.lineTo(target.x + target.r * 0.5, target.y - target.r * 0.2);
  ctx.moveTo(target.x + target.r * 0.05, target.y + target.r * 0.15);
  ctx.lineTo(target.x - target.r * 0.1, target.y + target.r * 0.7);
  ctx.stroke();
  ctx.fillRect(0, L.gY, L.W, L.H);
  ctx.translate(bodyT.tx, bodyT.ty);
  ctx.scale(bodyT.zL, bodyT.zL);
  ctx.translate(a.wx, L.gY);
  ctx.scale(L.unit, L.unit);
  drawCharacter(ctx, a.ch, a.pr.pose, { sil: INK, k: 1 });
  ctx.restore();
  void project;
}

function drawCracks(ctx: Ctx, target: { x: number; y: number; r: number }, since: number, m: number) {
  ctx.save();
  const pulse = Math.floor(since * 12) % 2 ? 0.75 : 1;
  ctx.globalAlpha = 0.25 * pulse;
  ctx.fillStyle = PRACTICAL;
  ctx.beginPath();
  ctx.arc(target.x, target.y, target.r * 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = pulse;
  ctx.strokeStyle = PRACTICAL;
  ctx.lineWidth = target.r * 0.06;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const c = { x: target.x + target.r * 0.05, y: target.y + target.r * 0.15 };
  const arms = [
    [-0.3, -0.3, -0.2, -0.65, -0.45, -0.9],
    [0.35, -0.25, 0.6, -0.15, 0.85, -0.45],
    [-0.15, 0.35, 0.05, 0.6, -0.08, 0.92],
    [0.4, 0.35, 0.6, 0.3],
    [-0.5, 0.05, -0.75, -0.12],
  ];
  for (const a of arms) {
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    for (let i = 0; i < a.length; i += 2) ctx.lineTo(target.x + a[i] * target.r, target.y + a[i + 1] * target.r);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = LINE;
  ctx.beginPath();
  ctx.arc(c.x, c.y, target.r * 0.09, 0, Math.PI * 2);
  ctx.fill();
  // shards drift outward
  const r = mulberry(77);
  ctx.fillStyle = '#f3ead6';
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2;
    const d = target.r * (1.1 + r() * 0.8) * (0.9 + Math.min(1, since) * 0.25);
    const x = target.x + Math.cos(a) * d;
    const y = target.y + Math.sin(a) * d;
    const s = m * (0.005 + r() * 0.01);
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.lineTo(x + s * 0.6, y);
    ctx.lineTo(x, y + s);
    ctx.lineTo(x - s * 0.6, y);
    ctx.fill();
  }
  ctx.restore();
}

export interface RenderOptions {
  /** Skip text and bubbles (thumbnails). */
  noText?: boolean;
  lipSync?: LipSyncTracks;
}

export function renderFrame(project: Project, frame: number, ctx: Ctx, out: Size, opts: RenderOptions = {}): void {
  const L = layoutFor(project);
  const at = shotAt(project, frame);
  const shot = at.shot;
  const t = at.local / FPS;
  const dur = at.frames / FPS;
  const base = out.width / L.W;
  ctx.setTransform(base, 0, 0, base, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, L.W, L.H);

  const castById = new Map(project.cast.map((c) => [c.id, c]));
  const actors: ActorFrame[] = [];
  shot.actors.forEach((a, i) => {
    const ch = castById.get(a.cast);
    if (!ch) return;
    const voice = opts.lipSync?.[shot.id];
    const speaker = shot.dialogue?.actor ?? (voice ? 0 : -1);
    const level = voice?.[at.local] ?? 0;
    const pr = poseAt(a, t, dur, `${shot.id}:${i}`, speaker === i, voice ? level >= 0.17 : undefined);
    actors.push({ ch, pr, wx: pr.x * L.W });
  });

  const world: World = { W: L.W, H: L.H, gY: L.gY, time: shot.place === 'space' ? 'night' : shot.time, t };
  const cam = camera(shot, actors, t, dur, L);

  for (const layer of LAYERS) {
    const T = layerTransform(cam, layer.depth, L);
    ctx.save();
    ctx.transform(T.zL, 0, 0, T.zL, T.tx, T.ty);
    drawPlace(ctx, shot.place, layer.id, world);
    ctx.restore();
  }

  // target of a power move: the moon or sun outdoors, the top of the frame indoors
  const skyT = layerTransform(cam, LAYERS[0].depth, L);
  const sb = skyBody(world);
  const target = INTERIOR[shot.place]
    ? { x: L.W / 2, y: L.H * 0.1, r: Math.min(L.W, L.H) * 0.08 }
    : { x: skyT.tx + sb.x * skyT.zL, y: skyT.ty + sb.y * skyT.zL, r: sb.r * skyT.zL };

  const bodyT = layerTransform(cam, 1, L);
  const toScreen = (wx: number, wy: number) => ({ x: bodyT.tx + wx * bodyT.zL, y: bodyT.ty + wy * bodyT.zL });

  // custom drawings from the assistant
  if (shot.props?.length) {
    ctx.save();
    ctx.transform(bodyT.zL, 0, 0, bodyT.zL, bodyT.tx, bodyT.ty);
    for (const pl of shot.props) {
      const prop = project.props.find((p) => p.id === pl.ref);
      if (prop) drawProp(ctx, prop, pl, L.W, L.H, t);
    }
    ctx.restore();
  }

  let impact: { a: ActorFrame; flash: number } | null = null;
  const anchors: { x: number; y: number }[] = [];
  actors.forEach((a) => {
    ctx.save();
    ctx.transform(bodyT.zL, 0, 0, bodyT.zL, bodyT.tx, bodyT.ty);
    ctx.translate(a.wx, L.gY);
    ctx.scale(L.unit, L.unit);
    const info = drawCharacter(ctx, a.ch, a.pr.pose);
    ctx.restore();
    const head = toScreen(a.wx, L.gY + info.headTop * L.unit);
    anchors.push(head);
    if (a.pr.power) {
      const hands = info.hands.map(([hx, hy]) => toScreen(a.wx + hx * L.unit, L.gY + hy * L.unit));
      const hand = { x: (hands[0].x + hands[1].x) / 2, y: Math.min(hands[0].y, hands[1].y) };
      const body = toScreen(a.wx, L.gY + (info.headCY + 260) * L.unit);
      drawPowerFx(ctx, a, cam, L, target, hand, body, t);
      if (a.pr.power.phase === 'impact') impact = { a, flash: a.pr.power.flash };
      if (a.pr.power.phase === 'land') drawCracks(ctx, target, a.pr.power.since, Math.min(L.W, L.H));
    }
  });

  // screen effects
  const seed = hash(shot.id);
  for (const e of shot.effects) drawEffect(ctx, e, L.W, L.H, t, dur, seed);
  for (const a of actors) {
    const ph = a.pr.power?.phase;
    if (ph === 'launch' || ph === 'rise' || ph === 'release') drawEffect(ctx, 'speedlines', L.W, L.H, t, dur, seed + 3);
  }
  if (impact) {
    const im = impact as { a: ActorFrame; flash: number };
    drawImpactFrame(ctx, project, im.a, im.flash, target, bodyT, L);
  }

  if (!opts.noText) {
    if (shot.dialogue && anchors[shot.dialogue.actor]) {
      const a = anchors[shot.dialogue.actor];
      drawBubble(ctx, project, shot.dialogue.text, a.x, a.y, t, L);
    }
    drawCaption(ctx, project, shot, t, L);
  }

  // transitions
  const prev = at.index > 0 ? project.shots[at.index - 1] : null;
  if (prev && prev.transition !== 'cut' && t < 0.35) {
    ctx.globalAlpha = 1 - easeOut(t / 0.35);
    ctx.fillStyle = prev.transition === 'flash' ? LINE : INK;
    ctx.fillRect(0, 0, L.W, L.H);
    ctx.globalAlpha = 1;
  }
  const last = at.index === project.shots.length - 1;
  if (!last && shot.transition !== 'cut' && dur - t <= 0.25) {
    const q = clamp(1 - (dur - t - 1 / FPS) / 0.25, 0, 1);
    ctx.globalAlpha = q * q;
    ctx.fillStyle = shot.transition === 'flash' ? LINE : INK;
    ctx.fillRect(0, 0, L.W, L.H);
    ctx.globalAlpha = 1;
  }
  if (last && project.fadeOut) {
    const left = at.frames - 1 - at.local;
    if (left < 8) {
      ctx.globalAlpha = 1 - left / 8;
      ctx.fillStyle = INK;
      ctx.fillRect(0, 0, L.W, L.H);
      ctx.globalAlpha = 1;
    }
  }
}

/** Never let one bad frame crash the editor. */
export function renderFrameSafe(project: Project, frame: number, ctx: Ctx, out: Size, opts?: RenderOptions): void {
  try {
    renderFrame(project, frame, ctx, out, opts);
  } catch (err) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.fillStyle = LINE;
    ctx.font = '700 24px Cairo, sans-serif';
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    ctx.fillText('تعذّر رسم هذا الإطار', out.width / 2, out.height / 2);
    console.error(err);
  }
}
