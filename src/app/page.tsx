"use client";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function HomePage() {
  const sorteoDate = new Date('2025-12-22T00:00:00');
  
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

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <main className="min-h-screen bg-white">
      {/* HERO RENOVADO */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-blue-50 border-b overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 md:w-96 md:h-96 bg-blue-100 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 md:w-96 md:h-96 bg-cyan-100 rounded-full blur-3xl opacity-20"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 py-6 md:py-12">
          {/* Badge */}
          <div className="text-center mb-4 md:mb-6">
            <span className="inline-block px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 text-white shadow-lg">
              🏆 RIFA COOPERADORA ESCUELA N° 6 "MALVINAS ARGENTINAS " Pinamar
            </span>
          </div>

          {/* Título Principal */}
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 bg-clip-text text-transparent">
              ¡VIVÍ LA PASIÓN MUNDIALISTA EN TU CASA!
            </h1>
            
            <p className="mt-4 md:mt-6 text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-800 px-2">
              Participá de esta rifa única y llevate la camiseta oficial del Seleccionado Argentino,{' '}
              <span className="text-blue-600">¡FIRMADA POR LOS CAMPEONES DEL MUNDO 2022!</span> 🏆🔥
            </p>

            <p className="mt-4 md:mt-6 text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 max-w-3xl mx-auto px-2">
              💙⚽️ Imaginá colgarla en tu living, llevarla a la cancha o guardarla como el tesoro más valioso: 
              una oportunidad única para cumplir el sueño de vestirte como un/a campeón/a 🏆
            </p>
          </div>

          {/* Countdown Timer */}
          <div className="mt-6 md:mt-10 max-w-2xl mx-auto">
  <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl border-2 border-blue-200 p-4 md:p-6">
    <div className="text-center mb-3 md:mb-4">
      <p className="text-sm md:text-lg font-bold text-gray-800">
        ⏱️ ¡Tenés tiempo hasta el 22 de diciembre!
      </p>
      <p className="text-xs md:text-sm text-gray-600 mt-1">Sorteo: 26 de Diciembre 2025</p>
    </div>
    
    <div className="grid grid-cols-4 gap-2 md:gap-3">
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg md:rounded-xl px-1 py-3 md:p-4 text-white text-center flex flex-col items-center justify-center">
        <div className="text-2xl sm:text-3xl md:text-4xl font-black leading-none">{timeLeft.days}</div>
        <div className="text-[9px] sm:text-[10px] md:text-xs font-medium mt-1 md:mt-1.5 leading-tight">DÍAS</div>
      </div>
      <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg md:rounded-xl px-1 py-3 md:p-4 text-white text-center flex flex-col items-center justify-center">
        <div className="text-2xl sm:text-3xl md:text-4xl font-black leading-none">{timeLeft.hours}</div>
        <div className="text-[9px] sm:text-[10px] md:text-xs font-medium mt-1 md:mt-1.5 leading-tight">HORAS</div>
      </div>
      <div className="bg-gradient-to-br from-blue-400 to-blue-500 rounded-lg md:rounded-xl px-1 py-3 md:p-4 text-white text-center flex flex-col items-center justify-center">
        <div className="text-2xl sm:text-3xl md:text-4xl font-black leading-none">{timeLeft.minutes}</div>
        <div className="text-[9px] sm:text-[10px] md:text-xs font-medium mt-1 md:mt-1.5 leading-tight">MIN</div>
      </div>
      <div className="bg-gradient-to-br from-cyan-400 to-cyan-500 rounded-lg md:rounded-xl px-1 py-3 md:p-4 text-white text-center flex flex-col items-center justify-center">
        <div className="text-2xl sm:text-3xl md:text-4xl font-black leading-none">{timeLeft.seconds}</div>
        <div className="text-[9px] sm:text-[10px] md:text-xs font-medium mt-1 md:mt-1.5 leading-tight">SEG</div>
      </div>
    </div>
  </div>
</div>

          {/* Imagen de la Camiseta */}
          <div className="mt-6 md:mt-10 max-w-2xl mx-auto">
            <div className="relative aspect-[4/3] rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border-2 md:border-4 border-white ring-2 md:ring-4 ring-blue-200">
              <Image
                src="/CamisetaFirmada.png"
                alt="Camiseta Argentina firmada por los campeones"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute top-2 right-2 md:top-4 md:right-4 bg-yellow-400 text-black px-2 py-1 md:px-4 md:py-2 rounded-full font-bold text-xs md:text-sm shadow-lg">
                ⭐ FIRMADA POR MESSI
              </div>
            </div>
          </div>

          {/* CTA Principal */}
          <div className="mt-6 md:mt-10 text-center">
  <p className="text-sm md:text-base lg:text-lg font-semibold text-gray-700 mb-3 md:mb-4 px-2">
    👉 Participar es fácil, rápido y divertido. ¡Comprá tus números y cruzá los dedos, que la Scaloneta puede ser tuya! 🇦🇷💫
  </p>

  {/* 👇 NUEVO: Banner de precio */}
  <div className="mb-4 md:mb-6 flex justify-center px-4">
    <div className="inline-flex items-center gap-3 px-6 md:px-8 py-3 md:py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 shadow-xl border-2 border-white">
      <span className="text-2xl md:text-3xl">💰</span>
      <div className="text-left">
        <p className="text-white text-xs md:text-sm font-medium">Cada número cuesta</p>
        <p className="text-white text-2xl md:text-3xl lg:text-4xl font-black">$1.000</p>
      </div>
      <span className="text-2xl md:text-3xl animate-pulse">✨</span>
    </div>
  </div>

  <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center items-center px-4">
    <Link
      href="/app"
      className="w-full sm:w-auto group relative px-6 md:px-8 py-3 md:py-5 rounded-xl md:rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 text-white font-black text-base md:text-lg lg:text-xl shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105 text-center"
    >
      <span className="relative z-10">🎟️ QUIERO MIS NÚMEROS</span>
      <div className="absolute inset-0 rounded-xl md:rounded-2xl bg-gradient-to-r from-blue-700 via-cyan-600 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity"></div>
    </Link>
    <Link
      href="/auth/register"
      className="w-full sm:w-auto px-6 md:px-8 py-3 md:py-5 rounded-xl md:rounded-2xl border-2 border-blue-600 text-blue-600 font-bold text-base md:text-lg hover:bg-blue-50 transition-all duration-300 text-center"
    >
      📝 Crear Cuenta Gratis
    </Link>
  </div>
</div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-sky-50 to-blue-100 py-16 px-4">
  <div className="max-w-4xl mx-auto">
    <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
      <div className="flex items-center gap-4 mb-6">
        <div className="bg-sky-100 p-4 rounded-full">
          <svg className="w-8 h-8 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-900">Ordenanza Municipal</h2>
      </div>
      
      <p className="text-gray-600 mb-8 text-lg">
        Descargá la ordenanza completa que autoriza y regula la Rifa Cooperadora en nuestro municipio.
      </p>
      
      <button 
        onClick={() => window.open('/Ordenanza.pdf', '_blank')}
        className="bg-sky-500 hover:bg-sky-600 text-white font-semibold px-8 py-4 rounded-xl flex items-center gap-3 transition-all transform hover:scale-105 shadow-lg"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Descargar Ordenanza (PDF)
      </button>
      
      <p className="text-sm text-gray-500 mt-4">
        Formato PDF • Tamaño: 2.3 MB • Actualizado: Octubre 2025
      </p>
    </div>
  </div>
</section>

      {/* EL PREMIO */}
      <section className="max-w-6xl mx-auto px-4 py-8 md:py-12 lg:py-16">
        <div className="flex items-center justify-between gap-4 md:gap-6 flex-col md:flex-row">
          <div className="w-full md:w-1/2">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl md:rounded-2xl border bg-white">
              <Image
                src="/Selec.jpeg"
                alt="Camiseta de la Selección Argentina firmada por los jugadores"
                fill
                className="object-cover"
              />
            </div>
          </div>
          <div className="w-full md:w-1/2">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold">El premio</h2>
            <ul className="mt-3 md:mt-4 space-y-1.5 md:space-y-2 text-sm md:text-base text-zinc-700">
              <li>• Camiseta oficial de la Selección Argentina.</li>
              <li>
                • Firmada por jugadores del plantel, incluida la firma de{" "}
                <b>Messi</b>.
              </li>
              <li>• Entrega en caja protectora.</li>
              <li>• Publicaremos el ganador/a y la entrega.</li>
            </ul>
            <p className="mt-3 md:mt-4 text-xs md:text-sm text-zinc-500">
              * Las fotos del premio son reales. Si querés, podés ver más
              imágenes o coordinar para verla en persona (escribinos por
              WhatsApp).
            </p>
            <Link
              href="/app"
              className="inline-block mt-4 md:mt-6 px-4 md:px-5 py-2 md:py-3 rounded-xl text-sm md:text-base bg-gradient-to-r from-blue-500 to-cyan-400 text-white hover:opacity-90 shadow-lg transition-all"
            >
              Quiero participar
            </Link>
          </div>
        </div>
      </section>

      {/* LA HISTORIA DE LA CAMISETA */}
      <section className="border-t bg-zinc-50">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 lg:py-16">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold">
            La historia de la camiseta
          </h2>

          <div className="mt-4 md:mt-6 grid gap-4 md:gap-6 md:grid-cols-5">
            <div className="md:col-span-3 space-y-2 md:space-y-3 text-sm md:text-base text-zinc-700">
              <p>
                A veces, los grandes gestos nacen en los lugares más simples. En
                una charla entre mates, en un abrazo de abuelo, en el amor por
                una escuela.
              </p>
              <p>
                Esta historia comienza así: con un abuelo que no buscó aplausos,
                ni fotos, ni agradecimientos. Solo pensó en sus nietos. Pensó en
                esa escuela a la que entra todos los días con su mochilita a
                cuestas, en sus maestros, en los juegos, en los sueños que se
                siembran desde pequeños. Y entonces hizo algo enorme.
              </p>
              <p>
                Gracias a su vínculo con alguien que trabaja en la Asociación
                del Fútbol Argentino, este abuelo logró conseguir una verdadera
                joya: una camiseta de la Selección Argentina. Pero no
                cualquiera: tenía que estar firmada por varios jugadores de la seleccion,
                incluyendo nada menos que la firma del capitán, Lionel Messi. La
                consiguió. Y la donó. Así, sin más.
              </p>
              <p>
                La trajo para que se pudiera rifar y así recaudar fondos para la
                escuela. Porque sabe que cada peso cuenta. Que detrás de cada
                pared que se arregla, de cada juego que se compra, hay niños
                creciendo.
              </p>
              <p>
                Hoy, esa camiseta no es solo una prenda de colección: es un
                símbolo de amor, de compromiso y de confianza. Es original,
                auténtica, y está firmada por muchos de los campeones del mundo
                (incluida la firma de Messi). Pero, sobre todo, está cargada de
                un valor mucho más profundo: el de una comunidad que apuesta por
                la educación y por un futuro mejor para sus chicos.
              </p>
              <p>
                ¿Y si esta historia también la escribís vos? Podés sumarte
                comprando tu número y compartiendo el link con tus amigos. El sorteo  se hará a través de Lotería Provincial (Bs As), en ese sorteo tan importante…
                porque esta iniciativa y tu aporte son como los sueños bien
                sembrados: crecen con tiempo y amor.
              </p>
            </div>

            <aside className="md:col-span-2">
              <div className="rounded-xl md:rounded-2xl border bg-white p-4 md:p-5">
                <div className="text-xs md:text-sm text-zinc-500">Dato</div>
                <div className="mt-1 font-semibold text-sm md:text-base">Precio por número</div>
                <div className="mt-1 text-xl md:text-2xl font-bold">$1.000</div>
                <p className="mt-2 md:mt-3 text-xs md:text-sm text-zinc-600">
                  Lo recaudado se destina a mejoras y proyectos de la escuela.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA EL SORTEO */}
      <section className="max-w-6xl mx-auto px-4 py-8 md:py-12 bg-zinc-50">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold">
          ¿Cómo funciona el sorteo?
        </h2>

        <div className="mt-4 md:mt-6 grid gap-2 md:gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { num: "1", title: "Elegí", subtitle: "Tus números", desc: "Entrá a la app, buscá y reservá. También podés sumar números al azar. Cada número cuesta $1.000." },
            { num: "2", title: "Pagá", subtitle: "Transferencia + comprobante", desc: "Tenés 1 hora para subir el comprobante desde el checkout. Si no, la reserva se libera automáticamente." },
            { num: "3", title: "Acreditación", subtitle: "Revisión del pago", desc: "Un admin revisa y acredita tu compra. Cuando esté aprobado, tus números quedan confirmados." },
            { num: "4", title: "Sorteo", subtitle: "Lotería Provincial", desc: "El ganador/a se define por la Lotería Nacional en Navidad, según los resultados oficiales." }
          ].map((item) => (
            <div key={item.num} className="rounded-xl md:rounded-2xl border p-4 md:p-5 bg-white">
              <div className="text-xs md:text-sm font-medium text-zinc-500">{item.num}) {item.title}</div>
              <h3 className="mt-1 font-semibold text-sm md:text-base">{item.subtitle}</h3>
              <p className="mt-1.5 md:mt-2 text-xs md:text-sm text-zinc-600">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* PREGUNTAS FRECUENTES */}
      <section className="border-t bg-zinc-50">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 lg:py-16">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold">
            Preguntas frecuentes
          </h2>

          <div className="mt-4 md:mt-6 grid gap-2 md:gap-3 md:grid-cols-2">
            {[
              { q: "¿Cuánto sale cada número?", a: "Cada número cuesta $1.000. El detalle final se ve al confirmar tu selección en el checkout." },
              { q: "¿Cómo pago y dónde subo el comprobante?", a: "Por transferencia bancaria. Al ir al checkout verás los datos y podrás subir el comprobante." },
              { q: "¿Qué pasa si no subo el comprobante a tiempo?", a: "Tenés 1 hora desde la reserva. Luego la orden se cancela y los números vuelven a estar disponibles." },
              { q: "¿Cómo y cuándo se anuncia el ganador/a?", a: "Se publicará la fecha del sorteo; compartimos el resultado y coordinamos la entrega del premio." }
            ].map((faq, i) => (
              <details key={i} className="rounded-xl md:rounded-2xl border p-3 md:p-4 group bg-white">
                <summary className="cursor-pointer font-medium list-none text-sm md:text-base">
                  {faq.q}
                </summary>
                <p className="mt-2 text-xs md:text-sm text-zinc-600">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="bg-zinc-50 border-t">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 lg:py-16 text-center">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold">
            ¿Listo para participar?
          </h2>
          <p className="mt-2 text-sm md:text-base text-zinc-600">
            Registrate gratis y empezá a elegir tus números.
          </p>
          <div className="mt-4 md:mt-6 flex justify-center gap-2 md:gap-3 flex-wrap px-4">
            <Link
              href="/auth/register"
              className="px-4 md:px-5 py-2 md:py-3 rounded-xl text-sm md:text-base bg-gradient-to-r from-blue-500 to-cyan-400 text-white hover:opacity-90 shadow-lg transition-all"
            >
              Crear cuenta
            </Link>
            <Link
              href="/app"
              className="px-4 md:px-5 py-2 md:py-3 rounded-xl text-sm md:text-base border-2 border-blue-500 text-blue-600 hover:bg-blue-50 transition-all"
            >
              Ver números
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t text-center">
        <div className="max-w-6xl mx-auto px-4 py-4 md:py-6 text-xs md:text-sm text-zinc-500">
          © {new Date().getFullYear()} Rifa Cooperativa · Hecho por{" "}
          <a className="text-blue-600" href="https://www.instagram.com/codela.estudio/">Codela</a>
        </div>
      </footer>
    </main>
  );

}