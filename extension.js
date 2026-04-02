import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Slider from 'resource:///org/gnome/shell/ui/slider.js';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

const BrightnessProxy = Gio.DBusProxy.makeProxyWrapper(
    '<node>' +
    '  <interface name="org.gnome.SettingsDaemon.Power.Screen">' +
    '    <property name="Brightness" type="i" access="readwrite"/>' +
    '  </interface>' +
    '</node>'
);

const LightBorder = GObject.registerClass(
    class LightBorder extends Clutter.Actor {
        _init(params) {
            super._init(params);
            this.set_background_color(new Clutter.Color({
                red: 255, green: 255, blue: 255, alpha: 255
            }));
            this.set_reactive(false); // Click-through
        }
    }
);

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
    }
);

const LighterIndicator = GObject.registerClass(
    class LighterIndicator extends PanelMenu.Button {
        _init(extension) {
            super._init(0.0, 'Lighter');
            this._extension = extension;
            this._settings = extension.getSettings();

            const icon = new St.Icon({
                icon_name: 'display-brightness-symbolic',
                style_class: 'system-status-icon',
            });
            this.add_child(icon);

            // Active Toggle
            this._activeItem = new PopupMenu.PopupSwitchMenuItem(_('Active'), this._settings.get_boolean('enabled'));
            this._activeItem.connect('toggled', (item, state) => {
                this._settings.set_boolean('enabled', state);
            });
            this.menu.addMenuItem(this._activeItem);

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

            // Sync UI with settings
            this._changedId = this._settings.connect('changed', (settings, key) => {
                if (key === 'enabled')
                    this._activeItem.setToggleState(settings.get_boolean('enabled'));
                else if (key === 'temperature')
                    this._tempSlider.value = settings.get_int('temperature') / 100;
            });
        }

        destroy() {
            if (this._changedId) {
                this._settings.disconnect(this._changedId);
                this._changedId = 0;
            }
            super.destroy();
        }
    }
);

export default class LighterExtension extends Extension {
    enable() {
        try {
            console.log('Lighter Extension Enabled v1.4 - Fixed color parsing');
            this._settings = this.getSettings();
            this._borders = [];
            this._oldBrightness = -1;
            
            // Indicator
            this._indicator = new LighterIndicator(this);
            Main.panel.addToStatusArea(this.uuid, this._indicator);

            // Keybinding
            Main.wm.addKeybinding(
                'open-prefs-shortcut',
                this._settings,
                Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.ALL,
                () => {
                    this.openPreferences();
                }
            );

            // Brightness Proxy
            this._proxy = new BrightnessProxy(
                Gio.DBus.session,
                'org.gnome.SettingsDaemon.Power',
                '/org/gnome/SettingsDaemon/Power/Screen'
            );

            // Listen for internal changes
            this._settingsIds = [
                this._settings.connect('changed::enabled', () => this._sync()),
                this._settings.connect('changed::thickness', () => this._sync()),
                this._settings.connect('changed::opacity', () => this._sync()),
                this._settings.connect('changed::color', () => this._sync()),
                this._settings.connect('changed::temperature', () => this._sync()),
                this._settings.connect('changed::multi-monitor', () => this._sync()),
            ];

            // Also sync on monitor changes
            this._monitorsChangedId = Main.layoutManager.connect('monitors-changed', () => this._sync());

            this._sync();
        } catch (e) {
            console.error(`Lighter: Error during enable(): ${e}\n${e.stack}`);
            throw e;
        }
    }

    disable() {
        this._restoreBrightness();
        this._settingsIds.forEach(id => this._settings.disconnect(id));
        Main.layoutManager.disconnect(this._monitorsChangedId);
        
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }

        this._clearBorders();
        this._settings = null;
        this._proxy = null;
        Main.wm.removeKeybinding('open-prefs-shortcut');
    }

    _restoreBrightness() {
        if (this._oldBrightness !== -1 && this._proxy) {
            this._proxy.Brightness = this._oldBrightness;
            this._oldBrightness = -1;
        }
    }

    _clearBorders() {
        this._borders.forEach(b => b.destroy());
        this._borders = [];
    }

    _sync() {
        this._clearBorders();
        
        const enabled = this._settings.get_boolean('enabled');

        // Handle brightness
        if (enabled && this._settings.get_boolean('maximize-brightness')) {
            if (this._oldBrightness === -1 && this._proxy) {
                this._oldBrightness = this._proxy.Brightness;
                this._proxy.Brightness = 100;
            }
        } else {
            this._restoreBrightness();
        }

        if (!enabled)
            return;

        const thickness = this._settings.get_int('thickness');
        const opacity = this._settings.get_double('opacity');
        const colorStr = this._settings.get_string('color');
        const multiMonitor = this._settings.get_boolean('multi-monitor');
        const temperature = this._settings.get_int('temperature');

        let color;
        // If color is default white, use temperature for warm/cool tint
        const parsed = this._parseColor(colorStr);
        if (parsed.red === 255 && parsed.green === 255 && parsed.blue === 255) {
            color = this._getColorFromTemperature(temperature);
        } else {
            color = parsed;
        }
        color.alpha = Math.floor(opacity * 255);

        const monitors = multiMonitor ? Main.layoutManager.monitors : [Main.layoutManager.primaryMonitor];

        for (const monitor of monitors) {
            this._createBordersForMonitor(monitor, thickness, color);
        }
    }

    _parseColor(str) {
        try {
            // Handle hex format: #rrggbb
            const hexMatch = str.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
            if (hexMatch) {
                return new Clutter.Color({
                    red: parseInt(hexMatch[1], 16),
                    green: parseInt(hexMatch[2], 16),
                    blue: parseInt(hexMatch[3], 16),
                    alpha: 255,
                });
            }
            // Handle rgb/rgba format: rgb(r,g,b) or rgba(r,g,b,a)
            const rgbMatch = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (rgbMatch) {
                return new Clutter.Color({
                    red: parseInt(rgbMatch[1]),
                    green: parseInt(rgbMatch[2]),
                    blue: parseInt(rgbMatch[3]),
                    alpha: 255,
                });
            }
        } catch (e) {
            console.error(`Lighter: Failed to parse color "${str}": ${e}`);
        }
        return new Clutter.Color({ red: 255, green: 255, blue: 255, alpha: 255 });
    }

    _getColorFromTemperature(temp) {
        // Linear interpolation:
        // 0 (Warm): [255, 147, 41]
        // 50 (Neutral): [255, 255, 255]
        // 100 (Cold): [201, 226, 255]

        let r, g, b;
        if (temp <= 50) {
            const factor = temp / 50;
            r = 255;
            g = 147 + (255 - 147) * factor;
            b = 41 + (255 - 41) * factor;
        } else {
            const factor = (temp - 50) / 50;
            r = 255 - (255 - 201) * factor;
            g = 255 - (255 - 226) * factor;
            b = 255;
        }

        return new Clutter.Color({
            red: Math.floor(r),
            green: Math.floor(g),
            blue: Math.floor(b)
        });
    }

    _createBordersForMonitor(monitor, thickness, color) {
        const {x, y, width, height} = monitor;

        // Create 4 actors for this monitor
        const borders = [
            this._addBorder(x, y, width, thickness, color), // Top
            this._addBorder(x, y + height - thickness, width, thickness, color), // Bottom
            this._addBorder(x, y + thickness, thickness, height - 2 * thickness, color), // Left
            this._addBorder(x + width - thickness, y + thickness, thickness, height - 2 * thickness, color), // Right
        ];

        // Animate them in
        const targetOpacity = color.alpha;
        borders.forEach(b => {
            b.opacity = 0;
            b.ease({
                opacity: targetOpacity,
                duration: 500,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD
            });
        });
    }

    _addBorder(x, y, width, height, color) {
        const border = new LightBorder({
            x, y, width, height,
            background_color: color
        });
        
        // Add as chrome (Always on Top)
        Main.layoutManager.addChrome(border, {
            affectsInputRegion: false,
            trackFullscreen: true
        });

        this._borders.push(border);
        return border;
    }
}
