# Change: Add Windows GUI launcher

## Why
Users currently need to remember and type `jav crawl` options in a terminal. A Windows desktop launcher would make common crawl settings selectable from a form while preserving the existing CLI behavior.

## What Changes
- Add a desktop GUI entry point for launching `jav crawl` with common options.
- Provide controls for limit, parallel, delay, timeout, proxy, Cloudflare bypass, magnet and image options, and advanced fields such as output, search, base URL, cookies, and SSL verification.
- Show the generated command before launch and stream process output into a log panel.
- Add a GUI action for `jav update`.
- Add a result browser that loads `filmData.json`, matches local poster images, and displays magnet links for copying.
- Package the GUI as a Windows executable without changing the existing `jav` CLI command.

## Impact
- Affected specs: packaging
- Affected code: package metadata, new GUI source files, build/package scripts
- New dependencies likely required: Electron and electron-builder
