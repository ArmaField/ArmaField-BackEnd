export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-6">
      <div className="flex flex-col items-center">
        {/* Main block */}
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-10">
          {/* Left — Logo */}
          <p
            className="text-4xl tracking-wider text-zinc-500 sm:text-5xl"
            style={{ fontFamily: '"SAIBA 45", sans-serif' }}
          >
            ARMAFIELD
          </p>

          {/* Divider — horizontal on mobile, vertical on desktop */}
          <div className="h-px w-16 bg-zinc-800 sm:h-14 sm:w-px" />

          {/* Right — 404 + subtitle */}
          <div className="flex flex-col items-center sm:items-start">
            <p className="text-5xl font-semibold tracking-tight text-zinc-500">404</p>
            <p className="mt-1.5 text-xs text-zinc-600">Page not found</p>
          </div>
        </div>

        {/* Dashboard link — centered under the whole block, hidden on mobile (shown inline there) */}
        <a
          href="/"
          className="mt-8 hidden text-sm text-zinc-500 underline underline-offset-4 transition-colors hover:text-zinc-300 sm:inline-block"
        >
          Go to Dashboard
        </a>

        {/* Mobile — link inline under 404 */}
        <a
          href="/"
          className="mt-4 text-sm text-zinc-500 underline underline-offset-4 transition-colors hover:text-zinc-300 sm:hidden"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}
