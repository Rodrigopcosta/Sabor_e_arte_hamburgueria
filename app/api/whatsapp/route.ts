import { NextRequest, NextResponse } from "next/server"

const WHATSAPP_PHONE = process.env.WHATSAPP_PHONE || "5511979643448"
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN || ""
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID || ""

export async function POST(request: NextRequest) {
  try {
    const { items, total, customerName, customerPhone, address } =
      await request.json()

    let message = `*Novo Pedido - Sabor e Arte*\n\n`
    message += `Cliente: ${customerName || "Nao informado"}\n`
    message += `Telefone: ${customerPhone || "Nao informado"}\n`
    message += `Endereco: ${address || "Retirada no local"}\n\n`
    message += `*Itens do Pedido:*\n`

    for (const item of items) {
      message += `${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2).replace(".", ",")}\n`
    }

    message += `\n*Total: R$ ${total.toFixed(2).replace(".", ",")}*`
    message += `\n\nSolicitar entrega via Lalamove.`

    if (WHATSAPP_API_TOKEN && WHATSAPP_PHONE_ID) {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: WHATSAPP_PHONE,
            type: "text",
            text: { body: message },
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        return NextResponse.json(
          { error: result.error?.message || "Erro ao enviar mensagem" },
          { status: response.status }
        )
      }

      return NextResponse.json({
        success: true,
        messageId: result.messages?.[0]?.id,
      })
    }

    // Fallback: return wa.me link
    const waLink = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`

    return NextResponse.json({
      success: true,
      waLink,
      fallback: true,
    })
  } catch (error) {
    console.error("WhatsApp API error:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
