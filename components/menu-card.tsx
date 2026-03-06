"use client"

import Image from "next/image"
import { Plus, Check, Info } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import type { MenuItem } from "@/lib/menu-data"

export function MenuCard({ item }: { item: MenuItem }) {
  const { addItem } = useCart()

  return (
    <article
      className="group border-border hover:border-primary/20 relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      onClick={() => addItem(item)} // O card todo agora adiciona ao clicar, facilitando no mobile
    >
      {/* Imagem do Produto */}
      <div className="relative aspect-4/3 overflow-hidden bg-zinc-100">
        <Image
          src={item.image}
          alt={item.name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <h3 className="group-hover:text-primary text-lg leading-tight font-bold text-zinc-900 transition-colors">
              {item.name}
            </h3>
            {/* Preço inserido aqui, abaixo do nome, de forma limpa */}
            <span className="text-primary text-xl font-black">
              R$ {item.price.toFixed(2).replace(".", ",")}
            </span>
          </div>
          
          {item.category === "combos" && (
            <div title="Melhor custo-benefício" className="text-orange-500">
              <Info className="h-4 w-4" />
            </div>
          )}
        </div>

        <p className="mb-4 flex-1 text-sm leading-relaxed text-zinc-500">
          {item.description}
        </p>

        {/* Inclusos */}
        {item.includes && item.includes.length > 0 && (
          <div className="mb-4 space-y-1.5 rounded-lg border border-zinc-100 bg-zinc-50 p-3">
            <p className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">
              Incluso no pedido:
            </p>
            <ul className="grid grid-cols-1 gap-1">
              {item.includes.map((inc) => (
                <li
                  key={inc}
                  className="flex items-center gap-2 text-xs font-medium text-zinc-700"
                >
                  <Check className="h-3.5 w-3.5 shrink-0 text-green-600" />
                  {inc}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Botão Adicionar - cursor-pointer garantido pela classe button ou explícito */}
        <button
          className="group/btn hover:bg-primary relative flex h-12 w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl bg-zinc-900 text-sm font-bold text-white shadow-md transition-all active:scale-95"
          aria-label={`Adicionar ${item.name} ao carrinho`}
        >
          <Plus className="h-5 w-5 transition-transform group-hover/btn:rotate-90" />
          <span>Adicionar ao pedido</span>
        </button>
      </div>
    </article>
  )
}