## ADDED Requirements

### Requirement: Windows GUI Launcher
The package MUST provide a Windows desktop GUI launcher that starts existing `jav` commands without changing the CLI interface.

#### Scenario: Launch crawl from GUI
- **GIVEN** the user opens the GUI launcher
- **WHEN** the user sets common crawl options and starts the crawl
- **THEN** the launcher MUST execute the existing `crawl` command with equivalent CLI arguments
- **AND** the launcher MUST stream process output to the GUI
- **AND** the launcher MUST allow the user to stop the running process

#### Scenario: Update address cache from GUI
- **GIVEN** the user opens the GUI launcher
- **WHEN** the user selects the update action
- **THEN** the launcher MUST execute the existing `update` command
- **AND** the launcher MUST stream process output to the GUI

### Requirement: GUI Option Coverage
The GUI launcher MUST expose common crawl options with defaults matching the CLI behavior.

#### Scenario: Default option values
- **WHEN** the GUI starts
- **THEN** limit MUST default to `0`
- **AND** parallel MUST default to `2`
- **AND** delay MUST default to `2`
- **AND** timeout MUST default to `30000`
- **AND** proxy MUST be empty to allow automatic proxy detection
- **AND** Cloudflare, nomag, allmag, nopic, and debug toggles MUST default to off

#### Scenario: Advanced option values
- **WHEN** the user expands advanced options
- **THEN** the GUI MUST allow output path, search keyword, base URL, cookies, and strict SSL settings to be configured

### Requirement: Windows Executable Packaging
The package MUST include a build path that produces a Windows executable for the GUI launcher.

#### Scenario: Build GUI executable
- **WHEN** the maintainer runs the documented GUI packaging command on Windows
- **THEN** a Windows `.exe` artifact MUST be created
- **AND** the artifact MUST include the built CLI files needed to run crawls

### Requirement: GUI Result Browser
The GUI launcher MUST provide a result browser for crawler output files.

#### Scenario: Load crawler results
- **GIVEN** an output directory contains `filmData.json`
- **WHEN** the user loads results from the GUI
- **THEN** the GUI MUST display each film record with title, categories, actresses, and magnet links
- **AND** the GUI MUST display the poster image when a matching local image exists

#### Scenario: Copy magnet links
- **GIVEN** a displayed film has one or more magnet links
- **WHEN** the user selects copy for a link or all links
- **THEN** the selected magnet link text MUST be written to the system clipboard

#### Scenario: Search results
- **GIVEN** results are loaded in the GUI
- **WHEN** the user enters a search keyword
- **THEN** the GUI MUST filter displayed films by title, film code, category, actress, magnet size, or magnet URL

#### Scenario: Compact result interaction
- **GIVEN** a displayed film has one or more magnet links
- **WHEN** the user hovers over its result card
- **THEN** the GUI MUST show quick actions for copying, opening, or previewing magnet links
- **AND** long magnet URLs MUST remain collapsed until the user expands them

#### Scenario: Detail modal
- **GIVEN** results are shown in poster gallery mode
- **WHEN** the user clicks a result card
- **THEN** the GUI MUST open a detail modal with a large poster preview, all tags, and the full magnet list

### Requirement: Drawer-Based Workspace
The GUI launcher MUST prioritize result browsing space by moving secondary controls into drawers.

#### Scenario: Configuration drawer
- **WHEN** the user opens parameter configuration
- **THEN** the GUI MUST show configuration as an overlay drawer
- **AND** the result gallery MUST remain the primary workspace when the drawer is closed

#### Scenario: Log drawer
- **WHEN** the user opens runtime logs
- **THEN** the GUI MUST show logs as an overlay drawer
- **AND** the drawer MUST support all, error, and success filters

### Requirement: GUI Runtime Dashboard
The GUI launcher MUST surface task state without requiring the user to read raw logs.

#### Scenario: Dashboard updates
- **WHEN** a crawl task is running or results are loaded
- **THEN** the GUI MUST display task state, result count, magnet count, error count, and progress summary
