import { getJson, postJson } from './http'

interface ApiResponse<T> {
  code: number
  data: T
  message?: string
}

export type RcPayChannel = 'wechat' | 'alipay'
export type RcPayScene = 'h5' | 'scan' | 'web'

export interface RcGatewayPayload {
  scene: string
  payload: Record<string, unknown> | string
}

export interface RcOrderItemEntitlement {
  asset_code: string
  quantity: number
  duration_days: number
}

export interface RcOrderItem {
  id: number
  item_code: string
  item_name: string
  item_type: number
  unit_price: string
  quantity: number
  line_amount: string
  entitlement_snapshot: RcOrderItemEntitlement[]
}

export interface RcOrder {
  id: number
  order_no: string
  payer_type: number
  payer_id: number
  scene_type: number
  product_code: string
  product_name: string
  quantity: number
  original_amount: string
  discount_amount: string
  payable_amount: string
  paid_amount: string
  currency: string
  pay_channel: number
  pay_channel_label: string
  pay_status: number
  pay_status_name: string
  order_status: number
  order_status_name: string
  expired_at: string
  paid_at: string | null
  canceled_at: string | null
  items: RcOrderItem[]
  created_at: string
}

export interface RcPayment {
  payment_no: string
  order_id: number
  channel: number
  channel_name: string
  channel_label: string
  status: number
  status_name: string
  amount: string
  currency: string
  expired_at: string
  gateway_payload: RcGatewayPayload | null
}

export async function createRcOrder(
  payload: { biz_plan_id: number, quantity?: number },
  authorization: string,
) {
  const response = await postJson<ApiResponse<{ created: boolean, order: RcOrder }>>(
    '/rc/orders',
    payload,
    { Authorization: authorization },
  )
  return response.data
}

export async function getRcOrder(id: number, authorization: string) {
  const response = await getJson<ApiResponse<RcOrder>>(
    `/rc/orders/${id}`,
    undefined,
    { Authorization: authorization },
  )
  return response.data
}

export async function payRcOrder(
  id: number,
  payload: { pay_channel: RcPayChannel, pay_scene: RcPayScene },
  authorization: string,
) {
  const response = await postJson<ApiResponse<{ order: RcOrder, payment: RcPayment }>>(
    `/rc/orders/${id}/pay`,
    payload,
    { Authorization: authorization },
  )
  return response.data
}
