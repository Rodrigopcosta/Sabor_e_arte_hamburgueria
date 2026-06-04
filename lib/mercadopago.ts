// lib/mercadopago.ts
const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || ""

interface RefundResponse {
  success: boolean
  data?: any
  error?: string
}

export async function refundPayment(paymentId: string): Promise<RefundResponse> {
  if (!MP_ACCESS_TOKEN) {
    console.error("❌ [Refund] MP_ACCESS_TOKEN não configurado")
    return { success: false, error: "Token não configurado" }
  }

  try {
    const url = `https://api.mercadopago.com/v1/payments/${paymentId}/refunds`
    
    console.log(`💰 [Refund] Solicitando reembolso do pagamento ${paymentId}`)
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `${paymentId}-${Date.now()}`
      },
      body: JSON.stringify({})
    })

    const data = await response.json()
    
    if (response.ok || response.status === 201) {
      console.log(`✅ [Refund] Reembolso do pagamento ${paymentId} realizado com sucesso`)
      return { success: true, data }
    } else {
      console.error(`❌ [Refund] Falha no reembolso ${paymentId}:`, data)
      return { success: false, error: data.message || "Erro desconhecido" }
    }
  } catch (error) {
    console.error(`💥 [Refund] Erro ao processar reembolso ${paymentId}:`, error)
    return { success: false, error: error instanceof Error ? error.message : "Erro de conexão" }
  }
}