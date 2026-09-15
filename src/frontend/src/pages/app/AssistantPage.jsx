/**
 * AssistantPage — Full-page AI Waste Assistant chat interface.
 *
 * Features:
 *  - Clean scrollable message thread
 *  - Animated typing indicator
 *  - Suggestion chips (shown until first message)
 *  - Per-message error state with retry
 *  - Request cancellation on unmount / new send
 *  - Source disclosure banner (honest about AI vs mock)
 *  - Markdown-lite: bold (**text**), line breaks
 *  - Accessible: live region for new messages, keyboard-only usable
 */

import { useState, useRef, useEffect, useCallback, useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  Bot,
  User,
  RefreshCw,
  Trash2,
  Info,
  AlertTriangle,
  Leaf,
  Loader2,
} from 'lucide-react'

import { PageLayout, PageHeader } from '../../components/layout/AppLayout'
import Button from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import {
  sendMessage,
  getSourceInfo,
  SUGGESTIONS,
} from '../../services/assistantService'

// ── Constants ─────────────────────────────────────────────────────────────────
const WELCOME_TEXT =
  "Hi! I'm EcoBot 🌱 — your waste management guide.\n\nAsk me where to throw something, whether an item is recyclable, how to dispose of hazardous waste, or what to do when a bin is full.\n\nI give general guidance based on common recycling standards. Local rules vary — always check your council's guide for exact bin colours and accepted materials."

// ── Markdown-lite renderer ────────────────────────────────────────────────────
// Supports **bold** and newlines only. Avoids importing a full markdown lib.
function RichText({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>
        }
        return part.split('\n').map((line, j, arr) => (
          <span key={`${i}-${j}`}>
            {line}
            {j < arr.length - 1 && <br />}
          </span>
        ))
      })}
    </span>
  )
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-end gap-2.5" aria-label="EcoBot is typing" role="status">
      <BotAvatar />
      <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-bg-secondary border border-token-default">
        <span className="flex items-center gap-1" aria-hidden="true">
          {[0, 150, 300].map(delay => (
            <span
              key={delay}
              className="w-1.5 h-1.5 rounded-full bg-token-tertiary animate-bounce"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </span>
      </div>
    </div>
  )
}

// ── Avatar helpers ────────────────────────────────────────────────────────────
function BotAvatar() {
  return (
    <div
      className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shrink-0 shadow-sm"
      aria-hidden="true"
    >
      <Bot size={16} className="text-white" />
    </div>
  )
}

function UserAvatar() {
  return (
    <div
      className="w-8 h-8 rounded-full bg-bg-tertiary border border-token-default flex items-center justify-center shrink-0"
      aria-hidden="true"
    >
      <User size={15} className="text-token-secondary" />
    </div>
  )
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, onRetry }) {
  const isBot   = msg.role === 'assistant'
  const isError = msg.status === 'error'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className={`flex items-end gap-2.5 ${isBot ? '' : 'flex-row-reverse'}`}
    >
      {isBot ? <BotAvatar /> : <UserAvatar />}

      <div className={`flex flex-col gap-1 max-w-[82%] sm:max-w-[70%] ${isBot ? '' : 'items-end'}`}>
        {/* Bubble */}
        <div
          className={[
            'px-4 py-3 text-sm leading-relaxed',
            isBot
              ? isError
                ? 'rounded-2xl rounded-bl-sm bg-[var(--warning-subtle)] border border-[var(--warning-border)] text-amber-800 dark:text-amber-300'
                : 'rounded-2xl rounded-bl-sm bg-bg-secondary border border-token-default text-token-primary'
              : 'rounded-2xl rounded-br-sm bg-green-500 text-white',
          ].join(' ')}
        >
          {isError ? (
            <span className="flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-500" />
              <RichText text={msg.text} />
            </span>
          ) : (
            <RichText text={msg.text} />
          )}
        </div>

        {/* Timestamp + retry */}
        <div className={`flex items-center gap-2 ${isBot ? '' : 'flex-row-reverse'}`}>
          <span className="text-[11px] text-token-disabled tabular-nums">
            {msg.timestamp}
          </span>
          {isError && onRetry && (
            <button
              type="button"
              onClick={() => onRetry(msg.id)}
              className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
              aria-label="Retry this message"
            >
              <RefreshCw size={10} />
              Retry
            </button>
          )}
          {/* Mock label */}
          {msg.isMock && !isError && (
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-medium">
              Local guide
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ── Suggestion chip ───────────────────────────────────────────────────────────
function SuggestionChip({ suggestion, onClick, disabled }) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onClick(suggestion.text)}
      disabled={disabled}
      className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-token-default bg-bg-secondary hover:border-green-500 hover:bg-[var(--brand-subtle)] transition-all text-sm text-token-secondary hover:text-green-700 dark:hover:text-green-400 disabled:opacity-40 disabled:cursor-not-allowed text-left"
    >
      <span aria-hidden="true">{suggestion.emoji}</span>
      <span>{suggestion.text}</span>
    </motion.button>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function nowLabel() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function makeId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AssistantPage() {
  const sourceInfo = getSourceInfo()

  const initialMessages = [{
    id:        makeId(),
    role:      'assistant',
    text:      WELCOME_TEXT,
    timestamp: nowLabel(),
    status:    'done',
    isMock:    false,
  }]

  const [messages,  setMessages]  = useState(initialMessages)
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)

  const bottomRef    = useRef(null)
  const inputRef     = useRef(null)
  const abortRef     = useRef(null)   // holds current AbortController
  const listRegionId = useId()

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Cancel any in-flight request on unmount
  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  const hasUserMessages = messages.some(m => m.role === 'user')

  // ── Core send logic ──────────────────────────────────────────────────────
  const doSend = useCallback(async (text) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    // Cancel any previous in-flight request
    abortRef.current?.abort()
    const controller  = new AbortController()
    abortRef.current  = controller

    // Append user message
    const userMsg = {
      id:        makeId(),
      role:      'user',
      text:      trimmed,
      timestamp: nowLabel(),
      status:    'done',
    }

    // Build the history we'll send (include welcome only as assistant context)
    const history = [
      ...messages.map(m => ({ role: m.role, text: m.text })),
      { role: 'user', text: trimmed },
    ]

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const result = await sendMessage(history, controller.signal)

      setMessages(prev => [...prev, {
        id:        makeId(),
        role:      'assistant',
        text:      result.text,
        timestamp: nowLabel(),
        status:    'done',
        isMock:    result.isMock,
      }])
    } catch (err) {
      // Ignore abort errors (user navigated away or sent new message)
      if (err?.name === 'CanceledError' || err?.name === 'AbortError' || err?.code === 'ERR_CANCELED') return

      const errText = err?.status === 401
        ? 'You need to be logged in to use EcoBot. Please sign in and try again.'
        : err?.status === 503
          ? 'The AI service is temporarily unavailable. Please try again in a moment.'
          : err?.code === 'NETWORK_ERROR'
            ? 'No connection to the server. Check your network and retry.'
            : 'Something went wrong. Tap Retry to try again, or rephrase your question.'

      setMessages(prev => [...prev, {
        id:        makeId(),
        role:      'assistant',
        text:      errText,
        timestamp: nowLabel(),
        status:    'error',
        // store original query so retry can re-send it
        _retryText: trimmed,
      }])
    } finally {
      setLoading(false)
      // Re-focus input after response
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [loading, messages])

  // ── Retry a failed message ───────────────────────────────────────────────
  const handleRetry = useCallback((errorMsgId) => {
    const errMsg = messages.find(m => m.id === errorMsgId)
    if (!errMsg?._retryText) return
    // Remove the error message then re-send
    setMessages(prev => prev.filter(m => m.id !== errorMsgId))
    doSend(errMsg._retryText)
  }, [messages, doSend])

  // ── Clear conversation ───────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    abortRef.current?.abort()
    setLoading(false)
    setMessages(initialMessages)
    setInput('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Input handlers ───────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      doSend(input)
    }
  }

  const canSend = input.trim().length > 0 && !loading

  return (
    <PageLayout className="flex flex-col touch-manipulation" style={{ minHeight: 'calc(100dvh - 56px - 64px)' }}>
      <PageHeader
        title="EcoBot"
        subtitle="Your AI waste-management guide"
        action={
          hasUserMessages && (
            <Button
              variant="ghost"
              size="sm"
              icon={<Trash2 size={14} />}
              onClick={handleClear}
              aria-label="Clear conversation"
            >
              Clear
            </Button>
          )
        }
      />

      {/* ── Source disclosure banner ────────────────────────────────────── */}
      {sourceInfo.isMock ? (
        <Alert variant="warning" className="mb-4">
          <strong>Demo mode</strong> — EcoBot is using local keyword responses, not a live AI model.
          Set <code className="font-mono text-xs">CHAT_SOURCE = 'backend'</code> in{' '}
          <code className="font-mono text-xs">assistantService.js</code> and start the backend to enable Groq AI.
        </Alert>
      ) : (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-bg-secondary border border-token-default mb-4 text-xs text-token-tertiary">
          <Info size={13} className="shrink-0 mt-0.5 text-blue-400" aria-hidden="true" />
          <span>
            <span className="font-medium text-token-secondary">AI-generated responses</span>
            {' '}— EcoBot provides general guidance based on common recycling standards.
            Local bin colours and accepted materials vary. Always verify with your local council.
          </span>
        </div>
      )}

      {/* ── Chat area ──────────────────────────────────────────────────── */}
      <div className="card p-0 flex flex-col overflow-hidden flex-1 shadow-sm" style={{ minHeight: 380 }}>

        {/* Message thread */}
        <div
          id={listRegionId}
          role="log"
          aria-live="polite"
          aria-label="Conversation with EcoBot"
          className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4"
          style={{ minHeight: 280 }}
        >
          <AnimatePresence initial={false}>
            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                onRetry={handleRetry}
              />
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          <AnimatePresence>
            {loading && (
              <motion.div
                key="typing"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <TypingIndicator />
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>

        {/* ── Suggestion chips (before first user message) ──────────────── */}
        <AnimatePresence>
          {!hasUserMessages && !loading && (
            <motion.div
              key="suggestions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, height: 0 }}
              className="px-3 sm:px-4 pb-3 border-t border-token-subtle pt-3"
            >
              <p className="text-xs text-token-disabled mb-2 font-medium uppercase tracking-wide">
                Try asking…
              </p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {SUGGESTIONS.map(s => (
                  <SuggestionChip
                    key={s.id}
                    suggestion={s}
                    onClick={doSend}
                    disabled={loading}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Input bar ─────────────────────────────────────────────────── */}
        <div className="flex items-end gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-t border-token-default bg-bg-primary">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about recycling, disposal, or waste…"
            disabled={loading}
            rows={1}
            aria-label="Message to EcoBot"
            aria-controls={listRegionId}
            className={[
              'flex-1 input-base h-auto py-2.5 resize-none overflow-hidden leading-snug text-base md:text-sm',
              'max-h-32 overflow-y-auto min-h-[44px]',
              'disabled:opacity-50',
            ].join(' ')}
            // Auto-grow up to ~5 lines
            onInput={e => {
              e.target.style.height = 'auto'
              e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`
            }}
          />
          <Button
            variant="primary"
            size="md"
            iconOnly
            icon={loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            disabled={!canSend}
            onClick={() => doSend(input)}
            aria-label="Send message"
            className="shrink-0 self-end min-h-[44px] min-w-[44px]"
          />
        </div>

        {/* Keyboard hint */}
        <p className="text-center text-[11px] text-token-disabled pb-2 hidden sm:block" aria-hidden="true">
          Press <kbd className="font-mono bg-bg-tertiary border border-token-default px-1 rounded text-[10px]">Enter</kbd> to send
          &nbsp;·&nbsp;
          <kbd className="font-mono bg-bg-tertiary border border-token-default px-1 rounded text-[10px]">Shift+Enter</kbd> for new line
        </p>
      </div>

      {/* ── Footer disclaimer ───────────────────────────────────────────── */}
      <div className="flex items-start gap-2 mt-4 text-xs text-token-disabled leading-relaxed">
        <Leaf size={12} className="shrink-0 mt-0.5 text-green-500" aria-hidden="true" />
        <p>
          EcoBot provides general waste-management guidance and may not reflect the rules in your specific area.
          AI responses have not been independently verified.
          For authoritative guidance, consult your local authority's recycling guide.
        </p>
      </div>
    </PageLayout>
  )
}
