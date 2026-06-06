"use client"

import { useEffect, useState, useRef, useCallback } from "react"

type OrderStatus =
  | "paid"
  | "preparing"
  | "delivering"
  | "delivered"
  | "cancelled"

interface Order {
  payment_id: string
  customer_name: string
  customer_phone: string
  items_serialized: string
  total: number
  order_status: OrderStatus
  created_at: string
  lalamoveShareLink?: string
}

export default function AdminPedidosPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    revenue: 0,
    ticket: 0,
    lastDate: "",
  })
  const [password, setPassword] = useState("")
  const [authenticated, setAuthenticated] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [, setTick] = useState(0)
  const [cancelModal, setCancelModal] = useState<{
    show: boolean
    paymentId: string | null
  }>({ show: false, paymentId: null })
  const [logoutModal, setLogoutModal] = useState(false)
  const [showRefreshFeedback, setShowRefreshFeedback] = useState(false)

  const audioContextRef = useRef<AudioContext | null>(null)
  const audioPlayedRef = useRef<Set<string>>(new Set())
  const isFetchingRef = useRef(false)

  // Atualiza os tempos a cada 30s
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(interval)
  }, [])

  // Salvar preferência do som no localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("@SaborEArte:soundEnabled")
      if (saved !== null) {
        setSoundEnabled(saved === "true")
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("@SaborEArte:soundEnabled", soundEnabled.toString())
    }
  }, [soundEnabled])

  const createAndActivateAudio = useCallback(() => {
    try {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      const ctx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )()
      audioContextRef.current = ctx
      ctx.resume()
      console.log("✅ AudioContext criado, state:", ctx.state)
    } catch (e) {
      console.error("Erro ao criar AudioContext:", e)
    }
  }, [])

  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return

    const ctx = audioContextRef.current
    if (!ctx) return

    const doPlay = () => {
      try {
        const playBip = (freq: number, startTime: number) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.type = "sine"
          osc.frequency.value = freq
          gain.gain.setValueAtTime(0.3, startTime)
          gain.gain.exponentialRampToValueAtTime(0.00001, startTime + 0.25)
          osc.start(startTime)
          osc.stop(startTime + 0.25)
        }
        playBip(880, ctx.currentTime)
        playBip(1100, ctx.currentTime + 0.3)
        console.log("🔔 Som tocado!")
      } catch (e) {
        console.error("Erro ao tocar som:", e)
      }
    }

    if (ctx.state === "suspended") {
      ctx.resume().then(doPlay)
    } else {
      doPlay()
    }
  }, [soundEnabled])

  const fetchOrders = useCallback(
    async (showFeedback = false) => {
      // Evitar múltiplas requisições simultâneas
      if (isFetchingRef.current) return

      try {
        isFetchingRef.current = true

        const res = await fetch("/api/admin/orders-memory")
        const data = await res.json()

        if (data.orders) {
          const paidIds = (data.orders as Order[])
            .filter((o) => o.order_status === "paid")
            .map((o) => o.payment_id)

          for (const id of paidIds) {
            if (!audioPlayedRef.current.has(id)) {
              audioPlayedRef.current.add(id)
              console.log("🆕 Novo pedido detectado:", id)
              playNotificationSound()
            }
          }

          setOrders(data.orders)

          const today = new Date().toDateString()
          const todayOrders = (data.orders as Order[]).filter(
            (o) =>
              new Date(o.created_at).toDateString() === today &&
              o.order_status !== "cancelled"
          )
          const total = todayOrders.length
          const revenue = todayOrders.reduce((sum, o) => sum + o.total, 0)
          const ticket = total > 0 ? revenue / total : 0

          setStats((prev) => {
            if (prev.lastDate && prev.lastDate !== today) {
              audioPlayedRef.current.clear()
              return { total: 0, revenue: 0, ticket: 0, lastDate: today }
            }
            return { total, revenue, ticket, lastDate: today }
          })

          // Mostrar feedback de atualização apenas se foi clique manual
          if (showFeedback) {
            setShowRefreshFeedback(true)
            setTimeout(() => setShowRefreshFeedback(false), 2000)
          }
        }
      } catch (err) {
        console.error("Erro:", err)
      } finally {
        setLoading(false)
        isFetchingRef.current = false
      }
    },
    [playNotificationSound]
  )

  // Carregamento inicial
  useEffect(() => {
    const isAuth = localStorage.getItem("@SaborEArte:adminAuth")
    if (isAuth === "true") {
      setAuthenticated(true)
      fetchOrders(false)
      createAndActivateAudio()
    }
  }, [createAndActivateAudio, fetchOrders])

  // Intervalo automático - SEM dependências problemáticas
  useEffect(() => {
    if (!authenticated) return

    const interval = setInterval(() => {
      fetchOrders(false)
    }, 5000)

    return () => clearInterval(interval)
  }, [authenticated, fetchOrders])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === "saborearte123") {
      createAndActivateAudio()
      localStorage.setItem("@SaborEArte:adminAuth", "true")
      setAuthenticated(true)
      fetchOrders(false)
    } else {
      alert("Senha incorreta")
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("@SaborEArte:adminAuth")
    setAuthenticated(false)
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    setLogoutModal(false)
  }

  const updateStatus = async (paymentId: string, newStatus: OrderStatus) => {
    try {
      const res = await fetch("/api/admin/update-status-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, status: newStatus }),
      })
      if (res.ok) fetchOrders(false)
    } catch (err) {
      console.error("Erro ao atualizar:", err)
    }
  }

  const handleCancelClick = (paymentId: string) =>
    setCancelModal({ show: true, paymentId })

  const confirmCancel = () => {
    if (cancelModal.paymentId) {
      updateStatus(cancelModal.paymentId, "cancelled")
      setCancelModal({ show: false, paymentId: null })
    }
  }

  const handleManualRefresh = () => {
    fetchOrders(true)
  }

  const getWaitTime = (createdAt: string) => {
    if (!createdAt) return 0
    const diffMs = new Date().getTime() - new Date(createdAt).getTime()
    return Math.max(0, Math.floor(diffMs / 1000 / 60))
  }

  const getTimeColor = (minutes: number) => {
    if (minutes >= 30) return "text-red-600 font-bold"
    if (minutes >= 20) return "text-orange-600 font-bold"
    if (minutes >= 10) return "text-yellow-600 font-bold"
    return "text-green-600"
  }

  const getBorderColor = (minutes: number) => {
    if (minutes >= 30) return "border-l-4 border-l-red-500"
    if (minutes >= 20) return "border-l-4 border-l-orange-500"
    if (minutes >= 10) return "border-l-4 border-l-yellow-500"
    return ""
  }

  const formatItems = (itemsSerialized: string) => {
    if (!itemsSerialized) return []
    return itemsSerialized.split(";").map((item) => {
      const [qty, name, price] = item.split(":")
      return { qty: parseInt(qty), name, price: parseFloat(price) }
    })
  }

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm rounded-lg bg-white p-6 shadow-md"
        >
          <h1 className="mb-4 text-xl font-bold">Acesso Restrito</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Digite a senha"
            className="mb-4 w-full rounded-lg border px-3 py-2"
            autoFocus
          />
          <button
            type="submit"
            className="bg-primary hover:bg-primary/90 w-full cursor-pointer rounded-lg py-2 font-bold text-white transition"
          >
            Entrar
          </button>
        </form>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">Carregando pedidos...</div>
      </div>
    )
  }

  const sortByOldest = (a: Order, b: Order) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()

  const novos = orders
    .filter((o) => o.order_status === "paid")
    .sort(sortByOldest)
  const preparando = orders
    .filter((o) => o.order_status === "preparing")
    .sort(sortByOldest)
  const aCaminho = orders
    .filter((o) => o.order_status === "delivering")
    .sort(sortByOldest)
  const prontos = orders
    .filter((o) => o.order_status === "delivered")
    .sort(sortByOldest)
  const cancelados = orders
    .filter((o) => o.order_status === "cancelled")
    .sort(sortByOldest)

  return (
    <div className="min-h-screen bg-gray-100 p-4 pt-20">
      <div className="mx-auto max-w-7xl">
        {/* Toast de feedback de atualização */}
        {showRefreshFeedback && (
          <div className="animate-in slide-in-from-top-2 fade-in fixed top-24 right-4 z-50 duration-300">
            <div className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white shadow-lg">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-sm font-medium">Pedidos atualizados!</span>
            </div>
          </div>
        )}

        {/* Modal de Cancelamento de Pedido */}
        {cancelModal.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="mx-4 w-full max-w-sm rounded-lg bg-white p-6">
              <h2 className="mb-4 text-xl font-bold">Confirmar Cancelamento</h2>
              <p className="mb-6 text-gray-600">
                Tem certeza que deseja cancelar este pedido? Esta ação não pode
                ser desfeita.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={confirmCancel}
                  className="flex-1 cursor-pointer rounded-lg bg-red-600 py-2 font-bold text-white transition hover:bg-red-700"
                >
                  Sim, Cancelar
                </button>
                <button
                  onClick={() =>
                    setCancelModal({ show: false, paymentId: null })
                  }
                  className="flex-1 cursor-pointer rounded-lg bg-gray-300 py-2 font-bold text-gray-800 transition hover:bg-gray-400"
                >
                  Não, Voltar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Logout */}
        {logoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="mx-4 w-full max-w-sm rounded-lg bg-white p-6">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-red-100 p-3">
                  <svg
                    className="h-8 w-8 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                </div>
              </div>
              <h2 className="mb-2 text-center text-xl font-bold">
                Sair do Painel
              </h2>
              <p className="mb-6 text-center text-gray-600">
                Tem certeza que deseja sair? Você precisará digitar a senha
                novamente para acessar.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleLogout}
                  className="flex-1 cursor-pointer rounded-lg bg-red-600 py-2 font-bold text-white transition hover:bg-red-700"
                >
                  Sair
                </button>
                <button
                  onClick={() => setLogoutModal(false)}
                  className="flex-1 cursor-pointer rounded-lg bg-gray-300 py-2 font-bold text-gray-800 transition hover:bg-gray-400"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Botões alinhados à direita */}
        <div className="mb-6 flex justify-end">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="cursor-pointer rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-700"
            >
              {soundEnabled ? "🔊 Som Ligado" : "🔇 Som Desligado"}
            </button>
            <button
              onClick={handleManualRefresh}
              className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              Atualizar
            </button>
            <button
              onClick={() => setLogoutModal(true)}
              className="cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700"
            >
              Sair
            </button>
          </div>
        </div>

        {/* Cards de estatísticas */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-white p-4 text-center shadow-sm">
            <div className="text-primary text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-gray-500">pedidos hoje</div>
          </div>

          <div className="rounded-lg bg-white p-4 text-center shadow-sm">
            <div className="text-2xl font-bold wrap-break-word text-green-600">
              R$ {stats.revenue.toFixed(2).replace(".", ",")}
            </div>
            <div className="text-xs text-gray-500">faturamento</div>
          </div>

          <div className="rounded-lg bg-white p-4 text-center shadow-sm">
            <div className="text-2xl font-bold wrap-break-word text-blue-600">
              R$ {stats.ticket.toFixed(2).replace(".", ",")}
            </div>
            <div className="text-xs text-gray-500">ticket médio</div>
          </div>
        </div>

        {/* NOVOS */}
        <div className="mb-6 rounded-lg bg-yellow-50 shadow-sm">
          <div className="rounded-t-lg bg-yellow-500 p-3 text-lg font-bold text-white">
            🟡 PEDIDOS NOVOS ({novos.length})
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {novos.map((order) => {
                const waitTime = getWaitTime(order.created_at)
                const items = formatItems(order.items_serialized)
                return (
                  <div
                    key={order.payment_id}
                    className={`flex h-full flex-col rounded-lg border bg-white p-4 shadow-sm ${getBorderColor(waitTime)}`}
                  >
                    <div className="flex-1">
                      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href={`/confirmacao?paymentId=${order.payment_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary text-base font-bold transition hover:underline sm:text-xl"
                          >
                            #{order.payment_id.slice(-6)}
                          </a>
                          <span
                            className={`text-xs font-bold ${getTimeColor(waitTime)}`}
                          >
                            {waitTime} min
                          </span>
                        </div>
                        <div className="text-primary text-base font-bold sm:text-xl">
                          R$ {order.total.toFixed(2).replace(".", ",")}
                        </div>
                      </div>
                      <div className="mb-2 text-sm font-semibold wrap-break-word text-gray-800 sm:text-base">
                        {order.customer_name}
                      </div>
                      <div className="mb-3 space-y-1 text-gray-700">
                        {items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex flex-wrap justify-between gap-2 text-xs sm:text-sm"
                          >
                            <span className="flex items-center gap-1">
                              <span className="text-primary font-bold">
                                {item.qty}x
                              </span>
                              <span className="wrap-break-word">
                                {item.name}
                              </span>
                            </span>
                            <span className="whitespace-nowrap text-gray-500">
                              R${" "}
                              {(item.price * item.qty)
                                .toFixed(2)
                                .replace(".", ",")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-4 flex flex-col gap-2 border-t border-gray-200 pt-3 sm:flex-row">
                      <button
                        onClick={() =>
                          updateStatus(order.payment_id, "preparing")
                        }
                        className="flex-1 cursor-pointer rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700 sm:text-sm"
                      >
                        PREPARAR
                      </button>
                      <button
                        onClick={() => handleCancelClick(order.payment_id)}
                        className="flex-1 cursor-pointer rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-700 sm:text-sm"
                      >
                        CANCELAR
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            {novos.length === 0 && (
              <div className="py-8 text-center text-gray-400">
                Nenhum pedido novo
              </div>
            )}
          </div>
        </div>

        {/* PREPARANDO */}
        <div className="mb-6 rounded-lg bg-blue-50 shadow-sm">
          <div className="rounded-t-lg bg-blue-500 p-3 text-lg font-bold text-white">
            🔵 PEDIDOS EM PREPARO ({preparando.length})
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {preparando.map((order) => {
                const waitTime = getWaitTime(order.created_at)
                const items = formatItems(order.items_serialized)
                return (
                  <div
                    key={order.payment_id}
                    className={`flex h-full flex-col rounded-lg border bg-white p-4 shadow-sm ${getBorderColor(waitTime)}`}
                  >
                    <div className="flex-1">
                      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-bold sm:text-xl">
                            #{order.payment_id.slice(-6)}
                          </span>
                          <span
                            className={`text-xs font-bold ${getTimeColor(waitTime)}`}
                          >
                            {waitTime} min
                          </span>
                        </div>
                        <div className="text-primary text-base font-bold sm:text-xl">
                          R$ {order.total.toFixed(2).replace(".", ",")}
                        </div>
                      </div>
                      <div className="mb-2 text-sm font-semibold wrap-break-word text-gray-800 sm:text-base">
                        {order.customer_name}
                      </div>
                      <div className="mb-3 space-y-1 text-gray-700">
                        {items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex flex-wrap justify-between gap-2 text-xs sm:text-sm"
                          >
                            <span className="flex items-center gap-1">
                              <span className="text-primary font-bold">
                                {item.qty}x
                              </span>
                              <span className="wrap-break-word">
                                {item.name}
                              </span>
                            </span>
                            <span className="whitespace-nowrap text-gray-500">
                              R${" "}
                              {(item.price * item.qty)
                                .toFixed(2)
                                .replace(".", ",")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-4 flex flex-col gap-2 border-t border-gray-200 pt-3 sm:flex-row">
                      <button
                        onClick={() =>
                          updateStatus(order.payment_id, "delivering")
                        }
                        className="flex-1 cursor-pointer rounded-lg bg-purple-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-purple-700 sm:text-sm"
                      >
                        A CAMINHO
                      </button>
                      <button
                        onClick={() => handleCancelClick(order.payment_id)}
                        className="flex-1 cursor-pointer rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-700 sm:text-sm"
                      >
                        CANCELAR
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            {preparando.length === 0 && (
              <div className="py-8 text-center text-gray-400">
                Nenhum pedido em preparo
              </div>
            )}
          </div>
        </div>

        {/* A CAMINHO */}
        <div className="mb-6 rounded-lg bg-purple-50 shadow-sm">
          <div className="rounded-t-lg bg-purple-500 p-3 text-lg font-bold text-white">
            🟣 A CAMINHO ({aCaminho.length})
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {aCaminho.map((order) => {
                const waitTime = getWaitTime(order.created_at)
                const items = formatItems(order.items_serialized)
                return (
                  <div
                    key={order.payment_id}
                    className={`flex h-full flex-col rounded-lg border bg-white p-4 shadow-sm ${getBorderColor(waitTime)}`}
                  >
                    <div className="flex-1">
                      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-bold sm:text-xl">
                            #{order.payment_id.slice(-6)}
                          </span>
                          <span
                            className={`text-xs font-bold ${getTimeColor(waitTime)}`}
                          >
                            {waitTime} min
                          </span>
                        </div>
                        <div className="text-primary text-base font-bold sm:text-xl">
                          R$ {order.total.toFixed(2).replace(".", ",")}
                        </div>
                      </div>
                      <div className="mb-2 text-sm font-semibold wrap-break-word text-gray-800 sm:text-base">
                        {order.customer_name}
                      </div>
                      <div className="mb-3 space-y-1 text-gray-700">
                        {items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex flex-wrap justify-between gap-2 text-xs sm:text-sm"
                          >
                            <span className="flex items-center gap-1">
                              <span className="text-primary font-bold">
                                {item.qty}x
                              </span>
                              <span className="wrap-break-word">
                                {item.name}
                              </span>
                            </span>
                            <span className="whitespace-nowrap text-gray-500">
                              R${" "}
                              {(item.price * item.qty)
                                .toFixed(2)
                                .replace(".", ",")}
                            </span>
                          </div>
                        ))}
                      </div>
                      {order.lalamoveShareLink && (
                        <div className="mt-2">
                          <a
                            href={order.lalamoveShareLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs wrap-break-word text-blue-600 underline"
                          >
                            Rastrear pedido
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex flex-col gap-2 border-t border-gray-200 pt-3 sm:flex-row">
                      <button
                        onClick={() =>
                          updateStatus(order.payment_id, "delivered")
                        }
                        className="flex-1 cursor-pointer rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-green-700 sm:text-sm"
                      >
                        ENTREGUE
                      </button>
                      <button
                        onClick={() => handleCancelClick(order.payment_id)}
                        className="flex-1 cursor-pointer rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-700 sm:text-sm"
                      >
                        CANCELAR
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            {aCaminho.length === 0 && (
              <div className="py-8 text-center text-gray-400">
                Nenhum pedido a caminho
              </div>
            )}
          </div>
        </div>

        {/* PRONTOS */}
        <div className="mb-6 rounded-lg bg-green-50 shadow-sm">
          <div className="rounded-t-lg bg-green-500 p-3 text-lg font-bold text-white">
            🟢 PEDIDOS PRONTOS ({prontos.length})
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {prontos.map((order) => {
                const items = formatItems(order.items_serialized)
                return (
                  <div
                    key={order.payment_id}
                    className="flex h-full flex-col rounded-lg border border-green-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex-1">
                      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <span className="text-base font-bold sm:text-xl">
                            #{order.payment_id.slice(-6)}
                          </span>
                        </div>
                        <div className="text-primary text-base font-bold sm:text-xl">
                          R$ {order.total.toFixed(2).replace(".", ",")}
                        </div>
                      </div>
                      <div className="mb-2 text-sm font-semibold wrap-break-word text-gray-800 sm:text-base">
                        {order.customer_name}
                      </div>
                      <div className="mb-3 space-y-1 text-gray-700">
                        {items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex flex-wrap justify-between gap-2 text-xs sm:text-sm"
                          >
                            <span className="flex items-center gap-1">
                              <span className="text-primary font-bold">
                                {item.qty}x
                              </span>
                              <span className="wrap-break-word">
                                {item.name}
                              </span>
                            </span>
                            <span className="whitespace-nowrap text-gray-500">
                              R${" "}
                              {(item.price * item.qty)
                                .toFixed(2)
                                .replace(".", ",")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-4 border-t border-gray-200 pt-3">
                      <button
                        className="w-full cursor-not-allowed rounded-lg bg-gray-400 px-3 py-2 text-xs font-bold text-white opacity-60 sm:text-sm"
                        disabled
                      >
                        ENTREGUE
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            {prontos.length === 0 && (
              <div className="py-8 text-center text-gray-400">
                Nenhum pedido pronto
              </div>
            )}
          </div>
        </div>

        {/* CANCELADOS */}
        {cancelados.length > 0 && (
          <div className="rounded-lg bg-gray-100 shadow-sm">
            <div className="rounded-t-lg bg-gray-500 p-3 text-lg font-bold text-white">
              ⚪ PEDIDOS CANCELADOS ({cancelados.length})
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {cancelados.map((order) => {
                  const items = formatItems(order.items_serialized)
                  return (
                    <div
                      key={order.payment_id}
                      className="rounded-lg border border-gray-300 bg-gray-200 p-4"
                    >
                      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <span className="text-base font-bold sm:text-xl">
                            #{order.payment_id.slice(-6)}
                          </span>
                        </div>
                        <div className="text-base font-bold text-gray-600 sm:text-xl">
                          R$ {order.total.toFixed(2).replace(".", ",")}
                        </div>
                      </div>
                      <div className="mb-2 text-sm font-semibold wrap-break-word text-gray-700 sm:text-base">
                        {order.customer_name}
                      </div>
                      <div className="text-xs text-gray-600 sm:text-sm">
                        {items.map((item, idx) => (
                          <span key={idx} className="mr-2 inline">
                            {item.qty}x {item.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
