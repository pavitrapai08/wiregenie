import { useRef, useState } from 'react'

interface Props {
  onTranscript: (text: string) => void
  disabled?: boolean
}

// Minimal SpeechRecognition shape for the web API
interface SpeechRecognitionResult {
  readonly isFinal: boolean
  readonly [index: number]: { transcript: string }
}

interface SpeechRecognitionResultList {
  readonly length: number
  readonly resultIndex: number
  readonly [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionEvent {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultList
}

interface SpeechRecognitionInstance {
  continuous: boolean
  interimResults: boolean
  lang: string
  onstart: (() => void) | null
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance

const SILENCE_MS = 2000

const isFirefox = navigator.userAgent.toLowerCase().includes('firefox')

export function VoiceInput({ onTranscript, disabled }: Props) {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const finalRef = useRef('')

  if (isFirefox) {
    return (
      <div className="voice-input voice-input--unsupported">
        Voice input not supported in Firefox.
      </div>
    )
  }

  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  const SpeechRecognitionCtor = win.SpeechRecognition ?? win.webkitSpeechRecognition

  if (!SpeechRecognitionCtor) {
    return (
      <div className="voice-input voice-input--unsupported">
        Voice input not supported in this browser.
      </div>
    )
  }

  function resetSilenceTimer(recognition: SpeechRecognitionInstance) {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    silenceTimerRef.current = setTimeout(() => {
      recognition.stop()
    }, SILENCE_MS)
  }

  function startListening() {
    finalRef.current = ''
    const recognition = new SpeechRecognitionCtor!()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setListening(true)
      resetSilenceTimer(recognition)
    }

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      resetSilenceTimer(recognition)
      let interimText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) {
          finalRef.current += r[0].transcript + ' '
        } else {
          interimText += r[0].transcript
        }
      }
      setInterim(interimText)
    }

    recognition.onend = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      setListening(false)
      setInterim('')
      const text = finalRef.current.trim()
      if (text) onTranscript(text)
      finalRef.current = ''
    }

    recognition.onerror = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      setListening(false)
      setInterim('')
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  function stopListening() {
    recognitionRef.current?.stop()
  }

  return (
    <div className="voice-input">
      <button
        className={`voice-input__btn${listening ? ' voice-input__btn--active' : ''}`}
        onClick={listening ? stopListening : startListening}
        disabled={disabled}
        aria-label={listening ? 'Stop recording' : 'Start voice input'}
      >
        {listening ? '⏹ Stop' : '🎤 Speak'}
      </button>
      {listening && (
        <p className="voice-input__interim">{interim || 'Listening…'}</p>
      )}
    </div>
  )
}
