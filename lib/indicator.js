import GObject from 'gi://GObject';
import St from 'gi://St';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Slider from 'resource:///org/gnome/shell/ui/slider.js';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

const LighterSliderItem = GObject.registerClass(
    class LighterSliderItem extends PopupMenu.PopupBaseMenuItem {
        _init(value) {
            super._init({
                activate: false,
                can_focus: false,
            });

            this._slider = new Slider.Slider(value);
            this.add_child(this._slider);

            // Allow slider to expand
            this._slider.x_expand = true;
        }

        get value() {
            return this._slider.value;
        }

        set value(v) {
            this._slider.value = v;
        }

        connectSlider(signal, callback) {
            if (signal === 'value-changed') {
                return this._slider.connect('notify::value', () => {
                    callback(this._slider, this._slider.value);
                });
            }
            return this._slider.connect(signal, callback);
        }
    },
);

export const LighterIndicator = GObject.registerClass(
    class LighterIndicator extends PanelMenu.Button {
        _init(extension, profileManager) {
            super._init(0.0, 'Lighter');
            this._extension = extension;
            this._settings = extension.getSettings();
            this._profiles = profileManager;

            const icon = new St.Icon({
                icon_name: 'display-brightness-symbolic',
                style_class: 'system-status-icon',
            });
            this.add_child(icon);

            // Active Toggle
            this._activeItem = new PopupMenu.PopupSwitchMenuItem(_('Active'),
                this._settings.get_boolean('enabled'));
            this._activeItem.connect('toggled', (item, state) => {
                this._settings.set_boolean('enabled', state);
            });
            this.menu.addMenuItem(this._activeItem);

            // Profiles
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            this._profileSubMenu = new PopupMenu.PopupSubMenuMenuItem(_('Profile'));
            this.menu.addMenuItem(this._profileSubMenu);

            this._autoSwitchItem = new PopupMenu.PopupSwitchMenuItem(_('Auto-switch profile'),
                this._settings.get_boolean('auto-switch'));
            this._autoSwitchItem.connect('toggled', (item, state) => {
                this._settings.set_boolean('auto-switch', state);
            });
            this.menu.addMenuItem(this._autoSwitchItem);

            // Temperature Slider
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            const tempItem = new PopupMenu.PopupMenuItem(_('Temperature'));
            tempItem.reactive = false;
            this.menu.addMenuItem(tempItem);

            this._tempSlider = new LighterSliderItem(this._settings.get_int('temperature') / 100);
            this._tempSlider.connectSlider('value-changed', (slider, value) => {
                this._settings.set_int('temperature', Math.round(value * 100));
            });
            this.menu.addMenuItem(this._tempSlider);

            // Settings Button
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            const settingsItem = new PopupMenu.PopupMenuItem(_('Settings'));
            settingsItem.connect('activate', () => {
                this._extension.openPreferences();
            });
            this.menu.addMenuItem(settingsItem);

            this._rebuildProfileMenu();

            // Sync UI with settings
            this._changedId = this._settings.connect('changed', (settings, key) => {
                if (key === 'enabled')
                    this._activeItem.setToggleState(settings.get_boolean('enabled'));
                else if (key === 'temperature')
                    this._tempSlider.value = settings.get_int('temperature') / 100;
                else if (key === 'auto-switch')
                    this._autoSwitchItem.setToggleState(settings.get_boolean('auto-switch'));
                else if (key === 'profiles' || key === 'active-profile')
                    this._rebuildProfileMenu();
            });
        }

        _rebuildProfileMenu() {
            this._profileSubMenu.menu.removeAll();

            const profiles = this._profiles.getProfiles();
            const hasProfiles = profiles.length > 0;
            this._profileSubMenu.visible = hasProfiles;
            this._autoSwitchItem.visible = hasProfiles;
            if (!hasProfiles)
                return;

            const activeId = this._settings.get_string('active-profile');
            for (const profile of profiles) {
                const item = new PopupMenu.PopupMenuItem(profile.name);
                item.setOrnament(profile.id === activeId
                    ? PopupMenu.Ornament.DOT
                    : PopupMenu.Ornament.NONE);
                item.connect('activate', () => {
                    this._profiles.applyProfile(profile.id);
                });
                this._profileSubMenu.menu.addMenuItem(item);
            }
        }

        destroy() {
            if (this._changedId) {
                this._settings.disconnect(this._changedId);
                this._changedId = 0;
            }
            this._settings = null;
            this._profiles = null;
            this._extension = null;
            super.destroy();
        }
    },
);
