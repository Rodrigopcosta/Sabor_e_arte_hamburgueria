"use client"

import { Hero } from "@/components/hero"
import { MenuSection } from "@/components/menu-section"
import { MapSection } from "@/components/map-section"
import { WhatsAppFab } from "@/components/whatsapp-fab"

export default function Home() {
  return (
    <>
      <main>
        <Hero />
        <MenuSection />
        <MapSection />
      </main>
      <WhatsAppFab />
    </>
  )
}
