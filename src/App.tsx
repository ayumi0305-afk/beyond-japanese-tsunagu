import { useCallback, useEffect, useRef, useState } from 'react';

import { WorldCanvas } from './ui/WorldCanvas';
import type { Seat } from './world/scene';
import type { World } from './world/world';

const INTENTION_CHIPS = [
  '今日のフォーカス',
  'ことばの ふくしゅう',
  'JLPT の べんきょう',
  '旅行の じゅんび',
];
const GOAL_CHIPS = [15, 25, 40];

function greetingForHourJST(): string {
  const h = (new Date().getUTCHours() + 9) % 24;
  if (h < 5) return 'こんばんは';
  if (h < 11) return 'おはようございます';
  if (h < 18) return 'こんにちは';
  return 'こんばんは';
}

export default function App() {
  const worldRef = useRef<World | null>(null);

  const [sheetSeat, setSheetSeat] = useState<Seat | null>(null);
  const [intention, setIntention] = useState(INTENTION_CHIPS[0]);
  const [customIntention, setCustomIntention] = useState('');
  const [goal, setGoal] = useState(15);
  const [inSession, setInSession] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [finishedMinutes, setFinishedMinutes] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showGreeting, setShowGreeting] = useState(true);

  // arrival greeting fades away on its own
  useEffect(() => {
    const t = setTimeout(() => setShowGreeting(false), 6500);
    return () => clearTimeout(t);
  }, []);

  // session clock
  useEffect(() => {
    if (!inSession) return;
    const t = setInterval(() => {
      setElapsed(Math.floor(worldRef.current?.sessionElapsedSec() ?? 0));
    }, 1000);
    return () => clearInterval(t);
  }, [inSession]);

  // toast auto-hide
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const events = {
    onSeatTapped: (seat: Seat) => {
      setCustomIntention('');
      setIntention(INTENTION_CHIPS[0]);
      setSheetSeat(seat);
    },
    onSessionStart: () => {
      setInSession(true);
      setElapsed(0);
    },
    onSessionEnd: (minutes: number) => {
      setInSession(false);
      setFinishedMinutes(minutes);
    },
    onToast: (text: string) => setToast(text),
  };

  const confirmCheckIn = useCallback(() => {
    const world = worldRef.current;
    if (!world || !sheetSeat) return;
    const finalIntention = customIntention.trim() || intention;
    world.checkIn(sheetSeat.id, finalIntention, goal);
    setSheetSeat(null);
  }, [sheetSeat, customIntention, intention, goal]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <div className="app">
      <WorldCanvas
        events={events}
        onWorld={(w) => {
          worldRef.current = w;
        }}
      />

      {/* arrival greeting */}
      {showGreeting && (
        <div className="greeting" onClick={() => setShowGreeting(false)}>
          <div className="greeting-jp">おかえりなさい</div>
          <div className="greeting-sub">
            {greetingForHourJST()}。自習室へようこそ — すきな せきを タップしてください
          </div>
        </div>
      )}

      {/* quiet session pill */}
      {inSession && (
        <div className="session-pill">
          <span className="session-time">
            {mm}:{ss}
          </span>
          <span className="session-intention">{worldRef.current?.session.intention}</span>
          <button className="stand-btn" onClick={() => worldRef.current?.finishSession()}>
            立つ
          </button>
        </div>
      )}

      {/* check-in sheet */}
      {sheetSeat && (
        <div className="sheet-backdrop" onClick={() => setSheetSeat(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-title">せきに つきますか？</div>
            <div className="sheet-label">きょうは なにを しますか</div>
            <div className="chip-row">
              {INTENTION_CHIPS.map((c) => (
                <button
                  key={c}
                  className={`chip ${intention === c && !customIntention ? 'on' : ''}`}
                  onClick={() => {
                    setIntention(c);
                    setCustomIntention('');
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
            <input
              className="intention-input"
              placeholder="じぶんで かく…"
              value={customIntention}
              maxLength={16}
              onChange={(e) => setCustomIntention(e.target.value)}
            />
            <div className="sheet-label">どのくらい すわりますか</div>
            <div className="chip-row">
              {GOAL_CHIPS.map((g) => (
                <button key={g} className={`chip ${goal === g ? 'on' : ''}`} onClick={() => setGoal(g)}>
                  {g}分
                </button>
              ))}
            </div>
            <div className="sheet-actions">
              <button className="btn quiet" onClick={() => setSheetSeat(null)}>
                また あとで
              </button>
              <button className="btn primary" onClick={confirmCheckIn}>
                席につく
              </button>
            </div>
          </div>
        </div>
      )}

      {/* お疲れさま — the closing of the day */}
      {finishedMinutes !== null && (
        <div className="otsukare" onClick={() => setFinishedMinutes(null)}>
          <div className="otsukare-card">
            <div className="otsukare-jp">お疲れさまでした</div>
            <div className="otsukare-sub">
              きょうは {finishedMinutes}分 いっしょに べんきょうしました
            </div>
            <div className="otsukare-mata">また明日 🌸</div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
