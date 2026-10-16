// 城市站动态命名：'全国'/空 → '城市站'，'南昌市' → '南昌站'，无'市'后缀直接加'站'
export function resolveCityStationName(cityName?: string | null): string {
  const trimmed = cityName?.trim() || ''
  if (!trimmed || trimmed === '全国')
    return '城市站'

  const base = trimmed.endsWith('市') ? trimmed.slice(0, -1) : trimmed
  return `${base}站`
}
