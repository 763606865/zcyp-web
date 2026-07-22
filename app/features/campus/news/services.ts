import { delJson, getJson, postJson, putJson } from '~/services/http'

interface ApiResponse<T> {
  code: number
  data: T
}

function createAuthHeaders(authorization: string) {
  return authorization ? { Authorization: authorization } : undefined
}

export interface ArticleItem {
  id: number
  title: string
  sub_title: string | null
  slug: string | null
  cover: string | null
  display_cover: string | null
  summary: string | null
  content: string | null
  content_type: number
  category_id: number | null
  category_name: string | null
  city_code: string | null
  author: string | null
  source_name: string | null
  source_url: string | null
  is_top: boolean
  is_recommend: boolean
  status: number
  status_label: string
  seo_keywords: string | null
  seo_description: string | null
  school_code: string | null
  published_at: string | null
  created_at: string
  updated_at: string
  tag_ids: number[]
  tags: { id: number, name: string }[]
}

export interface ArticleForm {
  title?: string
  category_id?: number | null
  province_code?: string | null
  city_code?: string | null
  sub_title?: string | null
  slug?: string | null
  cover?: string | null
  display_cover?: string | null
  summary?: string | null
  content?: string | null
  content_type?: number
  author?: string | null
  source_name?: string | null
  source_url?: string | null
  is_top?: boolean
  is_recommend?: boolean
  seo_keywords?: string | null
  seo_description?: string | null
  tag_ids?: number[]
  extra?: any[]
}

export interface ArticleListParams {
  status?: number
  category_id?: number
  keyword?: string
  page?: number
  per_page?: number
}

export async function getArticleList(authorization: string, params?: ArticleListParams) {
  const response = await getJson<ApiResponse<{ data: ArticleItem[], total: number, current_page: number, last_page: number }>>(
    '/rc/schools/articles',
    params as Record<string, string | number | undefined>,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function getArticleDetail(authorization: string, id: number) {
  const response = await getJson<ApiResponse<{ article: ArticleItem }>>(
    `/rc/schools/articles/${id}`,
    undefined,
    createAuthHeaders(authorization),
  )
  return response.data.article
}

export async function createArticle(authorization: string, payload: ArticleForm) {
  const response = await postJson<ApiResponse<ArticleItem>>(
    '/rc/schools/articles',
    payload,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function updateArticle(authorization: string, id: number, payload: ArticleForm) {
  const response = await putJson<ApiResponse<ArticleItem>>(
    `/rc/schools/articles/${id}`,
    payload,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function deleteArticle(authorization: string, id: number) {
  await delJson<ApiResponse<null>>(
    `/rc/schools/articles/${id}`,
    undefined,
    createAuthHeaders(authorization),
  )
}

export async function publishArticle(authorization: string, id: number) {
  const response = await postJson<ApiResponse<ArticleItem>>(
    `/rc/schools/articles/${id}/publish`,
    undefined,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function offlineArticle(authorization: string, id: number) {
  const response = await postJson<ApiResponse<ArticleItem>>(
    `/rc/schools/articles/${id}/offline`,
    undefined,
    createAuthHeaders(authorization),
  )
  return response.data
}
