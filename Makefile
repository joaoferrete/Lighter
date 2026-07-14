UUID = lighter@gnome-shell-extensions.ferrete.com
ZIP = dist/$(UUID).shell-extension.zip
EXT_DIR = $(HOME)/.local/share/gnome-shell/extensions/$(UUID)

SOURCES = extension.js prefs.js $(wildcard lib/*.js) $(wildcard preferences/*.js)

.PHONY: all build lint pot pack install uninstall nested clean

all: build

# Compile schemas for local development (a symlinked install needs this;
# `gnome-extensions install` compiles them automatically since GNOME 44)
build:
	glib-compile-schemas --strict schemas/

lint:
	npx eslint $(SOURCES)

pot:
	mkdir -p po
	xgettext --from-code=UTF-8 --keyword=_ --keyword=N_ \
		--package-name=lighter --output=po/lighter.pot $(SOURCES)

pack:
	mkdir -p dist
	gnome-extensions pack --force --out-dir=dist \
		--extra-source=lib \
		--extra-source=preferences \
		--extra-source=LICENSE \
		--podir=po

# DANGER: `gnome-extensions install --force` deletes the existing installation
# before extracting the zip. If the installation is a symlink into this repo,
# that deletes the repo contents THROUGH the symlink. Refuse to proceed.
install: pack
	@if [ -L "$(EXT_DIR)" ]; then \
		echo "ERROR: $(EXT_DIR) is a symlink (likely into this repo)."; \
		echo "Running 'gnome-extensions install --force' would delete the"; \
		echo "symlink target's contents — i.e. this repository."; \
		echo "If you use the symlink workflow, just run 'make build' and"; \
		echo "restart GNOME Shell. To switch to zip installs, first run:"; \
		echo "  rm \"$(EXT_DIR)\""; \
		exit 1; \
	fi
	gnome-extensions install --force $(ZIP)
	@echo "Restart GNOME Shell (or log out/in on Wayland) and enable with:"
	@echo "  gnome-extensions enable $(UUID)"

uninstall:
	gnome-extensions uninstall $(UUID)

# Run a nested GNOME Shell session for testing (Wayland)
nested:
	dbus-run-session -- gnome-shell --nested --wayland

clean:
	rm -rf dist schemas/gschemas.compiled
