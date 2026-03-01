"use client"

import { Header } from "@/components/header"
import { MapSection } from "@/components/map-section"
import { STORE_INFO } from "@/lib/menu-data"
import { MapPin, Phone, Clock, Instagram } from "lucide-react"

export default function ContatoPage() {
  return (
    <>
      <Header />
      <main className="pt-24 sm:pt-28">
        <section className="px-4 pb-8 sm:pb-12 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <span className="text-primary mb-2 inline-block text-sm font-semibold tracking-widest uppercase">
              Contato
            </span>
            <h1 className="text-foreground mb-4 text-3xl font-bold text-balance sm:text-4xl md:text-5xl">
              Fale conosco
            </h1>
            <p className="text-muted-foreground mx-auto max-w-xl text-pretty">
              Estamos prontos para atender voce! Faca seu pedido pelo WhatsApp
              ou nos visite.
            </p>
          </div>
        </section>

        <section className="px-4 py-8 sm:py-12 lg:px-8">
          <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            <div className="border-border bg-card flex flex-col items-center gap-3 rounded-xl border p-6 text-center">
              <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-xl">
                <MapPin className="text-primary h-6 w-6" />
              </div>
              <h3 className="text-card-foreground text-sm font-bold">
                Endereco
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {STORE_INFO.address}
              </p>
            </div>

            <div className="border-border bg-card flex flex-col items-center gap-3 rounded-xl border p-6 text-center">
              <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-xl">
                <Phone className="text-primary h-6 w-6" />
              </div>
              <h3 className="text-card-foreground text-sm font-bold">
                WhatsApp
              </h3>
              <a
                href={`https://wa.me/${STORE_INFO.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-sm hover:underline"
              >
                {STORE_INFO.phoneFormatted}
              </a>
            </div>

            <div className="border-border bg-card flex flex-col items-center gap-3 rounded-xl border p-6 text-center">
              <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-xl">
                <Clock className="text-primary h-6 w-6" />
              </div>
              <h3 className="text-card-foreground text-sm font-bold">
                Horario
              </h3>
              <div className="text-muted-foreground text-sm">
                <p>Seg a Sex: 09:00 - 18:00</p>
                <p>Sab: 09:00 - 13:00</p>
                <p>Dom e Feriados: Fechado</p>
              </div>
            </div>

            <div className="border-border bg-card flex flex-col items-center gap-3 rounded-xl border p-6 text-center">
              <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-xl">
                <Instagram className="text-primary h-6 w-6" />
              </div>
              <h3 className="text-card-foreground text-sm font-bold">
                Instagram
              </h3>
              <a
                href={STORE_INFO.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-sm hover:underline"
              >
                @{STORE_INFO.instagram}
              </a>
            </div>
          </div>
        </section>

        {/* Botao WhatsApp grande */}
        <section className="px-4 py-8 sm:py-12 lg:px-8">
          <div className="mx-auto max-w-md">
            <a
              href={`https://wa.me/${STORE_INFO.whatsapp}?text=${encodeURIComponent("Ola! Gostaria de fazer um pedido.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#25D366] text-lg font-semibold text-white transition-transform hover:scale-[1.02] active:scale-95"
            >
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              Pedir pelo WhatsApp
            </a>
          </div>
        </section>

        <MapSection />
      </main>
    </>
  )
}
