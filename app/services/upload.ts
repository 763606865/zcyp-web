import { delJson, uploadFile } from './http'

export interface UploadResponse {
  path: string
  url: string
  size: number
  mime_type: string
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

export async function upload(file: File, type: 'avatar' | 'resume' | 'file', authorization: string) {
  const response = await uploadFile<ApiResponse<UploadResponse>>(
    '/rc/upload',
    file,
    type,
    createAuthHeaders(authorization),
  )

  return response.data
}

export async function deleteUploadedFile(path: string, authorization: string) {
  await delJson<ApiResponse<{ message: string }>>(
    '/rc/files',
    { path },
    createAuthHeaders(authorization),
  )
}
