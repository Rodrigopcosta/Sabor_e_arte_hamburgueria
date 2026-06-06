// lib/order-store.ts
import { neon } from "@neondatabase/serverless"

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
  orderStatus:
    | "paid"
    | "pending"
    | "preparing"
    | "delivering"
    | "delivered"
    | "cancelled"
  createdAt?: string
}

let sql: any = null
let useDatabase = false

if (typeof process !== "undefined" && process.env.DATABASE_URL) {
  try {
    sql = neon(process.env.DATABASE_URL)
    useDatabase = true
    console.log("✅ [order-store] Usando Neon database")
  } catch (error) {
    console.warn("⚠️ [order-store] Neon não disponível, usando memória")
    useDatabase = false
  }
} else {
  console.log("📝 [order-store] DATABASE_URL não configurada, usando memória")
}

declare global {
  var __orderStore: Map<string, OrderData> | undefined
}

if (!globalThis.__orderStore) {
  globalThis.__orderStore = new Map<string, OrderData>()
}

const memoryStore = globalThis.__orderStore

export async function getOrder(paymentId: string): Promise<OrderData | null> {
  if (useDatabase && sql) {
    try {
      const result = await sql`
        SELECT 
          payment_id as "paymentId",
          customer_name as "customerName",
          customer_phone as "customerPhone",
          delivery_address as "deliveryAddress",
          items_serialized as "itemsSerialized",
          delivery_fee as "deliveryFee",
          total,
          quotation_id as "quotationId",
          sender_stop_id as "senderStopId",
          recipient_stop_id as "recipientStopId",
          lalamove_order_id as "lalamoveOrderId",
          share_link as "lalamoveShareLink",
          order_status as "orderStatus",
          created_at as "createdAt"
        FROM orders 
        WHERE payment_id = ${paymentId}
      `
      if (result && result.length > 0) {
        return result[0] as OrderData
      }
    } catch (error) {
      console.error("❌ [getOrder] Erro no Neon:", error)
    }
  }
  return memoryStore.get(paymentId) || null
}

export async function setOrder(
  paymentId: string,
  orderData: OrderData
): Promise<void> {
  const dataWithCreatedAt: OrderData = {
    ...orderData,
    createdAt: orderData.createdAt || new Date().toISOString(),
  }

  memoryStore.set(paymentId, dataWithCreatedAt)

  if (useDatabase && sql) {
    try {
      await sql`
        INSERT INTO orders (
          payment_id,
          customer_name,
          customer_phone,
          delivery_address,
          items_serialized,
          delivery_fee,
          total,
          quotation_id,
          sender_stop_id,
          recipient_stop_id,
          lalamove_order_id,
          share_link,
          order_status,
          created_at
        ) VALUES (
          ${paymentId},
          ${dataWithCreatedAt.customerName},
          ${dataWithCreatedAt.customerPhone},
          ${dataWithCreatedAt.deliveryAddress},
          ${dataWithCreatedAt.itemsSerialized},
          ${dataWithCreatedAt.deliveryFee},
          ${dataWithCreatedAt.total},
          ${dataWithCreatedAt.quotationId},
          ${dataWithCreatedAt.senderStopId},
          ${dataWithCreatedAt.recipientStopId},
          ${dataWithCreatedAt.lalamoveOrderId || null},
          ${dataWithCreatedAt.lalamoveShareLink || null},
          ${dataWithCreatedAt.orderStatus},
          NOW() AT TIME ZONE 'America/Sao_Paulo'
        )
        ON CONFLICT (payment_id) DO UPDATE SET
          customer_name = EXCLUDED.customer_name,
          customer_phone = EXCLUDED.customer_phone,
          delivery_address = EXCLUDED.delivery_address,
          items_serialized = EXCLUDED.items_serialized,
          delivery_fee = EXCLUDED.delivery_fee,
          total = EXCLUDED.total,
          quotation_id = EXCLUDED.quotation_id,
          sender_stop_id = EXCLUDED.sender_stop_id,
          recipient_stop_id = EXCLUDED.recipient_stop_id,
          lalamove_order_id = EXCLUDED.lalamove_order_id,
          share_link = EXCLUDED.share_link,
          order_status = EXCLUDED.order_status,
          updated_at = NOW() AT TIME ZONE 'America/Sao_Paulo'
      `
      console.log(`✅ [setOrder] Pedido ${paymentId} salvo no Neon`)
    } catch (error) {
      console.error(`❌ [setOrder] Erro no Neon para ${paymentId}:`, error)
    }
  }
}

export async function updateOrderStatus(
  paymentId: string,
  status: OrderData["orderStatus"]
): Promise<void> {
  const order = memoryStore.get(paymentId)
  if (order) {
    memoryStore.set(paymentId, { ...order, orderStatus: status })
  }

  if (useDatabase && sql) {
    try {
      await sql`
        UPDATE orders 
        SET order_status = ${status}, updated_at = NOW() AT TIME ZONE 'America/Sao_Paulo'
        WHERE payment_id = ${paymentId}
      `
      console.log(`✅ [updateOrderStatus] Pedido ${paymentId} -> ${status}`)
    } catch (error) {
      console.error(`❌ [updateOrderStatus] Erro:`, error)
    }
  }
}

export async function updateLalamoveInfo(
  paymentId: string,
  lalamoveOrderId: string,
  shareLink: string
): Promise<void> {
  const order = memoryStore.get(paymentId)
  if (order) {
    memoryStore.set(paymentId, {
      ...order,
      lalamoveOrderId,
      lalamoveShareLink: shareLink,
      orderStatus: "delivering",
    })
  }

  if (useDatabase && sql) {
    try {
      await sql`
        UPDATE orders 
        SET 
          lalamove_order_id = ${lalamoveOrderId},
          share_link = ${shareLink},
          order_status = 'delivering',
          updated_at = NOW() AT TIME ZONE 'America/Sao_Paulo'
        WHERE payment_id = ${paymentId}
      `
      console.log(
        `✅ [updateLalamoveInfo] Entrega ${lalamoveOrderId} vinculada ao pedido ${paymentId}`
      )
    } catch (error) {
      console.error(`❌ [updateLalamoveInfo] Erro:`, error)
    }
  }
}

export const orderStore = {
  get: (paymentId: string) => memoryStore.get(paymentId),
  set: (paymentId: string, data: OrderData) => {
    const dataWithCreatedAt: OrderData = {
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
    }
    memoryStore.set(paymentId, dataWithCreatedAt)
    setOrder(paymentId, dataWithCreatedAt).catch(console.error)
  },
  delete: (paymentId: string) => memoryStore.delete(paymentId),
  entries: () => memoryStore.entries(),
  size: memoryStore.size,
}
