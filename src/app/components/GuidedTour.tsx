import { useState } from 'react';

const STEPS = [
  {
    title: '1 — صف قصتك بالعربية',
    body: 'اكتب ما تريد أن يحدث في مربع الوصف، أو اضغط على نموذج جاهز. اذكر المكان والشخصيات والحركة والنص بين «». ثم اختر «أنشئ المشهد».',
  },
  {
    title: '2 — شاهد وحسّن',
    body: 'اضغط تشغيل للمعاينة، ثم اختر اللقطات من الشريط الزمني. في «احترافي» يمكنك تعديل الملابس وحركات الشخصيات وألوانها وزوايا الكاميرا، وإضافة تعليق صوتي للّقطة.',
  },
  {
    title: '3 — احفظ أو صدّر',
    body: 'اختر «تنزيل الفيديو» لتصدير MP4 أو WebM وفق دعم جهازك. يتوفر GIF قصير ولوحة قصة للطباعة PDF وصورة PNG من المعاينة. من «مشاريعي» احفظ نسخًا محلية أيضًا.',
  },
];

export function GuidedTour({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-labelledby="guide-title" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal guided-tour">
        <div className="modal-head">
          <h2 id="guide-title">دليل استوديو الأنمي</h2>
          <button type="button" aria-label="إغلاق الدليل" className="ghost" onClick={onClose}>✕</button>
        </div>
        <p className="small muted">الخطوة {step + 1} من {STEPS.length}</p>
        <div className="guide-step">
          <h3>{current.title}</h3>
          <p>{current.body}</p>
        </div>
        <div className="row wrap wizard-nav">
          <button type="button" disabled={step === 0} onClick={() => setStep((i) => i - 1)}>السابق</button>
          {step < STEPS.length - 1
            ? <button type="button" className="primary" onClick={() => setStep((i) => i + 1)}>التالي</button>
            : <button type="button" className="primary" onClick={onClose}>ابدأ التصميم</button>}
        </div>
      </div>
    </div>
  );
}
