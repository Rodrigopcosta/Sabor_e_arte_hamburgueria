import { STORE_INFO } from "@/lib/menu-data"

export function MapSection() {
  const mapQuery = encodeURIComponent(STORE_INFO.address)

  return (
    <section className="px-4 py-16 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 text-center sm:mb-12">
          <span className="text-primary mb-2 inline-block text-sm font-semibold tracking-widest uppercase">
            Localizacao
          </span>
          <h2 className="text-foreground mb-4 text-2xl font-bold text-balance sm:text-3xl md:text-4xl">
            Onde estamos
          </h2>
          <p className="text-muted-foreground mx-auto max-w-lg text-sm text-pretty sm:text-base">
            {STORE_INFO.address}
          </p>
        </div>

        <div className="border-border overflow-hidden rounded-xl border">
          <iframe
            title="Localizacao Sabor e Arte"
            src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${mapQuery}&zoom=16`}
            width="100%"
            height="400"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-75 w-full sm:h-100"
          />
        </div>
      </div>
    </section>
  )
}
