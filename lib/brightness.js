import Gio from 'gi://Gio';

const BrightnessProxy = Gio.DBusProxy.makeProxyWrapper(
    '<node>' +
    '  <interface name="org.gnome.SettingsDaemon.Power.Screen">' +
    '    <property name="Brightness" type="i" access="readwrite"/>' +
    '  </interface>' +
    '</node>',
);

/**
 * Controls the screen backlight through gnome-settings-daemon, remembering the
 * user's brightness so it can be restored later.
 */
export class BrightnessController {
    constructor() {
        this._saved = -1;
        this._proxy = new BrightnessProxy(
            Gio.DBus.session,
            'org.gnome.SettingsDaemon.Power',
            '/org/gnome/SettingsDaemon/Power/Screen',
        );
    }

    maximize() {
        if (this._saved === -1 && this._proxy) {
            this._saved = this._proxy.Brightness;
            this._proxy.Brightness = 100;
        }
    }

    restore() {
        if (this._saved !== -1 && this._proxy) {
            this._proxy.Brightness = this._saved;
            this._saved = -1;
        }
    }

    destroy() {
        this.restore();
        this._proxy = null;
    }
}
