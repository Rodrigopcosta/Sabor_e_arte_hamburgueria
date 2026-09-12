import { NextRequest, NextResponse } from "next/server"
import { generateToken } from "@/lib/auth"

// A senha fica apenas no .env, nunca no código
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

export async function POST(request: NextRequest) {
  console.log("=== REQUISIÇÃO DE LOGIN ===")
  console.log("🔍 ADMIN_PASSWORD configurada?", !!ADMIN_PASSWORD)

  try {
    const body = await request.json()
    const { password } = body

    console.log("Body recebido:", body)

    if (!password) {
      return NextResponse.json(
        { error: "Senha é obrigatória" },
        { status: 400 }
      )
    }

    if (!ADMIN_PASSWORD) {
      console.error("❌ ADMIN_PASSWORD não configurada no .env")
      return NextResponse.json(
        { error: "Erro de configuração do servidor" },
        { status: 500 }
      )
    }

    // Comparação simples (sem hash)
    const isValid = password === ADMIN_PASSWORD

    console.log("Senha válida?", isValid)

    if (!isValid) {
      return NextResponse.json({ error: "Senha incorreta" }, { status: 401 })
    }

    // Gerar token JWT compatível com os endpoints admin
    const token = generateToken({ userId: "admin", role: "admin" })

    const response = NextResponse.json({
      success: true,
      message: "Login realizado com sucesso",
    })

    response.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    })

    return response
  } catch (error) {
    console.error("❌ Erro no login:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
