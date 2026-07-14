import GLib from 'gi://GLib';
import Shell from 'gi://Shell';

const DEBOUNCE_MS = 300;

/**
 * Watches the focused window and applies the first matching profile.
 *
 * Listens to focus changes and to title changes of the focused window —
 * switching browser tabs changes the title without changing focus, which is
 * how a "Google Meet" profile can kick in when its tab is selected.
 */
export class WindowWatcher {
    constructor(settings, profileManager) {
        this._settings = settings;
        this._profiles = profileManager;
        this._focusId = 0;
        this._titleId = 0;
        this._titleWindow = null;
        this._debounceId = 0;
        this._settingsIds = null;
        this._regexCache = new Map();
    }

    enable() {
        this._focusId = global.display.connect('notify::focus-window',
            () => this._onFocusChanged());
        this._settingsIds = [
            this._settings.connect('changed::profiles', () => {
                this._regexCache.clear();
                this._scheduleEvaluate();
            }),
            this._settings.connect('changed::auto-switch',
                () => this._scheduleEvaluate()),
            this._settings.connect('changed::default-profile',
                () => this._scheduleEvaluate()),
        ];
        this._onFocusChanged();
    }

    disable() {
        if (this._debounceId) {
            GLib.source_remove(this._debounceId);
            this._debounceId = 0;
        }
        this._disconnectTitle();
        if (this._focusId) {
            global.display.disconnect(this._focusId);
            this._focusId = 0;
        }
        if (this._settingsIds) {
            this._settingsIds.forEach(id => this._settings.disconnect(id));
            this._settingsIds = null;
        }
        this._regexCache.clear();
        this._settings = null;
        this._profiles = null;
    }

    _disconnectTitle() {
        if (this._titleWindow && this._titleId) {
            try {
                this._titleWindow.disconnect(this._titleId);
            } catch {
                // The window may already be gone
            }
        }
        this._titleWindow = null;
        this._titleId = 0;
    }

    _onFocusChanged() {
        this._disconnectTitle();

        const win = global.display.focus_window;
        if (win) {
            this._titleWindow = win;
            this._titleId = win.connect('notify::title',
                () => this._scheduleEvaluate());
        }
        this._scheduleEvaluate();
    }

    _scheduleEvaluate() {
        if (this._debounceId)
            GLib.source_remove(this._debounceId);
        this._debounceId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, DEBOUNCE_MS, () => {
            this._debounceId = 0;
            this._evaluate();
            return GLib.SOURCE_REMOVE;
        });
    }

    _evaluate() {
        if (!this._settings.get_boolean('auto-switch'))
            return;

        const win = global.display.focus_window;
        const target = this._resolveProfile(win) ?? this._defaultProfile();
        // Compare against the active profile (not the last auto-applied one) so
        // that refocusing a matching window wins over an earlier manual switch.
        if (target && target.id !== this._settings.get_string('active-profile'))
            this._profiles.applyProfile(target.id);
    }

    _defaultProfile() {
        const id = this._settings.get_string('default-profile');
        return id ? this._profiles.getProfile(id) : null;
    }

    /**
     * Find the highest-priority profile whose match rule fits the window.
     * A rule matches if any of its app ids fits OR its title regex matches.
     *
     * @param {Meta.Window|null} win the focused window
     * @returns {object|null} the matching profile
     */
    _resolveProfile(win) {
        if (!win)
            return null;

        const app = Shell.WindowTracker.get_default().get_window_app(win);
        const appId = app?.get_id() ?? '';
        const wmClass = win.get_wm_class() ?? '';
        const title = win.get_title() ?? '';

        const candidates = this._profiles.getProfiles()
            .filter(p => p.match?.enabled)
            .sort((a, b) => (b.match.priority ?? 0) - (a.match.priority ?? 0));

        for (const profile of candidates) {
            const appHit = profile.match['app-ids']
                ?.some(id => this._matchesApp(id, appId, wmClass));
            const regex = this._regexFor(profile);
            const titleHit = regex ? regex.test(title) : false;
            if (appHit || titleHit)
                return profile;
        }
        return null;
    }

    _matchesApp(pattern, appId, wmClass) {
        const normalize = s => s.toLowerCase().replace(/\.desktop$/, '');
        const wanted = normalize(pattern.trim());
        return wanted !== '' &&
            (wanted === normalize(appId) || wanted === normalize(wmClass));
    }

    _regexFor(profile) {
        const pattern = profile.match?.['title-regex'] ?? '';
        if (!pattern)
            return null;

        if (!this._regexCache.has(profile.id)) {
            let regex = null;
            try {
                regex = new RegExp(pattern, 'i');
            } catch {
                console.error(`Lighter: Invalid title regex for profile "${profile.name}": ${pattern}`);
            }
            this._regexCache.set(profile.id, regex);
        }
        return this._regexCache.get(profile.id);
    }
}
