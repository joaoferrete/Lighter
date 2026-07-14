import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {ProfileManager} from '../lib/profileManager.js';

// Adw.AlertDialog needs libadwaita 1.5 (GNOME 46); fall back to the older
// Adw.MessageDialog on GNOME 45.
function createDialog(window, heading, body) {
    if (Adw.AlertDialog) {
        const dialog = new Adw.AlertDialog({heading, body});
        dialog.show = () => dialog.present(window);
        return dialog;
    }
    const dialog = new Adw.MessageDialog({
        heading, body,
        modal: true,
        transient_for: window,
    });
    dialog.show = () => dialog.present();
    return dialog;
}

function promptName(window, heading, initialText, onAccept) {
    const dialog = createDialog(window, heading, '');
    const entry = new Gtk.Entry({
        text: initialText,
        activates_default: true,
        margin_top: 6,
    });
    dialog.set_extra_child(entry);
    dialog.add_response('cancel', _('Cancel'));
    dialog.add_response('accept', _('Save'));
    dialog.set_response_appearance('accept', Adw.ResponseAppearance.SUGGESTED);
    dialog.set_default_response('accept');
    dialog.set_close_response('cancel');
    dialog.connect('response', (d, response) => {
        const name = entry.get_text().trim();
        if (response === 'accept' && name !== '')
            onAccept(name);
    });
    dialog.show();
}

function confirm(window, heading, body, onConfirm) {
    const dialog = createDialog(window, heading, body);
    dialog.add_response('cancel', _('Cancel'));
    dialog.add_response('delete', _('Delete'));
    dialog.set_response_appearance('delete', Adw.ResponseAppearance.DESTRUCTIVE);
    dialog.set_default_response('cancel');
    dialog.set_close_response('cancel');
    dialog.connect('response', (d, response) => {
        if (response === 'delete')
            onConfirm();
    });
    dialog.show();
}

/**
 * Build the "Profiles" preferences page: saved profiles list and automatic
 * switching options.
 *
 * @param {Gio.Settings} settings the extension settings
 * @param {Adw.PreferencesWindow} window used for dialogs and signal cleanup
 * @returns {Adw.PreferencesPage} the page
 */
export function buildProfilesPage(settings, window) {
    const manager = new ProfileManager(settings);

    const page = new Adw.PreferencesPage({
        title: _('Profiles'),
        icon_name: 'view-list-symbolic',
    });

    // Group: profile list
    const listGroup = new Adw.PreferencesGroup({
        title: _('Profiles'),
        description: _('Save the current settings as a named profile and switch between them'),
    });
    const addButton = new Gtk.Button({
        icon_name: 'list-add-symbolic',
        tooltip_text: _('Create a profile from the current settings'),
        valign: Gtk.Align.CENTER,
        css_classes: ['flat'],
    });
    addButton.connect('clicked', () => {
        promptName(window, _('New Profile'), '', name => manager.createProfile(name));
    });
    listGroup.set_header_suffix(addButton);
    page.add(listGroup);

    // Group: automatic switching
    const autoGroup = new Adw.PreferencesGroup({
        title: _('Automatic Switching'),
        description: _('Apply profiles automatically based on the focused window'),
    });
    page.add(autoGroup);

    const autoRow = new Adw.SwitchRow({
        title: _('Auto-switch profiles'),
        subtitle: _('Watch the focused window and apply the first matching profile'),
    });
    autoGroup.add(autoRow);
    settings.bind('auto-switch', autoRow, 'active', Gio.SettingsBindFlags.DEFAULT);

    const defaultRow = new Adw.ComboRow({
        title: _('Default profile'),
        subtitle: _('Applied when no window rule matches'),
    });
    autoGroup.add(defaultRow);

    // When > 0, 'changed::profiles' events were caused by edits on this page
    // that already updated the UI in place, so a full rebuild is unnecessary
    // (and would steal focus from the row being edited).
    let squelch = 0;
    const withSquelch = fn => {
        squelch++;
        try {
            fn();
        } finally {
            squelch--;
        }
    };

    let rows = [];
    const activeIcons = new Map(); // profile id -> Gtk.Image

    function updateActiveMarkers() {
        const activeId = settings.get_string('active-profile');
        for (const [id, icon] of activeIcons)
            icon.visible = id === activeId;
    }

    function makeProfileRow(profile) {
        const row = new Adw.ExpanderRow({title: profile.name});

        const activeIcon = new Gtk.Image({
            icon_name: 'object-select-symbolic',
            tooltip_text: _('Active profile'),
            visible: false,
        });
        activeIcons.set(profile.id, activeIcon);
        row.add_suffix(activeIcon);

        const applyButton = new Gtk.Button({
            label: _('Apply'),
            valign: Gtk.Align.CENTER,
            css_classes: ['flat'],
        });
        applyButton.connect('clicked', () => manager.applyProfile(profile.id));
        row.add_suffix(applyButton);

        // Rename
        const nameRow = new Adw.EntryRow({
            title: _('Name'),
            text: profile.name,
            show_apply_button: true,
        });
        nameRow.connect('apply', () => {
            const name = nameRow.get_text().trim();
            if (name === '')
                return;
            withSquelch(() => manager.updateProfile(profile.id, {name}));
            row.title = name;
        });
        row.add_row(nameRow);

        // Match rules
        const matchRow = new Adw.SwitchRow({
            title: _('Auto-activate'),
            subtitle: _('Apply this profile when a window below is focused'),
            active: profile.match?.enabled ?? false,
        });
        matchRow.connect('notify::active', () => {
            withSquelch(() => manager.updateProfile(profile.id,
                {match: {enabled: matchRow.get_active()}}));
        });
        row.add_row(matchRow);

        const appIdsRow = new Adw.EntryRow({
            title: _('Application IDs (comma-separated, e.g. firefox.desktop)'),
            text: (profile.match?.['app-ids'] ?? []).join(', '),
            show_apply_button: true,
        });
        appIdsRow.connect('apply', () => {
            const ids = appIdsRow.get_text()
                .split(',')
                .map(s => s.trim())
                .filter(s => s !== '');
            withSquelch(() => manager.updateProfile(profile.id,
                {match: {'app-ids': ids}}));
        });
        row.add_row(appIdsRow);

        const regexRow = new Adw.EntryRow({
            title: _('Window title regex (e.g. Meet)'),
            text: profile.match?.['title-regex'] ?? '',
            show_apply_button: true,
        });
        regexRow.connect('changed', () => {
            try {
                new RegExp(regexRow.get_text());
                regexRow.remove_css_class('error');
            } catch {
                regexRow.add_css_class('error');
            }
        });
        regexRow.connect('apply', () => {
            withSquelch(() => manager.updateProfile(profile.id,
                {match: {'title-regex': regexRow.get_text().trim()}}));
        });
        row.add_row(regexRow);

        const priorityRow = new Adw.SpinRow({
            title: _('Priority'),
            subtitle: _('Higher priority wins when several rules match'),
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 100,
                step_increment: 1,
            }),
            value: profile.match?.priority ?? 0,
        });
        priorityRow.connect('notify::value', () => {
            withSquelch(() => manager.updateProfile(profile.id,
                {match: {priority: priorityRow.get_value()}}));
        });
        row.add_row(priorityRow);

        // Actions
        const actionsRow = new Adw.ActionRow();
        const updateButton = new Gtk.Button({
            label: _('Update from current'),
            tooltip_text: _('Overwrite this profile with the current settings'),
            valign: Gtk.Align.CENTER,
        });
        updateButton.connect('clicked', () => {
            withSquelch(() => manager.updateProfileFromCurrentSettings(profile.id));
        });
        const duplicateButton = new Gtk.Button({
            label: _('Duplicate'),
            valign: Gtk.Align.CENTER,
        });
        duplicateButton.connect('clicked', () => manager.duplicateProfile(profile.id));
        const deleteButton = new Gtk.Button({
            label: _('Delete'),
            valign: Gtk.Align.CENTER,
            css_classes: ['destructive-action'],
        });
        deleteButton.connect('clicked', () => {
            confirm(window,
                _('Delete Profile?'),
                _('"%s" will be removed permanently.').replace('%s', profile.name),
                () => manager.deleteProfile(profile.id));
        });
        actionsRow.add_suffix(updateButton);
        actionsRow.add_suffix(duplicateButton);
        actionsRow.add_suffix(deleteButton);
        row.add_row(actionsRow);

        return row;
    }

    // Default-profile combo: index 0 is "None"
    let comboSyncing = false;
    function rebuildCombo(profiles) {
        comboSyncing = true;
        const model = new Gtk.StringList();
        model.append(_('None'));
        for (const p of profiles)
            model.append(p.name);
        defaultRow.set_model(model);

        const defaultId = settings.get_string('default-profile');
        const index = profiles.findIndex(p => p.id === defaultId);
        defaultRow.set_selected(index === -1 ? 0 : index + 1);
        comboSyncing = false;
    }
    defaultRow.connect('notify::selected', () => {
        if (comboSyncing)
            return;
        const profiles = manager.getProfiles();
        const selected = defaultRow.get_selected();
        const id = selected > 0 && profiles[selected - 1] ? profiles[selected - 1].id : '';
        settings.set_string('default-profile', id);
    });

    function rebuild() {
        rows.forEach(r => listGroup.remove(r));
        rows = [];
        activeIcons.clear();

        const profiles = manager.getProfiles();
        if (profiles.length === 0) {
            const placeholder = new Adw.ActionRow({
                title: _('No profiles yet'),
                subtitle: _('Use the + button to save the current settings as a profile'),
            });
            listGroup.add(placeholder);
            rows.push(placeholder);
        } else {
            for (const profile of profiles) {
                const row = makeProfileRow(profile);
                listGroup.add(row);
                rows.push(row);
            }
        }

        updateActiveMarkers();
        rebuildCombo(profiles);
    }

    const profilesChangedId = settings.connect('changed::profiles', () => {
        if (!squelch)
            rebuild();
    });
    const activeChangedId = settings.connect('changed::active-profile',
        updateActiveMarkers);
    const defaultChangedId = settings.connect('changed::default-profile',
        () => rebuildCombo(manager.getProfiles()));
    window.connect('close-request', () => {
        settings.disconnect(profilesChangedId);
        settings.disconnect(activeChangedId);
        settings.disconnect(defaultChangedId);
    });

    rebuild();
    return page;
}
