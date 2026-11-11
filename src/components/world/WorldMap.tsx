import { WORLD } from "../../content/world";
import type { SceneSpec } from "../../domain/types";
import type { StoredProgress } from "../../state/progress";
import { isSceneUnlocked } from "../../state/progress";
import AppHeader from "../common/AppHeader";
import LockBadge from "../common/LockBadge";
import ProgressBar from "../common/ProgressBar";
import { summarizeScene, summarizeWorld } from "../common/progressMath";
import windmillArt from "../../assets/art/scene-windmill-meadow-1600x900.webp";
import tideArt from "../../assets/art/scene-tide-coast-1600x900.webp";
import gearArt from "../../assets/art/scene-gear-workshop-1600x900.webp";
import mistArt from "../../assets/art/scene-mist-forest-1600x900.webp";

interface WorldMapProps {
  progress: StoredProgress;
  onOpenScene: (sceneId: string) => void;
  onBack: () => void;
}

interface ConceptInfo {
  label: string;
  short: string;
}

const CONCEPTS: Record<SceneSpec["conceptFocus"], ConceptInfo> = {
  movement: { label: "移动与顺序", short: "MOVE" },
  loops: { label: "循环", short: "LOOP" },
  "variables-conditions": { label: "变量与条件", short: "VAR · IF" },
  branching: { label: "分支判断", short: "IF / ELSE" },
};

const SCENE_ART: Record<string, string> = {
  s01: windmillArt,
  s02: tideArt,
  s03: gearArt,
  s04: mistArt,
};

/** Scene selection screen with unlock gates and per-scene progress. */
export default function WorldMap({ progress, onOpenScene, onBack }: WorldMapProps) {
  const summary = summarizeWorld(progress, WORLD);
  const scenes = [...WORLD.scenes].sort((a, b) => a.order - b.order);

  return (
    <div className="world-screen">
      <AppHeader
        onHome={onBack}
        onBack={onBack}
        backLabel="返回首页"
        stars={summary.stars}
        maxStars={summary.maxStars}
        completed={summary.completed}
        totalLevels={summary.total}
      />

      <main className="page-shell">
        <section className="page-intro world-intro" aria-labelledby="world-title">
          <p className="eyebrow">
            <span className="eyebrow__rule" aria-hidden="true" />
            WORLD MAP · 学习群岛
          </p>
          <h1 id="world-title">
            四片原野，<span>一条代码航线</span>
          </h1>
          <p className="page-intro__lead">
            每座岛只讲一个核心概念。沿着航线收集星星，把移动、循环、变量与判断一层层串起来。
          </p>
          <div className="world-summary">
            <span className="world-summary__item">
              <strong>{summary.stars}</strong>
              <span>/{summary.maxStars} 星</span>
            </span>
            <span className="world-summary__item">
              <strong>{summary.completed}</strong>
              <span>/{summary.total} 关</span>
            </span>
            <span className="world-summary__note">逐岛解锁 · 星星驱动</span>
          </div>
        </section>

        <section className="scene-grid" aria-label="四座主题岛">
          {scenes.map((scene) => {
            const unlocked = isSceneUnlocked(progress, WORLD, scene);
            const stats = summarizeScene(progress, scene);
            const concept = CONCEPTS[scene.conceptFocus];

            return (
              <button
                key={scene.id}
                type="button"
                className={`scene-card scene-card--${scene.id}${unlocked ? "" : " is-locked"}`}
                onClick={() => onOpenScene(scene.id)}
                disabled={!unlocked}
              >
                <span className="scene-card__top">
                  <span className="scene-card__index">
                    ISLAND {String(scene.order).padStart(2, "0")}
                  </span>
                  {unlocked ? (
                    <span className="scene-card__open">可探索</span>
                  ) : (
                    <LockBadge label="尚未解锁" />
                  )}
                </span>

                <span className="scene-card__art">
                  <img src={SCENE_ART[scene.id]} alt="" />
                  <span className="scene-card__art-veil" aria-hidden="true" />
                </span>

                <span className="scene-card__body">
                  <span className="concept-badge">
                    <span>{concept.label}</span>
                    <code>{concept.short}</code>
                  </span>
                  <span className="scene-card__name">{scene.name}</span>
                  <span className="scene-card__theme">{scene.theme}</span>

                  <span className="scene-card__stats">
                    <span className="scene-card__stars">
                      <span className="scene-card__star" aria-hidden="true">
                        ★
                      </span>
                      <strong>{stats.stars}</strong>
                      <span>/{stats.maxStars}</span>
                    </span>
                    <span>完成 {stats.completed}/{stats.total}</span>
                  </span>

                  <ProgressBar
                    value={stats.stars}
                    max={stats.maxStars}
                    tone="mint"
                    className="scene-card__progress"
                  />

                  <span className="scene-card__cta">
                    {unlocked ? "进入章节地图" : "先完成上一片原野"}
                    <span aria-hidden="true">{unlocked ? "→" : "·"}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </section>

        <p className="world-note">
          <span className="world-note__mark" aria-hidden="true" />
          每座岛包含两个章节、八个检查点与十六个关卡。星星只增不减，进度自动保存在本机。
        </p>
      </main>
    </div>
  );
}
