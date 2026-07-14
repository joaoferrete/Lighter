import GLib from 'gi://GLib';

// Appearance keys captured in a profile, with their GSettings type.
// Shared by the shell process and the preferences process — keep this module
// free of Shell UI and GTK imports.
export const PROFILE_KEY_TYPES = {
    'thickness-top': 'i',
    'thickness-bottom': 'i',
    'thickness-left': 'i',
    'thickness-right': 'i',
    'thickness-linked': 'b',
    'opacity': 'd',
    'color': 's',
    'temperature': 'i',
    'maximize-brightness': 'b',
    'multi-monitor': 'b',
};

export const PROFILE_KEYS = Object.keys(PROFILE_KEY_TYPES);

const FORMAT_VERSION = 1;

/**
 * Stores named snapshots of the appearance settings in the `profiles` JSON key.
 *
 * The flat settings keys remain the source of truth for what is on screen;
 * applying a profile copies its values onto them in a single batch, so all
 * existing bindings and listeners keep working unchanged.
 */
export class ProfileManager {
    constructor(settings) {
        this._settings = settings;
    }

    /**
     * @returns {object[]} the saved profiles (empty on missing/invalid JSON)
     */
    getProfiles() {
        try {
            const parsed = JSON.parse(this._settings.get_string('profiles'));
            if (Array.isArray(parsed))
                return parsed;
            if (parsed && Array.isArray(parsed.profiles))
                return parsed.profiles;
        } catch (e) {
            console.error(`Lighter: Invalid profiles JSON, ignoring: ${e}`);
        }
        return [];
    }

    getProfile(id) {
        return this.getProfiles().find(p => p.id === id) ?? null;
    }

    /**
     * Snapshot the current flat settings as a new profile.
     *
     * @param {string} name the profile name
     * @returns {object} the created profile
     */
    createProfile(name) {
        const profile = {
            id: GLib.uuid_string_random(),
            name,
            settings: this._snapshotSettings(),
            match: {enabled: false, 'app-ids': [], 'title-regex': '', priority: 0},
        };
        this._save([...this.getProfiles(), profile]);
        return profile;
    }

    /**
     * Shallow-merge a patch ({name, settings, match}) into a profile.
     *
     * @param {string} id the profile id
     * @param {object} patch fields to replace
     * @returns {object|null} the updated profile
     */
    updateProfile(id, patch) {
        const profiles = this.getProfiles();
        const profile = profiles.find(p => p.id === id);
        if (!profile)
            return null;

        if (patch.name !== undefined)
            profile.name = patch.name;
        if (patch.settings !== undefined)
            profile.settings = patch.settings;
        if (patch.match !== undefined)
            profile.match = {...profile.match, ...patch.match};

        this._save(profiles);
        return profile;
    }

    /** Re-snapshot the current flat settings into an existing profile.
     *
     * @param {string} id the profile id
     * @returns {object|null} the updated profile
     */
    updateProfileFromCurrentSettings(id) {
        return this.updateProfile(id, {settings: this._snapshotSettings()});
    }

    deleteProfile(id) {
        this._save(this.getProfiles().filter(p => p.id !== id));

        if (this._settings.get_string('active-profile') === id)
            this._settings.set_string('active-profile', '');
        if (this._settings.get_string('default-profile') === id)
            this._settings.set_string('default-profile', '');
    }

    duplicateProfile(id) {
        const source = this.getProfile(id);
        if (!source)
            return null;

        const copy = JSON.parse(JSON.stringify(source));
        copy.id = GLib.uuid_string_random();
        copy.name = `${source.name} (copy)`;
        this._save([...this.getProfiles(), copy]);
        return copy;
    }

    /**
     * Copy a profile's values onto the flat settings keys in a single batch,
     * and mark it as the active profile. Fields missing from the profile
     * (saved by older versions) keep their current values.
     *
     * @param {string} id the profile id
     * @returns {boolean} whether the profile existed and was applied
     */
    applyProfile(id) {
        const profile = this.getProfile(id);
        if (!profile)
            return false;

        this._settings.delay();
        for (const [key, type] of Object.entries(PROFILE_KEY_TYPES)) {
            if (profile.settings?.[key] !== undefined)
                this._setValue(key, type, profile.settings[key]);
        }
        this._settings.set_string('active-profile', profile.id);
        this._settings.apply();
        return true;
    }

    _snapshotSettings() {
        const snapshot = {};
        for (const [key, type] of Object.entries(PROFILE_KEY_TYPES))
            snapshot[key] = this._getValue(key, type);
        return snapshot;
    }

    _save(profiles) {
        this._settings.set_string('profiles',
            JSON.stringify({version: FORMAT_VERSION, profiles}));
    }

    _getValue(key, type) {
        switch (type) {
            case 'b': return this._settings.get_boolean(key);
            case 'i': return this._settings.get_int(key);
            case 'd': return this._settings.get_double(key);
            default: return this._settings.get_string(key);
        }
    }

    _setValue(key, type, value) {
        switch (type) {
            case 'b': this._settings.set_boolean(key, value); break;
            case 'i': this._settings.set_int(key, value); break;
            case 'd': this._settings.set_double(key, value); break;
            default: this._settings.set_string(key, value);
        }
    }
}
