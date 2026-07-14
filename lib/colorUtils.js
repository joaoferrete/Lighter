// Pure color helpers shared by the shell process and the preferences process.
// Keep this module free of Shell UI and GTK imports.

/**
 * Parse a `#rrggbb` or `rgb()/rgba()` string into a plain color object.
 *
 * @param {string} str the color string
 * @returns {{r: number, g: number, b: number}} the parsed color (white on failure)
 */
export function parseColor(str) {
    try {
        const hexMatch = str.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
        if (hexMatch) {
            return {
                r: parseInt(hexMatch[1], 16),
                g: parseInt(hexMatch[2], 16),
                b: parseInt(hexMatch[3], 16),
            };
        }

        const rgbMatch = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbMatch) {
            return {
                r: parseInt(rgbMatch[1]),
                g: parseInt(rgbMatch[2]),
                b: parseInt(rgbMatch[3]),
            };
        }
    } catch (e) {
        console.error(`Lighter: Failed to parse color "${str}": ${e}`);
    }
    return {r: 255, g: 255, b: 255};
}

/**
 * Map a temperature value to a color.
 * Linear interpolation: 0 (warm) [255, 147, 41] → 50 (neutral) [255, 255, 255]
 * → 100 (cold) [201, 226, 255].
 *
 * @param {number} temp temperature in the 0–100 range
 * @returns {{r: number, g: number, b: number}} the interpolated color
 */
export function colorFromTemperature(temp) {
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

    return {r: Math.floor(r), g: Math.floor(g), b: Math.floor(b)};
}

/**
 * Resolve the effective border color: pure white means "use the temperature".
 *
 * @param {string} colorStr the configured color string
 * @param {number} temperature temperature in the 0–100 range
 * @returns {{r: number, g: number, b: number}} the effective color
 */
export function resolveColor(colorStr, temperature) {
    const parsed = parseColor(colorStr);
    if (parsed.r === 255 && parsed.g === 255 && parsed.b === 255)
        return colorFromTemperature(temperature);
    return parsed;
}

/**
 * @param {{r: number, g: number, b: number}} color a plain color object
 * @returns {string} a CSS background-color declaration
 */
export function toBackgroundCss(color) {
    return `background-color: rgb(${color.r}, ${color.g}, ${color.b});`;
}
