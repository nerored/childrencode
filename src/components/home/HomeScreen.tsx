import { WORLD } from "../../content/world";
import type { StoredProgress } from "../../state/progress";
import BrandMark from "../common/BrandMark";
import ProgressBar from "../common/ProgressBar";
import { summarizeWorld } from "../common/progressMath";
import type { Track } from "../common/track";

interface HomeScreenProps {
  progress: StoredProgress;
  track: Track;
  onTrackChange: (track: Track) => void;
  onStart: () => void;
}

interface TrackOption {
  id: Track;
  name: string;
  hint: string;
  glyph: string;
}

const TRACK_OPTIONS: TrackOption[] = [
  {
    id: "blocks",
    name: "图形化",
    hint: "像拼积木一样组合指令",
    glyph: "◧",
  },
  {
    id: "python",
    name: "Python",
    hint: "用真实代码写下每一步",
    glyph: "Py",
  },
];

const DISCLAIMER = "原创开源学习项目，全部场景与关卡为本项目独立设计。";

/** Landing screen: product position, track choice, and journey snapshot. */
export default function HomeScreen({
  progress,
  track,
  onTrackChange,
  onStart,
}: HomeScreenProps) {
  const summary = summarizeWorld(progress, WORLD);
  const starPercent =
    summary.maxStars === 0 ? 0 : Math.round((summary.stars / summary.maxStars) * 100);

  return (
    <div className="home-screen">
      <header className="home-topbar">
        <span className="home-brand">
          <BrandMark className="home-brand__mark" />
          <span className="home-brand__word">ChildrenCode</span>
        </span>
        <span className="home-topbar__badge">
          <span className="home-topbar__spark" aria-hidden="true" />
          独立开源 · 本地保存进度
        </span>
      </header>

      <main className="home-main">
        <section className="home-hero" aria-labelledby="home-title">
          <div className="home-hero__copy">
            <p className="eyebrow">
              <span className="eyebrow__rule" aria-hidden="true" />
              ISLAND CODING LAB · 少儿编程
            </p>

            <h1 className="home-title" id="home-title">
              Children<span>Code</span>
            </h1>
            <p className="home-tagline">在岛屿闯关中学会编程</p>
            <p className="home-description">
              从风车原野到雾林岔路，把每一步指令拼成一条路。在四座原创主题岛里理解顺序、循环、变量与判断，让代码成为看得见的行动。
            </p>

            <fieldset className="track-fieldset">
              <legend className="track-fieldset__legend">选择编程方式</legend>
              <div className="track-picker">
                {TRACK_OPTIONS.map((option) => {
                  const selected = track === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`track-option${selected ? " is-active" : ""}`}
                      onClick={() => onTrackChange(option.id)}
                      aria-pressed={selected}
                    >
                      <span className="track-option__icon" aria-hidden="true">
                        {option.glyph}
                      </span>
                      <span className="track-option__copy">
                        <span className="track-option__name">{option.name}</span>
                        <span className="track-option__hint">{option.hint}</span>
                      </span>
                      <span className="track-option__check" aria-hidden="true">
                        {selected ? "✓" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="home-actions">
              <button type="button" className="button button--primary button--lg" onClick={onStart}>
                开始闯关
                <span aria-hidden="true">→</span>
              </button>
              <span className="home-actions__note">
                4 座主题岛 · {summary.total} 个关卡 · 随时切换轨道
              </span>
            </div>
          </div>

          <aside className="home-hero__side" aria-label="学习旅程概览">
            <section className="orbit-card" aria-labelledby="orbit-title">
              <div className="orbit-card__head">
                <h2 className="orbit-card__title" id="orbit-title">
                  学习航线
                </h2>
                <span className="orbit-card__tag">WORLD v{WORLD.version}</span>
              </div>

              <svg
                className="orbit-card__map"
                viewBox="0 0 360 300"
                role="img"
                aria-label="四座主题岛连成的学习航线"
              >
                <g className="orbit-card__rings" fill="none">
                  <circle cx="180" cy="150" r="112" />
                  <circle cx="180" cy="150" r="82" />
                  <path d="M40 240c54-30 70-84 112-84 46 0 54 54 100 54 34 0 54-16 72-30" />
                </g>

                <path
                  className="orbit-card__route"
                  d="M58 214C84 158 102 122 132 112C176 96 206 82 238 98C270 114 286 156 302 194"
                  fill="none"
                />

                <circle className="orbit-card__pulse" cx="180" cy="150" r="64" />

                <g className="orbit-card__nodes">
                  <g transform="translate(58 214)">
                    <circle className="orbit-card__node" r="21" />
                    <text className="orbit-card__node-label" y="4">01</text>
                  </g>
                  <g transform="translate(132 112)">
                    <circle className="orbit-card__node" r="19" />
                    <text className="orbit-card__node-label" y="4">02</text>
                  </g>
                  <g transform="translate(238 98)">
                    <circle className="orbit-card__node" r="19" />
                    <text className="orbit-card__node-label" y="4">03</text>
                  </g>
                  <g transform="translate(302 194)">
                    <circle className="orbit-card__node" r="21" />
                    <text className="orbit-card__node-label" y="4">04</text>
                  </g>
                </g>

                <g className="orbit-card__island" transform="translate(180 150)">
                  <polygon points="0,-45 39,-22.5 39,22.5 0,45 -39,22.5 -39,-22.5" />
                  <path d="M-18 8c7-5 13-5 20 0 7 5 13 5 20 0" />
                  <path d="M0-22v18" />
                  <path d="M-7-11 0-18l7 7" />
                  <circle cx="0" cy="22" r="2.5" />
                </g>
              </svg>

              <div className="orbit-card__legend">
                {WORLD.scenes.map((scene, index) => (
                  <span key={scene.id}>
                    <i className={`orbit-card__dot orbit-card__dot--${scene.id}`} aria-hidden="true" />
                    {String(index + 1).padStart(2, "0")} {scene.name}
                  </span>
                ))}
              </div>
            </section>

            <section className="progress-panel" aria-labelledby="progress-title">
              <div className="progress-panel__head">
                <div>
                  <p className="eyebrow progress-panel__eyebrow">YOUR VOYAGE</p>
                  <h2 id="progress-title">你的旅程</h2>
                </div>
                <span className="progress-panel__percent">{starPercent}%</span>
              </div>

              <div className="progress-panel__stats">
                <div className="stat">
                  <span className="stat__value">
                    {summary.stars}
                    <span>/{summary.maxStars}</span>
                  </span>
                  <span className="stat__label">已收集星星</span>
                </div>
                <div className="stat">
                  <span className="stat__value">
                    {summary.completed}
                    <span>/{summary.total}</span>
                  </span>
                  <span className="stat__label">已通关卡</span>
                </div>
              </div>

              <ProgressBar
                value={summary.stars}
                max={summary.maxStars}
                label="星星收集进度"
                showValue
                tone="gold"
              />
              <p className="progress-panel__hint">
                {summary.completed > 0
                  ? `已点亮 ${summary.completed} 个关卡，继续沿着航线前进。`
                  : "从风车原野出发，点亮第一颗星。"}
              </p>
            </section>
          </aside>
        </section>

        <footer className="home-footer">
          <p className="home-disclaimer">
            <span className="home-disclaimer__dot" aria-hidden="true" />
            {DISCLAIMER}
          </p>
          <p className="home-footer__meta">原创场景 · 学习进度只保存在此浏览器</p>
        </footer>
      </main>
    </div>
  );
}
