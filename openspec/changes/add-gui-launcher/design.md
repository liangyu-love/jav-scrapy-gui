## Context
The project is a Node.js TypeScript CLI whose runtime entry point is `dist/jav.js`. The GUI should avoid duplicating crawler logic and should launch the existing CLI with a structured argument array.

## Goals / Non-Goals
- Goals: provide a Windows desktop form for common options, preserve terminal CLI compatibility, and produce a distributable `.exe`.
- Non-Goals: rewrite crawler internals, add a web server, or change scraping behavior.

## Decisions
- Decision: use Electron for the GUI shell because the existing project already uses Node.js, and Electron can run a local desktop UI while spawning the built CLI process.
- Decision: use electron-builder for Windows packaging, targeting a portable `.exe` first to keep installation simple.
- Decision: keep renderer access restricted via preload IPC instead of enabling direct Node.js integration in the page.

## Risks / Trade-offs
- Electron output is larger than a native launcher, but it minimizes integration risk with the current Node CLI.
- The GUI depends on the built `dist/jav.js`; packaging commands must run the TypeScript build first.

## Migration Plan
Existing users continue using `jav` normally. GUI users run the packaged executable or the development GUI script.
