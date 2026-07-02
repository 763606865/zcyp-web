import type {
  ResumeCertificate,
  ResumeCertificateSavePayload,
  ResumeEducation,
  ResumeEducationSavePayload,
  ResumeIntention,
  ResumeIntentionSavePayload,
  ResumeLanguage,
  ResumeLanguageSavePayload,
  ResumeListResponse,
  ResumePortfolio,
  ResumePortfolioSavePayload,
  ResumeProject,
  ResumeProjectSavePayload,
  ResumeRecord,
  ResumeSavePayload,
  ResumeSkill,
  ResumeSkillSavePayload,
  ResumeTraining,
  ResumeTrainingSavePayload,
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
interface ProjectsListWrapper { projects: ResumeProject[] }
interface TrainingsListWrapper { trainings: ResumeTraining[] }
interface LanguagesListWrapper { languages: ResumeLanguage[] }
interface SkillsListWrapper { skills: ResumeSkill[] }
interface CertificatesListWrapper { certificates: ResumeCertificate[] }
interface PortfoliosListWrapper { portfolios: ResumePortfolio[] }

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

// ---------------------------------------------------------------------------
// 扩展模块
// ---------------------------------------------------------------------------

export async function getResumeProjects(resumeId: number, authorization: string) {
  const response = await getJson<ApiResponse<ProjectsListWrapper>>(
    `/rc/resumes/${resumeId}/projects`,
    undefined,
    createAuthHeaders(authorization),
  )

  return response.data.projects || []
}

export async function createResumeProject(resumeId: number, payload: ResumeProjectSavePayload, authorization: string) {
  const response = await postJson<ApiResponse<ResumeProject>>(
    `/rc/resumes/${resumeId}/projects`,
    payload,
    createAuthHeaders(authorization),
  )

  return response.data
}

export async function updateResumeProject(resumeId: number, projectId: number, payload: ResumeProjectSavePayload, authorization: string) {
  const response = await putJson<ApiResponse<ResumeProject>>(
    `/rc/resumes/${resumeId}/projects/${projectId}`,
    payload,
    createAuthHeaders(authorization),
  )

  return response.data
}

export async function deleteResumeProject(resumeId: number, projectId: number, authorization: string) {
  await delJson(
    `/rc/resumes/${resumeId}/projects/${projectId}`,
    undefined,
    createAuthHeaders(authorization),
  )
}

export async function getResumeTrainings(resumeId: number, authorization: string) {
  const response = await getJson<ApiResponse<TrainingsListWrapper>>(
    `/rc/resumes/${resumeId}/trainings`,
    undefined,
    createAuthHeaders(authorization),
  )

  return response.data.trainings || []
}

export async function createResumeTraining(resumeId: number, payload: ResumeTrainingSavePayload, authorization: string) {
  const response = await postJson<ApiResponse<ResumeTraining>>(
    `/rc/resumes/${resumeId}/trainings`,
    payload,
    createAuthHeaders(authorization),
  )

  return response.data
}

export async function updateResumeTraining(resumeId: number, trainingId: number, payload: ResumeTrainingSavePayload, authorization: string) {
  const response = await putJson<ApiResponse<ResumeTraining>>(
    `/rc/resumes/${resumeId}/trainings/${trainingId}`,
    payload,
    createAuthHeaders(authorization),
  )

  return response.data
}

export async function deleteResumeTraining(resumeId: number, trainingId: number, authorization: string) {
  await delJson(
    `/rc/resumes/${resumeId}/trainings/${trainingId}`,
    undefined,
    createAuthHeaders(authorization),
  )
}

export async function getResumeLanguages(resumeId: number, authorization: string) {
  const response = await getJson<ApiResponse<LanguagesListWrapper>>(
    `/rc/resumes/${resumeId}/languages`,
    undefined,
    createAuthHeaders(authorization),
  )

  return response.data.languages || []
}

export async function createResumeLanguage(resumeId: number, payload: ResumeLanguageSavePayload, authorization: string) {
  const response = await postJson<ApiResponse<ResumeLanguage>>(
    `/rc/resumes/${resumeId}/languages`,
    payload,
    createAuthHeaders(authorization),
  )

  return response.data
}

export async function updateResumeLanguage(resumeId: number, languageId: number, payload: ResumeLanguageSavePayload, authorization: string) {
  const response = await putJson<ApiResponse<ResumeLanguage>>(
    `/rc/resumes/${resumeId}/languages/${languageId}`,
    payload,
    createAuthHeaders(authorization),
  )

  return response.data
}

export async function deleteResumeLanguage(resumeId: number, languageId: number, authorization: string) {
  await delJson(
    `/rc/resumes/${resumeId}/languages/${languageId}`,
    undefined,
    createAuthHeaders(authorization),
  )
}

export async function getResumeSkills(resumeId: number, authorization: string) {
  const response = await getJson<ApiResponse<SkillsListWrapper>>(
    `/rc/resumes/${resumeId}/skills`,
    undefined,
    createAuthHeaders(authorization),
  )

  return response.data.skills || []
}

export async function createResumeSkill(resumeId: number, payload: ResumeSkillSavePayload, authorization: string) {
  const response = await postJson<ApiResponse<ResumeSkill>>(
    `/rc/resumes/${resumeId}/skills`,
    payload,
    createAuthHeaders(authorization),
  )

  return response.data
}

export async function updateResumeSkill(resumeId: number, skillId: number, payload: ResumeSkillSavePayload, authorization: string) {
  const response = await putJson<ApiResponse<ResumeSkill>>(
    `/rc/resumes/${resumeId}/skills/${skillId}`,
    payload,
    createAuthHeaders(authorization),
  )

  return response.data
}

export async function deleteResumeSkill(resumeId: number, skillId: number, authorization: string) {
  await delJson(
    `/rc/resumes/${resumeId}/skills/${skillId}`,
    undefined,
    createAuthHeaders(authorization),
  )
}

export async function getResumeCertificates(resumeId: number, authorization: string) {
  const response = await getJson<ApiResponse<CertificatesListWrapper>>(
    `/rc/resumes/${resumeId}/certificates`,
    undefined,
    createAuthHeaders(authorization),
  )

  return response.data.certificates || []
}

export async function createResumeCertificate(resumeId: number, payload: ResumeCertificateSavePayload, authorization: string) {
  const response = await postJson<ApiResponse<ResumeCertificate>>(
    `/rc/resumes/${resumeId}/certificates`,
    payload,
    createAuthHeaders(authorization),
  )

  return response.data
}

export async function updateResumeCertificate(resumeId: number, certificateId: number, payload: ResumeCertificateSavePayload, authorization: string) {
  const response = await putJson<ApiResponse<ResumeCertificate>>(
    `/rc/resumes/${resumeId}/certificates/${certificateId}`,
    payload,
    createAuthHeaders(authorization),
  )

  return response.data
}

export async function deleteResumeCertificate(resumeId: number, certificateId: number, authorization: string) {
  await delJson(
    `/rc/resumes/${resumeId}/certificates/${certificateId}`,
    undefined,
    createAuthHeaders(authorization),
  )
}

export async function getResumePortfolios(resumeId: number, authorization: string) {
  const response = await getJson<ApiResponse<PortfoliosListWrapper>>(
    `/rc/resumes/${resumeId}/portfolios`,
    undefined,
    createAuthHeaders(authorization),
  )

  return response.data.portfolios || []
}

export async function createResumePortfolio(resumeId: number, payload: ResumePortfolioSavePayload, authorization: string) {
  const response = await postJson<ApiResponse<ResumePortfolio>>(
    `/rc/resumes/${resumeId}/portfolios`,
    payload,
    createAuthHeaders(authorization),
  )

  return response.data
}

export async function updateResumePortfolio(resumeId: number, portfolioId: number, payload: ResumePortfolioSavePayload, authorization: string) {
  const response = await putJson<ApiResponse<ResumePortfolio>>(
    `/rc/resumes/${resumeId}/portfolios/${portfolioId}`,
    payload,
    createAuthHeaders(authorization),
  )

  return response.data
}

export async function deleteResumePortfolio(resumeId: number, portfolioId: number, authorization: string) {
  await delJson(
    `/rc/resumes/${resumeId}/portfolios/${portfolioId}`,
    undefined,
    createAuthHeaders(authorization),
  )
}
