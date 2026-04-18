// Lightweight haptic feedback. Safe no-op on platforms without Vibration API.
const canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

export const haptics = {
  light()   { if (canVibrate) navigator.vibrate(10) },
  medium()  { if (canVibrate) navigator.vibrate(20) },
  success() { if (canVibrate) navigator.vibrate([10, 40, 20]) },
  warning() { if (canVibrate) navigator.vibrate([30, 60, 30]) }
}
