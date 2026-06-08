import Link from 'next/link'

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-2xl bg-card p-6 border-0 text-center shadow-sm">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Offline</p>
        <h1 className="mt-3 text-2xl font-semibold text-foreground">You are currently offline</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connect to the internet and try again. Cached pages and data will keep working where available.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">Siz hozir offlinesiz. Internetga ulang va qayta urinib ko‘ring.</p>
        <p className="mt-1 text-xs text-muted-foreground">Вы сейчас офлайн. Подключитесь к интернету и попробуйте снова.</p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-background border-0 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Open Home
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Open Login
          </Link>
        </div>
      </section>
    </main>
  )
}

