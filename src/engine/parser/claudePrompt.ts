import { ACTIONS, CAMERAS, EFFECTS, EXPRESSIONS, KINDS, MUSIC, OUTFITS, PLACES, SIZES, TIMES, TRANSITIONS, MAX_SHOT_SECONDS, MAX_TOTAL_SECONDS, type Aspect } from '../../domain/types';
import { FONTS } from '../../design/fonts';

const list = (items: { id: string; label: string }[]) => items.map((x) => `"${x.id}" (${x.label})`).join('، ');

/**
 * The prompt a visitor copies into Claude (or any assistant) when the built-in library is not enough.
 * The assistant answers with project JSON that this studio validates, previews and exports. No code is executed:
 * new drawings come back as SVG path data only.
 */
export function buildClaudePrompt(description: string, aspect: Aspect): string {
  return `أنت مخرج أنمي قصير. حوّل الوصف التالي إلى ملف مشروع JSON لأداة «استوديو الأنمي» من Kamirty.AI.
أجب بكتلة واحدة \`\`\`json فقط، بلا شرح قبلها أو بعدها.

## الوصف
${description.trim() || '(اكتب وصف المشهد هنا)'}

## قواعد الإخراج
- قسّم المشهد إلى لقطات (shots). المجموع لا يتجاوز ${MAX_TOTAL_SECONDS} ثانية، وكل لقطة بين 1.5 و${MAX_SHOT_SECONDS} ثانية.
- ابدأ بلقطة واسعة تعرّف بالمكان، ثم اقترب من الشخصية، ثم الحدث، ثم لقطة ختام فيها العبارة إن وُجدت.
- حركة قوية واحدة فقط (power) إن احتاجها المشهد، ومدتها 4.5 ثانية على الأقل، وحجم لقطتها "wide".
- النصوص العربية تُكتب حرفيًا كما وردت في الوصف، ولا تُترجم.
- استعمل القيم المسموحة أدناه فقط، والألوان بصيغة #rrggbb.

## الشكل
{
  "version": 1,
  "title": "عنوان قصير",
  "aspect": "${aspect}",
  "font": "${FONTS[0].id}",
  "cast": [ { "id": "c1", "name": "سالم", "kind": "boy", "outfit": "dishdasha", "skin": 2, "color": "#f6f3ee", "accent": "#0b8a3c", "hair": "#16110e" } ],
  "shots": [
    {
      "duration": 3, "place": "fort", "time": "night", "size": "wide", "camera": "push",
      "actors": [ { "cast": "c1", "action": "stand", "expression": "calm", "x": 0.5 } ],
      "effects": [], "transition": "dip",
      "dialogue": { "actor": 0, "text": "جملة الشخصية" },
      "text": { "style": "caption", "main": "العبارة الرئيسية", "sub": "سطر صغير اختياري" },
      "props": [ { "ref": "p1", "x": 0.7, "y": 0.3, "size": 0.15, "motion": "float" } ]
    }
  ],
  "props": [ { "id": "p1", "name": "جمل", "parts": [ { "d": "M20,150 C40,90 160,90 180,150 Z", "fill": "#c8955c", "stroke": "#070a16", "width": 4 } ] } ],
  "audio": { "ambience": true, "sfx": true, "music": "calm" },
  "fadeOut": true
}

## القيم المسموحة
- aspect: "portrait" (عمودي 9:16)، "landscape" (أفقي 16:9)، "square" (مربع)
- font: ${FONTS.map((f) => `"${f.id}" (${f.label})`).join('، ')}
- kind: ${list(KINDS)}
- outfit: ${OUTFITS.map((o) => `"${o.id}" (${o.label}${o.for === 'both' ? '' : o.for === 'male' ? '، للذكور' : '، للإناث'})`).join('، ')}
- skin: 0 (فاتح) إلى 3 (داكن)
- place: ${list(PLACES)}
- time: ${list(TIMES)}
- size: ${list(SIZES)}
- camera: ${list(CAMERAS)}
- action: ${list(ACTIONS)}
- expression: ${list(EXPRESSIONS)}
- effects: ${list(EFFECTS)}
- transition: ${list(TRANSITIONS)}
- music: ${list(MUSIC)}
- x: موضع الشخصية أفقيًا من 0.05 إلى 0.95. للمشي أضف "to" لنقطة الوصول.
- dialogue.actor: رقم الشخصية داخل actors (يبدأ من 0)، وتظهر الجملة في فقاعة كلام.
- text.style: "caption" (شريط سفلي) أو "title" (عنوان كبير في المنتصف).

## رسومات جديدة (props)
إذا احتاج المشهد شيئًا غير موجود في المكتبة (حيوان، سيارة، صاروخ، كتاب…) ارسمه في "props":
- مربع الرسم 200×200، والمسارات بصيغة SVG path (الحرف d) بالأوامر M L H V C S Q T A Z والأرقام فقط.
- لكل جزء "fill" و"stroke" بألوان #rrggbb، و"width" للخط. أسلوب أنمي مسطح: ألوان صريحة وخط داكن (#070a16) حول الشكل وظل واحد بشفافية 0.2.
- ضعه في اللقطة عبر "props" داخل الـ shot: x وy من 0 إلى 1، وsize نسبة من ارتفاع الإطار، وmotion: "none" أو "float" أو "bounce" أو "spin" أو "fly" أو "grow" أو "pulse".
- لا تستخدم أكثر من 12 رسمة، ولا أكثر من 40 جزءًا في الرسمة.`;
}
