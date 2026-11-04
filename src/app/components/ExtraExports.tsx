import { useRef, useState } from 'react';
import type { Project } from '../../domain/types';
import { downloadBlob, safeName } from '../../storage/projectFile';
import { printStoryboard } from '../../engine/export/storyboard';

export function ExtraExports({ project, disabled }: { project: Project; disabled: boolean }) {
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const cancelRef = useRef<AbortController | null>(null);
  const gif = async () => {
    const controller = new AbortController();
    cancelRef.current = controller;
    setWorking(true);
    setError('');
    try {
      const { exportShortGif } = await import('../../engine/export/gif');
      const blob = await exportShortGif(project, (i, n) => setProgress(Math.round(i / n * 100) + '%'), controller.signal);
      if (controller.signal.aborted) return;
      downloadBlob(blob, safeName(project.title) + '.gif');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر صنع GIF.');
    } finally { setWorking(false); cancelRef.current = null; }
  };
  const storyboard = () => {
    setError('');
    if (!printStoryboard(project)) setError('منع المتصفح فتح نافذة لوحة القصة. اسمح بالنوافذ المنبثقة للموقع ثم أعد المحاولة.');
  };

  return (
    <section className="extra-exports">
      <h3>تنسيقات أخرى</h3>
      <p className="small muted">ملف GIF متحرك لأول 4 ثوانٍ، بدون صوت، بعرض أقصى 360 بكسل. أو لوحة مشاهد قابلة للطباعة والحفظ PDF.</p>
      <div className="row wrap">
        <button type="button" disabled={disabled || working} onClick={() => void gif()}>تنزيل GIF قصير</button>
        <button type="button" disabled={disabled || working} onClick={storyboard}>لوحة القصة / PDF</button>
        {working && <button type="button" onClick={() => cancelRef.current?.abort()}>إلغاء GIF</button>}
      </div>
      {working && <p role="status">جارٍ إنشاء GIF: {progress}</p>}
      {error && <p role="alert" className="alert error">{error}</p>}
    </section>
  );
}
