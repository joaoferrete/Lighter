# Contributing to Lighter

Thanks for your interest in contributing! Lighter is a GNOME Shell extension written in
GJS (GNOME JavaScript) using ES modules, targeting GNOME 45+.

## Development setup

Build dependencies: `glib2` (for `glib-compile-schemas`) and `gettext` (for
`make pot` and for compiling translations at pack time) — on Debian/Ubuntu:
`sudo apt install gettext`.

```bash
git clone https://github.com/joaoferrete/Lighter.git
cd Lighter
make install        # packs and installs the extension for your user
```

Alternatively, for a symlink-based workflow (edits picked up on shell restart):

```bash
ln -s "$PWD" ~/.local/share/gnome-shell/extensions/lighter@gnome-shell-extensions.ferrete.com
make build          # compiles the GSettings schema locally
```

> **Warning:** pick ONE of the two workflows. Never run `make install` while the
> extension is installed as a symlink into your working copy —
> `gnome-extensions install --force` deletes the previous installation, and with a
> symlink that means deleting your repository's contents. `make install` detects
> this and refuses to run, but don't bypass it.

Enable it with:

```bash
gnome-extensions enable lighter@gnome-shell-extensions.ferrete.com
```

## Testing your changes

The safest way to test is a nested GNOME Shell session (Wayland):

```bash
make nested
```

Inside the nested session, enable the extension and open its preferences
(`gnome-extensions prefs lighter@...`).

On X11 you can instead reload the running shell with `Alt+F2`, type `r`, press Enter.
On Wayland (non-nested) you must log out and back in.

Watch the logs while testing:

```bash
journalctl -f -o cat /usr/bin/gnome-shell
```

And watch settings changes live:

```bash
dconf watch /org/gnome/shell/extensions/lighter/
```

## Code style

We follow the [GNOME Shell JavaScript style](https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/main/docs/js-coding-style.md):
4-space indent, single quotes, semicolons, `camelCase`.

Run the linter before submitting:

```bash
npm install
npm run lint
```

A few project rules:

- `preferences/` and `prefs.js` run in a GTK process: never import anything from
  `resource:///org/gnome/shell/ui/*` there.
- `extension.js` and shell-side modules in `lib/` run inside the compositor: never
  import `Gtk`/`Adw` there.
- `lib/colorUtils.js` and `lib/profileManager.js` are shared by both sides: keep them
  free of both Shell UI and GTK imports (only `GLib`/`Gio`).
- Everything created in `enable()` must be destroyed/disconnected in `disable()`
  (signals, timeouts, actors, keybindings). This is a hard requirement for
  extensions.gnome.org review.
- User-visible strings must be wrapped in `_()` for translation.

## Translations

1. Regenerate the template: `make pot`
2. Create or update your language file, e.g.:
   `msginit -i po/lighter.pot -o po/pt_BR.po -l pt_BR.UTF-8` (new) or
   `msgmerge -U po/pt_BR.po po/lighter.pot` (update)
3. Translate the entries and open a pull request. Compiled `.mo` files are generated
   automatically at pack time — do not commit them.

## Submitting changes

1. Fork and create a topic branch.
2. Make your changes, run `npm run lint`, and test in a nested session.
3. Update `CHANGELOG.md` under the *Unreleased* heading.
4. Open a pull request describing what changed and why.

## Reporting bugs

Open an issue with your GNOME Shell version (`gnome-shell --version`), the extension
version, whether you're on Wayland or X11, and any relevant `journalctl` output.
