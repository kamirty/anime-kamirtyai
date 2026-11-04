import { SKINS, isFemale, type Character } from '../../domain/types';
import { circle, headwearFor, rig, sleeveColor, strokeLimb, wearColor, type CharacterDraw, type Limb, type Pose } from './body';
import { kummaEmbroidery } from './head';
import { INK, LINE, MOON, P, type Ctx, type Paint, cel, darken, fill, lighten, shade, stroke } from './paint';

/**
 * Side (profile) view used for walking and running. Drawn facing right; facing left mirrors it.
 * Head units match the front head (face centre at the origin, crown −285, chin about 250).
 */

export interface SideGait {
  facing: 1 | -1;
  /** 0..1 position in the step cycle, already snapped to drawings. */
  phase: number;
  run: boolean;
}

const FACE_S =
  'M0,-290 C130,-290 220,-220 236,-120 C242,-80 244,-30 246,0 L270,44 C272,52 262,60 246,62 C244,80 240,98 236,112 C232,130 230,150 222,170 C210,200 180,226 120,244 C80,256 30,258 -10,250 C-110,226 -190,150 -205,40 C-215,-40 -210,-120 -180,-190 C-140,-260 -70,-290 0,-290 Z';
const FACE_S_SHADE = 'M-205,40 C-190,150 -110,226 -10,250 C-60,200 -90,120 -96,40 Z';
const EAR_S = 'M-70,-30 C-104,-30 -112,10 -108,36 C-104,66 -84,82 -58,76 C-50,40 -50,0 -70,-30 Z';
const KUMMA_S = 'M-214,-118 L-206,-300 C-150,-352 160,-352 232,-306 L246,-122 Q20,-92 -214,-118 Z';
const KUMMA_S_SHADE = 'M-214,-118 L-206,-300 C-190,-318 -160,-330 -120,-338 C-136,-280 -140,-200 -136,-108 Z';
const HAIR_S =
  'M-216,-60 C-240,-230 -130,-334 20,-332 C150,-328 238,-256 250,-140 L226,-152 L214,-106 L190,-156 L160,-112 L136,-162 L70,-168 C10,-150 -40,-120 -70,-70 L-100,-20 L-130,-74 L-160,6 L-188,-50 Z';
const MASSAR_S = 'M-232,-110 C-250,-232 -170,-356 20,-362 C200,-350 266,-240 250,-116 Q10,-84 -232,-110 Z';
const HOOD_S = 'M-20,-374 C160,-374 278,-262 270,-118 L262,-90 L246,-110 C232,-196 160,-232 64,-230 C30,-110 34,60 72,252 L160,240 L214,196 L234,250 C246,330 254,400 272,474 L-300,474 C-322,300 -320,120 -290,-60 C-258,-250 -160,-374 -20,-374 Z';
const GHUTRA_S = 'M-20,-366 C160,-366 270,-262 266,-124 L258,-96 L246,-112 C232,-196 160,-234 64,-232 C40,-120 40,20 60,150 L40,160 C10,260 -40,360 -80,440 L-330,440 C-320,300 -316,120 -286,-60 C-254,-250 -160,-366 -20,-366 Z';
const EYE_S = 'M120,-28 C138,-54 186,-54 200,-24 C196,6 178,28 150,30 C132,28 122,10 120,-28 Z';

function sideHead(ctx: Ctx, ch: Character, o: { skin: string; happy: boolean; set: boolean; blink: boolean; mouthOpen: boolean; paint?: Paint }) {
  const p = o.paint;
  const hw = headwearFor(ch);
  const wrapped = hw === 'hijab' || hw === 'lihaf' || hw === 'ghutra';
  if (!wrapped) {
    cel(ctx, EAR_S, o.skin, 6, p);
    stroke(ctx, 'M-80,-6 C-92,10 -92,34 -78,48', INK, 3, p);
  }
  cel(ctx, FACE_S, o.skin, 6, p);
  shade(ctx, FACE_S_SHADE, p);
  if (!wrapped) cel(ctx, EAR_S, o.skin, 6, p);
  // eye
  if (o.blink || o.happy) {
    stroke(ctx, o.happy ? 'M124,-6 C140,-40 184,-40 198,-8' : 'M122,4 C140,18 182,18 200,4', '#120e0c', 12, p);
  } else {
    fill(ctx, o.set ? 'M120,-14 C140,-40 186,-40 200,-14 C196,10 178,28 150,30 C132,28 122,12 120,-14 Z' : EYE_S, '#f6f3ee', p);
    if (!p?.sil) {
      ctx.save();
      ctx.clip(P(EYE_S));
      ctx.fillStyle = '#4a2a16';
      ctx.beginPath();
      ctx.ellipse(178, -4, 20, 34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#120e0c';
      ctx.beginPath();
      ctx.ellipse(182, -6, 10, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = LINE;
      ctx.fillRect(176, -30, 9, 12);
      ctx.fillStyle = MOON;
      ctx.beginPath();
      ctx.arc(168, 14, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    stroke(ctx, o.set ? 'M112,-12 C134,-46 188,-50 206,-14' : 'M110,-28 C130,-64 190,-64 208,-22', '#120e0c', 12, p);
    stroke(ctx, 'M110,-28 L94,-40', '#120e0c', 7, p);
  }
  fill(ctx, o.set ? 'M112,-82 C146,-92 186,-104 218,-112 L220,-98 C186,-88 148,-74 116,-68 Z' : 'M112,-96 C142,-112 188,-110 218,-90 L212,-78 C184,-96 144,-98 116,-84 Z', ch.hair, p);
  // mouth
  if (o.mouthOpen || o.happy) cel(ctx, 'M206,118 C214,140 232,142 240,122 C228,126 216,124 206,118 Z', '#3a1410', 3, p);
  else stroke(ctx, 'M212,128 L236,124', INK, 5, p);

  switch (hw) {
    case 'kumma': {
      fill(ctx, KUMMA_S, '#f6f3ee', p);
      if (!p?.sil) {
        ctx.save();
        ctx.clip(P(KUMMA_S));
        for (const e of kummaEmbroidery([ch.accent, '#d7192a', '#7a4f35'])) {
          if (e.stroke) stroke(ctx, e.d, e.color, e.stroke);
          else fill(ctx, e.d, e.color);
        }
        shade(ctx, KUMMA_S_SHADE, p);
        ctx.restore();
      }
      stroke(ctx, KUMMA_S, INK, 6, p);
      break;
    }
    case 'massar': {
      cel(ctx, MASSAR_S, ch.accent, 6, p);
      if (!p?.sil) {
        ctx.save();
        ctx.clip(P(MASSAR_S));
        for (let i = -6; i <= 6; i++) {
          const x = i * 46;
          stroke(ctx, `M${x - 120},-100 C${x - 40},-200 ${x + 40},-280 ${x + 140},-380`, i % 2 ? lighten(ch.accent, 0.35) : darken(ch.accent, 0.3), 14);
        }
        ctx.restore();
      }
      cel(ctx, 'M-226,-160 C-280,-140 -292,-70 -268,-10 L-240,-24 C-256,-70 -250,-120 -214,-140 Z', darken(ch.accent, 0.1), 5, p);
      stroke(ctx, MASSAR_S, INK, 6, p);
      break;
    }
    case 'hair':
      cel(ctx, HAIR_S, ch.hair, 6, p);
      break;
    default: {
      const outer = hw === 'ghutra' ? GHUTRA_S : HOOD_S;
      const hole = 'M64,-232 C160,-236 240,-200 252,-110 L262,0 L284,46 L254,66 L242,120 C232,170 212,208 172,236 C132,256 94,258 64,250 C32,120 32,-120 64,-232 Z';
      const path = new Path2D(outer);
      path.addPath(P(hole));
      const color = wearColor(ch);
      ctx.save();
      ctx.fillStyle = p?.sil ?? color;
      ctx.fill(path, 'evenodd');
      if (!p?.sil) {
        ctx.clip(path, 'evenodd');
        if (hw === 'ghutra') {
          ctx.strokeStyle = ch.accent;
          ctx.lineWidth = 7;
          ctx.globalAlpha = 0.85;
          for (let i = -14; i <= 14; i++) {
            ctx.beginPath();
            ctx.moveTo(i * 42 - 500, -400);
            ctx.lineTo(i * 42 + 500, 600);
            ctx.moveTo(i * 42 + 500, -400);
            ctx.lineTo(i * 42 - 500, 600);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
        fill(ctx, 'M-320,-60 C-320,100 -310,290 -320,480 L-220,480 C-232,290 -236,100 -230,-60 C-226,-200 -170,-300 -90,-350 C-220,-330 -320,-236 -320,-60 Z', INK, undefined, 0.2);
        if (hw === 'lihaf') {
          ctx.setLineDash([2, 22]);
          stroke(ctx, 'M60,-252 C170,-256 262,-206 272,-110', ch.accent, 16);
          ctx.setLineDash([]);
        }
      }
      ctx.restore();
      if (!p?.sil) {
        ctx.save();
        ctx.lineWidth = 6;
        ctx.strokeStyle = INK;
        ctx.lineJoin = 'round';
        ctx.stroke(P(outer));
        ctx.stroke(P(hole));
        ctx.restore();
      }
      if (hw === 'ghutra') {
        ctx.save();
        ctx.strokeStyle = p?.sil ?? '#111111';
        ctx.lineWidth = 26;
        for (const y of [-268, -236]) {
          ctx.beginPath();
          ctx.ellipse(10, y, 236, 26, 0.04, Math.PI * 1.05, Math.PI * 1.95);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }
}

const n = (v: number) => v.toFixed(1);

/** Side-view garment from the shoulders to the hem; the hem stretches between the feet while walking. */
function robeSide(H: number, top: number, hemY: number, back: number, front: number, flare: number): string {
  const sh = top + 0.04 * H;
  return (
    `M${n(-0.05 * H)},${n(top - 0.004 * H)} C${n(-0.075 * H)},${n(top + 0.005 * H)} ${n(-0.085 * H)},${n(sh)} ${n(-0.085 * H)},${n(sh + 0.05 * H)} ` +
    `L${n(-0.08 * H)},${n(top + 0.3 * H)} L${n(back - flare * 0.4)},${n(hemY)} L${n(front + flare)},${n(hemY)} L${n(0.085 * H)},${n(top + 0.3 * H)} ` +
    `L${n(0.08 * H)},${n(sh + 0.04 * H)} C${n(0.075 * H)},${n(top + 0.01 * H)} ${n(0.05 * H)},${n(top - 0.004 * H)} ${n(0.03 * H)},${n(top - 0.006 * H)} Z`
  );
}

function sideLimb(s: [number, number], a1: number, bend: number, l1: number, l2: number): Limb {
  const e: [number, number] = [s[0] + Math.sin(a1) * l1, s[1] + Math.cos(a1) * l1];
  const a2 = a1 + bend;
  return { s, e, h: [e[0] + Math.sin(a2) * l2, e[1] + Math.cos(a2) * l2] };
}

export function drawCharacterSide(ctx: Ctx, ch: Character, pose: Pose, gait: SideGait, paint?: Paint): CharacterDraw {
  const r = rig(ch);
  const H = r.H;
  const skin = SKINS[Math.max(0, Math.min(3, ch.skin))];
  const o = 0.0055 * H;
  const female = isFemale(ch.kind);
  const legsVisible = (ch.outfit === 'casual' && !female) || ch.outfit === 'labcoat';
  const ph = gait.phase * Math.PI * 2;
  const amp = gait.run ? 0.78 : 0.42;
  // near leg leads at phase 0
  const legNear = amp * Math.cos(ph);
  const legFar = -legNear;
  const kneeNear = Math.max(0, -Math.sin(ph)) * (gait.run ? 1.4 : 0.7);
  const kneeFar = Math.max(0, Math.sin(ph)) * (gait.run ? 1.4 : 0.7);
  const bob = gait.run ? -Math.abs(Math.sin(ph)) * 0.05 * H : -Math.abs(Math.sin(ph)) * 0.014 * H;
  const lean = gait.run ? 0.16 : 0.04;
  const legLen = -r.hipY - 0.02 * H;

  ctx.save();
  ctx.translate(0, pose.dy + bob);
  ctx.scale(gait.facing, 1);
  ctx.translate(0, r.hipY);
  ctx.rotate(lean);
  ctx.translate(0, -r.hipY);

  const top = r.sY;
  const hip: [number, number] = [0, r.hipY];
  const nearLeg = sideLimb(hip, legNear, -kneeNear, legLen / 2, legLen / 2);
  const farLeg = sideLimb(hip, legFar, -kneeFar, legLen / 2, legLen / 2);
  const foot = (L: Limb, dark: string, near: boolean) => {
    ctx.save();
    ctx.translate(L.h[0], L.h[1]);
    ctx.beginPath();
    ctx.ellipse(0.025 * H, 0, 0.05 * H, 0.016 * H, 0, 0, Math.PI * 2);
    ctx.fillStyle = paint?.sil ?? dark;
    ctx.fill();
    if (!paint?.sil) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = o * 0.7;
      ctx.stroke();
    }
    if (!legsVisible) {
      ctx.beginPath();
      ctx.ellipse(0.02 * H, -0.013 * H, 0.032 * H, 0.012 * H, 0, Math.PI, Math.PI * 2);
      ctx.fillStyle = paint?.sil ?? (near ? skin : darken(skin, 0.12));
      ctx.fill();
    }
    ctx.restore();
  };

  // far arm and far leg sit behind the body
  const armSwing = (gait.run ? 0.8 : 0.4) * Math.cos(ph);
  const sleeve = sleeveColor(ch);
  const sl = ch.outfit === 'abaya' ? r.sleeve * 1.2 : r.sleeve;
  const shoulder: [number, number] = [0, top + 0.035 * H];
  const farArm = sideLimb(shoulder, armSwing, gait.run ? -1.5 : -0.25, r.ua, r.fa);
  const nearArm = sideLimb(shoulder, -armSwing, gait.run ? -1.5 : -0.25, r.ua, r.fa);
  strokeLimb(ctx, farArm, darken(sleeve, 0.12), sl, o, paint);
  circle(ctx, farArm.h[0], farArm.h[1], r.hand, darken(skin, 0.12), o * 0.8, paint);

  if (legsVisible) {
    const pants = ch.outfit === 'labcoat' ? '#33363f' : '#2b2f3a';
    strokeLimb(ctx, farLeg, darken(pants, 0.25), r.pant, o, paint);
    foot(farLeg, '#121214', false);
    strokeLimb(ctx, nearLeg, pants, r.pant, o, paint);
    foot(nearLeg, '#1d1d22', true);
  } else {
    // shins under the hem (sirwal for the Omani dress), then the sandals
    const shin = ch.outfit === 'omaniDress' ? ch.accent : skin;
    const lower = (L: Limb): Limb => ({ s: L.e, e: L.e, h: L.h });
    strokeLimb(ctx, lower(farLeg), darken(shin, 0.15), 0.045 * H, o * 0.8, paint);
    foot(farLeg, '#1d140f', false);
    strokeLimb(ctx, lower(nearLeg), shin, 0.045 * H, o * 0.8, paint);
    foot(nearLeg, '#2a1d17', true);
  }

  // neck
  cel(ctx, `M${n(-0.02 * H)},${n(r.chin - 0.01 * H)} L${n(-0.03 * H)},${n(top + 0.02 * H)} L${n(0.035 * H)},${n(top + 0.02 * H)} L${n(0.03 * H)},${n(r.chin - 0.01 * H)} Z`, skin, o, paint);

  // garment
  const frontX = Math.max(nearLeg.h[0], farLeg.h[0]);
  const backX = Math.min(nearLeg.h[0], farLeg.h[0]);
  if (legsVisible) {
    const shirtHem = ch.outfit === 'labcoat' ? top + 0.5 * H : top + 0.33 * H;
    cel(ctx, robeSide(H, top, top + 0.33 * H, -0.08 * H, 0.085 * H, 0), ch.color, o, paint);
    if (ch.outfit === 'labcoat') {
      cel(ctx, robeSide(H, top, shirtHem, -0.09 * H, 0.08 * H, (frontX - backX) * 0.15), '#f8f8f6', o, paint);
      shade(ctx, `M${n(-0.085 * H)},${n(top + 0.09 * H)} L${n(-0.09 * H)},${n(shirtHem)} L${n(-0.04 * H)},${n(shirtHem)} L${n(-0.04 * H)},${n(top + 0.09 * H)} Z`, paint);
    } else shade(ctx, `M${n(-0.085 * H)},${n(top + 0.09 * H)} L${n(-0.08 * H)},${n(shirtHem)} L${n(-0.04 * H)},${n(shirtHem)} L${n(-0.04 * H)},${n(top + 0.09 * H)} Z`, paint);
  } else {
    // running lifts the hem and sweeps it back; the hem never stretches wider than the cloth allows
    const hemY = (ch.outfit === 'omaniDress' ? -0.17 * H : r.hemY) - (gait.run ? 0.1 * H : 0);
    const flare = ch.outfit === 'abaya' || ch.outfit === 'omaniDress' ? 0.03 * H : 0.01 * H;
    const back = Math.max(-0.17 * H, Math.min(-0.09 * H, backX - 0.02 * H)) - (gait.run ? 0.04 * H : 0);
    const front = Math.min(0.15 * H, Math.max(0.1 * H, frontX + 0.04 * H));
    const robe = robeSide(H, top, hemY, back, front, flare);
    cel(ctx, robe, ch.color, o, paint);
    shade(ctx, `M${n(-0.085 * H)},${n(top + 0.09 * H)} L${n(-0.08 * H)},${n(top + 0.3 * H)} L${n(back)},${n(hemY)} L${n(-0.03 * H)},${n(hemY)} L${n(-0.04 * H)},${n(top + 0.09 * H)} Z`, paint);
    if (ch.outfit === 'omaniDress') {
      stroke(ctx, `M${n(back)},${n(hemY - 0.025 * H)} L${n(front + flare)},${n(hemY - 0.025 * H)}`, ch.accent, o * 2.2, paint);
    }
    if (ch.outfit === 'dishdasha' || ch.outfit === 'massar') {
      // tassel hanging from the collar at the chest
      const tx = 0.05 * H;
      const ty = top + 0.03 * H;
      const s = 0.00072 * H;
      const sw = Math.sin(ph) * 6 * s;
      stroke(ctx, `M${n(tx)},${n(ty)} C${n(tx + 6 * s)},${n(ty + 20 * s)} ${n(tx + sw)},${n(ty + 40 * s)} ${n(tx + sw)},${n(ty + 50 * s)}`, INK, 8 * s, paint);
      stroke(ctx, `M${n(tx)},${n(ty)} C${n(tx + 6 * s)},${n(ty + 20 * s)} ${n(tx + sw)},${n(ty + 40 * s)} ${n(tx + sw)},${n(ty + 50 * s)}`, ch.color, 4 * s, paint);
      cel(ctx, `M${n(tx + sw)},${n(ty + 46 * s)} C${n(tx + sw + 14 * s)},${n(ty + 66 * s)} ${n(tx + sw + 12 * s)},${n(ty + 106 * s)} ${n(tx + sw - 2 * s)},${n(ty + 124 * s)} C${n(tx + sw - 16 * s)},${n(ty + 106 * s)} ${n(tx + sw - 16 * s)},${n(ty + 66 * s)} ${n(tx + sw)},${n(ty + 46 * s)} Z`, ch.color, 3 * s, paint);
      cel(ctx, `M${n(tx + sw - 2 * s)},${n(ty + 128 * s)} C${n(tx + sw + 10 * s)},${n(ty + 148 * s)} ${n(tx + sw + 16 * s)},${n(ty + 176 * s)} ${n(tx + sw + 18 * s)},${n(ty + 196 * s)} L${n(tx + sw - 22 * s)},${n(ty + 196 * s)} C${n(tx + sw - 20 * s)},${n(ty + 176 * s)} ${n(tx + sw - 14 * s)},${n(ty + 148 * s)} ${n(tx + sw - 2 * s)},${n(ty + 128 * s)} Z`, ch.color, 3 * s, paint);
    }
  }

  // head
  ctx.save();
  ctx.translate(0.01 * H, r.headCY);
  ctx.scale(r.k, r.k);
  sideHead(ctx, ch, {
    skin,
    happy: pose.expression === 'happy' || pose.expression === 'amazed',
    set: pose.expression === 'set' || pose.expression === 'angry',
    blink: pose.blink,
    mouthOpen: pose.mouthOpen || (pose.mouth ?? 0) > 0,
    paint,
  });
  ctx.restore();

  // near arm in front
  strokeLimb(ctx, nearArm, sleeve, sl, o, paint);
  circle(ctx, nearArm.s[0], nearArm.s[1], sl / 2 - o * 0.2, sleeve, 0, paint);
  circle(ctx, nearArm.h[0], nearArm.h[1], r.hand, skin, o * 0.8, paint);
  ctx.restore();

  return {
    headTop: r.headCY - 372 * r.k + pose.dy + bob,
    headCY: r.headCY + pose.dy + bob,
    hands: [
      [nearArm.h[0] * gait.facing, nearArm.h[1] + pose.dy],
      [farArm.h[0] * gait.facing, farArm.h[1] + pose.dy],
    ],
  };
}
