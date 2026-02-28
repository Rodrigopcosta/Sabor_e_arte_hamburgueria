"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react"
import type { MenuItem } from "./menu-data"
import { isStoreOpen } from "./menu-data"

export type CartItem = MenuItem & { quantity: number }

type CartContextType = {
  items: CartItem[]
  addItem: (item: MenuItem) => boolean
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  totalItems: number
  totalPrice: number
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  closedMessage: string | null
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [closedMessage, setClosedMessage] = useState<string | null>(null)

  // 1. Carregar itens do localStorage ao iniciar
  useEffect(() => {
    const savedCart = localStorage.getItem("@SaborEArte:cart")
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart))
      } catch (error) {
        console.error("Erro ao carregar carrinho:", error)
      }
    }
  }, [])

  // 2. Salvar itens no localStorage sempre que o carrinho mudar
  useEffect(() => {
    localStorage.setItem("@SaborEArte:cart", JSON.stringify(items))
  }, [items])

  const addItem = useCallback((item: MenuItem) => {
    if (!isStoreOpen()) {
      setClosedMessage(
        "No momento estamos fechados. Confira nosso horario de funcionamento!"
      )
      setTimeout(() => setClosedMessage(null), 4000)
      return false
    }
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id)
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { ...item, quantity: 1 }]
    })
    setIsOpen(true)
    return true
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.id !== id))
      return
    }
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity } : i)))
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    localStorage.removeItem("@SaborEArte:cart")
  }, [])

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        isOpen,
        setIsOpen,
        closedMessage,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error("useCart deve ser usado dentro de um CartProvider")
  }
  return context
}
