/**
 * Next.js instrumentation hook — `register()` runs once when the server
 * process boots; `onRequestError` fires for ANY uncaught error during
 * server-side rendering/route handling, in every runtime (Node, Edge).
 *
 * Added specifically to debug the `/[locale]/u/[handle]` 500 in production:
 * Vercel's Function/Runtime logs showed NOTHING for those requests, and the
 * response's `X-Matched-Path: /500` header suggests the platform's routing
 * layer served a static fallback WITHOUT ever invoking our Next.js server —
 * i.e. this hook likely won't fire either. If it stays silent while the
 * 500s continue, that's confirmation the failure is upstream of our code
 * (Vercel build/routing config), not a bug reachable from here. If it DOES
 * fire, we finally get a real stack trace instead of a black box.
 */
export async function register(): Promise<void> {
  // No OpenTelemetry/tracing setup needed — this file's only job here is
  // the onRequestError hook below.
}

export async function onRequestError(
  error: unknown,
  request: {
    path: string;
    method: string;
    headers: Record<string, string | undefined>;
  },
  context: {
    routerKind: 'Pages Router' | 'App Router';
    routePath: string;
    routeType: string;
    renderSource?: string;
  },
): Promise<void> {
  const details =
    error instanceof Error
      ? { message: error.message, name: error.name, stack: error.stack }
      : { message: String(error) };

  // eslint-disable-next-line no-console -- intentional: this is the whole point of the hook.
  console.error('[instrumentation] onRequestError', {
    ...details,
    path: request.path,
    method: request.method,
    routerKind: context.routerKind,
    routePath: context.routePath,
    routeType: context.routeType,
    renderSource: context.renderSource,
  });
}
