"use client";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function HomePage() {
  // Fecha del sorteo - Navidad 2025 (ajustá según necesites)
  const sorteoDate = new Date('2025-12-25T00:00:00');
  
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = sorteoDate.getTime() - now.getTime();

      if (difference > 0) {
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        };
      }
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    };

    // Calcular inmediatamente
    setTimeLeft(calculateTimeLeft());

    // Actualizar cada segundo
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <main className="min-h-screen bg-white">
      {/* HERO RENOVADO */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-blue-50 border-b overflow-hidden">
        {/* Elementos decorativos */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-100 rounded-full blur-3xl opacity-20"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 py-8 md:py-12">
          {/* Badge */}
          <div className="text-center mb-6">
            <span className="inline-block px-4 py-2 text-sm font-semibold rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 text-white shadow-lg">
              🏆 Rifa Cooperativa Solidaria
            </span>
          </div>

          {/* Título Principal */}
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-black leading-tight bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 bg-clip-text text-transparent">
              ¡VIVÍ LA PASIÓN MUNDIALISTA EN TU CASA!
            </h1>
            
            <p className="mt-6 text-xl md:text-2xl font-bold text-gray-800">
              Participá de esta rifa única y llevate la camiseta oficial del Seleccionado Argentino,{' '}
              <span className="text-blue-600">¡FIRMADA POR LOS CAMPEONES DEL MUNDO 2022!</span> 🏆🔥
            </p>

            <p className="mt-6 text-lg md:text-xl text-gray-700 max-w-3xl mx-auto">
              💙⚽️ Imaginá colgarla en tu living, llevarla a la cancha o guardarla como el tesoro más valioso: 
              una oportunidad única para cumplir el sueño de vestirte como un/a campeón/a 🏆
            </p>
          </div>

          {/* Countdown Timer */}
          <div className="mt-10 max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-200 p-6">
              <div className="text-center mb-4">
                <p className="text-lg font-bold text-gray-800">
                  ⏱️ ¡Tenés tiempo hasta el sorteo!
                </p>
                <p className="text-sm text-gray-600 mt-1">Sorteo: 25 de Diciembre 2025</p>
              </div>
              
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white text-center">
                  <div className="text-3xl md:text-4xl font-black">{timeLeft.days}</div>
                  <div className="text-xs md:text-sm font-medium mt-1">DÍAS</div>
                </div>
                <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl p-4 text-white text-center">
                  <div className="text-3xl md:text-4xl font-black">{timeLeft.hours}</div>
                  <div className="text-xs md:text-sm font-medium mt-1">HORAS</div>
                </div>
                <div className="bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl p-4 text-white text-center">
                  <div className="text-3xl md:text-4xl font-black">{timeLeft.minutes}</div>
                  <div className="text-xs md:text-sm font-medium mt-1">MIN</div>
                </div>
                <div className="bg-gradient-to-br from-cyan-400 to-cyan-500 rounded-xl p-4 text-white text-center">
                  <div className="text-3xl md:text-4xl font-black">{timeLeft.seconds}</div>
                  <div className="text-xs md:text-sm font-medium mt-1">SEG</div>
                </div>
              </div>
            </div>
          </div>

          {/* Imagen de la Camiseta */}
          <div className="mt-10 max-w-2xl mx-auto">
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border-4 border-white ring-4 ring-blue-200">
              <Image
                src="/camisetaFirmada.png"
                alt="Camiseta Argentina firmada por los campeones"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute top-4 right-4 bg-yellow-400 text-black px-4 py-2 rounded-full font-bold text-sm shadow-lg">
                ⭐ FIRMADA POR MESSI
              </div>
            </div>
          </div>

          {/* CTA Principal */}
          <div className="mt-10 text-center">
            <p className="text-lg font-semibold text-gray-700 mb-4">
              👉 Participar es fácil, rápido y divertido. ¡Comprá tus números y cruzá los dedos, que la Scaloneta puede ser tuya! 🇦🇷💫
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/app"
                className="group relative px-8 py-5 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 text-white font-black text-xl shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105"
              >
                <span className="relative z-10">🎟️ QUIERO MIS NÚMEROS</span>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-700 via-cyan-600 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </Link>
              
              <Link
                href="/auth/register"
                className="px-8 py-5 rounded-2xl border-2 border-blue-600 text-blue-600 font-bold text-lg hover:bg-blue-50 transition-all duration-300"
              >
                📝 Crear Cuenta Gratis
              </Link>
            </div>

            <p className="mt-6 text-sm text-gray-600">
              💰 Cada número: <span className="font-bold text-blue-600 text-lg">$1.000</span> · 
              ✅ Pago por transferencia · ⚡ Confirmación inmediata
            </p>
          </div>
        </div>
      </section>

      {/* EL PREMIO */}
      <section className="max-w-6xl mx-auto px-4 py-12 md:py-16">
        <div className="flex items-center justify-between gap-6 flex-col md:flex-row">
          <div className="w-full md:w-1/2">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border bg-white">
              <Image
                src="/camiseta.jpeg"
                alt="Camiseta de la Selección Argentina firmada por los jugadores"
                fill
                className="object-cover"
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
  className="inline-block mt-6 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 text-white hover:opacity-90 shadow-lg transition-all"
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
          <div className="rounded-2xl border p-5 bg-white">
            <div className="text-sm font-medium text-zinc-500">1) Elegí</div>
            <h3 className="mt-1 font-semibold">Tus números</h3>
            <p className="mt-2 text-sm text-zinc-600">
              Entrá a la app, buscá y reservá. También podés sumar números al
              azar. Cada número cuesta <b>$1.000</b>.
            </p>
          </div>

          <div className="rounded-2xl border p-5 bg-white">
            <div className="text-sm font-medium text-zinc-500">2) Pagá</div>
            <h3 className="mt-1 font-semibold">Transferencia + comprobante</h3>
            <p className="mt-2 text-sm text-zinc-600">
              Tenés <b>1 hora</b> para subir el comprobante desde el checkout.
              Si no, la reserva se libera automáticamente.
            </p>
          </div>

          <div className="rounded-2xl border p-5 bg-white">
            <div className="text-sm font-medium text-zinc-500">
              3) Acreditación
            </div>
            <h3 className="mt-1 font-semibold">Revisión del pago</h3>
            <p className="mt-2 text-sm text-zinc-600">
              Un admin revisa y acredita tu compra. Cuando esté aprobado, tus
              números quedan confirmados.
            </p>
          </div>

          <div className="rounded-2xl border p-5 bg-white">
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
      <section className="border-t bg-zinc-50 rounded">
        <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-semibold">
            Preguntas frecuentes
          </h2>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <details className="rounded-2xl border p-4 group bg-white">
              <summary className="cursor-pointer font-medium list-none">
                ¿Cuánto sale cada número?
              </summary>
              <p className="mt-2 text-sm text-zinc-600">
                Cada número cuesta <b>$1.000</b>. El detalle final se ve al
                confirmar tu selección en el checkout.
              </p>
            </details>

            <details className="rounded-2xl border p-4 group bg-white">
              <summary className="cursor-pointer font-medium list-none">
                ¿Cómo pago y dónde subo el comprobante?
              </summary>
              <p className="mt-2 text-sm text-zinc-600">
                Por transferencia bancaria. Al ir al checkout verás los datos y
                podrás subir el comprobante.
              </p>
            </details>

            <details className="rounded-2xl border p-4 group bg-white">
              <summary className="cursor-pointer font-medium list-none">
                ¿Qué pasa si no subo el comprobante a tiempo?
              </summary>
              <p className="mt-2 text-sm text-zinc-600">
                Tenés 1 hora desde la reserva. Luego la orden se cancela y los
                números vuelven a estar disponibles.
              </p>
            </details>

            <details className="rounded-2xl border p-4 group bg-white">
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
      <section className="bg-zinc-50 border-t">
        <div className="max-w-6xl mx-auto px-4 py-12 md:py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold">
            ¿Listo para participar?
          </h2>
          <p className="mt-2 text-zinc-600">
            Registrate gratis y empezá a elegir tus números.
          </p>
          <div className="mt-6 flex justify-center gap-3 flex-wrap">
  <Link
    href="/auth/register"
    className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 text-white hover:opacity-90 shadow-lg transition-all"
  >
    Crear cuenta
  </Link>
  <Link
    href="/app"
    className="px-5 py-3 rounded-xl border-2 border-blue-500 text-blue-600 hover:bg-blue-50 transition-all"
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