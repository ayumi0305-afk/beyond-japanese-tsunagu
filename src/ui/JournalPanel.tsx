/** The Japan Journal — the postcard wall, opened by walking up to it. */
import { useState } from 'react';

interface Props {
  onClose: () => void;
}

interface Postcard {
  author: string;
  place: string;
  date: string;
  photoNote: string;
  used?: string;
  heard?: string;
  words?: string;
  question?: string;
  senseiReply?: string;
  tip?: string;
}

const POSTCARDS: Postcard[] = [
  {
    author: 'Marco',
    place: '大阪 Osaka',
    date: '7月2日',
    photoNote: '道頓堀のたこ焼き屋台',
    used: '「たこ焼き、ひとつください」— it worked!',
    heard: '「熱いから気をつけて！」',
    words: '熱い（あつい）— hot ・ 気をつけて — be careful',
    question: 'The vendor said something fast ending in「まいど！」',
    senseiReply: 'まいど is Osaka dialect — a warm "thanks, come again!" You heard real 関西弁!',
    tip: 'Order at the window, pay in cash.',
  },
  {
    author: 'Yuki',
    place: '京都 Kyoto',
    date: '6月18日',
    photoNote: '哲学の道、あじさいの季節',
    used: '「すみません、写真を とっても いいですか」',
    heard: '「どうぞどうぞ！」',
    words: '紫陽花（あじさい）— hydrangea',
    tip: 'Go early in the morning — you will have the path to yourself.',
  },
];

export function JournalPanel({ onClose }: Props) {
  const [tab, setTab] = useState<'feed' | 'map'>('feed');

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet journal" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-title">日本の思い出</div>
        <div className="journal-tabs">
          <button className={`chip ${tab === 'feed' ? 'on' : ''}`} onClick={() => setTab('feed')}>
            はがき
          </button>
          <button className={`chip ${tab === 'map' ? 'on' : ''}`} onClick={() => setTab('map')}>
            ちず
          </button>
        </div>

        {tab === 'feed' && (
          <div className="journal-feed">
            {POSTCARDS.map((card) => (
              <article className="postcard" key={`${card.author}-${card.date}`}>
                <div className="postcard-head">
                  <span className="postcard-author">{card.author}</span>
                  <span className="postcard-place">
                    {card.place} · {card.date}
                  </span>
                </div>
                <div className="postcard-photo">{card.photoNote}</div>
                {card.used && (
                  <div className="pc-field">
                    <div className="pc-label">使った日本語</div>
                    <p>{card.used}</p>
                  </div>
                )}
                {card.heard && (
                  <div className="pc-field">
                    <div className="pc-label">聞いた日本語</div>
                    <p>{card.heard}</p>
                  </div>
                )}
                {card.words && (
                  <div className="pc-field">
                    <div className="pc-label">新しい言葉</div>
                    <p>{card.words}</p>
                  </div>
                )}
                {card.question && (
                  <div className="pc-field">
                    <div className="pc-label">わからなかったこと</div>
                    <p>{card.question}</p>
                    {card.senseiReply && (
                      <div className="pc-sensei">
                        <b>あゆみ先生：</b>
                        {card.senseiReply}
                      </div>
                    )}
                  </div>
                )}
                {card.tip && (
                  <div className="pc-field">
                    <div className="pc-label">旅のヒント</div>
                    <p>{card.tip}</p>
                  </div>
                )}
              </article>
            ))}
            <p className="journal-hint">
              あなたの はがきは、日本へ 行ったとき ここに ふえていきます 🌸
            </p>
          </div>
        )}

        {tab === 'map' && (
          <div className="journal-map">
            <svg viewBox="0 0 200 220" role="img" aria-label="日本地図とコミュニティのピン">
              <rect x="0" y="0" width="200" height="220" rx="10" fill="#FDF8EC" />
              <path
                d="M150 22 q20 -10 30 4 q8 12 -5 22 q-15 10 -27 1 q-9 -14 2 -27 Z"
                fill="#E9E3D2"
                stroke="#D8CFB8"
              />
              <path
                d="M160 68 q14 8 6 26 l-20 40 q-11 20 -31 31 l-40 20 q-18 8 -26 -6 q-6 -16 9 -23 l37 -20 q17 -9 26 -26 l19 -34 q8 -14 20 -8 Z"
                fill="#E9E3D2"
                stroke="#D8CFB8"
              />
              <path
                d="M74 172 q15 -2 17 10 q0 11 -12 12 q-14 2 -17 -9 q-1 -11 12 -13 Z"
                fill="#E9E3D2"
                stroke="#D8CFB8"
              />
              <path
                d="M36 180 q14 -6 22 5 q6 11 -5 20 q-12 9 -21 0 q-8 -12 4 -25 Z"
                fill="#E9E3D2"
                stroke="#D8CFB8"
              />
              <circle cx="134" cy="118" r="6" fill="#2E5A6B" />
              <circle cx="98" cy="146" r="6" fill="#6E8F76" />
              <circle cx="90" cy="155" r="6" fill="#D2694F" />
              <text x="146" y="122" fontSize="10" fill="#5C554B">
                東京 1
              </text>
              <text x="106" y="143" fontSize="10" fill="#5C554B">
                京都 1
              </text>
              <text x="98" y="164" fontSize="10" fill="#5C554B">
                大阪 1
              </text>
            </svg>
            <p className="journal-hint">まだ だれも 北海道に 行っていません。あなたの旅かも？</p>
          </div>
        )}

        <div className="sheet-actions">
          <button className="btn quiet" onClick={onClose}>
            かべを はなれる
          </button>
        </div>
      </div>
    </div>
  );
}
