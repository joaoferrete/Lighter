# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0] - Unreleased

### Added
- Independent border thickness per side (top/bottom/left/right); setting a side to 0
  disables it entirely.
- Named profiles: save the current appearance as a profile (e.g. "Google Meet") and
  switch between profiles from the panel menu or the preferences window.
- Optional automatic profile switching based on the focused window (match by
  application ID or a regular expression on the window title).
- Build tooling: `Makefile` (build/lint/pot/pack/install/nested), ESLint config,
  GitHub Actions CI, and gettext translation scaffolding (`po/`).
- `CONTRIBUTING.md` and this changelog.
- Brazilian Portuguese translation.

### Changed
- Borders are now drawn with `St.Widget` and CSS colors instead of the deprecated
  `Clutter.Color` API (removed in GNOME 47).
- The color picker in preferences uses `Gtk.ColorDialogButton` instead of the
  deprecated `Gtk.ColorButton`.
- The preferences keyboard shortcut is now only active in normal mode
  (`Shell.ActionMode.NORMAL`).
- `make install` refuses to run when the extension is installed as a symlink into
  the repository, because `gnome-extensions install --force` would delete the
  repository contents through the symlink.

### Fixed
- Toggling "Maximize Brightness" in preferences now takes effect immediately.
- `schemas/gschemas.compiled` is no longer tracked in the repository.

## [1] - 2025

### Added
- Initial release: adjustable white screen borders for videocall lighting, with
  thickness, opacity, color, temperature, multi-monitor support, automatic screen
  brightness maximization, and a panel indicator.
