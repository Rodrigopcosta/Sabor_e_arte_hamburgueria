// lib/mercadopago.ts
const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || ""

interface RefundResponse {
  success: boolean
  data?: any
  error?: string
}

export async function refundPayment(
  paymentId: string
): Promise<RefundResponse> {
  if (!MP_ACCESS_TOKEN) {
    console.error("❌ [Refund] MP_ACCESS_TOKEN não configurado")
    return { success: false, error: "Token não configurado" }
  }

  // Mostra os primeiros caracteres do token para debug (não mostre completo!)
  console.log(`🔑 [Refund] Token usado: ${MP_ACCESS_TOKEN.substring(0, 10)}...`)

  try {
    // 🔥 PASSO 1: Primeiro, verifica se o pagamento existe e está aprovado
    console.log(`🔍 [Refund] Verificando pagamento ${paymentId}...`)

    const checkUrl = `https://api.mercadopago.com/v1/payments/${paymentId}`
    const checkResponse = await fetch(checkUrl, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    })

    const paymentData = await checkResponse.json()

    if (!checkResponse.ok) {
      console.error(
        `❌ [Refund] Pagamento ${paymentId} não encontrado ou sem acesso:`,
        {
          status: checkResponse.status,
          error: paymentData,
        }
      )
      return {
        success: false,
        error: `Pagamento não encontrado (HTTP ${checkResponse.status}): ${paymentData.message || "Sem acesso"}`,
      }
    }

    console.log(`✅ [Refund] Pagamento encontrado:`, {
      id: paymentData.id,
      status: paymentData.status,
      status_detail: paymentData.status_detail,
      payment_method_id: paymentData.payment_method_id,
      transaction_amount: paymentData.transaction_amount,
    })

    // Verifica se o pagamento está aprovado
    if (paymentData.status !== "approved") {
      console.log(
        `⚠️ [Refund] Pagamento ${paymentId} não está aprovado (status: ${paymentData.status})`
      )
      return {
        success: false,
        error: `Pagamento não está aprovado para reembolso (status: ${paymentData.status})`,
      }
    }

    // 🔥 PASSO 2: Verifica se já foi reembolsado
    if (paymentData.refunds && paymentData.refunds.length > 0) {
      console.log(
        `⚠️ [Refund] Pagamento ${paymentId} já possui reembolso:`,
        paymentData.refunds
      )
      return {
        success: false,
        error: "Pagamento já foi reembolsado anteriormente",
      }
    }

    // 🔥 PASSO 3: Prossegue com o reembolso
    const refundUrl = `https://api.mercadopago.com/v1/payments/${paymentId}/refunds`

    console.log(
      `💰 [Refund] Solicitando reembolso do pagamento ${paymentId}...`
    )

    const refundResponse = await fetch(refundUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `${paymentId}-${Date.now()}`,
      },
      body: JSON.stringify({}),
    })

    const refundData = await refundResponse.json()

    if (refundResponse.ok || refundResponse.status === 201) {
      console.log(
        `✅ [Refund] Reembolso do pagamento ${paymentId} realizado com sucesso:`,
        refundData
      )
      return { success: true, data: refundData }
    } else {
      console.error(`❌ [Refund] Falha no reembolso ${paymentId}:`, {
        status: refundResponse.status,
        error: refundData,
      })
      return {
        success: false,
        error: refundData.message || "Erro desconhecido",
      }
    }
  } catch (error) {
    console.error(
      `💥 [Refund] Erro ao processar reembolso ${paymentId}:`,
      error
    )
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro de conexão",
    }
  }
}
