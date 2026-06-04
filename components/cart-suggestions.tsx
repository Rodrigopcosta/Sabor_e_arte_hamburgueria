"use client"

import Image from "next/image"
import { Plus } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { menuItems, type MenuItem } from "@/lib/menu-data"

interface CartSuggestionsProps {
  currentItems: Array<{ id: string; name: string; category: string }>
}

export function CartSuggestions({ currentItems }: CartSuggestionsProps) {
  const { addItem } = useCart()

  const hasBurger = currentItems.some(
    (item) => item.category === "combos" || item.category === "lanches"
  )
  const hasDrink = currentItems.some((item) => item.category === "bebidas")
  const hasFries = currentItems.some(
    (item) => item.category === "acompanhamentos"
  )

  let suggestedItems: MenuItem[] = []

  if (hasBurger && !hasDrink && !hasFries) {
    suggestedItems = [
      ...menuItems.filter((item) => item.category === "bebidas").slice(0, 2),
      ...menuItems
        .filter((item) => item.category === "acompanhamentos")
        .slice(0, 1),
    ]
  } else if (hasDrink && !hasBurger && !hasFries) {
    suggestedItems = [
      ...menuItems
        .filter(
          (item) => item.category === "lanches" || item.category === "combos"
        )
        .slice(0, 2),
      ...menuItems
        .filter((item) => item.category === "acompanhamentos")
        .slice(0, 1),
    ]
  } else if (hasFries && !hasBurger && !hasDrink) {
    suggestedItems = [
      ...menuItems
        .filter(
          (item) => item.category === "lanches" || item.category === "combos"
        )
        .slice(0, 2),
      ...menuItems.filter((item) => item.category === "bebidas").slice(0, 1),
    ]
  } else if (hasBurger && !hasDrink && hasFries) {
    suggestedItems = menuItems
      .filter((item) => item.category === "bebidas")
      .slice(0, 3)
  } else if (hasBurger && hasDrink && !hasFries) {
    suggestedItems = menuItems
      .filter((item) => item.category === "acompanhamentos")
      .slice(0, 3)
  }

  if (suggestedItems.length === 0) {
    return null
  }

  return (
    <div className="border-border bg-card rounded-xl border p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-foreground text-base font-bold">🍔 Peça também</h3>
        <span className="text-muted-foreground text-xs">
          Sugestões para acompanhar
        </span>
      </div>

      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
        {suggestedItems.map((item) => (
          <div
            key={item.id}
            className="bg-secondary flex w-32 shrink-0 snap-start flex-col overflow-hidden rounded-lg"
          >
            <div className="relative h-24 w-full">
              <Image
                src={item.image}
                alt={item.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="p-2">
              <h4 className="line-clamp-2 min-h-8 text-xs leading-tight font-bold">
                {item.name}
              </h4>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-primary text-xs font-bold">
                  R$ {item.price.toFixed(2).replace(".", ",")}
                </span>
                <button
                  onClick={() => addItem(item)}
                  className="bg-primary text-primary-foreground rounded-full p-1.5 transition-transform hover:scale-105 active:scale-95"
                  aria-label={`Adicionar ${item.name}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
