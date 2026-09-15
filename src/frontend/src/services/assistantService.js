/**
 * BinIQ — Assistant Service
 * ─────────────────────────────────────────────────────────────────────────────
 * ARCHITECTURE
 *   All AI chat calls flow through this module. The UI never calls any AI
 *   provider directly — it only calls sendMessage() and reads the result.
 *
 *   CHAT_SOURCE controls which implementation is used:
 *
 *     'backend' (default)
 *       Sends the message to POST /api/chat on the FastAPI backend.
 *       The backend holds the GROQ_API_KEY in its own .env file and proxies
 *       the request to Groq (Llama-3 8b). No key is ever sent to the browser.
 *       Falls back gracefully when the backend has no key configured (returns
 *       the backend's own keyword-matched fallback response).
 *
 *     'mock'
 *       Fully deterministic, no network calls. Safe for development/testing
 *       when the backend is not running. Clearly labelled in responses.
 *       To activate: set CHAT_SOURCE = 'mock' below.
 *
 *   TO ADD A FUTURE PROVIDER (e.g. OpenAI, Anthropic, Gemini):
 *     1. Add a new case to CHAT_SOURCE.
 *     2. Implement a sendWith<Provider>(history, signal) function below.
 *     3. All keys must stay on the backend — never import them here.
 *
 *   RESPONSE CONTRACT
 *   Every source returns the same shape so the UI never needs to change:
 *   {
 *     text:    string        — assistant reply
 *     source:  string        — 'backend' | 'mock' (shown in UI badge)
 *     isMock:  boolean       — true only for mock source (shows demo banner)
 *   }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import api from './api'

// ── Source toggle ─────────────────────────────────────────────────────────────
// The local FastAPI service is the normal application path. Set
// VITE_CHAT_SOURCE=mock only when deliberately running the UI without it.
// sendMessage still falls back to the built-in guide if the backend is offline.
const CHAT_SOURCE = import.meta.env.VITE_CHAT_SOURCE === 'mock' ? 'mock' : 'backend'

// ── Suggested starter questions ───────────────────────────────────────────────
export const SUGGESTIONS = [
  { id: 's1', text: 'Where should I throw a plastic bottle?',    emoji: '🧴' },
  { id: 's2', text: 'Can a greasy pizza box be recycled?',        emoji: '🍕' },
  { id: 's3', text: 'How do I dispose of old batteries?',         emoji: '🔋' },
  { id: 's4', text: 'What goes in the blue recycling bin?',       emoji: '♻️' },
  { id: 's5', text: 'What should I do if a bin is overflowing?',  emoji: '🗑️' },
  { id: 's6', text: 'Is aluminium foil recyclable?',              emoji: '🥡' },
  { id: 's7', text: 'How should I dispose of old electronics?',   emoji: '📱' },
  { id: 's8', text: 'Can I recycle broken glass?',                emoji: '🍶' },
]

// ── System prompt sent to backend (kept here so product can iterate on it) ───
// NOTE: This is not a secret — it only shapes tone/format, not access control.
export const SYSTEM_PROMPT = `You are EcoBot, BinIQ's waste-management assistant.
Your job is to give users practical, accurate guidance on waste disposal and recycling.

GUIDELINES:
- Answer concisely (2-4 sentences for simple questions; up to 8 for complex ones).
- Always specify which bin or facility to use.
- Describe how to prepare the item (rinse, flatten, remove caps, etc.).
- When local rules may differ, say so explicitly: "Rules vary by area — check your local council's guide."
- Never invent local collection schedules, bin colours, or authority-specific rules you are not certain of.
- If you are uncertain, say so honestly rather than guessing.
- For hazardous items (batteries, chemicals, WEEE/e-waste, medicines) always recommend specialist disposal.
- Keep a friendly, encouraging tone. One eco-tip at the end is welcome but not mandatory.
- Use short paragraphs and occasional relevant emoji — but don't overdo it.`

// ── Mock knowledge base ───────────────────────────────────────────────────────
// Deterministic responses for development/testing. Clearly labelled as mock.
const MOCK_RESPONSES = [
  {
    patterns: ['plastic bottle', 'plastic', 'bottle', 'pet', 'hdpe', 'resin'],
    reply: "♻️ **Plastic bottles** generally go in the **blue recycling bin**. Rinse them out, remove and separate the cap (small caps often fall through sorting machinery), and flatten the bottle to save space. Check the resin code on the base — codes 1 (PET) and 2 (HDPE) are accepted almost everywhere; codes 3–7 vary by area. Rules differ by local authority — check your council's guide if unsure.",
  },
  {
    patterns: ['pizza box', 'pizza', 'greasy box', 'greasy cardboard'],
    reply: "🍕 A **greasy pizza box** cannot go in the recycling bin — grease contaminates paper fibres and ruins entire batches. Tear off any clean, dry portions (like the lid) and recycle those. The greasy base goes in **general waste (black bin)**. If your area has a food-waste or composting service, small food residue may be acceptable there.",
  },
  {
    patterns: ['batter', 'batteries'],
    reply: "🔋 **Batteries are hazardous** — never put them in any household bin. Take them to a **battery recycling point** (most large supermarkets and DIY stores have a collection box near the entrance). Some councils also offer kerbside battery collection in a small clear bag on top of your recycling box. Car and e-bike batteries need to go to a Household Waste Recycling Centre (HWRC).",
  },
  {
    patterns: ['blue bin', 'blue recycling', 'recycling bin', 'what can', 'what goes'],
    reply: "♻️ The **blue recycling bin** typically accepts: clean plastic bottles & containers, cardboard (flattened), paper, metal cans & tins, and sometimes cartons. It generally does **not** accept: food waste, nappies, polystyrene, crisp packets, or black plastic. These lists vary — your local council's website will have the definitive list for your postcode.",
  },
  {
    patterns: ['overflowing', 'full bin', 'bin overflow', 'bin is full', 'bin is overflowing'],
    reply: "🗑️ If a public bin is **overflowing**, don't leave waste on the ground — it becomes a litter and health hazard. Use the **Report Waste** feature in BinIQ to alert your local authority with a photo and location. You can also call or use your council's online reporting tool. In the meantime, find the next nearest bin or take waste home. If it's a recurring problem, a report helps councils adjust collection frequency.",
  },
  {
    patterns: ['aluminium foil', 'foil', 'tin foil'],
    reply: "🥡 **Clean aluminium foil** is recyclable — scrunch several pieces into a ball (so it doesn't slip through sorting machinery) and place in the **blue recycling bin**. Foil that is heavily soiled with food should go in general waste. Foil trays follow the same rule: rinse them first.",
  },
  {
    patterns: ['electronic', 'electronics', 'weee', 'e-waste', 'phone', 'laptop', 'computer', 'television', 'tv', 'appliance'],
    reply: "📱 **Electrical and electronic items (WEEE)** must never go in household bins — they contain hazardous materials and valuable recoverable metals. Options: ① Take to a **Household Waste Recycling Centre (HWRC)**. ② Use a retailer take-back scheme (most large electronics retailers are legally required to accept like-for-like items). ③ Donate working items to charity. Check the BinIQ Map for your nearest e-waste drop-off point.",
  },
  {
    patterns: ['glass', 'bottle', 'jar', 'broken glass'],
    reply: "🍶 **Intact glass bottles and jars** go in the **glass bank (green bottle bank)** — rinse them and remove metal lids first. Broken glass is a safety hazard: wrap it securely in newspaper, seal in a box, and place in **general waste** (never loose in recycling). Flat glass (windows, mirrors, Pyrex, drinking glasses) is a different type of glass and is **not** accepted in bottle banks — take it to a HWRC.",
  },
  {
    patterns: ['cardboard', 'box', 'packaging'],
    reply: "📦 **Cardboard** goes in the **blue recycling bin** — break boxes down flat first to save space and remove excessive tape (a little tape is fine). Keep it dry; wet cardboard is harder to recycle. Pizza boxes and other heavily greasy cardboard go in general waste. Waxed cardboard (used in some food packaging) is generally not recyclable — check with your council.",
  },
  {
    patterns: ['medicine', 'medication', 'drugs', 'pills', 'tablets'],
    reply: "💊 **Medicines** must never go in household bins or be flushed down the drain — they contaminate water supplies. Return unused or expired medicines to any **pharmacy or chemist**, who are legally required to accept them for safe disposal. This includes tablets, liquids, creams, and inhalers.",
  },
  {
    patterns: ['compost', 'food waste', 'organic', 'fruit', 'vegetable', 'leftovers'],
    reply: "🌱 **Food and organic waste** goes in the **brown/green organic waste bin** or your home compost bin if you have one. Accepted items typically include: fruit & veg peelings, cooked food, teabags, coffee grounds, and eggshells. Not accepted: liquids, oils, meat and fish (in most home composters — some councils accept these in kerbside collection). Check your local authority's guide for what they collect.",
  },
  {
    patterns: ['recycle', 'recyclable', 'can i recycle', 'is this recyclable'],
    reply: `♻️ As a general rule, the following are **widely recyclable**: clean plastic bottles (codes 1 & 2), cardboard, paper, metal cans, and glass jars. **Not recyclable** in standard bins: black plastic, polystyrene, crisp packets, cling film, nappies, and anything heavily contaminated with food. When in doubt, the mantra is: **"when in doubt, leave it out"** — contaminated recycling can cause an entire batch to be rejected. Check your local council's guide for definitive lists.`,
  },
]

function getMockResponse(userMessage) {
  const lower = userMessage.toLowerCase()
  const match = MOCK_RESPONSES.find(r =>
    r.patterns.some(p => lower.includes(p))
  )
  return match?.reply
    ?? "I don't have a specific answer for that in demo mode. In production, EcoBot uses Groq AI (Llama 3) to answer any waste question. General tip: when in doubt about recycling, rinse the item and check your local council's website for definitive guidance."
}

// ── Backend implementation ────────────────────────────────────────────────────
/**
 * Sends message history to POST /api/chat on the FastAPI backend.
 * The backend holds all API keys — none are ever sent to the browser.
 * Respects AbortSignal for request cancellation.
 *
 * @param {Array<{role:'user'|'assistant', text:string}>} history
 * @param {AbortSignal} signal
 */
async function sendWithBackend(history, signal) {
  // The backend /chat endpoint accepts a single message.
  // We send the latest user message; the system prompt on the backend provides context.
  // For multi-turn context we include a condensed transcript as part of the message.
  const lastUser = [...history].reverse().find(m => m.role === 'user')
  if (!lastUser) throw new Error('No user message to send')

  // Build a short context prefix from the last few exchanges (max 3 pairs)
  const recent = history.slice(-7) // at most 4 user + 3 assistant
  // Provider requests have size limits. Preserve conversational continuity
  // without allowing long assistant replies to make later messages fail.
  const contextLines = recent
    .slice(0, -1) // exclude the current message
    .map(m => `${m.role === 'user' ? 'User' : 'EcoBot'}: ${m.text.slice(0, 400)}`)
    .join('\n')
    .slice(-2400)

  const fullMessage = contextLines
    ? `[Previous context]\n${contextLines}\n\n[Current question]\n${lastUser.text.slice(0, 1200)}`
    : lastUser.text.slice(0, 1200)

  const { data } = await api.post(
    '/chat',
    { message: fullMessage },
    { signal, timeout: 30000 }
  )

  if (!data?.reply) throw new Error('Empty response from server')
  return { text: data.reply, source: data.source || 'local_guide' }
}

// ── Mock implementation ───────────────────────────────────────────────────────
async function sendWithMock(history, _signal) {
  // Simulate realistic network latency
  const delay = 600 + Math.random() * 900
  await new Promise(r => setTimeout(r, delay))

  const lastUser = [...history].reverse().find(m => m.role === 'user')
  if (!lastUser) throw new Error('No user message')
  return getMockResponse(lastUser.text)
}

// ── PUBLIC: Send a message ────────────────────────────────────────────────────
/**
 * Send the current conversation history and receive an assistant reply.
 *
 * @param {Array<{role:'user'|'assistant', text:string}>} history
 *   Full conversation so far, including the latest user message at the end.
 * @param {AbortSignal} [signal]  Optional — pass to cancel in-flight requests.
 * @returns {Promise<{ text: string, source: string, isMock: boolean }>}
 */
export async function sendMessage(history, signal) {
  switch (CHAT_SOURCE) {
    case 'mock': {
      const text = await sendWithMock(history, signal)
      return { text, source: 'mock', isMock: true }
    }
    case 'backend':
    default: {
      try {
        const result = await sendWithBackend(history, signal)
        return {
          text: result.text,
          source: result.source,
          // Show an honest local-guide label whenever the remote provider was
          // unavailable rather than presenting it as an online AI response.
          isMock: result.source !== 'groq',
        }
      } catch (error) {
        // Keep the assistant useful if the local API is restarting or an AI
        // provider is unavailable.  The deterministic guide covers the
        // starter questions without exposing provider credentials to the UI.
        console.warn('[Assistant] Backend unavailable; using local guide:', error)
        const text = await sendWithMock(history, signal)
        return { text, source: 'mock', isMock: true }
      }
    }
  }
}

// ── PUBLIC: Source info ───────────────────────────────────────────────────────
/**
 * Returns human-readable info about the current AI source.
 * Used by the UI to show an honest disclosure badge.
 */
export function getSourceInfo() {
  switch (CHAT_SOURCE) {
    case 'mock':
      return {
        label:       'Demo mode',
        description: 'Using local keyword responses — no AI model connected.',
        isMock:      true,
      }
    case 'backend':
    default:
      return {
        label:       'EcoBot waste guide',
        description: 'Uses AI when available and a built-in waste guide otherwise. Local rules may differ.',
        isMock:      false,
      }
  }
}
