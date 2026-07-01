import type {
  ResumeEducation,
  ResumeEducationSavePayload,
  ResumeIntention,
  ResumeIntentionSavePayload,
  ResumeListResponse,
  ResumeRecord,
  ResumeSavePayload,
  ResumeWork,
  ResumeWorkSavePayload,
} from '~/types/resume'
import { delJson, getJson, postJson, putJson, uploadFile } from './http'

interface ApiResponse<T> {
  code: number
  data: T
  message?: string
  meta?: {
    timestamp?: number
    response_time?: number
  }
}

interface IntentionsListWrapper { intentions: ResumeIntention[] }
interface WorksListWrapper { works: ResumeWork[] }
interface EducationsListWrapper { educations: ResumeEducation[] }

function createAuthHeaders(authorization: string) {
  return authorization ? { Authorization: authorization } : undefined
}

// ---------------------------------------------------------------------------
// 简历主表
// ---------------------------------------------------------------------------

export async function getResumeList(authorization: string, perPage = 15) {
  const response = await getJson<ApiResponse<ResumeListResponse>>(
    '/rc/resumes',
    { per_page: perPage },
    createAuthHeaders(authorization),
  )

  return response.data
}

export async function getResumeDetail(id: number, authorization: string) {
  const response = await getJson<ApiResponse<ResumeRecord>>(
    `/rc/resumes/${id}`,
    undefined,
    createAuthHeaders(authorization),
  )

  return response.data
}

export async function uploadResumeAttachment(id: number, file: File, authorization: string) {
  return uploadFile<ApiResponse<ResumeRecord>>(
    `/rc/resumes/${id}/attachment`,
    file,
    undefined,
    { Authorization: authorization },
  )
}

export async function uploadResumeAvatar(id: number, file: File, authorization: string) {
  const response = await uploadFile<ApiResponse<ResumeRecord>>(
    `/rc/resume/${id}/avatar/upload`,
    file,
    undefined,
    { Authorization: authorization },
    'PATCH',
  )

  return response.data
}

export async function createResume(payload: ResumeSavePayload, authorization: string) {
  const response = await postJson<ApiResponse<ResumeRecord>>(
    '/rc/resumes',
    payload,
    createAuthHeaders(authorization),
  )

  return response.data
}

export async function updateResume(id: number, payload: ResumeSavePayload, authorization: string) {
  const response = await putJson<ApiResponse<ResumeRecord>>(
    `/rc/resumes/${id}`,
    payload,
    createAuthHeaders(authorization),
  )

  return response.data
}

// ---------------------------------------------------------------------------
// 求职意向 (rc_resume_intentions) — 1:N
// ---------------------------------------------------------------------------

export async function getResumeIntentions(resumeId: number, authorization: string) {
  const response = await getJson<ApiResponse<IntentionsListWrapper>>(
    `/rc/resumes/${resumeId}/intentions`,
    undefined,
    createAuthHeaders(authorization),
  )

  return response.data.intentions || []
}

export async function getResumeIntentionDetail(resumeId: number, intentionId: number, authorization: string) {
  const response = await getJson<ApiResponse<ResumeIntention>>(
    `/rc/resumes/${resumeId}/intentions/${intentionId}`,
    undefined,
    createAuthHeaders(authorization),
  )

  return response.data
}

export async function createResumeIntention(resumeId: number, payload: ResumeIntentionSavePayload, authorization: string) {
  const response = await postJson<ApiResponse<ResumeIntention>>(
    `/rc/resumes/${resumeId}/intentions`,
    payload,
    createAuthHeaders(authorization),
  )

  return response.data
}

export async function updateResumeIntention(resumeId: number, intentionId: number, payload: ResumeIntentionSavePayload, authorization: string) {
  const response = await putJson<ApiResponse<ResumeIntention>>(
    `/rc/resumes/${resumeId}/intentions/${intentionId}`,
    payload,
    createAuthHeaders(authorization),
  )

  return response.data
}

export async function deleteResumeIntention(resumeId: number, intentionId: number, authorization: string) {
  await delJson(
    `/rc/resumes/${resumeId}/intentions/${intentionId}`,
    undefined,
    createAuthHeaders(authorization),
  )
}

// ---------------------------------------------------------------------------

export async function getResumeWorks(resumeId: number, authorization: string) {
  const response = await getJson<ApiResponse<WorksListWrapper>>(
    `/rc/resumes/${resumeId}/works`,
    undefined,
    createAuthHeaders(authorization),
  )

  return response.data.works || []
}

export async function createResumeWork(resumeId: number, payload: ResumeWorkSavePayload, authorization: string) {
  const response = await postJson<ApiResponse<ResumeWork>>(
    `/rc/resumes/${resumeId}/works`,
    payload,
    createAuthHeaders(authorization),
  )

  return response.data
}

export async function updateResumeWork(resumeId: number, workId: number, payload: ResumeWorkSavePayload, authorization: string) {
  const response = await putJson<ApiResponse<ResumeWork>>(
    `/rc/resumes/${resumeId}/works/${workId}`,
    payload,
    createAuthHeaders(authorization),
  )

  return response.data
}

export async function deleteResumeWork(resumeId: number, workId: number, authorization: string) {
  await delJson(
    `/rc/resumes/${resumeId}/works/${workId}`,
    undefined,
    createAuthHeaders(authorization),
  )
}

// ---------------------------------------------------------------------------
// 教育经历 (rc_resume_educations) — 1:N
// ---------------------------------------------------------------------------

export async function getResumeEducations(resumeId: number, authorization: string) {
  const response = await getJson<ApiResponse<EducationsListWrapper>>(
    `/rc/resumes/${resumeId}/educations`,
    undefined,
    createAuthHeaders(authorization),
  )

  return response.data.educations || []
}

export async function createResumeEducation(resumeId: number, payload: ResumeEducationSavePayload, authorization: string) {
  const response = await postJson<ApiResponse<ResumeEducation>>(
    `/rc/resumes/${resumeId}/educations`,
    payload,
    createAuthHeaders(authorization),
  )

  return response.data
}

export async function updateResumeEducation(resumeId: number, educationId: number, payload: ResumeEducationSavePayload, authorization: string) {
  const response = await putJson<ApiResponse<ResumeEducation>>(
    `/rc/resumes/${resumeId}/educations/${educationId}`,
    payload,
    createAuthHeaders(authorization),
  )

  return response.data
}

export async function deleteResumeEducation(resumeId: number, educationId: number, authorization: string) {
  await delJson(
    `/rc/resumes/${resumeId}/educations/${educationId}`,
    undefined,
    createAuthHeaders(authorization),
  )
}
