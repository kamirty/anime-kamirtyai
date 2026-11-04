/** Self-hosted Arabic fonts (SIL OFL 1.1, bundled via @fontsource) used for on-screen text in the video. */
export interface FontOption {
  id: string;
  label: string;
  family: string;
  bold: 400 | 700;
}

export const FONTS: FontOption[] = [
  { id: 'ruqaa', label: 'عارف رقعة', family: 'Aref Ruqaa', bold: 700 },
  { id: 'reemkufi', label: 'ريم كوفي', family: 'Reem Kufi', bold: 700 },
  { id: 'cairo', label: 'القاهرة', family: 'Cairo', bold: 700 },
  { id: 'tajawal', label: 'تجوال', family: 'Tajawal', bold: 700 },
  { id: 'lalezar', label: 'لاله‌زار', family: 'Lalezar', bold: 400 },
  { id: 'messiri', label: 'المسيري', family: 'El Messiri', bold: 700 },
  { id: 'amiri', label: 'أميري', family: 'Amiri', bold: 700 },
  { id: 'marhey', label: 'مرحي', family: 'Marhey', bold: 700 },
  { id: 'lemonada', label: 'ليمونادة', family: 'Lemonada', bold: 700 },
  { id: 'baloo', label: 'بالو بهيجان', family: 'Baloo Bhaijaan 2', bold: 700 },
];

export const FONT_IDS = FONTS.map((f) => f.id);
export const DEFAULT_FONT = 'ruqaa';

export const fontById = (id: string): FontOption => FONTS.find((f) => f.id === id) ?? FONTS[0];

export const cssFamily = (f: FontOption): string => `"${f.family}", "Cairo", Tahoma, sans-serif`;

/** Loads both weights with Arabic and Latin glyphs before frames are drawn. */
export async function ensureFontLoaded(id: string): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  const f = fontById(id);
  const sample = 'أبجد هوز ١٢٣ 123';
  await Promise.all([
    document.fonts.load(`400 32px "${f.family}"`, sample),
    document.fonts.load(`${f.bold} 32px "${f.family}"`, sample),
    document.fonts.load(`700 32px "Cairo"`, sample),
  ]).catch(() => undefined);
}
