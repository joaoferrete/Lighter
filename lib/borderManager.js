import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {resolveColor, toBackgroundCss} from './colorUtils.js';

const FADE_IN_MS = 500;

const LightBorder = GObject.registerClass(
    class LightBorder extends St.Widget {
        _init(params) {
            super._init(params);
            this.set_reactive(false); // Click-through
        }
    },
);

/**
 * Draws the light borders along the monitor edges based on the current settings.
 * Profiles are invisible to this class: it only reads the flat appearance keys.
 */
export class BorderManager {
    constructor(settings) {
        this._settings = settings;
        this._borders = [];
    }

    sync() {
        this.clear();

        if (!this._settings.get_boolean('enabled'))
            return;

        const sides = {
            top: this._settings.get_int('thickness-top'),
            bottom: this._settings.get_int('thickness-bottom'),
            left: this._settings.get_int('thickness-left'),
            right: this._settings.get_int('thickness-right'),
        };
        const color = resolveColor(
            this._settings.get_string('color'),
            this._settings.get_int('temperature'));
        const cssColor = toBackgroundCss(color);
        const targetOpacity = Math.floor(this._settings.get_double('opacity') * 255);

        const monitors = (this._settings.get_boolean('multi-monitor')
            ? Main.layoutManager.monitors
            : [Main.layoutManager.primaryMonitor]).filter(m => m);

        for (const monitor of monitors)
            this._createBordersForMonitor(monitor, sides, cssColor, targetOpacity);
    }

    clear() {
        this._borders.forEach(b => b.destroy());
        this._borders = [];
    }

    destroy() {
        this.clear();
        this._borders = null;
        this._settings = null;
    }

    _createBordersForMonitor(monitor, sides, cssColor, targetOpacity) {
        const {x, y, width, height} = monitor;
        const {top, bottom, left, right} = sides;
        // Left/right bars fill the space between the horizontal bars; a side
        // with thickness 0 is simply not drawn.
        const sideHeight = Math.max(0, height - top - bottom);

        const borders = [];
        if (top > 0)
            borders.push(this._addBorder(x, y, width, top, cssColor));
        if (bottom > 0)
            borders.push(this._addBorder(x, y + height - bottom, width, bottom, cssColor));
        if (left > 0 && sideHeight > 0)
            borders.push(this._addBorder(x, y + top, left, sideHeight, cssColor));
        if (right > 0 && sideHeight > 0)
            borders.push(this._addBorder(x + width - right, y + top, right, sideHeight, cssColor));

        borders.forEach(b => {
            b.opacity = 0;
            b.ease({
                opacity: targetOpacity,
                duration: FADE_IN_MS,
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            });
        });
    }

    _addBorder(x, y, width, height, cssColor) {
        const border = new LightBorder({
            x, y, width, height,
            style: cssColor,
        });

        // Add as chrome (Always on Top)
        Main.layoutManager.addChrome(border, {
            affectsInputRegion: false,
            trackFullscreen: true,
        });

        this._borders.push(border);
        return border;
    }
}
