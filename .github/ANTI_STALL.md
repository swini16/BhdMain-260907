# Anti-stall execution policy

This repository uses a one-pass CI/deploy observation policy for ChatGPT-driven work.

- Start the required gate once.
- Check required gate state once after work is ready. If it has passed, proceed immediately.
- Do not create timed polling loops such as wait 20s -> poll -> wait 30s -> poll.
- Do not repeatedly query advisory/background jobs.
- Advisory jobs never block merge/deploy unless repository branch protection explicitly makes them required.
- After merge, perform one production/deploy verification.
- If that verification is still running, report it once and stop polling. Revisit only on a later user request or if a failure event blocks the next action.
- Re-run only a required job that actually failed and appears transient. At most one retry per failed required job per change.
- Never re-run successful, cancelled-as-superseded, or advisory jobs merely to obtain a fresh status.
- Never trigger a second deploy solely because status observation timed out.
- Prefer event-driven GitHub Actions dependencies over sleep/poll loops.
- Keep attribution, analytics refreshes, recovery monitors, and other advisory automation non-blocking unless explicitly designated required.

This policy governs both human/agent operation and future automation changes. Any workflow that adds polling or retry behavior must justify why event-driven completion cannot be used.
