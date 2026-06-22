import { useMemo } from 'react'
import { trimChatHistory } from '@lib/prompts.js'
import type { ChatMessage } from '../types/index.js'

export function useChatHistory(history: ChatMessage[]) {
  return useMemo(() => {
    const { trimmedHistory, summaryPrefix } = trimChatHistory(history)
    return {
      trimmedHistory,
      summaryPrefix,
      hasOlderTurns: summaryPrefix.length > 0,
      totalTurns: history.length,
    }
  }, [history])
}
