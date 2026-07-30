/**
 * Central error-reporting hook.
 *
 * Today this only logs to the console — on Oxygen that output is ephemeral
 * (it doesn't survive past the request), so unexpected 500s currently leave
 * no trace anywhere durable. Routing every catch site through this one
 * function means wiring in a real provider later (e.g. Sentry, via
 * `@sentry/cloudflare` for the Oxygen/Workers runtime) is a one-file change:
 * swap the body for `Sentry.captureException(error, {extra: context})` and
 * add the DSN as an env var (see env.d.ts).
 */
export function captureError(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (context) {
    console.error(error, context);
  } else {
    console.error(error);
  }
}
