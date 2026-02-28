export type MenuItem = {
  id: string
  name: string
  description: string
  price: number
  image: string
  category: "combos" | "lanches" | "acompanhamentos" | "bebidas"
  tags?: string[]
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
    image: "/images/combo-casal.png",
    category: "combos",
    tags: ["Mais Vendido", "Melhor Valor"],
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
    price: 34.9,
    image: "/images/combo-promo.jpg",
    category: "combos",
    tags: ["Promoção"],
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
    price: 27.9,
    image: "/images/xburguer-combo.jpg",
    category: "combos",
    includes: ["1x X-Burguer Clássico", "1x Coca-Cola Lata 350ml"],
  },

  // --- LANCHES AVULSOS ---
  {
    id: "xsalada-avulso",
    name: "X-Salada Artesanal",
    description:
      "Pão brioche macio, blend bovino 150g, queijo prato, alface crocante, tomate fresquinho e maionese da casa.",
    price: 24.9,
    image: "/images/xsalada.jpg",
    category: "lanches",
    tags: ["Popular"],
  },
  {
    id: "xburguer-avulso",
    name: "X-Burguer Clássico",
    description:
      "Pão brioche, blend bovino 150g e muito queijo derretido. O sabor essencial em cada mordida.",
    price: 21.9,
    image: "/images/xburguer.png",
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
  {
    id: "batata-cheddar",
    name: "Batata com Cheddar & Bacon",
    description:
      "Batata crocante coberta com muito cheddar cremoso e bacon em cubos. Irresistível.",
    price: 22.9,
    image: "/images/batata-cheddar.jpg",
    category: "acompanhamentos",
    tags: ["Favorito"],
  },

  // --- BEBIDAS ---
  {
    id: "coca-cola-lata",
    name: "Coca-Cola Lata",
    description: "Lata de 350ml gelada.",
    price: 7.9,
    image: "/images/coca-cola.jpg",
    category: "bebidas",
  },
  {
    id: "guarana-lata",
    name: "Guaraná Antarctica Lata",
    description: "Lata de 350ml gelada.",
    price: 6.9,
    image: "/images/guarana.jpg",
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
    weekdays: { open: 9, close: 18 },
    saturday: { open: 9, close: 23 },
    sunday: null, // Fechado
  },
}

export function isStoreOpen(): boolean {
  const now = new Date()
  const spTime = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  )
  const day = spTime.getDay() // 0: Dom, 1: Seg, ..., 6: Sab
  const hour = spTime.getHours()
  const minutes = spTime.getMinutes()
  const currentTime = hour + minutes / 60

  // Domingo: Fechado
  if (day === 0) return false

  // Sábado
  if (day === 6) {
    return (
      !!STORE_INFO.hours.saturday &&
      currentTime >= STORE_INFO.hours.saturday.open &&
      currentTime < STORE_INFO.hours.saturday.close
    )
  }

  // Dias de semana (Segunda a Sexta)
  return (
    currentTime >= STORE_INFO.hours.weekdays.open &&
    currentTime < STORE_INFO.hours.weekdays.close
  )
}

export function getStoreStatusMessage(): { open: boolean; message: string } {
  const open = isStoreOpen()
  if (open) {
    return { open: true, message: "Aberto agora" }
  }

  const now = new Date()
  const spTime = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  )
  const day = spTime.getDay()
  const hour = spTime.getHours()

  // Se for domingo ou sábado após o fechamento
  if (
    day === 0 ||
    (day === 6 && hour >= (STORE_INFO.hours.saturday?.close || 0))
  ) {
    return { open: false, message: "Fechado - Abrimos segunda às 09:00h" }
  }

  // Se for antes do horário de abrir no dia atual (semana ou sábado)
  const openingHour =
    day === 6 ? STORE_INFO.hours.saturday?.open : STORE_INFO.hours.weekdays.open
  if (hour < (openingHour || 0)) {
    return {
      open: false,
      message: `Fechado - Abrimos hoje às 0${openingHour}:00h`,
    }
  }

  // Se já fechou no dia de semana
  const tomorrow = day === 5 ? "amanhã (sábado)" : "amanhã"
  const tomorrowOpen =
    day === 5 ? STORE_INFO.hours.saturday?.open : STORE_INFO.hours.weekdays.open

  return {
    open: false,
    message: `Fechado - Abrimos ${tomorrow} às 0${tomorrowOpen}:00h`,
  }
}
