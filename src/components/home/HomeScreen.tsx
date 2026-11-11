import { WORLD } from "../../content/world";
import type { StoredProgress } from "../../state/progress";
import BrandMark from "../common/BrandMark";
import ProgressBar from "../common/ProgressBar";
import { summarizeWorld } from "../common/progressMath";
import type { Track } from "../common/track";
import homeArchipelago from "../../assets/art/home-archipelago-1600x1100.webp";

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
              让小车走到终点
            </h1>
            <p className="home-tagline">拖一拖指令，让小车救回企鹅。</p>
            <p className="home-description">
              从风车原野出发，把每一步指令拼成一条路。用图形化积木或 Python，沿着四座学习小岛发现代码的力量。
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
                {summary.completed > 0 ? "继续：风车小径" : "从风车原野开始"}
                <span aria-hidden="true">→</span>
              </button>
              <div className="home-next-stop" aria-label="下一站">
                <span className="home-next-stop__label">下一站</span>
                <span className="home-next-stop__value">风车原野 · 第1关</span>
              </div>
            </div>
          </div>

          <aside className="home-hero__side" aria-label="学习旅程概览">
            <section className="home-hero__art" aria-label="北极学习群岛插画">
              <img src={homeArchipelago} alt="风车原野、企鹅和远方学习小岛" />
              <span className="home-hero__art-caption">四座学习小岛 · 一段代码旅程</span>
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
