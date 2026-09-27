// Haptic feedback for the web.
// - Android / Chrome: Vibration API.
// - iOS 18+ Safari (no Vibration API): toggling an <input type="checkbox" switch> plays the
//   system haptic tick, so we toggle a hidden one. It must run inside a user gesture (a tap).

const HELPER_ATTR = "data-haptic-helper";
let label: HTMLLabelElement | null = null;

function iosSwitch() {
  if (!label) {
    label = document.createElement("label");
    label.setAttribute(HELPER_ATTR, "");
    label.setAttribute("aria-hidden", "true");
    label.style.cssText = "position:fixed;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;left:-100px;top:0";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    input.tabIndex = -1;
    label.appendChild(input);
    document.body.appendChild(label);
  }
  label.click();
}

const canVibrate = () => typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

export type HapticStyle = "light" | "medium" | "heavy";

const PATTERN: Record<HapticStyle, number | number[]> = { light: 12, medium: 25, heavy: [40, 30, 40] };

/** Call from a tap/click handler. */
export function haptic(style: HapticStyle = "light") {
  try {
    if (canVibrate()) navigator.vibrate(PATTERN[style]);
    else iosSwitch();
  } catch {
    /* unsupported */
  }
}

export function isHapticHelper(target: EventTarget | null) {
  return target instanceof Element && !!target.closest(`[${HELPER_ATTR}]`);
}
