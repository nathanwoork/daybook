# Verification

## Automated scope

Run `node --test tests/*.test.mjs`. The suite contains 23 tests covering:

- Current/inactive lifecycle filtering, focus pinning and the three-step cap.
- Backlog, future dates, blockers, snooze expiry and reminder deduplication.
- Completion, immutable state mutation, invalid dates/statuses/fields and handover bounds.
- Scanner pruning, actual traversal depth, entry caps, missing roots and file differences.
- Initialisation from a clean checkout with no private import files.
- Empty personal setup, relative sample dates and fixture independence from supplied paths.
- HTTP persistence, stale-write rejection, snapshot creation, demo folder-path rejection, request-body limit, Host/Origin checks and static-file allowlist.

Browser JavaScript also passes `node --check public/app.js`. The GitHub Actions matrix is configured for Node 22/24 on Windows/Linux. Local passing tests do not by themselves imply that every hosted matrix job has finished; see the repository Actions results for that evidence.

## Visual and browser evidence

The images in `docs/images/` are actual browser captures from the fictional demo. They show Today, Projects in card view, and Attention. They contain invented records rather than private personal work.

The underlying Daybook build was checked for task save/reload, completion/undo, alert snooze/restore, project editing, journal persistence and narrow-layout overflow. Portfolio-specific checks cover the default demo, fictional file index, visible no-scanning disclosure and clean setup. Any future substantial changes should repeat the relevant browser flows.

## Not established

No formal user study, productivity improvement percentage, production adoption, external security audit, exhaustive accessibility conformance, cross-browser notification delivery or multi-day uptime claim is made. There is no service worker, OS notification daemon, cloud sync or crash-recovery supervisor.
