import BrandMark from "./BrandMark";

interface AppHeaderProps {
  onHome: () => void;
  onBack?: () => void;
  backLabel?: string;
  stars: number;
  maxStars: number;
  completed: number;
  totalLevels: number;
}

/** Sticky navigation and compact progress readout shared by map screens. */
export default function AppHeader({
  onHome,
  onBack,
  backLabel = "返回",
  stars,
  maxStars,
  completed,
  totalLevels,
}: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div className="app-header__nav">
          {onBack ? (
            <button
              type="button"
              className="button button--ghost app-header__back"
              onClick={onBack}
            >
              <span aria-hidden="true">←</span>
              {backLabel}
            </button>
          ) : null}

          <button
            type="button"
            className="brand"
            onClick={onHome}
            aria-label="ChildrenCode 首页"
          >
            <BrandMark className="brand__mark" />
            <span className="brand__word">ChildrenCode</span>
          </button>
        </div>

        <div className="header-stats" aria-label="学习进度">
          <span className="header-stats__item">
            <span className="header-stats__label">星星</span>
            <strong>
              <svg
                className="header-stats__star"
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M12 2.5 14.9 8.4l6.5.95-4.7 4.58 1.11 6.47L12 17.35 6.19 20.4l1.1-6.47-4.7-4.58 6.51-.95L12 2.5Z" />
              </svg>
              {stars}
            </strong>
            <span className="header-stats__muted">/{maxStars}</span>
          </span>
          <span className="header-stats__divider" aria-hidden="true" />
          <span className="header-stats__item">
            <span className="header-stats__label">关卡</span>
            <strong>{completed}</strong>
            <span className="header-stats__muted">/{totalLevels}</span>
          </span>
        </div>
      </div>
    </header>
  );
}
