import type { Metadata, Viewport } from "next"
import { Inter, Playfair_Display } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { CartProvider } from "@/lib/cart-context"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "Sabor e Arte | Hamburgueria Artesanal na Raposo Tavares",
    template: "%s | Sabor e Arte",
  },
  description:
    "A melhor hamburgueria artesanal na região da Raposo Tavares. Lanches feitos com carinho, ingredientes frescos e entrega rápida. Peça já pelo WhatsApp!",
  keywords: [
    "hamburgueria artesanal",
    "Raposo Tavares",
    "delivery de lanches",
    "hambúrguer artesanal",
    "Sabor e Arte",
  ],
  metadataBase: new URL("https://saboreartes.com.br"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Sabor e Arte | Hamburgueria Artesanal na Raposo Tavares",
    description:
      "Bateu aquela fome? Peça o melhor artesanal da região! Entrega rápida e ingredientes selecionados.",
    url: "https://saboreartes.com.br",
    siteName: "Sabor e Arte",
    locale: "pt_BR",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  themeColor: "#7a1f1f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: "Sabor e Arte",
    image: "https://saboreartes.com.br/logo.jpg",
    description: "Hamburgueria artesanal na região da Raposo Tavares.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Região da Raposo Tavares",
      addressLocality: "São Paulo",
      addressRegion: "SP",
      addressCountry: "BR",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: -23.589,
      longitude: -46.748,
    },
    url: "https://saboreartes.com.br",
    telephone: "+5511979643448",
    servesCuisine: "Hamburgueria",
    priceRange: "$$",
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        opens: "18:00",
        closes: "23:30",
      },
    ],
  }

  return (
    <html lang="pt-BR" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-background flex min-h-screen flex-col font-sans antialiased">
        <CartProvider>
          <Header />
          <div className="flex-1">{children}</div>
          <Footer />
        </CartProvider>
        <Analytics />
      </body>
    </html>
  )
}
