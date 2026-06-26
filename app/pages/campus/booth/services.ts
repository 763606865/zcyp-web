import type { Booth, BoothArea, PaginatedData } from './types'
import { delJson, getJson, postJson, putJson } from '~/services/http'

interface ApiResponse<T> {
  code: number
  data: T
}

function createAuthHeaders(authorization: string) {
  return authorization ? { Authorization: authorization } : undefined
}

export async function getBoothList(authorization: string, params?: { status?: number, keyword?: string, per_page?: number }) {
  const response = await getJson<ApiResponse<PaginatedData<Booth>>>(
    '/rc/schools/booths',
    params as Record<string, string | number | undefined>,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function createBooth(authorization: string, payload: Record<string, any>) {
  const response = await postJson<ApiResponse<Booth | { booth: Booth }>>(
    '/rc/schools/booths',
    payload,
    createAuthHeaders(authorization),
  )
  const data = response.data as any
  return data.booth ?? data
}

export async function getBoothDetail(authorization: string, id: number) {
  const response = await getJson<ApiResponse<Booth | { booth: Booth }>>(
    `/rc/schools/booths/${id}`,
    undefined,
    createAuthHeaders(authorization),
  )
  const data = response.data as any
  return data.booth ?? data
}

export async function updateBooth(authorization: string, id: number, payload: Record<string, any>) {
  const response = await putJson<ApiResponse<Booth | { booth: Booth }>>(
    `/rc/schools/booths/${id}`,
    payload,
    createAuthHeaders(authorization),
  )
  const data = response.data as any
  return data.booth ?? data
}

export async function deleteBooth(authorization: string, id: number) {
  await delJson<ApiResponse<null>>(
    `/rc/schools/booths/${id}`,
    undefined,
    createAuthHeaders(authorization),
  )
}

export async function getAreaList(authorization: string, boothId: number) {
  const response = await getJson<ApiResponse<{ areas: BoothArea[] }>>(
    `/rc/schools/booths/${boothId}/areas`,
    undefined,
    createAuthHeaders(authorization),
  )
  return response.data.areas
}

export async function createArea(authorization: string, boothId: number, payload: Record<string, any>) {
  const response = await postJson<ApiResponse<BoothArea>>(
    `/rc/schools/booths/${boothId}/areas`,
    payload,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function updateArea(authorization: string, boothId: number, id: number, payload: Record<string, any>) {
  const response = await putJson<ApiResponse<BoothArea>>(
    `/rc/schools/booths/${boothId}/areas/${id}`,
    payload,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function deleteArea(authorization: string, boothId: number, id: number) {
  await delJson<ApiResponse<null>>(
    `/rc/schools/booths/${boothId}/areas/${id}`,
    undefined,
    createAuthHeaders(authorization),
  )
}
