function IslandMark() {
  return (
    <svg
      className="hero__mark"
      viewBox="0 0 64 64"
      role="img"
      aria-label="海岛徽标"
    >
      <circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.45" />
      <path
        d="M10 40c6-4 10-4 16-1s11 3 17-1 8-4 11-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M22 34c0-7 4.5-12 10-12s10 5 10 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="25" cy="22" r="2.2" fill="currentColor" />
      <circle cx="39" cy="22" r="2.2" fill="currentColor" />
    </svg>
  );
}

export default function App() {
  return (
    <main className="page">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__badge">
          <span className="hero__dot" aria-hidden="true" />
          正在建设
        </div>
        <IslandMark />
        <h1 className="hero__title" id="hero-title">
          ChildrenCode
        </h1>
        <p className="hero__tagline">在岛屿闯关中学会编程</p>
        <p className="hero__note">
          一座座小岛，一关关挑战。用代码解开谜题，让每一步思考都变成看得见的改变。
        </p>
      </section>
    </main>
  );
}
