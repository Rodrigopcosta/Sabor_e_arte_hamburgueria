"use client"

import Image from "next/image"
import Link from "next/link" // Importado para navegação interna do Next.js
import { ArrowDown, MessageCircle } from "lucide-react"
import { STORE_INFO } from "@/lib/menu-data"

export function Hero() {
  return (
    <section className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[#0a0908]">
      {/* Container da Imagem de Fundo */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/hero-burger.jpg"
          alt="Hamburguer artesanal Sabor e Arte"
          fill
          className="scale-105 object-cover opacity-60"
          priority
          sizes="100vw"
        />
        {/* Overlay Escuro e Gradiente de Fogo */}
        <div className="absolute inset-0 bg-linear-to-t from-[#0a0908] via-[#0a0908]/40 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-r from-[#0a0908] via-transparent to-[#0a0908]/20" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 text-center">
        {/* Badge de Status Flutuante */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-500 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500"></span>
          </span>
          <span className="text-[10px] font-bold tracking-[0.2em] text-orange-200 uppercase">
            O Melhor da Região da Raposo
          </span>
        </div>

        <Image
          src="/images/logo.jpg"
          alt="Logo Sabor e Arte"
          width={140}
          height={140}
          className="border-primary animate-in zoom-in mx-auto mb-8 rounded-full border-4 shadow-[0_0_50px_rgba(234,88,12,0.3)] duration-700 sm:h-40 sm:w-40"
        />

        <h1 className="mb-6 text-5xl leading-[0.9] font-black tracking-tighter text-balance text-white italic sm:text-7xl md:text-8xl lg:text-9xl">
          SABOR <span className="text-primary NOT-italic">&</span> ARTE
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed font-medium text-pretty text-white/80 drop-shadow-md sm:text-xl md:text-2xl">
          A verdadeira experiência do{" "}
          <span className="text-primary font-bold">hambúrguer artesanal</span>{" "}
          com aquele toque caseiro que você ama.
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          {/* Link atualizado para a página de cardápio separada */}
          <Link
            href="/cardapio"
            className="group bg-primary shadow-primary/20 relative inline-flex h-14 w-full items-center justify-center overflow-hidden rounded-full px-10 text-lg font-black tracking-widest text-white uppercase shadow-xl transition-all hover:scale-105 active:scale-95 sm:w-auto"
          >
            <span className="relative z-10">Ver Cardápio</span>
            <div className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
          </Link>

          <a
            href={`https://wa.me/${STORE_INFO.whatsapp}?text=${encodeURIComponent("Olá! Vi o site e gostaria de fazer um pedido.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-full bg-[#25D366] px-10 text-lg font-bold text-white transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(37,211,102,0.4)] active:scale-95 sm:w-auto"
          >
            <MessageCircle className="h-6 w-6" />
            Pedir no WhatsApp
          </a>
        </div>

        <div className="mt-8 flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-6">
          <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-white/40 uppercase">
            <span className="bg-primary h-1 w-1 rounded-full" />
            Entrega Rápida
          </div>
          <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-white/40 uppercase">
            <span className="bg-primary h-1 w-1 rounded-full" />
            Ingredientes Frescos
          </div>
        </div>
      </div>

      {/* Indicador de rolagem atualizado para a página de cardápio */}
      <Link
        href="/cardapio"
        className="hover:text-primary absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-white/30 transition-colors"
        aria-label="Ir para o cardápio"
      >
        <ArrowDown className="h-8 w-8" />
      </Link>
    </section>
  )
}
