"use client"

import Image from "next/image"
import Link from "next/link"
import { ShoppingCart, Menu, X } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { getRealStoreStatus } from "@/lib/store-utils"
import { useState, useEffect } from "react"

export function Header() {
  const { totalItems } = useCart()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [storeStatus, setStoreStatus] = useState({
    open: false,
    message: "Verificando...",
  })

  useEffect(() => {
    const updateStatus = () => {
      const status = getRealStoreStatus()
      setStoreStatus({
        open: status.isOpen,
        message: status.message,
      })
    }

    updateStatus()
    const interval = setInterval(updateStatus, 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <header className="fixed top-0 right-0 left-0 z-50 border-b border-white/5 bg-[#120f0e]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
          {/* LADO ESQUERDO: LOGO E NOME */}
          <Link
            href="/"
            className="flex items-center gap-3 transition-transform hover:scale-105"
          >
            <Image
              src="/images/logo.jpg"
              alt="Sabor e Arte"
              width={48}
              height={48}
              className="border-primary/20 rounded-full border-2"
            />
            <div className="flex flex-col">
              <span className="text-xl leading-none font-black tracking-tighter text-white uppercase italic">
                Sabor <span className="text-primary not-italic">e</span> Arte
              </span>
              <div className="mt-1 hidden items-center gap-1.5 sm:flex">
                <div
                  className={`h-2 w-2 rounded-full ${
                    storeStatus.open
                      ? "animate-pulse bg-green-500"
                      : "bg-red-600"
                  }`}
                />
                <span
                  className={`text-[10px] font-bold tracking-widest uppercase ${
                    storeStatus.open ? "text-green-400" : "text-red-500"
                  }`}
                >
                  {storeStatus.message}
                </span>
              </div>
            </div>
          </Link>

          {/* LADO DIREITO: NAV E CARRINHO */}
          <div className="flex items-center gap-2 sm:gap-6">
            <nav className="hidden items-center gap-6 md:flex">
              {["Home", "Cardápio", "Meus Pedidos", "Sobre", "Contato"].map((item) => (
                <Link
                  key={item}
                  href={
                    item === "Home"
                      ? "/"
                      : item === "Meus Pedidos"
                      ? "/historico"
                      : `/${item
                          .toLowerCase()
                          .normalize("NFD")
                          .replace(/[\u0300-\u036f]/g, "")}`
                  }
                  className="hover:text-primary text-xs font-black tracking-widest text-white/70 uppercase transition-colors"
                >
                  {item}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2 border-l border-white/10 pl-2 sm:gap-3 sm:pl-6">
              <Link
                href="/carrinho"
                className="bg-primary shadow-primary/20 relative flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-lg transition-all hover:scale-110 active:scale-95"
              >
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && (
                  <span className="ring-primary absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#120f0e] text-[11px] font-black text-white ring-2">
                    {totalItems}
                  </span>
                )}
              </Link>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-white md:hidden"
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* MENU MOBILE */}
        {mobileMenuOpen && (
          <nav className="animate-in slide-in-from-right fixed inset-0 top-18 z-40 h-screen bg-[#120f0e] px-8 py-10 duration-300 md:hidden">
            <div className="flex flex-col gap-8">
              {["Home", "Cardápio", "Meus Pedidos", "Sobre", "Contato"].map((item) => (
                <Link
                  key={item}
                  href={
                    item === "Home"
                      ? "/"
                      : item === "Meus Pedidos"
                      ? "/historico"
                      : `/${item
                          .toLowerCase()
                          .normalize("NFD")
                          .replace(/[\u0300-\u036f]/g, "")}`
                  }
                  onClick={() => setMobileMenuOpen(false)}
                  className="group flex items-center justify-between text-3xl font-black text-white uppercase italic"
                >
                  {item}{" "}
                  <span className="bg-primary h-2 w-2 rounded-full opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              ))}

              <div className="mt-auto border-t border-white/5 pt-10 pb-24">
                <p className="mb-4 text-[10px] tracking-[0.3em] text-white/30 uppercase">
                  Status da Loja
                </p>
                <div
                  className={`inline-flex items-center gap-3 rounded-full border px-4 py-2 ${
                    storeStatus.open
                      ? "border-green-500/20 bg-green-500/5 text-green-400"
                      : "border-red-500/20 bg-red-500/5 text-red-500"
                  }`}
                >
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${
                      storeStatus.open
                        ? "animate-pulse bg-green-500"
                        : "bg-red-600"
                    }`}
                  />
                  <span className="text-sm font-black uppercase italic">
                    {storeStatus.message}
                  </span>
                </div>
              </div>
            </div>
          </nav>
        )}
      </header>
    </>
  )
}