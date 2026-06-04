export type MenuItem = {
  id: string
  name: string
  description: string
  price: number
  image: string
  category: "combos" | "lanches" | "acompanhamentos" | "bebidas"
  includes?: string[]
}

export const menuItems: MenuItem[] = [
  // --- COMBOS ---
  {
    id: "combo-casal",
    name: "Combo Casal",
    description:
      "Para dividir e curtir junto! 2 X-Salada bem servidos, 2 Coca-Cola em lata geladinha e 2 porções de batata frita crocante.",
    price: 59.9,
    image: "/images/combo-casal.jpeg",
    category: "combos",
    includes: [
      "2x X-Salada Artesanal",
      "2x Batata Frita Média",
      "2x Coca-Cola Lata 350ml",
    ],
  },
  {
    id: "combo-promocional",
    name: "Combo Promocional",
    description:
      "X-Salada caprichado, batata frita crocante e Coca-Cola gelada. O clássico que você já conhece.",
    price: 34.99,
    image: "/images/combo-xsalada.jpeg",
    category: "combos",
    includes: [
      "1x X-Salada Artesanal",
      "1x Batata Frita Pequena",
      "1x Coca-Cola Lata 350ml",
    ],
  },
  {
    id: "combo-xburguer",
    name: "Combo X-Burguer",
    description:
      "X-Burguer suculento com Coca-Cola bem gelada. Ideal para uma refeição rápida e saborosa.",
    price: 19.9,
    image: "/images/xburguer-combos.jpeg",
    category: "combos",
    includes: ["1x X-Burguer Clássico", "1x Coca-Cola Lata 350ml"],
  },
  {
    id: "batata-cheddar",
    name: "Batata com Cheddar",
    description:
      "Batata crocante coberta com muito cheddar cremoso mais Coca-Cola gelada. Irresistível.",
    price: 19.9,
    image: "/images/batata-cheddar.jpeg",
    category: "combos",
    includes: ["1x Batata Frita com cheddar", "1x Coca-Cola Lata 350ml"],
  },

  // --- LANCHES AVULSOS ---
  {
    id: "xsalada-avulso",
    name: "X-Salada Artesanal",
    description:
      "Pão brioche macio, hamburguer bovino 150g, queijo prato, alface crocante, tomate fresquinho e maionese da casa.",
    price: 24.9,
    image: "/images/xsalada.jpeg",
    category: "lanches",
  },

  // --- ACOMPANHAMENTOS ---
  {
    id: "batata-palito",
    name: "Batata Frita Tradicional",
    description:
      "Porção de batatas palito crocantes e sequinhas. O acompanhamento perfeito.",
    price: 15.9,
    image: "/images/batata-frita.png",
    category: "acompanhamentos",
  },

  // --- BEBIDAS ---
  {
    id: "coca-cola-lata",
    name: "Coca-Cola Lata",
    description: "Lata de 350ml gelada.",
    price: 7.9,
    image: "/images/coca-cola.png",
    category: "bebidas",
  },
  {
    id: "guarana-lata",
    name: "Guaraná Antarctica Lata",
    description: "Lata de 350ml gelada.",
    price: 1.0,
    image: "/images/guarana.png",
    category: "bebidas",
  },
]

export const categories = [
  { id: "combos" as const, label: "Combos Promocionais" },
  { id: "lanches" as const, label: "Lanches Avulsos" },
  { id: "acompanhamentos" as const, label: "Acompanhamentos" },
  { id: "bebidas" as const, label: "Bebidas" },
]

export const STORE_INFO = {
  name: "Sabor e Arte",
  address:
    "R. Jose Silvano Filho, 113 - Jardim Lucia, Sao Paulo - SP, 05545-160",
  phone: "5511979643448",
  phoneFormatted: "(11) 97964-3448",
  whatsapp: "5511979643448",
  instagram: "saborearte_123_oficial",
  instagramUrl: "https://www.instagram.com/saborearte_123_oficial",
  domain: "https://saboreartes.com.br",
  deliveryMinFee: 5,
  hours: {
    weekdays: { open: 18, close: 23.5 }, // 18h às 23h30 (terça a quinta)
    saturday: { open: 18, close: 24 }, // 18h à meia-noite (sexta e sábado)
    sunday: { open: 18, close: 24 }, // 18h à meia-noite (domingo)
  },
}

// ============================================
// IMPORTA A FUNÇÃO DE HORÁRIO REAL
// ============================================
import { getRealStoreStatus } from "./store-utils"

// ============================================
// FUNÇÃO isStoreOpen()
// ============================================

export function isStoreOpen(): boolean {
  // ========================================
  // 🔥 MODO PRODUÇÃO (usar horário real)
  // Descomente ESTA linha e comente o return false/true abaixo
  // ========================================
  // const status = getRealStoreStatus()
  // return status.isOpen

  // ========================================
  // 🧪 MODO TESTE (forçar loja aberta)
  // Descomente ESTA linha e comente o bloco de produção acima
  // ========================================
  return true
}

// ============================================
// FUNÇÃO getStoreStatusMessage()
// ============================================

export function getStoreStatusMessage(): { open: boolean; message: string } {
  // ========================================
  // 🔥 MODO PRODUÇÃO (usar horário real)
  // Descomente ESTA linha e comente o return abaixo
  // ========================================
  const status = getRealStoreStatus()
  // return { open: status.isOpen, message: status.message }

  // ========================================
  // 🧪 MODO TESTE (forçar loja aberta)
  // Descomente ESTA linha e comente o bloco de produção acima
  // ========================================
  return { open: true, message: "Aberto agora" }

  // ========================================
  // 🧪 MODO TESTE (forçar loja fechada)
  // Descomente ESTA linha e comente o bloco de produção acima
  // ========================================
  // return { open: false, message: "Fechado agora" }
}
