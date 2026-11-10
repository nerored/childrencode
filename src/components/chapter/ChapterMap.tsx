import { WORLD, findLevel } from "../../content/world";
import type { LevelSpec, SceneSpec } from "../../domain/types";
import type { StoredProgress } from "../../state/progress";
import {
  getStars,
  isChapterUnlocked,
  isLevelUnlocked,
} from "../../state/progress";
import AppHeader from "../common/AppHeader";
import LockBadge from "../common/LockBadge";
import StarRow from "../common/StarRow";
import {
  summarizeChapter,
  summarizeCheckpoint,
  summarizeWorld,
} from "../common/progressMath";

interface ChapterMapProps {
  progress: StoredProgress;
  scene: SceneSpec;
  chapterId: string;
  onSelectChapter: (chapterId: string) => void;
  onOpenLevel: (levelId: string) => void;
  onBack: () => void;
}

/** Chapter tabs plus the hex checkpoint route and its level chips. */
export default function ChapterMap({
  progress,
  scene,
  chapterId,
  onSelectChapter,
  onOpenLevel,
  onBack,
}: ChapterMapProps) {
  const worldSummary = summarizeWorld(progress, WORLD);
  const chapters = [...scene.chapters].sort((a, b) => a.order - b.order);
  const activeChapter =
    chapters.find((chapter) => chapter.id === chapterId) ?? chapters[0];

  const header = (
    <AppHeader
      onHome={onBack}
      onBack={onBack}
      backLabel="返回群岛"
      stars={worldSummary.stars}
      maxStars={worldSummary.maxStars}
      completed={worldSummary.completed}
      totalLevels={worldSummary.total}
    />
  );

  if (!activeChapter) {
    return (
      <div className="chapter-screen">
        {header}
        <main className="page-shell">
          <div className="empty-panel">
            <p className="eyebrow">CHAPTER MAP</p>
            <h1>这座岛还没有章节</h1>
            <p>返回群岛，选择另一片已经开放的原野。</p>
          </div>
        </main>
      </div>
    );
  }

  const activeIndex = chapters.findIndex((chapter) => chapter.id === activeChapter.id);
  const nextChapter = activeIndex >= 0 ? chapters[activeIndex + 1] : undefined;
  const activeUnlocked = isChapterUnlocked(progress, scene, activeChapter);
  const chapterSummary = summarizeChapter(progress, activeChapter);
  const checkpoints = [...activeChapter.checkpoints].sort((a, b) => a.order - b.order);
  const nextChapterLocked = nextChapter
    ? !isChapterUnlocked(progress, scene, nextChapter)
    : false;

  return (
    <div className="chapter-screen">
      {header}

      <main className="page-shell">
        <section className="page-intro chapter-intro" aria-labelledby="chapter-map-title">
          <p className="eyebrow">
            <span className="eyebrow__rule" aria-hidden="true" />
            CHAPTER MAP · {scene.name}
          </p>
          <h1 id="chapter-map-title">
            {scene.name}
            <span>·章节地图</span>
          </h1>
          <p className="page-intro__lead">
            {scene.theme}。选择一个章节，沿着四个检查点完成本岛的编程练习。
          </p>
        </section>

        <nav className="chapter-tabs" aria-label={`${scene.name}章节`}>
          {chapters.map((chapter, index) => {
            const unlocked = isChapterUnlocked(progress, scene, chapter);
            const stats = summarizeChapter(progress, chapter);
            const active = chapter.id === activeChapter.id;

            return (
              <button
                key={chapter.id}
                type="button"
                className={`chapter-tab${active ? " is-active" : ""}`}
                onClick={() => onSelectChapter(chapter.id)}
                disabled={!unlocked}
                aria-pressed={active}
              >
                <span className="chapter-tab__index">
                  CH.{String(index + 1).padStart(2, "0")}
                </span>
                <span className="chapter-tab__copy">
                  <span className="chapter-tab__name">{chapter.name}</span>
                  <span className="chapter-tab__meta">
                    <span className="chapter-tab__star" aria-hidden="true">
                      ★
                    </span>
                    {stats.stars}/{stats.maxStars}
                    <span className="chapter-tab__levels">
                      {stats.completed}/{stats.total} 关
                    </span>
                  </span>
                </span>
                {unlocked ? (
                  <span className="chapter-tab__arrow" aria-hidden="true">
                    →
                  </span>
                ) : (
                  <LockBadge label="未解锁" />
                )}
              </button>
            );
          })}
        </nav>

        <section
          className={`chapter-panel${activeUnlocked ? "" : " is-locked"}`}
          aria-labelledby="chapter-title"
        >
          <div className="chapter-panel__head">
            <div>
              <p className="eyebrow chapter-panel__eyebrow">
                STAGE {String(activeChapter.order).padStart(2, "0")} · {checkpoints.length} 个检查点
              </p>
              <h2 id="chapter-title">{activeChapter.name}</h2>
            </div>
            <div className="chapter-panel__score">
              <span className="chapter-panel__score-star" aria-hidden="true">
                ★
              </span>
              <strong>{chapterSummary.stars}</strong>
              <span>/{chapterSummary.maxStars}</span>
            </div>
          </div>

          {!activeUnlocked ? (
            <div className="locked-panel" role="status">
              <LockBadge label="章节未解锁" />
              <h3>这一章还藏在海雾里</h3>
              <p>先在上一章收集足够的星星，再回来点亮这里的检查点。</p>
            </div>
          ) : (
            <>
              {nextChapter && nextChapterLocked ? (
                <p className="chapter-panel__gate">
                  <LockBadge label="下一章待解锁" />
                  <span>
                    在本章获得 {nextChapter.starGate} 颗星，即可开启「{nextChapter.name}」。
                  </span>
                </p>
              ) : null}

              <div className="checkpoint-board">
                <span className="checkpoint-board__rail" aria-hidden="true" />
                <ol className="checkpoint-grid">
                  {checkpoints.map((checkpoint) => {
                    const levels: LevelSpec[] = checkpoint.levelIds
                      .map((levelId) => findLevel(levelId))
                      .filter((level): level is LevelSpec => level !== undefined);

                    const levelStates = levels.map((level) => ({
                      level,
                      unlocked: isLevelUnlocked(progress, WORLD, level.id),
                      stars: getStars(progress, level.id),
                    }));

                    const anyUnlocked = levelStates.some((state) => state.unlocked);
                    const complete =
                      levelStates.length > 0 && levelStates.every((state) => state.stars > 0);
                    const checkpointStats = summarizeCheckpoint(progress, checkpoint);

                    return (
                      <li className="checkpoint" key={checkpoint.id}>
                        <div
                          className={[
                            "checkpoint__node",
                            anyUnlocked ? "" : "is-locked",
                            complete ? "is-complete" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          aria-hidden="true"
                        >
                          <span className="checkpoint__hex" />
                          <span className="checkpoint__order">
                            {String(checkpoint.order).padStart(2, "0")}
                          </span>
                          {anyUnlocked ? null : (
                            <LockBadge
                              compact
                              label="检查点未解锁"
                              className="checkpoint__lock"
                            />
                          )}
                        </div>

                        <div className="checkpoint__meta">
                          <p className="checkpoint__kicker">
                            CHECKPOINT {String(checkpoint.order).padStart(2, "0")}
                          </p>
                          <h3>{checkpoint.name}</h3>
                          <span className="checkpoint__stars">
                            <StarRow
                              stars={checkpointStats.stars}
                              max={checkpointStats.maxStars}
                              size="xs"
                            />
                            <span>
                              {checkpointStats.stars}/{checkpointStats.maxStars}
                            </span>
                          </span>
                        </div>

                        <div className="level-chips">
                          {levelStates.map(({ level, unlocked, stars }) => (
                            <button
                              key={level.id}
                              type="button"
                              className={`level-chip${stars > 0 ? " is-complete" : ""}`}
                              onClick={() => onOpenLevel(level.id)}
                              disabled={!unlocked}
                            >
                              <span className="level-chip__no">
                                {String(level.index).padStart(2, "0")}
                              </span>
                              <span className="level-chip__title">{level.title}</span>
                              <span className="level-chip__meta">
                                <StarRow stars={stars} max={3} size="xs" />
                                {unlocked ? null : <LockBadge compact label="关卡未解锁" />}
                              </span>
                            </button>
                          ))}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </>
          )}
        </section>

        <p className="world-note">
          <span className="world-note__mark" aria-hidden="true" />
          点击亮起的关卡进入练习。星数由代码长度与步数共同决定，重复挑战只会保留最好成绩。
        </p>
      </main>
    </div>
  );
}
