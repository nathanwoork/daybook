# Use Daybook for yourself

## Requirements

- Node.js 22 or newer, available as `node` in your terminal.
- A modern browser on the same computer.
- Git only for cloning the repository or reading optional repository status. Downloading the ZIP is also supported.

No package installation, credentials or cloud account is required.

## Explore the fictional sample

```sh
git clone https://github.com/nathanwoork/daybook.git
cd daybook
node server.mjs
```

Open **http://127.0.0.1:8145**. On Windows, **Start Demo.cmd** runs the same command. Keep the terminal open. Stop with `Ctrl+C`.

The sample is generated from `sample/seed.mjs`. Its initial deadlines are relative to the first run. Afterwards your demo edits persist under `data/demo/`; the dates are not continually moved to hide overdue work.

## Start your personal workspace

```sh
node server.mjs --personal
```

Open **http://127.0.0.1:8146**. On Windows, use **Start Personal.cmd**. The first run creates an empty workspace under `data/personal/`, separate from the sample.

1. In **Projects**, choose **New project** and give it a name and description.
2. Optionally add an absolute path to the specific project folder. Leave it blank for remote or non-file work. Avoid broad home/Desktop mappings.
3. Use **Edit project** to record the next step, lifecycle, handover and waiting-on date.
4. Add tasks. Pin up to three preferred steps for Today and keep speculative work in Backlog.
5. In **My profile**, edit the name, headline and summary. Optional interest/direction lists can be maintained in the state file while the server is stopped.
6. Review scan coverage in Settings. Only current projects with explicit folder mappings are scanned.

Folder paths are accepted only in personal mode. Scanning starts on the next scan or when you click Scan now. Files are indexed by name, size and timestamp; their contents are not read. Git status is optional and reports tracked changes only.

## Ports and data directories

Demo defaults to 8145 and personal mode to 8146, avoiding the original private Daybook port. To change the port in PowerShell:

```powershell
$env:DAYBOOK_PORT = '8150'
node server.mjs
```

On macOS/Linux:

```sh
DAYBOOK_PORT=8150 node server.mjs
```

`DAYBOOK_DATA_DIR` can select a different data directory. Use a new dedicated directory and keep demo/personal records separate. Do not point two running servers at the same state directory.

The server binds only to `127.0.0.1`. A responsive phone-sized layout does not mean the app is reachable from a separate phone over Wi-Fi. Do not change the binding to deploy this as a public website.

## Backup, reset and restore

Settings → **Export backup** downloads the authoritative state. The preceding 20 state revisions are also kept under the mode's `backups/` directory.

To restore, stop the server first. Preserve the current `state.json`, copy the selected backup to `state.json`, and restart. Generated scans, briefs and handovers can regenerate. Do not replace the file while the server retains an in-memory state.

To reset only the fictional sample, stop it and rename `data/demo/` to a dated archive name. The next default start creates a new sample. Do not apply that step to personal mode without retaining a backup.

## Notifications

Use the app's opt-in button if you want browser notifications. They require permission, an open tab and browser/OS support. In-app Attention works without permission. Nothing runs while the server is stopped or the computer is asleep. No automatic sign-in task, Windows service or hidden watchdog is installed.

## Verify or modify

```sh
node --test tests/*.test.mjs
node --check public/app.js
```

Edit `public/style.css` for the visual tokens, `lib/model.mjs` for daily rules, and `sample/seed.mjs` for the fictional demo. Restart after changing backend files; reload the browser after public asset changes. Read [Architecture](ARCHITECTURE.md) before modifying persistence or request boundaries.
