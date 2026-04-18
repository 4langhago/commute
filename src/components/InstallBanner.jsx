import { Download, Share, X } from 'lucide-react'
import useInstallPrompt from '../hooks/useInstallPrompt'
import { haptics } from '../lib/haptics'

export default function InstallBanner() {
  const { canPromptNative, showIOSHint, prompt, dismiss } = useInstallPrompt()

  if (!canPromptNative && !showIOSHint) return null

  const onInstall = async () => {
    haptics.medium()
    await prompt()
  }

  return (
    <div className="mx-4 mb-3 rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-9 h-9 rounded-lg bg-indigo-600 text-white grid place-items-center">
          <Download className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-800">Install Commute</div>
          {canPromptNative ? (
            <p className="text-xs text-slate-600 mt-0.5">
              Add to your home screen for a full-screen, offline-ready experience.
            </p>
          ) : (
            <p className="text-xs text-slate-600 mt-0.5 inline-flex items-center flex-wrap gap-1">
              Tap <Share className="w-3.5 h-3.5 inline" /> <b>Share</b> in Safari, then <b>Add to Home Screen</b>.
            </p>
          )}
          {canPromptNative && (
            <button
              onClick={onInstall}
              className="tap mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700"
            >
              <Download className="w-3.5 h-3.5" />
              Install app
            </button>
          )}
        </div>
        <button
          onClick={() => { haptics.light(); dismiss() }}
          className="tap shrink-0 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
