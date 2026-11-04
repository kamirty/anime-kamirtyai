import { useState } from 'react';
import type { Aspect, Project } from '../../domain/types';
import { describeToProject, type ParseReport } from '../../engine/parser/describe';
import { buildClaudePrompt } from '../../engine/parser/claudePrompt';
import { extractJson, parseProjectLoose } from '../../domain/sanitize';
import { EXAMPLES } from '../examples';

interface Props {
  description: string;
  aspect: Aspect;
  font: string;
  onDescription: (d: string) => void;
  onProject: (p: Project, note?: string) => void;
}

const MAX_DESC = 1500;

export function Sidebar({ description, aspect, font, onDescription, onProject }: Props) {
  const [tab, setTab] = useState<'describe' | 'claude'>('describe');
  const [report, setReport] = useState<ParseReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paste, setPaste] = useState('');
  const [pasteMsg, setPasteMsg] = useState<{ ok: boolean; text: string; warnings?: string[] } | null>(null);
  const [copied, setCopied] = useState(false);

  const create = () => {
    setError(null);
    try {
      const { project, report } = describeToProject(description, { aspect, font });
      setReport(report);
      onProject(project);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const prompt = buildClaudePrompt(description, aspect);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const importPaste = () => {
    try {
      const { project, warnings } = parseProjectLoose(extractJson(paste));
      onProject(project, 'استوردت مشهد Claude.');
      setPasteMsg({ ok: true, text: `تم! ${project.shots.length} لقطة و${project.cast.length} شخصية${project.props.length ? ` و${project.props.length} رسمة جديدة` : ''}.`, warnings });
    } catch (e) {
      setPasteMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <aside className="sidebar">
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'describe'} className={tab === 'describe' ? 'active' : ''} onClick={() => setTab('describe')}>
          صِف مشهدك
        </button>
        <button role="tab" aria-selected={tab === 'claude'} className={tab === 'claude' ? 'active' : ''} onClick={() => setTab('claude')}>
          مشهد حرّ مع Claude
        </button>
      </div>

      {tab === 'describe' && (
        <section className="box">
          <h2>
            <span className="step">1</span> اكتب ما تريد أن يحدث
          </h2>
          <textarea
            rows={7}
            value={description}
            maxLength={MAX_DESC}
            onChange={(e) => onDescription(e.target.value)}
            placeholder="مثال: ولد بالدشداشة فوق قلعة نزوى ليلاً يضرب القمر ليظهر عبارة كل عام وعُماننا بخير"
            aria-label="وصف المشهد"
          />
          <div className="hint-row muted">
            <span>اكتب المكان والوقت والشخصيات وما تفعله. ضع الكلام بين «» أو بعد كلمة «عبارة».</span>
            <span>
              {description.length}/{MAX_DESC}
            </span>
          </div>
          <div className="chips">
            {EXAMPLES.map((ex) => (
              <button key={ex.label} type="button" className="chip" onClick={() => onDescription(ex.text)}>
                {ex.label}
              </button>
            ))}
          </div>
          <button type="button" className="primary big" onClick={create} disabled={!description.trim()}>
            أنشئ المشهد
          </button>
          {error && <div className="alert error">{error}</div>}
          {report && (
            <div className="report">
              <b>فهمت:</b>
              <div className="chips">
                {report.understood.map((c) => (
                  <span key={c.kind + c.label} className={`chip k-${c.kind}`}>
                    {c.label}
                  </span>
                ))}
              </div>
              {report.notes.map((n) => (
                <p key={n} className="muted small">
                  {n}
                </p>
              ))}
              {report.unknown.length > 0 && (
                <div className="unknown">
                  <b>لم أستخدم هذه الكلمات:</b> {report.unknown.join('، ')}
                  <p className="small">
                    غيّر الصياغة، أو عدّل اللقطات يدويًا، أو انتقل إلى{' '}
                    <button type="button" className="linklike" onClick={() => setTab('claude')}>
                      المشهد الحرّ مع Claude
                    </button>{' '}
                    ليرسم ما ليس في المكتبة.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {tab === 'claude' && (
        <section className="box">
          <h2>
            <span className="step">1</span> انسخ الطلب إلى Claude
          </h2>
          <p className="small muted">
            للأفكار التي ليست في المكتبة (حيوانات، سيارات، أدوات…). يكتب Claude المشهد ويرسم العناصر الجديدة، ثم تعاينه هنا وتنزّله فيديو. حسابك في Claude هو الذي يُستخدم، ولا تكلفة على الموقع.
          </p>
          <textarea rows={5} value={description} maxLength={MAX_DESC} onChange={(e) => onDescription(e.target.value)} placeholder="اكتب وصف المشهد" aria-label="وصف المشهد لـ Claude" />
          <details className="tips">
            <summary>عرض الطلب الكامل</summary>
            <pre dir="rtl" className="prompt">
              {prompt}
            </pre>
          </details>
          <div className="row">
            <button type="button" className="primary" onClick={copy} disabled={!description.trim()}>
              {copied ? 'نُسخ ✓' : 'انسخ الطلب'}
            </button>
            <a className="button" href="https://claude.ai/new" target="_blank" rel="noopener noreferrer">
              افتح Claude ↗
            </a>
          </div>
          <h2 className="mt">
            <span className="step">2</span> الصق رد Claude هنا
          </h2>
          <textarea rows={6} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="الصق الرد كاملًا، أو الجزء الذي بين ```json و```" dir="ltr" aria-label="رد Claude" />
          <button type="button" className="primary big" onClick={importPaste} disabled={!paste.trim()}>
            اعرض المشهد
          </button>
          {pasteMsg && (
            <div className={`alert ${pasteMsg.ok ? 'ok' : 'error'}`}>
              {pasteMsg.text}
              {pasteMsg.warnings && pasteMsg.warnings.length > 0 && (
                <ul>
                  {pasteMsg.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <p className="small muted">لا يُشغَّل أي كود من الرد: نقرأ بيانات المشهد ومسارات الرسم فقط، ونرفض ما سواها.</p>
        </section>
      )}
    </aside>
  );
}
