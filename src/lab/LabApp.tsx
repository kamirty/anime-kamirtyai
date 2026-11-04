import { useEffect, useState } from 'react';
import { ensureFontLoaded } from '../design/fonts';
import { ThemeToggle, useUiTheme } from '../app/theme';
import { LESSONS } from './lessons';

const fromHash = () => {
  const id = decodeURIComponent(location.hash.slice(1));
  const i = LESSONS.findIndex((l) => l.id === id);
  return i < 0 ? 0 : i;
};

export function LabApp() {
  const [index, setIndex] = useState(fromHash);
  const [ready, setReady] = useState(false);
  const [theme, setTheme] = useUiTheme();
  const lesson = LESSONS[index];

  useEffect(() => {
    ensureFontLoaded('ruqaa').then(() => setReady(true));
    const onHash = () => setIndex(fromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    document.title = `${lesson.title} | مختبر الحركة`;
  }, [lesson]);

  const go = (i: number) => {
    location.hash = LESSONS[i].id;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app">
      <div className="ticker">
        <span className="ticker-label">مختبر</span>
        <span className="ticker-text">تعلّم لماذا تتحرك رسوم الأنمي بهذه الطريقة… بأمثلة تحركها بيدك</span>
        <a className="ticker-link" href="/">
          استوديو الأنمي
        </a>
        <ThemeToggle theme={theme} onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
      </div>
      <header className="topbar">
        <a className="brand" href="/lab/" aria-label="مختبر الحركة من KamirtyAI">
          <img className="brand-logo" src="/brand/kamirty-logo.png" alt="Kamirty.AI" width={198} height={122} />
          <span className="brand-name">
            <b>مختبر الحركة</b>
            <small>anime.kamirtyai.com/lab</small>
          </span>
        </a>
        <div className="actions">
          <a className="button primary-link" href="/">
            جرّب في استوديو الأنمي ←
          </a>
        </div>
      </header>
      <main className="lab">
        <nav className="lab-nav" aria-label="الدروس">
          <p className="muted small">8 دروس قصيرة في مبادئ تحريك الأنمي</p>
          <ol>
            {LESSONS.map((l, i) => (
              <li key={l.id}>
                <button type="button" className={i === index ? 'active' : ''} onClick={() => go(i)} aria-current={i === index ? 'page' : undefined}>
                  <span className="n">{i + 1}</span> {l.title}
                </button>
              </li>
            ))}
          </ol>
        </nav>
        <article className="lesson">
          <span className="muted small">
            الدرس {index + 1} من {LESSONS.length}
          </span>
          <h1>{lesson.title}</h1>
          <p className="idea">{lesson.idea}</p>
          {ready ? lesson.body : <p className="muted">جارٍ التحميل…</p>}
          <a className="button try-it" href={`/?d=${encodeURIComponent(lesson.tryIt)}`}>
            🎬 جرّب الدرس في الاستوديو: «{lesson.tryIt.slice(0, 48)}{lesson.tryIt.length > 48 ? '…' : ''}»
          </a>
          <div className="lesson-nav">
            <button type="button" onClick={() => go(index - 1)} disabled={index === 0}>
              → الدرس السابق
            </button>
            <button type="button" className="primary" onClick={() => go(index + 1)} disabled={index === LESSONS.length - 1}>
              الدرس التالي ←
            </button>
          </div>
        </article>
      </main>
      <footer className="footer">
        <div className="footer-brand">
          <img className="brand-logo" src="/brand/kamirty-logo.png" alt="Kamirty.AI" width={198} height={122} />
          <p className="slogan">مختبر الحركة</p>
        </div>
        <p className="footer-note">كل الأمثلة مرسومة بالكود داخل متصفحك، بمحرك استوديو الأنمي نفسه. مجاني للطلاب والمعلمين.</p>
        <nav className="footer-links">
          <a href="/">استوديو الأنمي</a>
          <span>·</span>
          <a href="https://www.kamirtyai.com/">أدوات كاميرتي</a>
        </nav>
      </footer>
    </div>
  );
}
