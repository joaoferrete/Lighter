# Lighter (GNOME Extension)

![Lighter Icon](https://img.icons8.com/color/96/sun.png)

**Lighter** is a GNOME Shell Extension that improves your videocall lighting at night by adding adjustable white borders around your screen edges. Perfect for laptop users who need extra illumination without external gear.

## Features
- **Adjustable Thickness**: From thin lines to thick light bars.
- **Customizable Color**: Full RGB color picker support (warm/cool white, or any color).
- **Opacity Control**: Adjust the brightness to your comfort level.
- **Multi-Monitor Support**: Show on the primary monitor or all screens.
- **Seamless Integration**: Native GNOME Shell feel with a toggle in the top bar.
- **Convenient Shortcut**: Quick access to settings with `Ctrl + Alt + L`.

## Requirements

- GNOME Shell 45, 46, or 47
- `glib2` (provides `glib-compile-schemas`, usually pre-installed on GNOME systems)

On Debian/Ubuntu, ensure the required packages are installed:
```bash
sudo apt install gnome-shell-extensions glib-2.0-dev
```

On Fedora:
```bash
sudo dnf install gnome-shell gnome-extensions-app glib2-devel
```

## Installation & Development

To run this extension locally:

### 1. Clone & Link
Clone this repository and create a symbolic link in the GNOME extensions directory:
```bash
mkdir -p ~/.local/share/gnome-shell/extensions
ln -s "$(pwd)" ~/.local/share/gnome-shell/extensions/lighter@gnome-shell-extensions.ferrete.com
```

### 2. Compile Schemas
The settings schema must be compiled for the extension to work:
```bash
glib-compile-schemas schemas/
```

### 3. Restart GNOME Shell
- **X11**: Press `Alt + F2`, type `r`, and hit `Enter`.
- **Wayland**: Log out and log back in, or restart your session.

### 4. Enable the Extension
Once the shell has restarted, enable the extension:
```bash
gnome-extensions enable lighter@gnome-shell-extensions.ferrete.com
```

### 5. Open Preferences
To configure the borders (thickness, color, etc.), open the preferences window from the GNOME Extensions app or run:
```bash
gnome-extensions prefs lighter@gnome-shell-extensions.ferrete.com
```

**Shortcut:** You can also press `Ctrl + Alt + L` at any time to open the preferences directly.

### Troubleshooting
If the extension shows as ERROR state after code changes, you must restart GNOME Shell (step 3) to reload the updated code. Check logs with:
```bash
journalctl /usr/bin/gnome-shell -b | grep -i lighter
```

## License
Licensed under the [GNU General Public License v3.0](LICENSE).

