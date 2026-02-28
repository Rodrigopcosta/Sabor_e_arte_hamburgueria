// @/lib/store-utils.ts

export type StoreStatus = {
  isOpen: boolean
  message: string
  nextOpening?: string
}

export function getRealStoreStatus(): StoreStatus {
  const agora = new Date()
  const diaSemana = agora.getDay() // 0: Dom, 1: Seg, ..., 6: Sáb
  const hora = agora.getHours()
  const minutos = agora.getMinutes()
  const horarioAtual = hora + minutos / 60

  // Segunda-feira (1) sempre fechado
  if (diaSemana === 1) {
    return { isOpen: false, message: "Fechado hoje" }
  }

  // Sexta (5), Sábado (6) e Domingo (0) fecham 00h. Outros 23:30h.
  const fechamento =
    diaSemana === 0 || diaSemana === 5 || diaSemana === 6 ? 24 : 23.5

  if (horarioAtual >= 18 && horarioAtual < fechamento) {
    return { isOpen: true, message: "Aberto agora" }
  }

  return { isOpen: false, message: "Fechado agora" }
}
