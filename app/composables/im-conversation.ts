import { createImConversation } from '~/services/im'
import { pushGlobalNotice } from '~/utils/notice'

const pendingConversationStorageKey = 'zcyp-im-pending-conversation-no'

export type ImConversationMetadata = Record<string, string | number | boolean | null | undefined>

function normalizeConversationMetadata(metadata?: ImConversationMetadata | null) {
  if (!metadata)
    return null

  const entries = Object.entries(metadata).filter(([, value]) => value !== undefined && value !== null && value !== '')
  return entries.length ? Object.fromEntries(entries) : null
}

export function useImConversationStarter() {
  const userStore = useUserStore()
  const router = useRouter()
  const isStartingConversation = ref(false)

  async function startSingleConversation(externalUserId?: string | null, metadata?: ImConversationMetadata | null) {
    if (!userStore.authHeader) {
      pushGlobalNotice('请先登录后再发起沟通', 'warning')
      return null
    }

    if (!externalUserId) {
      pushGlobalNotice('暂无联系人 IM 信息，暂不能发起沟通', 'warning')
      return null
    }

    isStartingConversation.value = true

    try {
      const normalizedMetadata = normalizeConversationMetadata(metadata)
      const { job_id: jobId, ...metadataWithoutJobId } = normalizedMetadata || {}
      const conversationMetadata = normalizeConversationMetadata(metadataWithoutJobId)
      const conversation = await createImConversation(
        {
          type: 'single',
          members: [{ external_user_id: externalUserId }],
          ...(typeof jobId === 'number' ? { job_id: jobId } : {}),
          ...(conversationMetadata ? { metadata: conversationMetadata } : {}),
        },
        userStore.authHeader,
      )

      if (import.meta.client)
        sessionStorage.setItem(pendingConversationStorageKey, conversation.conversation_no)

      const imPath = userStore.currentIdentity === 'employer' ? '/im/recruiter' : '/im/jobseeker'
      await router.push({
        path: imPath,
        query: { conversation_no: conversation.conversation_no },
      })
      pushGlobalNotice('已创建会话，正在进入聊天')
      return conversation
    }
    catch (error) {
      pushGlobalNotice(error instanceof Error ? error.message : '创建会话失败', 'error')
      return null
    }
    finally {
      isStartingConversation.value = false
    }
  }

  return {
    isStartingConversation,
    startSingleConversation,
  }
}

export function getPendingImConversationNo() {
  if (!import.meta.client)
    return ''

  return sessionStorage.getItem(pendingConversationStorageKey) || ''
}

export function clearPendingImConversationNo() {
  if (import.meta.client)
    sessionStorage.removeItem(pendingConversationStorageKey)
}
