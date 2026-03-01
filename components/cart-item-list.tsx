"use client"

import Image from "next/image"
import { Plus, Minus, Trash2 } from "lucide-react"

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  image: string
}

interface CartItemListProps {
  items: CartItem[]
  updateQuantity: (id: string, q: number) => void
  removeItem: (id: string) => void
}

export function CartItemList({
  items,
  updateQuantity,
  removeItem,
}: CartItemListProps) {
  return (
    <div className="animate-in fade-in flex flex-col gap-4 duration-500">
      {items.map((item) => (
        <div
          key={item.id}
          className="border-border bg-card flex gap-4 rounded-xl border p-3 shadow-sm sm:p-4"
        >
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg sm:h-24 sm:w-24">
            <Image
              src={item.image}
              alt={item.name}
              fill
              className="object-cover"
              sizes="96px"
            />
          </div>

          <div className="flex flex-1 flex-col justify-between py-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-card-foreground text-sm font-semibold sm:text-base">
                {item.name}
              </h3>
              <button
                onClick={() => removeItem(item.id)}
                className="text-muted-foreground hover:text-destructive shrink-0 cursor-pointer p-1 transition-colors"
                aria-label={`Remover ${item.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-auto flex items-center justify-between">
              <span className="text-primary text-sm font-bold">
                R$ {(item.price * item.quantity).toFixed(2).replace(".", ",")}
              </span>

              <div className="bg-secondary/50 flex items-center gap-3 rounded-lg p-1">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="bg-secondary text-foreground hover:bg-border flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="text-foreground w-6 text-center text-sm font-bold">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="bg-secondary text-foreground hover:bg-border flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
