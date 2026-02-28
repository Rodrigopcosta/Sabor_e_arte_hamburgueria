"use client"

import { STORE_INFO } from "@/lib/menu-data"
import Image from "next/image"
import Link from "next/link"
import { Flame, Clock, Truck, Heart } from "lucide-react"

export default function SobrePage() {
  return (
    <main className="bg-background min-h-screen pt-24 sm:pt-28">
      {/* Hero Sobre */}
      <section className="px-4 pb-16 sm:pb-20 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <Image
            src="/images/logo.jpg"
            alt="Logo Sabor e Arte"
            width={100}
            height={100}
            className="border-primary/20 mx-auto mb-6 rounded-full border-2"
          />
          <span className="text-primary mb-2 inline-block text-sm font-semibold tracking-widest uppercase">
            Sobre nós
          </span>
          <h1 className="text-foreground mb-6 text-3xl font-bold text-balance sm:text-4xl md:text-5xl">
            Nossa História e Paixão
          </h1>
          <p className="text-muted-foreground mx-auto max-w-2xl text-base leading-relaxed text-pretty sm:text-lg">
            A <strong className="text-foreground">{STORE_INFO.name}</strong>{" "}
            nasceu de uma paixão familiar pela culinária e pelo desejo de levar
            o sabor caseiro e a qualidade dos hambúrgueres artesanais para a
            mesa de todos. Desde o primeiro dia, nosso compromisso é com a{" "}
            <strong className="text-foreground">excelência</strong> dos
            ingredientes e o{" "}
            <strong className="text-foreground">carinho</strong> no preparo de
            cada item.
          </p>
        </div>
      </section>

      {/* Diferenciais */}
      <section className="bg-zinc-50/5 px-4 py-16 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            <div className="border-border bg-card flex flex-col items-center gap-4 rounded-xl border p-6 text-center sm:p-8">
              <div className="bg-primary/10 flex h-14 w-14 items-center justify-center rounded-xl">
                <Flame className="text-primary h-7 w-7" />
              </div>
              <h3 className="text-card-foreground text-base font-bold sm:text-lg">
                Qualidade Real
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Receitas tradicionais aprimoradas ao longo dos anos. Não
                utilizamos conservantes ou aditivos químicos.
              </p>
            </div>

            <div className="border-border bg-card flex flex-col items-center gap-4 rounded-xl border p-6 text-center sm:p-8">
              <div className="bg-primary/10 flex h-14 w-14 items-center justify-center rounded-xl">
                <Clock className="text-primary h-7 w-7" />
              </div>
              <h3 className="text-card-foreground text-base font-bold sm:text-lg">
                Feito na Hora
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                O segredo está na combinação de uma massa leve com um recheio
                farto. Tudo preparado no momento.
              </p>
            </div>

            <div className="border-border bg-card flex flex-col items-center gap-4 rounded-xl border p-6 text-center sm:p-8">
              <div className="bg-primary/10 flex h-14 w-14 items-center justify-center rounded-xl">
                <Heart className="text-primary h-7 w-7" />
              </div>
              <h3 className="text-card-foreground text-base font-bold sm:text-lg">
                Dedicação
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Nossa missão é proporcionar momentos de alegria e sabor em cada
                pedido realizado.
              </p>
            </div>

            <div className="border-border bg-card flex flex-col items-center gap-4 rounded-xl border p-6 text-center sm:p-8">
              <div className="bg-primary/10 flex h-14 w-14 items-center justify-center rounded-xl">
                <Truck className="text-primary h-7 w-7" />
              </div>
              <h3 className="text-card-foreground text-base font-bold sm:text-lg">
                Entrega Rápida
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Entregas rápidas e seguras na região da Raposo Tavares. Seu
                pedido chega quentinho!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 sm:py-20 lg:px-8">
        <div className="border-primary/20 bg-primary/5 mx-auto max-w-3xl rounded-2xl border p-8 text-center sm:p-12">
          <h2 className="text-foreground mb-4 text-2xl font-bold text-balance sm:text-3xl">
            Venha nos conhecer!
          </h2>
          <p className="text-muted-foreground mb-6 text-pretty">
            Estamos localizados na região da Raposo, prontos para atender o seu
            pedido.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
            <Link
              href="/cardapio"
              className="bg-primary text-primary-foreground inline-flex h-12 w-full items-center justify-center rounded-lg px-8 text-base font-semibold transition-transform hover:scale-105 active:scale-95 sm:w-auto"
            >
              Ver Cardápio
            </Link>
            <a
              href={`https://wa.me/${STORE_INFO.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-8 text-base font-semibold text-white transition-transform hover:scale-105 active:scale-95 sm:w-auto"
            >
              Falar no WhatsApp
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
