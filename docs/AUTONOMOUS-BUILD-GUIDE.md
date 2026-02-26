# SkyWork Manager - Autonomous Build Guide

## Prerequisites

- Node.js 18+ installed
- Claude Code CLI installed (`npm install -g @anthropic-ai/claude-code`)
- Git initialised in the project folder

## Folder Setup

```bash
mkdir skywork-manager
cd skywork-manager
git init
```

Place the downloaded files like this:

```
skywork-manager/
  CLAUDE.md                          # Root - Claude Code reads this automatically
  .claude/
    settings.json                    # Permissions config (safe commands only)
  docs/
    PRD.md                           # Renamed from PRD-SkyWork-Management-System.md
    receipt-reference.html           # Existing receipt template for styling
```

## Install Ralph Wiggum Plugin

Open Claude Code and run:

```
/plugin marketplace add anthropics/claude-code
/plugin install ralph-wiggum@claude-plugins-official
```

## Run the Autonomous Build

Start Claude Code in the project directory:

```bash
cd skywork-manager
claude
```

Then run the ralph-loop command:

```
/ralph-loop "Read CLAUDE.md and docs/PRD.md thoroughly. Build the SkyWork Manager system phase by phase as defined in PRD Section 10. Start with Phase 1 (Project Setup & Database) and work through to Phase 8 (Dashboard & Reports). For each phase: implement all features described in the PRD, ensure npm run dev works without errors, test that pages render correctly, and git commit before moving to the next phase. Use Next.js App Router, better-sqlite3 for SQLite, and Tailwind CSS. After completing all 8 phases, run npm run dev one final time to verify everything works. Output <promise>BUILD_COMPLETE</promise> when all 8 phases are done and the app runs without errors." --max-iterations 50 --completion-promise "BUILD_COMPLETE"
```

## What the Permissions Allow

The `.claude/settings.json` file grants Claude Code permission to:

**Allowed (auto-approved):**
- Read, write, edit files (all project files)
- Run node, npm, npx, git, tsc commands
- Run safe bash commands: ls, cat, mkdir, cp, mv, touch, echo, head, tail, grep, find, sed, awk, sort, wc, curl
- Use sub-agents (Task) and todo tracking

**Denied (blocked entirely):**
- `rm`, `rmdir` - cannot delete files or folders
- `sudo`, `chmod`, `chown` - no privilege escalation
- `kill`, `pkill`, `killall` - no process killing
- `apt`, `apt-get`, `brew`, `pip` - no system package installs
- `wget` - no arbitrary downloads
- `eval`, `exec` - no dynamic code execution
- `dd`, `mkfs`, `fdisk` - no disk operations
- `shutdown`, `reboot` - no system commands

## Monitoring Progress

While the loop runs, you can monitor:

- **Terminal output** - watch Claude work in real-time
- **Git log** - `git log --oneline` from another terminal to see committed phases
- **Dev server** - open `http://localhost:3000` in your browser to check the app

## Stopping the Loop

If you need to stop at any point:

```
/cancel-ralph
```

## After Completion

Once the build is complete:

1. Review the git log to see what was built per phase
2. Run `npm run dev` and test the app at `http://localhost:3000`
3. Check `docs/BLOCKERS.md` if it exists for any issues Claude encountered
4. The SQLite database will be at `data/skywork.db`

## Cost Estimate

With 50 max iterations, expect roughly $30-80 in API usage depending on complexity. Most builds should complete well within 30-40 iterations.
