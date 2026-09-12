import jwt from 'jsonwebtoken'
import * as bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET || 'teste123'

export interface JWTPayload {
  userId: string
  role: string
  exp?: number
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    return decoded
  } catch (error) {
    return null
  }
}

export async function validateAdminPassword(password: string): Promise<boolean> {
  const adminHash = process.env.ADMIN_PASSWORD_HASH
  
  console.log('=== VALIDAÇÃO ===')
  console.log('Hash:', adminHash)
  console.log('Senha:', password)
  
  if (!adminHash) {
    return false
  }
  
  // Se for texto puro (não começa com $2)
  if (!adminHash.startsWith('$2')) {
    const result = password === adminHash
    console.log('Texto puro:', result)
    return result
  }
  
  try {
    // Tenta comparar com bcrypt
    const result = await bcrypt.compare(password, adminHash)
    console.log('Bcrypt compare:', result)
    return result
  } catch (error) {
    console.error('Erro no bcrypt.compare:', error)
    return false
  }
}

export async function verifyAdminAuth() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  
  if (!token) {
    return false
  }
  
  const payload = verifyToken(token)
  return payload !== null && payload.role === 'admin'
}