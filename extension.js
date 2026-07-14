import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {BorderManager} from './lib/borderManager.js';
import {BrightnessController} from './lib/brightness.js';
import {LighterIndicator} from './lib/indicator.js';
import {ProfileManager} from './lib/profileManager.js';
import {WindowWatcher} from './lib/windowWatcher.js';
import {migrateSettings} from './lib/migrations.js';

// Keys whose changes require redrawing the borders
const SYNC_KEYS = [
    'enabled',
    'thickness-top',
    'thickness-bottom',
    'thickness-left',
    'thickness-right',
    'opacity',
    'color',
    'temperature',
    'multi-monitor',
    'maximize-brightness',
];

export default class LighterExtension extends Extension {
    enable() {
        try {
            this._settings = this.getSettings();
            migrateSettings(this._settings);

            this._brightness = new BrightnessController();
            this._borders = new BorderManager(this._settings);
            this._profiles = new ProfileManager(this._settings);

            this._indicator = new LighterIndicator(this, this._profiles);
            Main.panel.addToStatusArea(this.uuid, this._indicator);

            Main.wm.addKeybinding(
                'open-prefs-shortcut',
                this._settings,
                Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.NORMAL,
                () => this.openPreferences(),
            );

            this._settingsId = this._settings.connect('changed', (settings, key) => {
                if (SYNC_KEYS.includes(key))
                    this._sync();
            });
            this._monitorsChangedId = Main.layoutManager.connect(
                'monitors-changed', () => this._sync());

            this._watcher = new WindowWatcher(this._settings, this._profiles);
            this._watcher.enable();

            this._sync();
        } catch (e) {
            console.error(`Lighter: Error during enable(): ${e}\n${e.stack}`);
            throw e;
        }
    }

    disable() {
        if (this._watcher) {
            this._watcher.disable();
            this._watcher = null;
        }

        if (this._settingsId) {
            this._settings.disconnect(this._settingsId);
            this._settingsId = 0;
        }

        if (this._monitorsChangedId) {
            Main.layoutManager.disconnect(this._monitorsChangedId);
            this._monitorsChangedId = 0;
        }

        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }

        if (this._borders) {
            this._borders.destroy();
            this._borders = null;
        }

        if (this._brightness) {
            this._brightness.destroy();
            this._brightness = null;
        }

        Main.wm.removeKeybinding('open-prefs-shortcut');
        this._profiles = null;
        this._settings = null;
    }

    _sync() {
        const enabled = this._settings.get_boolean('enabled');

        if (enabled && this._settings.get_boolean('maximize-brightness'))
            this._brightness.maximize();
        else
            this._brightness.restore();

        this._borders.sync();
    }
}
