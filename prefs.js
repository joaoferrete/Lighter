import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gdk from 'gi://Gdk';
import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class LighterPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        // Page
        const page = new Adw.PreferencesPage({
            title: _('Settings'),
            icon_name: 'lightbulb-symbolic',
        });
        window.add(page);

        // Group: General
        const generalGroup = new Adw.PreferencesGroup({
            title: _('General'),
            description: _('Control the main lighting parameters'),
        });
        page.add(generalGroup);

        // Enabled Toggle
        const enabledRow = new Adw.SwitchRow({
            title: _('Active'),
            subtitle: _('Turn the screen borders on or off'),
        });
        generalGroup.add(enabledRow);
        settings.bind('enabled', enabledRow, 'active', Gio.SettingsBindFlags.DEFAULT);

        // Maximize Brightness
        const brightnessRow = new Adw.SwitchRow({
            title: _('Maximize Brightness'),
            subtitle: _('Automatically set screen brightness to 100% when active'),
        });
        generalGroup.add(brightnessRow);
        settings.bind('maximize-brightness', brightnessRow, 'active', Gio.SettingsBindFlags.DEFAULT);

        // Thickness Slider
        const thicknessRow = new Adw.ActionRow({
            title: _('Thickness'),
            subtitle: _('Adjust the width of the white borders'),
        });
        const thicknessScale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 5, 500, 5);
        thicknessScale.set_draw_value(true);
        thicknessScale.set_hexpand(true);
        thicknessScale.set_valign(Gtk.Align.CENTER);
        thicknessRow.add_suffix(thicknessScale);
        generalGroup.add(thicknessRow);
        settings.bind('thickness', thicknessScale.get_adjustment(), 'value', Gio.SettingsBindFlags.DEFAULT);

        // Opacity Slider
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

        // Group: Appearance
        const appearanceGroup = new Adw.PreferencesGroup({
            title: _('Appearance'),
        });
        page.add(appearanceGroup);

        // Color Picker
        const colorRow = new Adw.ActionRow({
            title: _('Color'),
            subtitle: _('Choose the color of the borders (Default: White)'),
        });
        const colorButton = new Gtk.ColorButton();
        colorButton.set_valign(Gtk.Align.CENTER);
        colorRow.add_suffix(colorButton);
        appearanceGroup.add(colorRow);
        
        // Sync color manually because Gtk.ColorButton doesn't support GSettings binding well with hex strings
        const rgba = new Gdk.RGBA();
        rgba.parse(settings.get_string('color'));
        colorButton.set_rgba(rgba);
        colorButton.connect('color-set', () => {
            const c = colorButton.get_rgba();
            const toHex = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
            const hex = `#${toHex(c.red)}${toHex(c.green)}${toHex(c.blue)}`;
            settings.set_string('color', hex);
        });

        // Temperature Slider
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

        // Multi-Monitor Toggle
        const monitorRow = new Adw.SwitchRow({
            title: _('Multi-Monitor'),
            subtitle: _('Show borders on all connected screens'),
        });
        appearanceGroup.add(monitorRow);
        settings.bind('multi-monitor', monitorRow, 'active', Gio.SettingsBindFlags.DEFAULT);
    }
}
