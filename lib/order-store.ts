// lib/order-store.ts
// Usa globalThis para garantir instância única entre rotas no Next.js (Turbopack/dev).

export interface OrderData {
  paymentId: string
  customerName: string
  customerPhone: string
  deliveryAddress: string
  itemsSerialized: string
  deliveryFee: string
  total: string
  quotationId: string
  senderStopId: string
  recipientStopId: string
  lalamoveOrderId?: string
  lalamoveShareLink?: string
  orderStatus: "paid" | "preparing" | "delivering" | "delivered" | "cancelled"
}

declare global {
  var __orderStore: Map<string, OrderData> | undefined
}

// Reutiliza a instância entre hot reloads
if (!globalThis.__orderStore) {
  globalThis.__orderStore = new Map<string, OrderData>()
}

export const orderStore = globalThis.__orderStore
