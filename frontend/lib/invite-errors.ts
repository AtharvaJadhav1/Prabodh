/**
 * The server answers "This invitation is no longer pending" when a request was already answered
 * (accepted, declined, expired or withdrawn) - e.g. from another tab or by the team leader. That is not
 * an error the mentor can act on: the screen should just refresh and drop the stale card.
 */
export function isAlreadyAnswered(err: unknown): boolean {
  return err instanceof Error && /no longer pending/i.test(err.message);
}
