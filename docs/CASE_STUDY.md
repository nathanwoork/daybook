# Daybook — making a daily dashboard easier to use

| | |
| --- | --- |
| Owner | Nathan Woo |
| Format | Working personal-product prototype, reusable sample and portfolio case study |
| Build | October 2026; developed with OpenAI Codex |
| Focus | Product requirements, information hierarchy, local-first workflows and maintainability |

## The problem

A project overview can be accurate and still be difficult to act on. A long brief, overlapping reminder panels and a large count of open tasks all compete for attention. A twenty-step project plan is not the same thing as twenty things that should happen today.

Nathan wanted an independent version of a personal project dashboard that could be compared on UI cohesion, personal visual preference, token maintenance cost, local operation and day-to-day usefulness. The visual preference was explicit: a minimal dark workspace with navy blue.

The portfolio edition retains that product direction while replacing the private workspace with a fictional sample that anyone can safely run.

## Nathan's role and the use of AI

Nathan defined the need, the evaluation criteria, the preference for local operation and the navy visual direction. He also requested that the project be packaged for reuse and explained to employers.

OpenAI Codex translated the brief into the implementation, tests and supporting documentation. This case study presents the result transparently as **AI-assisted product development**. It does not claim Nathan manually authored every module, independently performed every technical test, or conducted formal user research.

The useful work to assess is the product brief, the resulting design decisions, the functional behaviour and the ability to explain trade-offs honestly. A reviewer can inspect and run the complete implementation rather than relying on a polished image alone.

## Decisions that shaped the product

### 1. Give today a small, actionable surface

The main view offers at most three focus steps. Pinned tasks and overdue commitments rank ahead of ordinary suggestions. Blocked, snoozed, future-dated and backlog work stay out of automatic suggestions unless the rules explicitly make it relevant.

This is deterministic prioritisation, not an AI recommendation. It is understandable and inexpensive, but it cannot know the user's real energy, dependencies or changing context. Pinning and editing remain essential.

### 2. Separate lifecycle from urgency

Building and Planning are current. Might pursue, On hold, Finished and Graveyard are separate places for work that should not compete for today's attention. Even a historical due date on a paused project does not make that project urgent again.

### 3. Make common actions durable

Task edits save to the local server, rather than depending on an unsynchronised browser override. Completion offers an undo action. Writes use revision checks to avoid one stale browser tab overwriting another, and save a recovery snapshot before the authoritative state changes.

### 4. Keep observation separate from accomplishment

A changed file is evidence of activity, not proof that a milestone was delivered. The scanner therefore produces metadata and file differences; a person records task and milestone completion. This avoids an attractive but misleading progress score.

### 5. Use navy as a system, not decoration

The interface uses layered navy surfaces, restrained blue highlights and amber for attention. Navigation, cards, dialogs, badges and typography share the same tokens. Project details and backlog live behind deliberate views so the home screen can stay quieter.

### 6. Make the public version safe to try

The original workspace remains private. A fresh clone starts with an invented persona and project set. Demo mode cannot accept a folder mapping and never invokes the real scanner. Personal mode is an explicit command and starts empty in a different data directory.

## The implementation in plain language

One Node process serves a browser interface and a small JSON API. A pure rule layer derives the daily view. Local JSON files store the authoritative records and recovery copies. Optional scanning has depth, entry and time bounds and skips dependency, archive, data and tool folders before descending into them.

There are no external runtime packages, API keys, remote fonts, telemetry or model calls. That reduces routine setup and dependency maintenance. The trade-off is a deliberately small application: no framework ecosystem, no cloud collaboration and no language-model interpretation of arbitrary documents.

## Evidence and limits

The repository includes executable tests for the rules, persistence, request boundaries and scan behaviour, plus browser captures of the actual sample. See [Verification](VERIFICATION.md) for the scope.

This is not a production deployment case study. There are no invented user counts, conversion metrics, employer endorsements or productivity statistics. Browser notification delivery, long-running uptime and every accessibility combination are not established by the automated suite.

## What a reviewer can explore in five minutes

1. Start the fictional demo and find the next dated commitment.
2. Complete a sample focus task, undo it, then reload to check persistence.
3. Open a project and compare task completion with recorded milestones.
4. Snooze a reminder and restore it from Attention.
5. Open Files and note that the sample is a fixture, then inspect how personal mode changes the boundary.

Potential next iterations include accessibility review with assistive technology, clearer task dependencies, recurrence, easier backup restoration and a narrowly scoped notification service. Those are opportunities, not shipped features.
