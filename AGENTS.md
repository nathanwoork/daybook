# Daybook portfolio maintenance

Read README.md, then only the module relevant to the change.

- Default demo mode must never invoke the real filesystem scanner, accept folder mappings, import another app's records or infer paths from a username/home directory.
- Personal mode must be explicit, initialise empty and keep a separate data directory.
- Commit only source, fictional fixtures, tests, docs and reviewed sample screenshots. Never commit data/, logs, exports, private paths or original personal screenshots.
- Preserve deterministic rules and zero external runtime packages/API calls unless the user explicitly changes that requirement.
- Preserve current-project filtering, observation-versus-completion distinctions, text-node rendering, request boundaries, atomic saves, snapshots and revision checks.
- A failed save must not be presented as a success. Do not test by completing actual personal tasks.
- Run `node --test tests/*.test.mjs` and `node --check public/app.js` after relevant changes. Use temporary datasets for mutation tests.
- The portfolio should credit AI-assisted implementation honestly. Do not invent impact metrics, user studies, adoption or manual authorship.
