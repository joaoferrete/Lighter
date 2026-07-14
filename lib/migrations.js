const CURRENT_VERSION = 2;

/**
 * Upgrade settings written by older versions of the extension.
 * Version 2 replaced the single `thickness` key with per-side keys.
 *
 * @param {Gio.Settings} settings the extension settings
 */
export function migrateSettings(settings) {
    if (settings.get_int('settings-version') >= CURRENT_VERSION)
        return;

    const thickness = settings.get_int('thickness');
    for (const side of ['top', 'bottom', 'left', 'right'])
        settings.set_int(`thickness-${side}`, thickness);

    settings.set_int('settings-version', CURRENT_VERSION);
}
