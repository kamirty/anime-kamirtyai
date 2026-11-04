import { useEffect, useState } from 'react';
import type { Project } from '../../domain/types';
import { LESSONS } from '../../lab/lessons';
import { MotionLibrary } from './MotionLibrary';

/** The Motion Lab inside the studio: short interactive lessons on anime motion, each one applicable to your scene. */
interface Props {
  project: Project;
  shotIndex: number;
  onClose: () => void;
  onTry: (description: string) => void;
  onApply: (next: Project, label: string, everyShot: boolean) => void;
}

export function MotionLab({ project, shotIndex, onClose, onTry, onApply }: Props) {
  const [tab, setTab] = useState<'library' | 'lessons'>('library');
  const [index, setIndex] = useState(0);
  const lesson = LESSONS[index];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-labelledby="lab-title" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal lab-modal">
        <div className="modal-head">
          <h2 id="lab-title">مختبر الحركة: لماذا يتحرك الأنمي بهذه الطريقة؟</h2>
          <button type="button" className="ghost" onClick={onClose} aria-label="إغلاق">
            ✕
          </button>
        </div>
        <div className="tabs lab-tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'library'} className={tab === 'library' ? 'active' : ''} onClick={() => setTab('library')}>
            مكتبة الحركات (50)
          </button>
          <button role="tab" aria-selected={tab === 'lessons'} className={tab === 'lessons' ? 'active' : ''} onClick={() => setTab('lessons')}>
            دروس التحريك (8)
          </button>
        </div>
        {tab === 'library' && <MotionLibrary project={project} shotIndex={shotIndex} onApply={onApply} />}
        {tab === 'lessons' && (
        <div className="lab">
          <nav className="lab-nav" aria-label="الدروس">
            <ol>
              {LESSONS.map((l, i) => (
                <li key={l.id}>
                  <button type="button" className={i === index ? 'active' : ''} onClick={() => setIndex(i)} aria-current={i === index ? 'page' : undefined}>
                    <span className="n">{i + 1}</span> {l.title}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
          <article className="lesson" key={lesson.id}>
            <span className="muted small">
              الدرس {index + 1} من {LESSONS.length}
            </span>
            <h1>{lesson.title}</h1>
            <p className="idea">{lesson.idea}</p>
            {lesson.body}
            <button type="button" className="try-it" onClick={() => onTry(lesson.tryIt)}>
              🎬 طبّق الدرس على مشهد في الاستوديو: «{lesson.tryIt.slice(0, 48)}
              {lesson.tryIt.length > 48 ? '…' : ''}»
            </button>
            <div className="lesson-nav">
              <button type="button" onClick={() => setIndex(index - 1)} disabled={index === 0}>
                → الدرس السابق
              </button>
              <button type="button" className="primary" onClick={() => setIndex(index + 1)} disabled={index === LESSONS.length - 1}>
                الدرس التالي ←
              </button>
            </div>
          </article>
        </div>
        )}
      </div>
    </div>
  );
}
