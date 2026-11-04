import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FPS, type Project, type Shot } from '../domain/types';
import { shotAt, shotStarts, totalFrames } from '../domain/timeline';
import { newShot } from '../domain/sanitize';
import { ensureFontLoaded } from '../design/fonts';
import { describeToProject } from '../engine/parser/describe';
import { buildSoundtrack, toAudioBuffer } from '../engine/audio/soundtrack';
import { PreviewAudio } from '../engine/audio/player';
import { clearTextCache } from '../engine/renderer/textLayout';
import { downloadBlob, loadLocal, projectBlob, readProjectFile, safeName, saveLocal } from '../storage/projectFile';
import { EXAMPLES } from './examples';
import { Sidebar } from './components/Sidebar';
import { Preview } from './components/Preview';
import { Timeline } from './components/Timeline';
import { Inspector } from './components/Inspector';
import { ExportDialog } from './components/ExportDialog';
import { ThemeToggle, useUiTheme } from './theme';

function initial(): { project: Project; description: string } {
  const saved = loadLocal();
  if (saved) return saved;
  const description = EXAMPLES[0].text;
  return { project: describeToProject(description).project, description };
}

type UserMusic = { name: string; L: Float32Array; R: Float32Array };

async function decodeMusic(file: File): Promise<UserMusic> {
  if (file.size > 40 * 1024 * 1024) throw new Error('الملف الصوتي أكبر من 40 ميجابايت.');
  const data = await file.arrayBuffer();
  const ctx = new OfflineAudioContext(2, 48000, 48000);
  const buf = await ctx.decodeAudioData(data);
  const off = new OfflineAudioContext(2, Math.ceil(buf.duration * 48000), 48000);
  const src = off.createBufferSource();
  src.buffer = buf;
  src.connect(off.destination);
  src.start();
  const r = await off.startRendering();
  return { name: file.name, L: r.getChannelData(0).slice(), R: r.getChannelData(r.numberOfChannels > 1 ? 1 : 0).slice() };
}

export function App() {
  const init = useMemo(initial, []);
  const [project, setProjectRaw] = useState<Project>(init.project);
  const [description, setDescription] = useState(init.description);
  const [past, setPast] = useState<Project[]>([]);
  const [future, setFuture] = useState<Project[]>([]);
  const [selected, setSelected] = useState(0);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [ready, setReady] = useState(false);
  const [renderKey, setRenderKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const [music, setMusic] = useState<UserMusic | null>(null);
  const [theme, setTheme] = useUiTheme();
  const player = useRef(new PreviewAudio());
  const raf = useRef(0);
  const audioCache = useRef<{ key: string; buf: AudioBuffer } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const total = totalFrames(project);

  const setProject = useCallback((next: Project | ((p: Project) => Project), record = true) => {
    setProjectRaw((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      if (record && value !== prev) {
        setPast((p) => [...p.slice(-60), prev]);
        setFuture([]);
      }
      return value;
    });
  }, []);

  useEffect(() => {
    ensureFontLoaded(project.font).then(() => {
      clearTextCache();
      setReady(true);
      setRenderKey((k) => k + 1);
    });
  }, [project.font]);

  useEffect(() => {
    const id = setTimeout(() => saveLocal(project, description), 400);
    return () => clearTimeout(id);
  }, [project, description]);

  useEffect(() => {
    if (selected >= project.shots.length) setSelected(project.shots.length - 1);
    if (frame >= total) setFrame(Math.max(0, total - 1));
  }, [project, selected, frame, total]);

  const getAudio = useCallback(async (): Promise<AudioBuffer | null> => {
    const key = JSON.stringify([project.shots, project.audio, project.fadeOut, music?.name ?? '']);
    if (audioCache.current?.key === key) return audioCache.current.buf;
    if (!project.audio.sfx && !project.audio.ambience && project.audio.music === 'none' && !music) return null;
    await new Promise((r) => setTimeout(r, 20));
    const buf = toAudioBuffer(buildSoundtrack(project, music));
    audioCache.current = { key, buf };
    return buf;
  }, [project, music]);

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    player.current.stop();
    setPlaying(false);
  }, []);

  const play = useCallback(async () => {
    const from = frame >= total - 1 ? 0 : frame;
    setPreparing(true);
    const buf = await getAudio().catch(() => null);
    setPreparing(false);
    await player.current.play(buf, from / FPS);
    setPlaying(true);
    const tick = () => {
      const f = Math.floor(player.current.position() * FPS);
      if (f >= total) {
        setFrame(total - 1);
        stop();
        return;
      }
      setFrame(f);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, [frame, total, getAudio, stop]);

  const togglePlay = useCallback(() => (playing ? stop() : play()), [playing, play, stop]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => () => stop(), [stop]);

  const playingShot = shotAt(project, Math.min(frame, total - 1)).index;
  const selectShot = (i: number) => {
    stop();
    setSelected(i);
    const starts = shotStarts(project);
    setFrame(starts[i] + Math.floor(Math.round(project.shots[i].duration * FPS) * 0.6));
  };

  const undo = () => {
    if (!past.length) return;
    stop();
    setFuture((f) => [project, ...f]);
    setProjectRaw(past[past.length - 1]);
    setPast((p) => p.slice(0, -1));
  };
  const redo = () => {
    if (!future.length) return;
    stop();
    setPast((p) => [...p, project]);
    setProjectRaw(future[0]);
    setFuture((f) => f.slice(1));
  };

  const loadProject = (p: Project, note?: string) => {
    stop();
    setProject(p);
    setSelected(0);
    setFrame(0);
    setNotice(note ? { text: note } : null);
  };

  const patchShot = (patch: Partial<Shot>) => setProject((p) => ({ ...p, shots: p.shots.map((s, i) => (i === selected ? { ...s, ...patch } : s)) }));

  return (
    <div className="app">
      <div className="ticker">
        <span className="ticker-label">جديد</span>
        <span className="ticker-text">اكتب مشهدك بالعربية… وحوّله إلى أنمي متحرك بصوت ومؤثرات، مجانًا وداخل متصفحك</span>
        <a className="ticker-link" href="https://www.kamirtyai.com/">
          الموقع الرئيسي
        </a>
        <ThemeToggle theme={theme} onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
      </div>
      <header className="topbar">
        <a className="brand" href="./" aria-label="استوديو الأنمي من KamirtyAI">
          <img className="brand-logo" src="/brand/kamirty-logo.png" alt="Kamirty.AI" width={198} height={122} />
          <span className="brand-name">
            <b>استوديو الأنمي</b>
            <small>anime.kamirtyai.com</small>
          </span>
        </a>
        <input className="title-input" value={project.title} maxLength={80} onChange={(e) => setProject((p) => ({ ...p, title: e.target.value }), false)} aria-label="اسم المشروع" />
        <div className="actions">
          <button type="button" onClick={undo} disabled={!past.length} title="تراجع (Ctrl+Z)">
            ↶ تراجع
          </button>
          <button type="button" onClick={redo} disabled={!future.length} title="إعادة">
            ↷
          </button>
          <button type="button" onClick={() => fileRef.current?.click()}>
            فتح
          </button>
          <button type="button" onClick={() => downloadBlob(projectBlob(project), `${safeName(project.title)}.anime.json`)}>
            حفظ
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => {
              stop();
              setExporting(true);
            }}
          >
            ⬇ تنزيل الفيديو
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              try {
                loadProject(await readProjectFile(f), `فتحت «${f.name}».`);
              } catch (err) {
                setNotice({ text: err instanceof Error ? err.message : String(err), error: true });
              }
            }}
          />
        </div>
      </header>

      {notice && (
        <div className={`notice ${notice.error ? 'error' : ''}`} role="status">
          <span>{notice.text}</span>
          <button type="button" className="ghost" onClick={() => setNotice(null)} aria-label="إغلاق">
            ✕
          </button>
        </div>
      )}

      <main className="workspace">
        <Sidebar description={description} aspect={project.aspect} font={project.font} onDescription={setDescription} onProject={(p, note) => loadProject(p, note)} />
        <div className="center">
          <Preview project={project} frame={frame} playing={playing} preparing={preparing} ready={ready} renderKey={renderKey} onFrame={(f) => (stop(), setFrame(f))} onTogglePlay={togglePlay} />
          <Timeline
            project={project}
            selected={selected}
            playingShot={playingShot}
            renderKey={renderKey}
            onSelect={selectShot}
            onAdd={() => {
              const last = project.shots[project.shots.length - 1];
              setProject((p) => ({ ...p, shots: [...p.shots, newShot({ place: last.place, time: last.time, actors: last.actors.map((a) => ({ ...a, action: 'stand' })) })] }));
              setSelected(project.shots.length);
            }}
          />
          <section className="box music-box">
            <b>موسيقاك أو صوتك (اختياري)</b>
            <p className="small muted">ملف صوتي من جهازك يحل محل الموسيقى المولّدة. يبقى على جهازك ولا يُرفع إلى أي مكان. تأكد أن لك حق استخدامه.</p>
            <div className="row wrap">
              <label className="upload">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (!f) return;
                    try {
                      setMusic(await decodeMusic(f));
                      setNotice({ text: `أضفت «${f.name}».` });
                    } catch (err) {
                      setNotice({ text: `تعذّر قراءة الملف الصوتي: ${err instanceof Error ? err.message : String(err)}`, error: true });
                    }
                  }}
                />
                {music ? `🎵 ${music.name}` : 'اختر ملفًا صوتيًا'}
              </label>
              {music && (
                <button type="button" onClick={() => setMusic(null)}>
                  أزله
                </button>
              )}
            </div>
          </section>
        </div>
        <Inspector
          project={project}
          index={selected}
          onShot={patchShot}
          onProject={(patch) => setProject((p) => ({ ...p, ...patch }))}
          onMove={(dir) => {
            const j = selected + dir;
            setProject((p) => {
              const shots = [...p.shots];
              [shots[selected], shots[j]] = [shots[j], shots[selected]];
              return { ...p, shots };
            });
            setSelected(j);
          }}
          onDuplicate={() => {
            setProject((p) => {
              const shots = [...p.shots];
              shots.splice(selected + 1, 0, { ...structuredClone(p.shots[selected]), id: `${p.shots[selected].id}x${Date.now().toString(36).slice(-3)}` });
              return { ...p, shots };
            });
            setSelected(selected + 1);
          }}
          onDelete={() => {
            setProject((p) => ({ ...p, shots: p.shots.filter((_, i) => i !== selected) }));
            setSelected(Math.max(0, selected - 1));
          }}
        />
      </main>

      <footer className="footer">
        <div className="footer-brand">
          <img className="brand-logo" src="/brand/kamirty-logo.png" alt="Kamirty.AI" width={198} height={122} />
          <p className="slogan">استوديو الأنمي العربي</p>
        </div>
        <p className="footer-note">كل شيء يعمل داخل متصفحك: لا نرفع وصفك أو ملفاتك أو فيديوهاتك إلى أي خادم. الرسوم والأصوات مولّدة بالكود، والفيديو ملكك دون أي شعار.</p>
        <nav className="footer-links">
          <a href="https://motion.kamirtyai.com/">مولّد الموشن</a>
          <span>·</span>
          <a href="https://www.kamirtyai.com/">أدوات كاميرتي</a>
        </nav>
      </footer>

      {exporting && <ExportDialog project={project} getAudio={getAudio} onClose={() => setExporting(false)} />}
    </div>
  );
}
