# Architecture and design decisions

Daybook is a buildless browser application served by one Node process. Runtime code uses only the Node standard library and browser APIs.

## Module map

| File | Responsibility |
| --- | --- |
| `server.mjs` | Loopback HTTP, static allowlist, serialized writes, mode selection, scheduled artifacts |
| `lib/store.mjs` | First-run creation, atomic JSON writes and validated state mutations |
| `lib/model.mjs` | Pure derived model: lifecycle, focus ordering, reminders, dates and handovers |
| `lib/scanner.mjs` | Optional bounded filesystem metadata traversal and tracked Git observations |
| `sample/seed.mjs` | Fictional first-run records and simulated file-index fixture |
| `public/app.js` | DOM views, dialogs, task save/undo, search and opt-in notifications |
| `public/style.css` | Navy design tokens, responsive layouts and interaction states |
| `tests/` | Rule, storage, scanner, demo and HTTP checks |

## Two execution modes

`node server.mjs` selects demo mode. Initialisation reads the checked-in fictional seed, never another application's data. Refreshing the file index calls `sampleScan()`, a pure fixture function. Folder mappings in incoming mutations are rejected. The real scanner is not invoked.

`node server.mjs --personal` selects a separate empty workspace. A project must be current and have an explicitly configured absolute folder path before `scanProjects()` visits it. No default home directory, desktop root or original user's path is encoded in the app.

Both modes write their own local JSON state; "no folder scanning" does not mean the app avoids reading or writing its own application files.

## The save path

1. A UI action includes the revision the browser last read.
2. The server checks Host, Origin, a custom request header, JSON content type and a 64 KiB request-body limit.
3. The mutation joins a serial queue and must match the current revision.
4. `mutate()` validates allowed fields and produces a new state rather than changing the prior object.
5. The old revision is snapshotted, the new JSON is written through a temporary file and rename, and older snapshots beyond 20 are removed.
6. Derived brief/handover files refresh and the browser reloads the saved state.

A stale tab receives a conflict rather than silently winning. Completion undo issues a new validated mutation. Snapshots offer recovery, but are not an off-device disaster backup. A process or filesystem failure between related artifact writes can leave generated files behind the authoritative state; they regenerate on restart.

## Daily rules

- Current projects are `building` and `planning`.
- Open tasks exclude `done` and `dropped`.
- Focus excludes blocked/snoozed work, ordinary future-dated commitments and backlog. Explicit pins and overdue dates take precedence; the list is capped at three.
- Reminders combine dated tasks and recorded follow-ups, deduplicating a corresponding follow-up task.
- Snooze suppresses visibility until its chosen local calendar date.
- Progress is based on recorded milestone checks, not file timestamps or task-count guesses.

Rules are local and inspectable. They do not infer business outcomes, dependency completion or the user's mental state.

## Personal scanning

The metadata traversal prunes dependencies, Git internals, archives, data/tool directories, common secret filenames and links before descending. It records names, paths, sizes and modification timestamps. It does not read file contents.

Defaults are five directory levels, 6,000 visited entries and a four-second traversal budget per mapped project. An in-flight OS operation may finish after the budget; no new traversal work begins after the cap is observed. Git commands have independent five-second timeouts and optional locks disabled. Git's tracked-change count intentionally excludes untracked entries.

Partial coverage and read warnings are preserved. Change comparison is skipped for incomplete scans to avoid turning skipped paths into false deletion reports. The scanner skips the app's own source root to avoid self-generated activity feedback.

## Server and browser boundaries

Only explicit public assets and API routes are served. `data/`, `.git/` and arbitrary paths are not web routes. The server refuses unexpected Host/Origin values and does not grant CORS preflights. Content Security Policy limits scripts, styles and connections to self. User content is rendered as text nodes.

There is no account authentication, encryption-at-rest layer or multi-user permissions system. These boundaries are appropriate to a single-user loopback prototype, not an internet-facing service. A local process with the same user's filesystem rights can access the stored records.

## Maintenance trade-off

No framework or runtime dependency upgrades are necessary for routine use; Node and the browser still need normal maintenance. The small module set and compact handovers reduce repeated context gathering, but no exact token savings are measured. The UI source favours direct DOM composition; a larger product would likely benefit from stronger component boundaries, broader accessibility testing and a transactional database.
