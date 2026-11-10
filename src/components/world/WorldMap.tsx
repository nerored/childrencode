import { WORLD } from "../../content/world";
import type { SceneSpec } from "../../domain/types";
import type { StoredProgress } from "../../state/progress";
import { isSceneUnlocked } from "../../state/progress";
import AppHeader from "../common/AppHeader";
import LockBadge from "../common/LockBadge";
import ProgressBar from "../common/ProgressBar";
import { summarizeScene, summarizeWorld } from "../common/progressMath";

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

function SceneGlyph({ sceneId }: { sceneId: string }) {
  if (sceneId === "s01") {
    return (
      <svg className="scene-card__glyph" viewBox="0 0 220 130" aria-hidden="true" focusable="false">
        <path d="M8 106c28-18 52-18 78 0 24 16 48 16 74 2 18-10 34-12 52-4" />
        <path d="M18 118h184" opacity="0.35" />
        <path d="M104 106 111 44h22l8 62" />
        <path d="M116 66h13M113 84h19" opacity="0.5" />
        <g transform="translate(122 44)">
          <path d="M0 0 4-8 4-40 0-44-4-40-4-8Z" />
          <path d="M0 0 4-8 4-40 0-44-4-40-4-8Z" transform="rotate(90)" />
          <path d="M0 0 4-8 4-40 0-44-4-40-4-8Z" transform="rotate(180)" />
          <path d="M0 0 4-8 4-40 0-44-4-40-4-8Z" transform="rotate(270)" />
          <circle r="5" />
        </g>
        <path d="M26 40c9-13 23-13 32 0M42 52c7-10 18-10 25 0" opacity="0.45" />
        <circle cx="188" cy="36" r="3" />
      </svg>
    );
  }

  if (sceneId === "s02") {
    return (
      <svg className="scene-card__glyph" viewBox="0 0 220 130" aria-hidden="true" focusable="false">
        <path d="M10 82c18-11 34-11 52 0s34 11 52 0 34-11 52 0 28 9 44 3" />
        <path d="M4 98c18-11 34-11 52 0s34 11 52 0 34-11 52 0 34 10 56 0" opacity="0.55" />
        <path d="M12 114c18-11 34-11 52 0s34 11 52 0 34-11 52 0 26 8 42 2" opacity="0.3" />
        <path d="M146 96 154 42h18l8 54" />
        <path d="M154 42h18M160 28h6v14" />
        <path d="M163 20 151 30M163 20l12 10" opacity="0.5" />
        <circle cx="163" cy="56" r="2.5" />
        <path d="M40 48c8-10 20-10 28 0" opacity="0.5" />
      </svg>
    );
  }

  if (sceneId === "s03") {
    return (
      <svg className="scene-card__glyph" viewBox="0 0 220 130" aria-hidden="true" focusable="false">
        <g className="scene-card__gear">
          <circle cx="74" cy="68" r="30" strokeDasharray="8 6" />
          <circle cx="74" cy="68" r="11" />
          <path d="M74 38v-8M74 106v-8M44 68h-8M112 68h-8M53 47l-6-6M101 95l6 6M95 47l6-6M53 89l-6 6" opacity="0.6" />
        </g>
        <g className="scene-card__gear">
          <circle cx="151" cy="48" r="19" strokeDasharray="6 5" />
          <circle cx="151" cy="48" r="6" />
        </g>
        <path d="M104 90h22l10-14h18" />
        <path d="M20 112h182" opacity="0.35" />
        <circle cx="176" cy="92" r="11" strokeDasharray="5 4" />
        <circle cx="176" cy="92" r="3" />
        <path d="M24 30h26M24 39h16" opacity="0.45" />
      </svg>
    );
  }

  return (
    <svg className="scene-card__glyph" viewBox="0 0 220 130" aria-hidden="true" focusable="false">
      <path d="M18 112c35-1 62-24 62-48 0-21 20-35 42-35 20 0 27 15 43 15 14 0 24-9 34-21" />
      <path d="M122 64c-12 3-20 11-25 23M122 64c16 1 27 10 34 24" opacity="0.75" />
      <circle cx="122" cy="64" r="7" />
      <circle cx="97" cy="90" r="4" />
      <circle cx="157" cy="91" r="4" />
      <circle cx="195" cy="23" r="3" />
      <path d="M24 30h54M16 41h38M150 116h52M132 122h28" opacity="0.3" />
      <path d="M34 86c15-9 30-9 45 0" opacity="0.2" />
    </svg>
  );
}

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

                <span className="scene-card__art" aria-hidden="true">
                  <SceneGlyph sceneId={scene.id} />
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
