import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {buildGeneralPage} from './preferences/generalPage.js';
import {buildProfilesPage} from './preferences/profilesPage.js';

export default class LighterPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        window.add(buildGeneralPage(settings, window));
        window.add(buildProfilesPage(settings, window));
    }
}
