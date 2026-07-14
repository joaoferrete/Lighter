import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const SIDES = ['top', 'bottom', 'left', 'right'];

/**
 * Build the "General" preferences page (activation, thickness, appearance).
 *
 * @param {Gio.Settings} settings the extension settings
 * @param {Adw.PreferencesWindow} window used to clean up signal handlers on close
 * @returns {Adw.PreferencesPage} the page
 */
export function buildGeneralPage(settings, window) {
    const page = new Adw.PreferencesPage({
        title: _('General'),
        icon_name: 'preferences-system-symbolic',
    });

    // Group: General
    const generalGroup = new Adw.PreferencesGroup({
        title: _('General'),
        description: _('Control the main lighting parameters'),
    });
    page.add(generalGroup);

    const enabledRow = new Adw.SwitchRow({
        title: _('Active'),
        subtitle: _('Turn the screen borders on or off'),
    });
    generalGroup.add(enabledRow);
    settings.bind('enabled', enabledRow, 'active', Gio.SettingsBindFlags.DEFAULT);

    const brightnessRow = new Adw.SwitchRow({
        title: _('Maximize Brightness'),
        subtitle: _('Automatically set screen brightness to 100% when active'),
    });
    generalGroup.add(brightnessRow);
    settings.bind('maximize-brightness', brightnessRow, 'active', Gio.SettingsBindFlags.DEFAULT);

    const opacityRow = new Adw.ActionRow({
        title: _('Opacity'),
        subtitle: _('Adjust the brightness of the light'),
    });
    const opacityScale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0.1, 1.0, 0.05);
    opacityScale.set_draw_value(true);
    opacityScale.set_hexpand(true);
    opacityScale.set_valign(Gtk.Align.CENTER);
    opacityRow.add_suffix(opacityScale);
    generalGroup.add(opacityRow);
    settings.bind('opacity', opacityScale.get_adjustment(), 'value', Gio.SettingsBindFlags.DEFAULT);

    // Group: Thickness
    const thicknessGroup = new Adw.PreferencesGroup({
        title: _('Thickness'),
        description: _('Width of each border in pixels; 0 disables that side'),
    });
    page.add(thicknessGroup);

    const linkedRow = new Adw.SwitchRow({
        title: _('Link sides'),
        subtitle: _('Changing one side updates all sides'),
    });
    thicknessGroup.add(linkedRow);
    settings.bind('thickness-linked', linkedRow, 'active', Gio.SettingsBindFlags.DEFAULT);

    const sideTitles = {
        top: _('Top'),
        bottom: _('Bottom'),
        left: _('Left'),
        right: _('Right'),
    };
    for (const side of SIDES) {
        const row = new Adw.SpinRow({
            title: sideTitles[side],
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 500,
                step_increment: 5,
                page_increment: 25,
            }),
        });
        thicknessGroup.add(row);
        settings.bind(`thickness-${side}`, row, 'value', Gio.SettingsBindFlags.DEFAULT);
    }

    // Propagate a side's value to the others while sides are linked. The guard
    // avoids re-entrancy from our own writes.
    let propagating = false;
    const sideChangedIds = SIDES.map(side =>
        settings.connect(`changed::thickness-${side}`, () => {
            if (propagating || !settings.get_boolean('thickness-linked'))
                return;
            propagating = true;
            const value = settings.get_int(`thickness-${side}`);
            for (const other of SIDES) {
                if (other !== side)
                    settings.set_int(`thickness-${other}`, value);
            }
            propagating = false;
        }),
    );
    const linkedChangedId = settings.connect('changed::thickness-linked', () => {
        if (!settings.get_boolean('thickness-linked'))
            return;
        propagating = true;
        const value = settings.get_int('thickness-top');
        for (const side of SIDES)
            settings.set_int(`thickness-${side}`, value);
        propagating = false;
    });
    window.connect('close-request', () => {
        sideChangedIds.forEach(id => settings.disconnect(id));
        settings.disconnect(linkedChangedId);
    });

    // Group: Appearance
    const appearanceGroup = new Adw.PreferencesGroup({
        title: _('Appearance'),
    });
    page.add(appearanceGroup);

    const colorRow = new Adw.ActionRow({
        title: _('Color'),
        subtitle: _('Choose the color of the borders (Default: White)'),
    });
    const colorButton = new Gtk.ColorDialogButton({
        dialog: new Gtk.ColorDialog({with_alpha: false}),
        valign: Gtk.Align.CENTER,
    });
    colorRow.add_suffix(colorButton);
    appearanceGroup.add(colorRow);

    // Sync color manually because color buttons don't support GSettings binding
    // with hex strings
    const rgba = new Gdk.RGBA();
    rgba.parse(settings.get_string('color'));
    colorButton.set_rgba(rgba);
    colorButton.connect('notify::rgba', () => {
        const c = colorButton.get_rgba();
        const toHex = v => Math.round(v * 255).toString(16).padStart(2, '0');
        const hex = `#${toHex(c.red)}${toHex(c.green)}${toHex(c.blue)}`;
        settings.set_string('color', hex);
    });

    const tempRow = new Adw.ActionRow({
        title: _('Temperature'),
        subtitle: _('Adjust the color from Warm to Cold (Only if color is White)'),
    });
    const tempScale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0, 100, 1);
    tempScale.set_draw_value(true);
    tempScale.set_hexpand(true);
    tempScale.set_valign(Gtk.Align.CENTER);
    tempRow.add_suffix(tempScale);
    appearanceGroup.add(tempRow);
    settings.bind('temperature', tempScale.get_adjustment(), 'value', Gio.SettingsBindFlags.DEFAULT);

    const monitorRow = new Adw.SwitchRow({
        title: _('Multi-Monitor'),
        subtitle: _('Show borders on all connected screens'),
    });
    appearanceGroup.add(monitorRow);
    settings.bind('multi-monitor', monitorRow, 'active', Gio.SettingsBindFlags.DEFAULT);

    return page;
}
