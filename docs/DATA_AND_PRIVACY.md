# What Daybook stores, reads and does not do

The checked-in repository contains source code, invented sample records, tests, documentation and screenshots captured from the fictional sample. It does not include the creator's private workspace.

## Local data inventory

| Location | Contents | Retention |
| --- | --- | --- |
| `data/demo/state.json` or `data/personal/state.json` | Projects, tasks, profile, folder mappings, settings, snoozes, notes, last 150 edit-history entries | Until you change or remove the local workspace |
| `<mode>/backups/state-N.json` | State immediately before a saved edit | Latest 20 revisions |
| `<mode>/scan.json` | Fixture index in demo; paths, names, sizes, timestamps, coverage and tracked Git observations in personal mode | Latest scan and up to 100 recent file changes |
| `<mode>/briefs/YYYY-MM-DD.json` | Latest rule-based brief saved for a day the server runs | No automatic date-based deletion |
| `<mode>/HANDOVER.md` | Generated text context for current projects | Latest generated version |
| Browser local storage | Notification opt-in and daily per-alert notification markers | Until site storage is cleared |
| Downloaded export | Authoritative state you explicitly exported | Controlled by you; outside app retention |

`<mode>` means `data/demo` or `data/personal`, unless you deliberately set `DAYBOOK_DATA_DIR`. The `importedAt` JSON field is retained for compatibility but represents this edition's workspace-creation time; no private import occurs.

All `data/`, verification output and test temporary directories are ignored by Git. Git ignore is a convenience, not a security boundary: do not force-add personal data or upload an export when reporting an issue.

## Demo mode

- Only the bundled fictional seed and the app's own saved demo state are used.
- File references are invented. They are not inspected on disk.
- The API rejects folder paths, and the real scan function is never selected.
- You can still type your own text into the demo. Such edits become local personal information even though the starter records were fictional.

## Optional personal mode

- Starts empty and never copies another app's data.
- Scans only current projects with paths you explicitly enter.
- Reads directory entries and file metadata, plus tracked Git status; no document-content interpretation occurs.
- Excludes common data, dependency, archive, tool and secret-file patterns. The exclusion list is not a comprehensive secret detector.
- Missing or unreadable paths and partial scans are surfaced rather than described as complete.

## Network behaviour

The app makes same-origin browser requests to its local Node server. It contains no analytics, model API calls, automatic remote integrations, cloud backup or remote font loads. No records are sent to GitHub merely because the source came from GitHub.

Repository actions such as cloning, fetching updates, GitHub-hosted CI, and opening an external URL are separate from runtime data handling. User-entered project links are opened only when clicked.

## Important limits

Stored records are plain JSON/Markdown, not encrypted. Other software with the same local user's file access can read them. Local snapshots do not protect against disk loss. The app has no user login and must remain on loopback. Browser notification permissions and OS delivery are controlled by the browser and operating system.

For sharing, use only a fresh fictional sample and review screenshots before publishing. For recovery, stop the server and follow [Setup](SETUP.md#backup-reset-and-restore).
