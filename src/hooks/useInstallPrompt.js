import { useEffect, useState, useCallback } from 'react'

const DISMISS_KEY = 'commute.installDismissedAt.v1'
const DISMISS_DAYS = 14

function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

function isIOS() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) && !window.MSStream
}

export default function useInstallPrompt() {
  const [deferred, setDeferred] = useState(null)
  const [installed, setInstalled] = useState(isStandalone())
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem(DISMISS_KEY)
    if (raw) {
      const ageMs = Date.now() - Number(raw)
      if (ageMs < DISMISS_DAYS * 24 * 60 * 60 * 1000) setDismissed(true)
    }

    const onBeforeInstall = (e) => {
      e.preventDefault()
      setDeferred(e)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const prompt = useCallback(async () => {
    if (!deferred) return 'unavailable'
    deferred.prompt()
    const { outcome } = await deferred.userChoice
    setDeferred(null)
    return outcome // 'accepted' | 'dismissed'
  }, [deferred])

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setDismissed(true)
  }, [])

  const canPromptNative = !!deferred && !installed && !dismissed
  const showIOSHint = isIOS() && !installed && !dismissed && !deferred

  return { canPromptNative, showIOSHint, installed, prompt, dismiss }
}
