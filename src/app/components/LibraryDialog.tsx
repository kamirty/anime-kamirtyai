import { useState } from 'react';
import type { Project } from '../../domain/types';
import { deleteFromLibrary, readLibrary, saveToLibrary, type LibraryEntry } from '../../storage/library';

interface Props {
  project: Project;
  description: string;
  onLoad: (project: Project, description: string) => void;
  onClose: () => void;
}

export function LibraryDialog({ project, description, onLoad, onClose }: Props) {
  const [items, setItems] = useState<LibraryEntry[]>(readLibrary);
  const [error, setError] = useState('');
  const save = () => {
    try {
      setItems(saveToLibrary(project, description));
      setError('');
    } catch {
      setError('تعذّر الحفظ: قد تكون مساحة المتصفح ممتلئة. نزّل المشروع بصيغة JSON للاحتفاظ بنسخة.');
    }
  };
  const remove = (id: string) => {
    if (!window.confirm('هل تريد حذف هذه النسخة المحفوظة من جهازك؟')) return;
    try {
      setItems(deleteFromLibrary(id));
      setError('');
    } catch { setError('تعذّر حذف المشروع.'); }
  };

  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-labelledby="library-title" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal library-dialog">
        <div className="modal-head">
          <h2 id="library-title">مشاريعي المحفوظة</h2>
          <button type="button" className="ghost" aria-label="إغلاق" onClick={onClose}>✕</button>
        </div>
        <p className="small muted">هذه نسخ على جهازك فقط، وليست سحابة. تنزيل ملف المشروع JSON أفضل لحفظ نسخة دائمة. ملفات الصوت المستوردة أو المسجلة لا تدخل في هذه النسخ.</p>
        <button type="button" className="primary" onClick={save}>＋ احفظ نسخة من المشروع الحالي</button>
        {error && <p className="alert error" role="status">{error}</p>}
        <div className="library-entries">
          {items.length === 0 && <p className="muted">لا توجد مشاريع محفوظة بعد.</p>}
          {items.map((item) => (
            <div className="library-item" key={item.id}>
              <div className="library-info">
                <b>{item.title}</b>
                <small className="muted">{item.project.shots.length} لقطة · {item.updated ? new Date(item.updated).toLocaleString('ar-OM') : 'دون تاريخ'}</small>
              </div>
              <button type="button" onClick={() => { onLoad(item.project, item.description); onClose(); }}>افتح</button>
              <button type="button" className="danger" onClick={() => remove(item.id)}>حذف</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
