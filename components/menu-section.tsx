"use client"

import { useState } from "react"
import { menuItems, categories } from "@/lib/menu-data"
import { MenuCard } from "./menu-card"

export function MenuSection() {
  const [activeCategory, setActiveCategory] = useState<string>("combos")

  const filteredItems = menuItems.filter(
    (item) => item.category === activeCategory
  )

  return (
    <section id="cardapio" className="scroll-mt-20 px-4 py-16 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 text-center sm:mb-12">
          <span className="text-primary mb-2 inline-block text-sm font-semibold tracking-widest uppercase">
            Cardapio
          </span>
          <h2 className="text-foreground mb-4 text-2xl font-bold text-balance sm:text-3xl md:text-4xl">
            Nossos lanches
          </h2>
          <p className="text-muted-foreground mx-auto max-w-lg text-sm text-pretty sm:text-base">
            Feitos com ingredientes frescos e muito carinho. Escolha o seu e
            peca agora!
          </p>
        </div>

        <div className="scrollbar-none mb-8 flex justify-start gap-2 overflow-x-auto pb-2 sm:mb-10 sm:justify-center">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-medium transition-all sm:px-5 ${
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-border"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <MenuCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  )
}
