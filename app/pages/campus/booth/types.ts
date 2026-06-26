export interface BoothArea {
  id: number
  booth_id: number
  code: string | null
  name: string
  area_size: number | null
  max_people: number | null
  start_no: number
  end_no: number
  total_booth_count: number
  max_company_count: number | null
  map_image: string | null
  display_map_image: string | null
  sort: number
}

export interface Booth {
  id: number
  school_code: string | null
  name: string
  province_code: string | null
  city_code: string | null
  district_code: string | null
  address: string | null
  image: string | null
  display_image: string | null
  area_size: number | null
  max_people: number | null
  total_booth_count: number
  description: string | null
  rule: object | null
  status: number
  status_label: string
  areas_count: number
  areas: BoothArea[]
}

export interface AreaForm {
  name: string
  start_no: number
  end_no: number
  code: string | null
  sort: number | null
}

export interface BoothForm {
  name: string
  province_code: string | null
  city_code: string | null
  district_code: string | null
  address: string | null
  image: string | null
  area_size: number | null
  max_people: number | null
  description: string | null
  status: number
}

export interface PaginatedData<T> {
  data: T[]
  total: number
  current_page: number
  last_page: number
}
