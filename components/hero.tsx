"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowDown, MessageCircle } from "lucide-react"
import { STORE_INFO } from "@/lib/menu-data"

export function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0908]">
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

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-8 text-center">
        {/* Badge de Status Flutuante */}
        <div className="mx-auto mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-md sm:mb-6 sm:px-4 sm:py-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-500 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500"></span>
          </span>
          <span className="text-[8px] font-bold tracking-[0.15em] text-orange-200 uppercase sm:text-[10px] sm:tracking-[0.2em]">
            O Melhor da Região da Raposo
          </span>
        </div>

        {/* Logo */}
        <Image
          src="/images/logo.jpg"
          alt="Logo Sabor e Arte"
          width={100}
          height={100}
          className="border-primary animate-in zoom-in mx-auto mb-6 rounded-full border-4 shadow-[0_0_50px_rgba(234,88,12,0.3)] duration-700 sm:mb-8 sm:h-32 sm:w-32 md:h-40 md:w-40"
        />

        {/* Título */}
        <h1 className="mb-4 text-4xl leading-[0.9] font-black tracking-tighter text-balance text-white italic sm:mb-6 sm:text-5xl md:text-7xl lg:text-9xl">
          SABOR <span className="text-primary not-italic">&</span> ARTE
        </h1>

        {/* Descrição */}
        <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed font-medium text-pretty text-white/80 drop-shadow-md sm:mb-10 sm:text-lg md:text-xl">
          A verdadeira experiência do{" "}
          <span className="text-primary font-bold">hambúrguer artesanal</span>{" "}
          com aquele toque caseiro que você ama.
        </p>

        {/* Botões */}
        <div className="flex flex-col items-center gap-3 px-4 sm:flex-row sm:justify-center sm:gap-4">
          <Link
            href="/cardapio"
            className="group bg-primary shadow-primary/20 relative inline-flex h-12 w-full items-center justify-center overflow-hidden rounded-full px-6 text-base font-black tracking-widest text-white uppercase shadow-xl transition-all hover:scale-105 active:scale-95 sm:h-14 sm:w-auto sm:px-10 sm:text-lg"
          >
            <span className="relative z-10">Ver Cardápio</span>
            <div className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
          </Link>

          <a
            href={`https://wa.me/${STORE_INFO.whatsapp}?text=${encodeURIComponent("Olá! Vi o site e gostaria de fazer um pedido.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 text-base font-bold text-white transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(37,211,102,0.4)] active:scale-95 sm:h-14 sm:w-auto sm:gap-3 sm:px-10 sm:text-lg"
          >
            <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
            Pedir no WhatsApp
          </a>
        </div>

        {/* Features (Entrega Rápida e Ingredientes Frescos) */}
        <div className="mt-8 flex flex-col items-center justify-center gap-2 sm:mt-10 sm:flex-row sm:gap-6 md:mt-12">
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-white/40 uppercase sm:text-xs">
            <span className="bg-primary h-1.5 w-1.5 rounded-full" />
            Entrega Rápida
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-white/40 uppercase sm:text-xs">
            <span className="bg-primary h-1.5 w-1.5 rounded-full" />
            Ingredientes Frescos
          </div>
        </div>
      </div>

      {/* Indicador de rolagem - agora com margin bottom para não encostar */}
      <Link
        href="/cardapio"
        className="hover:text-primary absolute bottom-4 left-1/2 -translate-x-1/2 animate-bounce text-white/30 transition-colors sm:bottom-8"
        aria-label="Ir para o cardápio"
      >
        <ArrowDown className="h-6 w-6 sm:h-8 sm:w-8" />
      </Link>
    </section>
  )
}
