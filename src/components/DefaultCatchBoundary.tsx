import {
  ErrorComponent,
  Link,
  rootRouteId,
  useMatch,
  useRouter,
} from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter()
  const isRoot = useMatch({
    strict: false,
    select: (state) => state.id === rootRouteId,
  })

  console.error(error)

  return (
    <div className="min-w-0 flex-1 p-4 flex flex-col items-center justify-center gap-6">
      <ErrorComponent error={error} />
      <div className="flex gap-2 items-center flex-wrap">
        <button
          onClick={() => {
            router.invalidate()
          }}
          className={`h-9 rounded-md border border-line-strong bg-surface-2 px-3 text-sm font-medium text-foreground hover:bg-surface-3 inline-flex items-center`}
        >
          Try Again
        </button>
        {isRoot ? (
          <Link
            to="/"
            className={`h-9 rounded-md border border-line-strong bg-surface-2 px-3 text-sm font-medium text-foreground hover:bg-surface-3 inline-flex items-center`}
          >
            Home
          </Link>
        ) : (
          <Link
            to="/"
            className={`h-9 rounded-md border border-line-strong bg-surface-2 px-3 text-sm font-medium text-foreground hover:bg-surface-3 inline-flex items-center`}
            onClick={(e) => {
              e.preventDefault()
              window.history.back()
            }}
          >
            Go Back
          </Link>
        )}
      </div>
    </div>
  )
}
