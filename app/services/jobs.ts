import type { JobListResponse, JobRecord, JobSavePayload } from '~/types/jobs'
import { delJson, getJson, postJson, putJson } from './http'

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

export async function getJobs(authorization: string, query?: Record<string, string | number | undefined>) {
  const response = await getJson<ApiResponse<JobListResponse>>(
    '/rc/jobs',
    query,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function getJobDetail(id: number, authorization: string) {
  const response = await getJson<ApiResponse<JobRecord>>(
    `/rc/jobs/${id}`,
    undefined,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function createJob(payload: JobSavePayload, authorization: string) {
  const response = await postJson<ApiResponse<JobRecord>>(
    '/rc/jobs',
    payload,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function updateJob(id: number, payload: Partial<JobSavePayload>, authorization: string) {
  const response = await putJson<ApiResponse<JobRecord>>(
    `/rc/jobs/${id}`,
    payload,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function publishJob(id: number, authorization: string) {
  const response = await postJson<ApiResponse<JobRecord>>(
    `/rc/jobs/${id}/publish`,
    undefined,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function pauseJob(id: number, authorization: string) {
  const response = await postJson<ApiResponse<JobRecord>>(
    `/rc/jobs/${id}/pause`,
    undefined,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function closeJob(id: number, authorization: string) {
  const response = await postJson<ApiResponse<JobRecord>>(
    `/rc/jobs/${id}/close`,
    undefined,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function deleteJob(id: number, authorization: string) {
  await delJson(
    `/rc/jobs/${id}`,
    undefined,
    createAuthHeaders(authorization),
  )
}
