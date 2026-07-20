import { getJson, postJson } from './http'

export interface ParsedResume {
  name?: string
  phone?: string
  email?: string
  gender?: string
  birthday?: string
  educations?: Array<{
    school?: string
    major?: string
    degree?: string
    start_date?: string
    end_date?: string
  }>
  works?: Array<{
    company?: string
    position?: string
    start_date?: string
    end_date?: string
    description?: string
  }>
  skills?: string[]
}

export interface ResumeParseTask {
  id: number
  file_url: string
  provider: string | null
  status: 'Pending' | 'Processing' | 'Succeeded' | 'Failed'
  status_value: number
  status_label: string
  parsed_resume: ParsedResume | null
  error_message: string | null
  token_cost: number
  started_at: string | null
  finished_at: string | null
  created_at: string | null
  updated_at: string | null
}

interface ApiResponse<T> {
  code: number
  data: T
  message?: string
  meta?: {
    timestamp?: number
    response_time?: number
  }
}

function createAuthHeaders(authorization: string) {
  return authorization ? { Authorization: authorization } : undefined
}

/**
 * 创建 AI 简历解析任务
 */
export async function createResumeParseTask(fileUrl: string, authorization: string) {
  const response = await postJson<ApiResponse<ResumeParseTask>>(
    '/rc/ai/resume-parses',
    { file_url: fileUrl },
    createAuthHeaders(authorization),
  )

  return response.data
}

/**
 * 查询 AI 简历解析任务状态
 */
export async function getResumeParseTask(id: number, authorization: string) {
  const response = await getJson<ApiResponse<ResumeParseTask>>(
    `/rc/ai/resume-parses/${id}`,
    undefined,
    createAuthHeaders(authorization),
  )

  return response.data
}
