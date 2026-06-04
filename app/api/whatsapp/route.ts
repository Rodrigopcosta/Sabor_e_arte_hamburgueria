import { NextRequest, NextResponse } from "next/server"
import { normalizePhone, waLink } from "@/lib/whatsapp-deeplink"

const WHATSAPP_PHONE = process.env.WHATSAPP_PHONE || "5511979643448"
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN || ""
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID || ""

const TEMPLATES = {
  confirmado: "pedido_confirmado",
  preparo: "pedido_preparo",
  entrega: "pedido_entrega",
  entregue: "pedido_entregue",
} as const

type TemplateType = keyof typeof TEMPLATES

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { phone, message, template, parameters } = body

    const targetPhone = normalizePhone(phone || WHATSAPP_PHONE)

    if (!targetPhone) {
      return NextResponse.json(
        { error: "phone é obrigatório" },
        { status: 400 }
      )
    }

    if (
      WHATSAPP_API_TOKEN &&
      WHATSAPP_PHONE_ID &&
      template &&
      TEMPLATES[template as TemplateType]
    ) {
      const templatePayload: any = {
        messaging_product: "whatsapp",
        to: targetPhone,
        type: "template",
        template: {
          name: TEMPLATES[template as TemplateType],
          language: { code: "pt_BR" },
        },
      }

      if (parameters && parameters.length > 0) {
        templatePayload.template.components = [
          {
            type: "body",
            parameters: parameters.map((p: string) => ({
              type: "text",
              text: p,
            })),
          },
        ]
      }

      const response = await fetch(
        `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(templatePayload),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        const fallbackLink = waLink(
          targetPhone,
          message || "Atualização do seu pedido"
        )
        return NextResponse.json(
          {
            success: false,
            error: result.error?.message,
            fallback: true,
            waLink: fallbackLink,
          },
          { status: 200 }
        )
      }

      return NextResponse.json({
        success: true,
        messageId: result.messages?.[0]?.id,
      })
    }

    const finalMessage = message || "Atualização do seu pedido"
    const fallbackLink = waLink(targetPhone, finalMessage)

    return NextResponse.json({
      success: false,
      fallback: true,
      waLink: fallbackLink,
    })
  } catch (error) {
    console.error("WhatsApp API error:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
