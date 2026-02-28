"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { STORE_INFO } from "@/lib/menu-data"
import { getRealStoreStatus } from "@/lib/store-utils" // Importando a utilidade única
import {
  Instagram,
  MessageCircle,
  MapPin,
  Clock,
  Phone,
  Circle,
} from "lucide-react"

export function Footer() {
  const [storeStatus, setStoreStatus] = useState({
    isOpen: false,
    message: "Verificando...",
  })

  useEffect(() => {
    const updateStatus = () => {
      setStoreStatus(getRealStoreStatus())
    }

    updateStatus()
    const interval = setInterval(updateStatus, 30000) // Sincronizado com o header (30s)
    return () => clearInterval(interval)
  }, [])

  return (
    <footer className="border-t border-white/5 bg-[#0a0908] pt-20 pb-10">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-4 lg:gap-0">
          {/* Coluna 1: Branding */}
          <div className="flex flex-col gap-6 lg:border-r lg:border-white/5 lg:pr-12">
            <div className="flex items-center gap-3">
              <Image
                src="/images/logo.jpg"
                alt="Sabor e Arte"
                width={56}
                height={56}
                className="rotate-3 rounded-2xl border border-white/10"
              />
              <div className="flex flex-col">
                <span className="text-xl leading-none font-black tracking-tighter text-white uppercase italic">
                  Sabor <span className="text-primary NOT-italic">&</span> Arte
                </span>
                <span className="mt-1 text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                  Burger Artesanal
                </span>
              </div>
            </div>
            <p className="text-sm leading-relaxed font-medium text-zinc-400">
              Transformamos ingredientes simples em arte gastronômica. O ponto
              perfeito da carne e o pão sempre fresquinho.
            </p>
          </div>

          {/* Coluna 2: Status Dinâmico e Horários */}
          <div className="flex flex-col gap-6 lg:border-r lg:border-white/5 lg:px-12">
            <h4 className="text-primary text-xs font-black tracking-[0.2em] uppercase">
              Funcionamento
            </h4>
            <div className="flex flex-col gap-5">
              {/* Badge de Status usando a Utilidade */}
              <div
                className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 ${storeStatus.isOpen ? "border-green-500/20 bg-green-500/5 text-green-500" : "border-red-500/20 bg-red-500/5 text-red-500"}`}
              >
                <Circle
                  className={`h-2 w-2 fill-current ${storeStatus.isOpen ? "animate-pulse" : ""}`}
                />
                <span className="text-[10px] font-black tracking-widest uppercase">
                  {storeStatus.message}
                </span>
              </div>

              <div className="space-y-2.5 text-sm font-bold text-zinc-400">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-zinc-500 uppercase">
                    Ter à Qui
                  </span>
                  <span className="text-zinc-200">18:00 — 23:30</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-zinc-500 uppercase">
                    Sex à Dom
                  </span>
                  <span className="text-zinc-200">18:00 — 00:00</span>
                </div>
                <div className="flex items-center justify-between text-red-500/40 italic">
                  <span className="text-[11px] font-medium uppercase">
                    Segunda
                  </span>
                  <span className="text-[10px] tracking-widest">FECHADO</span>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna 3: Redes Sociais */}
          <div className="flex flex-col gap-6 lg:border-r lg:border-white/5 lg:px-12">
            <h4 className="text-primary text-xs font-black tracking-[0.2em] uppercase">
              Social
            </h4>
            <div className="flex flex-col gap-3">
              <a
                href={STORE_INFO.instagramUrl}
                target="_blank"
                className="group flex items-center gap-4 text-sm text-zinc-400 transition-all hover:text-white"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-white/5 transition-all group-hover:border-transparent group-hover:bg-linear-to-tr group-hover:from-[#f9ce34] group-hover:via-[#ee2a7b] group-hover:to-[#6228d7]">
                  <Instagram className="h-5 w-5" />
                </div>
                <span className="font-bold tracking-tight">Instagram</span>
              </a>
              <a
                href={`https://wa.me/${STORE_INFO.whatsapp}`}
                target="_blank"
                className="group flex items-center gap-4 text-sm text-zinc-400 transition-all hover:text-white"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-white/5 transition-all group-hover:border-transparent group-hover:bg-[#25D366]">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <span className="font-bold tracking-tight">WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Coluna 4: Localização */}
          <div className="flex flex-col gap-6 lg:pl-12">
            <h4 className="text-primary text-xs font-black tracking-[0.2em] uppercase">
              Onde estamos
            </h4>
            <div className="flex flex-col gap-5">
              <div className="flex items-start gap-3 text-sm leading-relaxed font-medium text-zinc-400 italic">
                <MapPin className="text-primary mt-0.5 h-5 w-5 shrink-0" />
                <span>{STORE_INFO.address}</span>
              </div>
              <div className="flex w-fit items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-3 text-sm font-black text-white">
                <Phone className="text-primary h-4 w-4" />
                <span>{STORE_INFO.phoneFormatted}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé Inferior */}
        <div className="mt-20 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 md:flex-row">
          <p className="text-[10px] font-bold tracking-[0.4em] text-zinc-600 uppercase">
            © {new Date().getFullYear()} {STORE_INFO.name}
          </p>
          <div className="flex gap-6">
            <Link
              href="/cardapio"
              className="hover:text-primary text-[10px] font-black tracking-widest text-zinc-500 uppercase transition-colors"
            >
              Cardápio
            </Link>
            <Link
              href="/contato"
              className="hover:text-primary text-[10px] font-black tracking-widest text-zinc-500 uppercase transition-colors"
            >
              Contato
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
