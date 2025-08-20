// src/app/page.tsx
import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* HERO */}
      <section className="bg-gradient-to-b from-zinc-50 to-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl">
            <span className="inline-block px-2.5 py-1 text-xs rounded-full border bg-white">
              Rifa cooperativa
            </span>
            <h1 className="mt-4 text-3xl md:text-5xl font-bold leading-tight">
              Participá por una camiseta de la Selección Argentina{" "}
              <span className="whitespace-nowrap">firmada por el plantel</span>{" "}
              (incluye la firma de Messi)
            </h1>
            <p className="mt-4 text-zinc-600 max-w-2xl">
              Elegís tus números, subís el comprobante y listo. Todo
              transparente y súper simple.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/app"
                className="px-5 py-3 rounded-xl bg-black text-white hover:opacity-90"
              >
                Ver números y comprar
              </Link>
              <Link
                href="/auth/register"
                className="px-5 py-3 rounded-xl border hover:bg-zinc-50"
              >
                Crear cuenta
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* EL PREMIO */}
      <section className="max-w-6xl mx-auto px-4 py-12 md:py-16">
        <div className="flex items-center justify-between gap-6 flex-col md:flex-row">
          <div className="w-full md:w-1/2">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border bg-white">
              {/* Reemplazá /camiseta.jpg por tu foto real (colocala en /public/camiseta.jpg) */}
              <Image
                src="/camiseta.jpeg"
                alt="Camiseta de la Selección Argentina firmada por los jugadores"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
          <div className="w-full md:w-1/2">
            <h2 className="text-2xl md:text-3xl font-semibold">El premio</h2>
            <ul className="mt-4 space-y-2 text-zinc-700">
              <li>• Camiseta oficial de la Selección Argentina.</li>
              <li>
                • Firmada por jugadores del plantel, incluida la firma de{" "}
                <b>Messi</b>.
              </li>
              <li>• Entrega en caja protectora.</li>
              <li>• Publicaremos el ganador/a y la entrega.</li>
            </ul>
            <p className="mt-4 text-sm text-zinc-500">
              * Las fotos del premio son reales. Si querés, podés ver más
              imágenes o coordinar para verla en persona (escribinos por
              WhatsApp).
            </p>
            <Link
              href="/app"
              className="inline-block mt-6 px-5 py-3 rounded-xl bg-black text-white hover:opacity-90"
            >
              Quiero participar
            </Link>
          </div>
        </div>
      </section>

      {/* LA HISTORIA DE LA CAMISETA */}
      <section className="border-t bg-zinc-50">
        <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-semibold">
            La historia de la camiseta
          </h2>

          <div className="mt-6 grid gap-6 md:grid-cols-5">
            <div className="md:col-span-3">
              <p className="text-zinc-700">
                A veces, los grandes gestos nacen en los lugares más simples. En
                una charla entre mates, en un abrazo de abuelo, en el amor por
                una escuela.
              </p>
              <p className="mt-3 text-zinc-700">
                Esta historia comienza así: con un abuelo que no buscó aplausos,
                ni fotos, ni agradecimientos. Solo pensó en sus nietos. Pensó en
                esa escuela a la que entra todos los días con su mochilita a
                cuestas, en sus maestros, en los juegos, en los sueños que se
                siembran desde pequeños. Y entonces hizo algo enorme.
              </p>
              <p className="mt-3 text-zinc-700">
                Gracias a su vínculo con alguien que trabaja en la Asociación
                del Fútbol Argentino, este abuelo logró conseguir una verdadera
                joya: una camiseta de la Selección Argentina. Pero no
                cualquiera: tenía que estar firmada por todos los jugadores,
                incluyendo nada menos que la firma del capitán, Lionel Messi. La
                consiguió. Y la donó. Así, sin más.
              </p>
              <p className="mt-3 text-zinc-700">
                La trajo para que se pudiera rifar y así recaudar fondos para la
                escuela. Porque sabe que cada peso cuenta. Que detrás de cada
                pared que se arregla, de cada juego que se compra, hay niños
                creciendo.
              </p>
              <p className="mt-3 text-zinc-700">
                Hoy, esa camiseta no es solo una prenda de colección: es un
                símbolo de amor, de compromiso y de confianza. Es original,
                auténtica, y está firmada por muchos de los campeones del mundo
                —incluida la firma de Messi—. Pero, sobre todo, está cargada de
                un valor mucho más profundo: el de una comunidad que apuesta por
                la educación y por un futuro mejor para sus chicos.
              </p>
              <p className="mt-3 text-zinc-700">
                ¿Y si esta historia también la escribís vos? Podés sumarte
                comprando tu número y compartiendo el link con tus amigos. El
                sorteo se realizará en Navidad, en ese sorteo tan importante…
                porque esta iniciativa y tu aporte son como los sueños bien
                sembrados: crecen con tiempo y amor.
              </p>
            </div>

            <aside className="md:col-span-2">
              <div className="rounded-2xl border bg-white p-5">
                <div className="text-sm text-zinc-500">Dato</div>
                <div className="mt-1 font-semibold">Precio por número</div>
                <div className="mt-1 text-2xl font-bold">$1.000</div>
                <p className="mt-3 text-sm text-zinc-600">
                  Lo recaudado se destina a mejoras y proyectos de la escuela.
                </p>
              </div>
              {/* Si querés, podés sumar una foto acá */}
              {/* <div className="mt-4 relative aspect-[4/3] rounded-2xl border overflow-hidden">
          <Image src="/camiseta.jpg" alt="Camiseta firmada" fill className="object-cover" />
        </div> */}
            </aside>
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA EL SORTEO */}
      <section className="max-w-6xl mx-auto p-4 md:py-6 bg-zinc-50">

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-2xl md:text-3xl font-semibold">
            ¿Cómo funciona el sorteo?
          </h2>
        
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border p-5">
            <div className="text-sm font-medium text-zinc-500">1) Elegí</div>
            <h3 className="mt-1 font-semibold">Tus números</h3>
            <p className="mt-2 text-sm text-zinc-600">
              Entrá a la app, buscá y reservá. También podés sumar números al
              azar. Cada número cuesta <b>$1.000</b>.
            </p>
          </div>

          <div className="rounded-2xl border p-5">
            <div className="text-sm font-medium text-zinc-500">2) Pagá</div>
            <h3 className="mt-1 font-semibold">Transferencia + comprobante</h3>
            <p className="mt-2 text-sm text-zinc-600">
              Tenés <b>1 hora</b> para subir el comprobante desde el checkout.
              Si no, la reserva se libera automáticamente.
            </p>
          </div>

          <div className="rounded-2xl border p-5">
            <div className="text-sm font-medium text-zinc-500">
              3) Acreditación
            </div>
            <h3 className="mt-1 font-semibold">Revisión del pago</h3>
            <p className="mt-2 text-sm text-zinc-600">
              Un admin revisa y acredita tu compra. Cuando esté aprobado, tus
              números quedan confirmados.
            </p>
          </div>

          <div className="rounded-2xl border p-5">
            <div className="text-sm font-medium text-zinc-500">4) Sorteo</div>
            <h3 className="mt-1 font-semibold">Lotería Nacional (Navidad)</h3>
            <p className="mt-2 text-sm text-zinc-600">
              El ganador/a se define <b>por la Lotería Nacional</b> en Navidad,
              según los resultados oficiales. Publicamos el resultado y
              coordinamos la entrega del premio.
            </p>
          </div>
        </div>
      </section>



      {/* PREGUNTAS FRECUENTES */}
      <section className="border-t bg-zinc-50  rounded">
        <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-semibold">
            Preguntas frecuentes
          </h2>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <details className="rounded-2xl border p-4 group">
              <summary className="cursor-pointer font-medium list-none">
                ¿Cuánto sale cada número?
              </summary>
              <p className="mt-2 text-sm text-zinc-600">
                Cada número cuesta <b>$1.000</b>. El detalle final se ve al
                confirmar tu selección en el checkout.
              </p>
            </details>

            <details className="rounded-2xl border p-4 group">
              <summary className="cursor-pointer font-medium list-none">
                ¿Cómo pago y dónde subo el comprobante?
              </summary>
              <p className="mt-2 text-sm text-zinc-600">
                Por transferencia bancaria. Al ir al checkout verás los datos y
                podrás subir el comprobante.
              </p>
            </details>

            <details className="rounded-2xl border p-4 group">
              <summary className="cursor-pointer font-medium list-none">
                ¿Qué pasa si no subo el comprobante a tiempo?
              </summary>
              <p className="mt-2 text-sm text-zinc-600">
                Tenés 1 hora desde la reserva. Luego la orden se cancela y los
                números vuelven a estar disponibles.
              </p>
            </details>

            <details className="rounded-2xl border p-4 group">
              <summary className="cursor-pointer font-medium list-none">
                ¿Cómo y cuándo se anuncia el ganador/a?
              </summary>
              <p className="mt-2 text-sm text-zinc-600">
                Se publicará la fecha del sorteo; compartimos el resultado y
                coordinamos la entrega del premio.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="bg-zinc-50 border-t ">
        <div className="max-w-6xl mx-auto px-4 py-12 md:py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold">
            ¿Listo para participar?
          </h2>
          <p className="mt-2 text-zinc-600">
            Registrate gratis y empezá a elegir tus números.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/auth/register"
              className="px-5 py-3 rounded-xl bg-black text-white hover:opacity-90"
            >
              Crear cuenta
            </Link>
            <Link
              href="/app"
              className="px-5 py-3 rounded-xl border hover:bg-white"
            >
              Ver números
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t text-center rounded">
        <div className="max-w-6xl mx-auto px-4 py-6 text-sm text-zinc-500">
          © {new Date().getFullYear()} Rifa Cooperativa · Hecho por{" "}
          <a className="text-blue-600" href="https://www.instagram.com/codela.estudio/">Codela</a>
        </div>
      </footer>
    </main>
  );
}
