"use client"

import { useEffect, useRef } from "react"
import { menuItems, categories, STORE_INFO } from "@/lib/menu-data"
import { MenuCard } from "@/components/menu-card"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"

export default function CardapioPage() {
  const combosRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Verifica se veio com hash #combos (vindo do carrinho)
    if (window.location.hash === "#combos" && combosRef.current) {
      setTimeout(() => {
        combosRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        })
        // Remove o hash da URL após o scroll para não causar problemas
        window.history.replaceState(null, "", window.location.pathname)
      }, 100)
    }
  }, [])

  return (
    <main className="bg-background min-h-screen pt-24 sm:pt-28">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Botão de Voltar */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-muted-foreground hover:text-primary inline-flex items-center gap-2 text-sm font-bold transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar para Home
          </Link>
        </div>

        {/* Cabeçalho da Página */}
        <div className="mb-16">
          <span className="text-primary mb-2 inline-block text-sm font-semibold tracking-widest uppercase">
            Cardápio Completo
          </span>
          <h1 className="text-foreground text-4xl font-black tracking-tight uppercase italic sm:text-6xl">
            Sabor <span className="text-primary">e</span> Arte
          </h1>
          <p className="text-muted-foreground mt-4 max-w-2xl text-lg">
            Escolha entre nossos combos econômicos ou monte seu lanche avulso.
            Tudo preparado de forma artesanal com ingredientes selecionados.
          </p>
        </div>

        {/* Listagem por Categorias */}
        {categories.map((category, index) => {
          const items = menuItems.filter(
            (item) => item.category === category.id
          )
          if (items.length === 0) return null

          // Adiciona ref na primeira categoria (combos)
          const isCombos =
            category.id === "combos" || category.label === "Combos"

          return (
            <section
              key={category.id}
              ref={isCombos ? combosRef : null}
              id={isCombos ? "combos" : undefined}
              className="mb-20 scroll-mt-28 last:mb-0"
            >
              <div className="mb-10 flex items-center gap-6">
                <h2 className="text-foreground text-2xl font-black tracking-tighter whitespace-nowrap uppercase italic">
                  {category.label}
                </h2>
                <div className="bg-border/50 h-px flex-1" />
              </div>

              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <MenuCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </main>
  )
}
