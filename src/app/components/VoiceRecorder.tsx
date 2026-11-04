import { useEffect, useRef, useState } from 'react';

interface Props {
  shotLabel: string;
  hasVoice: boolean;
  onClip: (file: File) => Promise<void>;
  onRemove: () => void;
}

export function VoiceRecorder({ shotLabel, hasVoice, onClip, onRemove }: Props) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const cleanup = () => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    recorder.current = null;
  };
  useEffect(() => () => {
    try { if (recorder.current?.state === 'recording') recorder.current.stop(); } catch { /* ignore */ }
    cleanup();
  }, []);
  const start = async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('التسجيل غير متاح في هذا المتصفح. يمكنك اختيار ملف صوتي من الجهاز.');
      return;
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: BlobPart[] = [];
      const type = ['audio/webm;codecs=opus', 'audio/mp4'].find((t) => MediaRecorder.isTypeSupported(t));
      const mr = new MediaRecorder(stream.current, type ? { mimeType: type } : undefined);
      recorder.current = mr;
      mr.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      mr.onerror = () => { setError('حدث خطأ أثناء التسجيل. جرّب رفع ملف صوتي.'); setRecording(false); cleanup(); };
      mr.onstop = async () => {
        setRecording(false);
        const mime = mr.mimeType || 'audio/webm';
        const ext = mime.includes('mp4') ? 'm4a' : 'webm';
        const file = new File(chunks, 'narration.' + ext, { type: mime });
        cleanup();
        if (!file.size) { setError('لم يُلتقط صوت.'); return; }
        setBusy(true);
        try { await onClip(file); } catch (e) { setError(e instanceof Error ? e.message : 'تعذر قراءة التسجيل.'); }
        finally { setBusy(false); }
      };
      mr.start();
      setRecording(true);
    } catch (e) {
      cleanup();
      setError(e instanceof Error ? 'تعذر استخدام الميكروفون: ' + e.message : 'تعذر فتح الميكروفون.');
    }
  };
  const stop = () => { if (recorder.current?.state === 'recording') recorder.current.stop(); };
  const load = async (file?: File) => {
    if (!file) return;
    setError('');
    setBusy(true);
    try { await onClip(file); } catch (e) { setError(e instanceof Error ? e.message : 'تعذر قراءة الملف.'); }
    finally { setBusy(false); }
  };

  return (
    <section className="box voice-recorder">
      <b>🎙️ تعليق صوتي — {shotLabel}</b>
      <p className="small muted">سجّل بصوتك أو أضف ملفًا لهذه اللقطة فقط. يتم مزجه مع الموسيقى والمؤثرات عند التصدير، ولا يُرفع إلى خادم. التسجيل محفوظ لهذه الجلسة فقط، لذا صدّر الفيديو قبل إغلاق الصفحة.</p>
      <div className="row wrap">
        {!recording ? (
          <button type="button" onClick={start} disabled={busy}>{hasVoice ? '↺ إعادة التسجيل' : '● بدء التسجيل'}</button>
        ) : <button type="button" onClick={stop} className="danger">■ إيقاف التسجيل وحفظه</button>}
        <button type="button" onClick={() => input.current?.click()} disabled={busy || recording}>استيراد صوت</button>
        <input ref={input} type="file" accept="audio/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; void load(f); }} />
        {hasVoice && <button type="button" onClick={onRemove} disabled={recording || busy}>حذف صوت اللقطة</button>}
        {hasVoice && <span className="small">✓ أُضيف الصوت</span>}
        {recording && <span role="status" className="recording-status">🔴 جارٍ التسجيل…</span>}
        {busy && <span role="status">جارٍ إعداد الصوت…</span>}
      </div>
      {error && <p role="alert" className="alert error">{error}</p>}
    </section>
  );
}
