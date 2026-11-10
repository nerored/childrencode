import { useEffect, useState, type ReactNode } from "react";
import ChapterMap from "./components/chapter/ChapterMap";
import type { Track } from "./components/common/track";
import HomeScreen from "./components/home/HomeScreen";
import LevelScreen from "./components/level/LevelScreen";
import WorldMap from "./components/world/WorldMap";
import { WORLD, findLevel } from "./content/world";
import {
  isChapterUnlocked,
  isLevelUnlocked,
  loadProgress,
  nextLevelId as nextUnlockedLevelId,
  recordResult,
  saveProgress,
} from "./state/progress";
import type { StarRating, StoredProgress } from "./state/progress";

type View =
  | { name: "home" }
  | { name: "world" }
  | { name: "chapter"; sceneId: string; chapterId: string }
  | { name: "level"; levelId: string };

/** Application shell: owns the current view, track, and persisted progress. */
export default function App() {
  const [progress, setProgress] = useState<StoredProgress>(() => loadProgress());
  const [track, setTrack] = useState<Track>("blocks");
  const [view, setView] = useState<View>({ name: "home" });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  function goHome() {
    setView({ name: "home" });
  }

  function openWorld() {
    setView({ name: "world" });
  }

  function openScene(sceneId: string) {
    const scene = WORLD.scenes.find((candidate) => candidate.id === sceneId);
    if (!scene) return;

    const chapters = [...scene.chapters].sort((a, b) => a.order - b.order);
    const target =
      chapters.find((chapter) => isChapterUnlocked(progress, scene, chapter)) ?? chapters[0];
    if (!target) return;

    setView({ name: "chapter", sceneId: scene.id, chapterId: target.id });
  }

  function selectChapter(chapterId: string) {
    if (view.name !== "chapter") return;
    setView({ name: "chapter", sceneId: view.sceneId, chapterId });
  }

  function openLevel(levelId: string) {
    if (!findLevel(levelId)) return;
    if (!isLevelUnlocked(progress, WORLD, levelId)) return;
    setView({ name: "level", levelId });
  }

  function handleComplete(levelId: string, stars: number) {
    setProgress((current) => {
      const normalized = Number.isFinite(stars)
        ? Math.min(3, Math.max(0, Math.trunc(stars)))
        : 0;
      const next = recordResult(current, levelId, normalized as StarRating);
      saveProgress(next);
      return next;
    });
  }

  function goToLevelChapter(levelId: string) {
    const level = findLevel(levelId);
    if (!level) {
      setView({ name: "world" });
      return;
    }
    setView({ name: "chapter", sceneId: level.sceneId, chapterId: level.chapterId });
  }

  function handleLevelBack() {
    if (view.name === "level") goToLevelChapter(view.levelId);
  }

  function handleLevelNext() {
    if (view.name !== "level") return;

    const nextId = nextUnlockedLevelId(progress, WORLD, view.levelId);
    if (nextId) {
      setView({ name: "level", levelId: nextId });
      return;
    }
    goToLevelChapter(view.levelId);
  }

  let screen: ReactNode;

  if (view.name === "home") {
    screen = (
      <HomeScreen
        progress={progress}
        track={track}
        onTrackChange={setTrack}
        onStart={openWorld}
      />
    );
  } else if (view.name === "world") {
    screen = <WorldMap progress={progress} onOpenScene={openScene} onBack={goHome} />;
  } else if (view.name === "chapter") {
    const scene = WORLD.scenes.find((candidate) => candidate.id === view.sceneId);

    screen = scene ? (
      <ChapterMap
        progress={progress}
        scene={scene}
        chapterId={view.chapterId}
        onSelectChapter={selectChapter}
        onOpenLevel={openLevel}
        onBack={openWorld}
      />
    ) : (
      <WorldMap progress={progress} onOpenScene={openScene} onBack={goHome} />
    );
  } else {
    const level = findLevel(view.levelId);

    screen = level ? (
      <LevelScreen
        level={level}
        track={track}
        onTrackChange={setTrack}
        onBack={handleLevelBack}
        onComplete={handleComplete}
        onNext={handleLevelNext}
        nextLevelId={nextUnlockedLevelId(progress, WORLD, level.id)}
      />
    ) : (
      <WorldMap progress={progress} onOpenScene={openScene} onBack={goHome} />
    );
  }

  return (
    <div className="app-shell">
      <div className="app-shell__aurora" aria-hidden="true" />
      {screen}
    </div>
  );
}
