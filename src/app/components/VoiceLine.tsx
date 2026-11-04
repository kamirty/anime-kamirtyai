import { useEffect, useRef, useState } from 'react';
import type { Shot } from '../../domain/types';
import { lipLevels } from '../../engine/audio/lipsync';
import { decodeToMono, getVoice, putVoice } from '../../storage/voices';

interface Props {
  shot: Shot;
  onVoice: (voice: Shot['voice'] | undefined, seconds: number) => void;
}

/** Record or upload the spoken line; the mouth then follows the voice. Audio never leaves the device. */
export function VoiceLine({ shot, onVoice }: Props) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState<number | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSeconds(null);
    if (shot.voice) getVoice(shot.voice.id).then((v) => setSeconds(v ? v.length / 48000 : null));
  }, [shot.voice?.id]);

  const accept = async (data: ArrayBuffer) => {
    setBusy(true);
    setError(null);
    try {
      const pcm = await decodeToMono(data);
      if (pcm.length < 4800) throw new Error('التسجيل قصير جدًا أو صامت.');
      if (pcm.length > 48000 * 14) throw new Error('الجملة أطول من 14 ثانية. قسّمها على أكثر من لقطة.');
      const id = `v${Date.now().toString(36)}`;
      await putVoice(id, pcm);
      setSeconds(pcm.length / 48000);
      onVoice({ id, levels: lipLevels(pcm) }, pcm.length / 48000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّر قراءة الصوت.');
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const r = new MediaRecorder(stream);
      chunks.current = [];
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunks.current, { type: r.mimeType });
        await accept(await blob.arrayBuffer());
      };
      rec.current = r;
      r.start();
      setRecording(true);
    } catch {
      setError('لم نتمكن من استخدام الميكروفون. اسمح للمتصفح باستخدامه، أو ارفع ملفًا صوتيًا.');
    }
  };

  const play = async () => {
    if (!shot.voice) return;
    const pcm = await getVoice(shot.voice.id);
    if (!pcm) return setError('الصوت غير موجود على هذا الجهاز. سجّله من جديد.');
    const ctx = new AudioContext();
    const buf = ctx.createBuffer(1, pcm.length, 48000);
    buf.copyToChannel(new Float32Array(pcm), 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.onended = () => ctx.close();
    src.start();
  };

  return (
    <div className="voice-box">
      <span className="small muted">صوت الجملة (اختياري): يتحرك فم الشخصية مع صوتك.</span>
      <div className="voice-row">
        {!recording ? (
          <button type="button" onClick={start} disabled={busy}>
            🎙 سجّل
          </button>
        ) : (
          <button type="button" className="danger" onClick={() => rec.current?.stop()}>
            ⏹ أوقف التسجيل
          </button>
        )}
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy || recording}>
          ارفع ملفًا
        </button>
        {shot.voice && (
          <>
            <button type="button" onClick={play} disabled={busy || recording}>
              ▶ استمع
            </button>
            <button type="button" className="ghost" onClick={() => onVoice(undefined, 0)} aria-label="احذف الصوت">
              ✕
            </button>
            {seconds !== null && <span className="voice-len" dir="ltr">{seconds.toFixed(1)}s</span>}
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) await accept(await f.arrayBuffer());
          }}
        />
      </div>
      {recording && <span className="rec-live"><span className="rec-dot" /> جارٍ التسجيل… اقرأ الجملة ثم أوقف.</span>}
      {busy && <span className="small muted">جارٍ تجهيز الصوت…</span>}
      {error && <span className="warn">{error}</span>}
    </div>
  );
}
