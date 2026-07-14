# Lighter (GNOME Extension)

![CI](https://github.com/joaoferrete/Lighter/actions/workflows/ci.yml/badge.svg)
![GNOME 45+](https://img.shields.io/badge/GNOME-45%20%7C%2046%20%7C%2047-blue)
![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-green)

**Lighter** is a GNOME Shell extension that improves your videocall lighting at night by
adding adjustable light borders around your screen edges — a software ring light. Perfect
for laptop users who need extra illumination without external gear.

<!-- TODO: add screenshots to docs/ -->
<!-- ![Borders on screen](docs/screenshot-borders.png) -->
<!-- ![Preferences window](docs/screenshot-prefs.png) -->

## Features

- **Per-side thickness**: Adjust each border (top, bottom, left, right) independently,
  or keep them linked. Set a side to 0 to disable it — e.g. only bottom + sides for a
  lower fill light.
- **Profiles**: Save your setups as named profiles (e.g. *Google Meet*) and switch
  between them from the panel menu or the preferences window.
- **Automatic profile switching** *(optional)*: Apply a profile automatically when a
  matching window is focused — match by application ID or by a regex on the window
  title (works for Meet running in a browser tab).
- **Customizable color & temperature**: Full RGB color picker, plus a warm↔cold
  temperature slider when the color is white.
- **Opacity control**: Adjust the light intensity to your comfort level.
- **Maximize brightness**: Optionally push the screen backlight to 100% while active,
  restoring your previous level when turned off.
- **Multi-monitor support**: Show on the primary monitor or all screens.
- **Seamless integration**: Native GNOME Shell feel with a toggle in the top bar.
- **Convenient shortcut**: `Ctrl + Alt + L` opens the preferences.

## Requirements

- GNOME Shell 45, 46, or 47

## Installation

### From source

```bash
git clone https://github.com/joaoferrete/Lighter.git
cd Lighter
make install
```

Then restart GNOME Shell (log out/in on Wayland, or `Alt + F2` → `r` → `Enter` on X11)
and enable the extension:

```bash
gnome-extensions enable lighter@gnome-shell-extensions.ferrete.com
```

## Usage

- Click the ☀ indicator in the top bar to toggle the light, pick a profile, or adjust
  the color temperature.
- Open the full preferences with `Ctrl + Alt + L` or:

  ```bash
  gnome-extensions prefs lighter@gnome-shell-extensions.ferrete.com
  ```

### Profiles

On the **Profiles** page of the preferences, click **+** to save the current settings
as a named profile. Each profile stores thickness, opacity, color, temperature,
brightness, and monitor options.

To switch profiles automatically, enable **Auto-switch profiles** and give a profile a
match rule — an application ID (e.g. `firefox.desktop`) and/or a window title regex
(e.g. `Meet`). When a focused window matches, the profile is applied; when nothing
matches, the optional *default profile* is applied. Manual selection always works and
takes effect immediately.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide. Quick start:

```bash
make install   # pack and install locally
make nested    # test in a nested GNOME Shell session (Wayland)
make lint      # run ESLint (requires `npm install` once)
make pot       # regenerate the translation template
```

### Troubleshooting

If the extension shows an ERROR state after code changes, restart GNOME Shell to reload
the updated code. Check logs with:

```bash
journalctl /usr/bin/gnome-shell -b | grep -i lighter
```

## License

[GPL-3.0](LICENSE)
