import { NextRequest, NextResponse } from "next/server"

const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || ""
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ""
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || ""

async function sendTelegram(message: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return
  try {
    await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "Markdown",
        }),
      }
    )
  } catch (error) {
    console.error("[Telegram] Erro:", error)
  }
}

async function createLalamoveOrder(
  quotationId: string,
  recipientName: string,
  recipientPhone: string
) {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "https://saboreartes.com.br"
    const response = await fetch(`${baseUrl}/api/lalamove`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "order",
        quotationId,
        recipientName,
        recipientPhone,
      }),
    })
    return await response.json()
  } catch (error) {
    console.error("[Lalamove] Erro ao criar pedido:", error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const { formData, metadata } = await request.json()

    // Processa o pagamento via API do MP
    const paymentResponse = await fetch(
      "https://api.mercadopago.com/v1/payments",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
          "X-Idempotency-Key": `${metadata.customerPhone}-${Date.now()}`,
        },
        body: JSON.stringify({
          ...formData,
          metadata: {
            quotation_id: metadata.quotationId,
            customer_name: metadata.customerName,
            customer_phone: metadata.customerPhone,
            delivery_address: metadata.deliveryAddress,
          },
        }),
      }
    )

    const payment = await paymentResponse.json()
    console.log("MP Payment response:", JSON.stringify(payment, null, 2)) // TEMP

    if (!paymentResponse.ok) {
      console.error("MP Payment error:", payment)
      return NextResponse.json(
        { error: "Erro ao processar pagamento" },
        { status: 400 }
      )
    }

    const {
      id,
      status,
      status_detail,
      transaction_amount,
      payment_type_id,
      point_of_interaction,
    } = payment

    // Pagamento aprovado — notifica e cria entrega
    if (status === "approved") {
      const paymentMethod =
        payment_type_id === "credit_card" ? "💳 Cartão de crédito" : "⚡ Pix"

      await sendTelegram(
        `🎉 *Novo pedido pago!*\n\n` +
          `👤 *Cliente:* ${metadata.customerName}\n` +
          `📱 *Telefone:* ${metadata.customerPhone}\n` +
          `📍 *Endereço:* ${metadata.deliveryAddress}\n` +
          `💰 *Total:* R$ ${transaction_amount?.toFixed(2).replace(".", ",")}\n` +
          `${paymentMethod}\n\n` +
          `🛵 Criando pedido de entrega...`
      )

      if (metadata.quotationId) {
        const lalamoveOrder = await createLalamoveOrder(
          metadata.quotationId,
          metadata.customerName,
          metadata.customerPhone
        )

        if (lalamoveOrder?.orderId) {
          await sendTelegram(
            `✅ *Entrega confirmada na Lalamove!*\n\n` +
              `🆔 Pedido: \`${lalamoveOrder.orderId}\`\n` +
              `📍 [Rastrear entrega](${lalamoveOrder.shareLink})`
          )
        } else {
          await sendTelegram(
            `⚠️ *Atenção!* Pagamento aprovado mas erro ao criar entrega.\n` +
              `Crie manualmente no painel da Lalamove.`
          )
        }
      }
    }

    // Pix pendente — avisa o dono para aguardar
    if (status === "pending" && payment_type_id === "bank_transfer") {
      const pixQrCode = point_of_interaction?.transaction_data?.qr_code
      const pixQrCodeBase64 =
        point_of_interaction?.transaction_data?.qr_code_base64

      await sendTelegram(
        `⏳ *Aguardando pagamento Pix*\n\n` +
          `👤 *Cliente:* ${metadata.customerName}\n` +
          `📱 *Telefone:* ${metadata.customerPhone}\n` +
          `📍 *Endereço:* ${metadata.deliveryAddress}\n` +
          `💰 *Total:* R$ ${transaction_amount?.toFixed(2).replace(".", ",")}\n\n` +
          `Aguardando confirmação do Pix...`
      )

      return NextResponse.json({
        id,
        status,
        status_detail,
        pixQrCode,
        pixQrCodeBase64,
      })
    }

    return NextResponse.json({ id, status, status_detail })
  } catch (error) {
    console.error("Process payment error:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
