import { describe, expect, it } from 'vitest';
import { describeToProject, splitMainSub } from '../engine/parser/describe';

const show = (d: string) => {
  const { project, report } = describeToProject(d);
  return { project, report, brief: project.shots.map((s) => `${s.place}/${s.time}/${s.size} [${s.actors.map((a) => `${a.cast}:${a.action}`).join(',')}] fx=${s.effects.join('+')} ${s.dialogue ? 'D:' + s.dialogue.text : ''} ${s.text ? 'T:' + s.text.main + (s.text.sub ? '|' + s.text.sub : '') : ''} ${s.duration}s` ) };
};

describe('describeToProject', () => {
  it('national day: boy strikes the moon, caption split into main and sub', () => {
    const r = show('ولد بالزي العُماني فوق قلعة نزوى ليلاً ويضرب القمر بحركة من ابدعاتك الانمية ليظهر عبارة كل عام وعُماننا بخير .. اليوم الوطني 56');
    console.log(r.brief.join('\n'), r.report);
    const shots = r.project.shots;
    expect(shots.some((s) => s.actors.some((a) => a.action === 'power'))).toBe(true);
    const t = shots.find((s) => s.text)?.text;
    expect(t?.main).toBe('كل عام وعُماننا بخير');
    expect(t?.sub).toBe('اليوم الوطني 56');
    expect(shots[0].place).toBe('fort');
    expect(shots[0].time).toBe('night');
    expect(r.project.cast[0].outfit).toBe('dishdasha');
  });
  it('classroom dialogue with names and quotes', () => {
    const r = show('في الفصل صباحاً، معلمة تقف أمام السبورة وتقول «اليوم نتعلم حرف الضاد». ثم طالبة اسمها مريم ترفع يدها وتسأل «لماذا هو مميز؟» ثم يصفق الطلاب.');
    console.log(r.brief.join('\n'), r.report);
    expect(r.project.shots.some((s) => s.dialogue?.text === 'اليوم نتعلم حرف الضاد')).toBe(true);
    expect(r.project.cast.some((c) => c.name === 'مريم')).toBe(true);
    expect(r.project.shots.every((s) => s.place === 'classroom')).toBe(true);
  });
  it('eid greeting with colours', () => {
    const r = show('بنت بلحاف أحمر وأمها في البيت يحتفلان بالعيد ويلوحان لنا: "عيدكم مبارك"');
    console.log(r.brief.join('\n'), r.report);
    expect(r.project.shots.length).toBeGreaterThan(0);
  });
  it('reports unknown words', () => {
    const r = show('ولد يركب جملاً في الصحراء عند الغروب');
    console.log(r.brief.join('\n'), r.report);
    expect(r.report.unknown.length).toBeGreaterThan(0);
  });
  it('splitMainSub', () => {
    expect(splitMainSub('أ .. ب')).toEqual({ main: 'أ', sub: 'ب' });
  });
});
