'use client';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TermsModal({ isOpen, onClose }: TermsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-cyan-400 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Términos y Condiciones</h2>
          <button 
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="prose prose-sm max-w-none space-y-4">
            
            <section>
              <h3 className="text-xl font-bold text-gray-900 mb-3">1. ORGANIZACIÓN Y OBJETIVO</h3>
              <div className="space-y-2 text-gray-700">
                <p><strong>1.1. Organizador del Sorteo:</strong> La rifa es organizada y ejecutada por la Asociación Cooperadora de la ESCUELA N° 6 "MALVINAS ARGENTINAS", con domicilio en Avda Martín Pescador y Albacora, Pinamar CP 7167 Pcia de Bs As (en adelante, la "Entidad Organizadora").</p>
                <p><strong>1.2. Finalidad:</strong> El objetivo de la rifa es la recaudación de fondos destinados íntegramente para sostener y mejorar tanto la infraestructura escolar como las iniciativas educativas que enriquecen el aprendizaje diario de la escuela.</p>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-bold text-gray-900 mb-3">2. CONDICIONES DE PARTICIPACIÓN</h3>
              <div className="space-y-2 text-gray-700">
                <p><strong>2.1. Aceptación de Bases:</strong> La participación en la rifa implica la aceptación plena e incondicional de todos los presentes Términos y Condiciones.</p>
                <p><strong>2.2. Participantes:</strong> Podrá participar cualquier persona mayor de 18 años en adelante.</p>
                <p><strong>2.3. Método de Participación:</strong> La participación se formaliza mediante la compra de los Billetes Virtuales a través de esta plataforma. Una vez elegidos los números, se deben abonar, adjuntando comprobante para su posterior control. Dentro de las 24 hs de efectuada la compra, se verificarán los datos, y se confirmará la compra en caso que se cumplan los requisitos, y los números elegidos ya no estarán disponibles en la grilla.</p>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-bold text-gray-900 mb-3">3. MECÁNICA DEL SORTEO Y PREMIOS</h3>
              <div className="space-y-2 text-gray-700">
                <p><strong>3.1. Vigencia:</strong> El período de venta y participación de la rifa es desde la fecha de lanzamiento: 15/10/25 hasta el 22/12/25.</p>
                <p><strong>3.2. Sorteo:</strong> El sorteo se realizará el día 26 de diciembre de 2025 a través de La Lotería Provincial (Bs As) conocido como sorteo del Gordo de Navidad.</p>
                <p><strong>3.3. Método de Sorteo:</strong> Mediante el sorteo de Lotería Provincial para el Gordo de Navidad, previsto para el día 26/12/25.</p>
                <p><strong>3.4. Premio:</strong> Existe un solo premio: 1 camiseta del seleccionado argentino de fútbol, firmada por varios de los campeones del mundo Qatar 2022, incluido Lionel Messi, enmarcada.</p>
                <p><strong>3.5. Ganador/a:</strong> Sale o Sale. El beneficiario/a será el que compró el número que salió sorteado por la Lotería Provincial en la fecha indicada. En caso de que el número ganador no se haya vendido, define el número que ocupa el puesto 2, y así sucesivamente hasta que se obtenga un ganador/a.</p>
                <p><strong>3.6. Entrega de Premios:</strong> El ganador será contactado a través de WhatsApp, para informarle que puede retirar el premio (en caso que tenga domicilio en la ciudad de Pinamar) o se coordinará el envío a cargo de la Entidad Organizadora, al domicilio que indique la persona beneficiaria.</p>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-bold text-gray-900 mb-3">4. EXENCIÓN DE RESPONSABILIDAD DE LA PLATAFORMA (WEBRIFA)</h3>
              <div className="space-y-2 text-gray-700">
                <p><strong>4.1. Relación de la Plataforma:</strong> Los desarrolladores y administradores de esta plataforma web (en adelante, los "Desarrolladores" o "WebRifa") son un agente tecnológico externo e independiente de la Entidad Organizadora.</p>
                <p><strong>4.2. Alcance de Responsabilidad de WebRifa:</strong> La única responsabilidad de WebRifa es la operación técnica del software para el registro y la emisión de números. Los Desarrolladores no son los organizadores, patrocinadores ni responsables legales de la rifa, sus bases, la recaudación de fondos, la fiscalización del sorteo, la entrega de premios o el destino final de los fondos.</p>
                <p><strong>4.3. Exención:</strong> Los participantes aceptan que cualquier reclamo o disputa relativa a la organización, premios, sorteo o fondos recaudados debe ser dirigido exclusivamente a la Entidad Organizadora. WebRifa se exime de toda responsabilidad por cualquier incumplimiento o daño derivado de la participación.</p>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-bold text-gray-900 mb-3">5. DISPOSICIONES GENERALES</h3>
              <div className="space-y-2 text-gray-700">
                <p><strong>5.1. Modificaciones:</strong> La Entidad Organizadora se reserva el derecho de modificar estas Bases y Condiciones por motivos de fuerza mayor, sin que ello genere derecho a reclamo o compensación.</p>
                <p><strong>5.2. Jurisdicción:</strong> Toda cuestión se someterá a la jurisdicción de los tribunales ordinarios de la ciudad de Dolores, con renuncia a cualquier otro fuero o jurisdicción.</p>
              </div>
            </section>

            <section className="border-t pt-4 mt-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">POLÍTICA DE PRIVACIDAD DE LA PLATAFORMA WEBRIFA</h3>
              
              <h4 className="text-lg font-semibold text-gray-900 mb-2">1. IDENTIDAD Y CONTACTO</h4>
              <div className="space-y-2 text-gray-700 mb-4">
                <p><strong>1.1. Responsable del Tratamiento de Datos (Plataforma):</strong></p>
                <p>Nombre/Empresa: WebTurno<br/>Contacto: webturno@gmail.com</p>
                <p><strong>1.2. Organizador del Sorteo (Tercero):</strong></p>
                <p>La rifa es organizada por la Asociación Cooperadora de ESCUELA N° 6 "MALVINAS ARGENTINAS", quien es la única responsable de la ejecución de la rifa, la gestión de premios y los fondos recaudados.</p>
              </div>

              <h4 className="text-lg font-semibold text-gray-900 mb-2">2. INFORMACIÓN QUE RECOPILAMOS</h4>
              <div className="space-y-2 text-gray-700 mb-4">
                <p>Recopilamos la información que usted proporciona al registrarse:</p>
                <ul className="list-disc pl-5">
                  <li>Datos de Identificación: Nombre, Apellido y DNI.</li>
                  <li>Datos de Contacto: Dirección de correo electrónico y número de teléfono.</li>
                  <li>Datos de Participación: Número(s) de rifa asignado(s) y fecha de participación.</li>
                </ul>
              </div>

              <h4 className="text-lg font-semibold text-gray-900 mb-2">3. USO Y COMPARTICIÓN DE LA INFORMACIÓN</h4>
              <p className="text-gray-700 mb-4">Utilizamos su información personal exclusivamente para la gestión de su participación y para contactarlo en caso de resultar ganador. Su información solo será compartida con la Asociación Cooperadora de ESCUELA N° 6 "MALVINAS ARGENTINAS" para que puedan validar su participación y gestionar la entrega del premio.</p>

              <h4 className="text-lg font-semibold text-gray-900 mb-2">4. CLÁUSULA DE EXENCIÓN DE RESPONSABILIDAD (PREMIO Y FONDOS)</h4>
              <div className="space-y-2 text-gray-700 mb-4">
                <p><strong>4.1. Naturaleza de la Plataforma:</strong> WebRifa es una herramienta tecnológica cuyo único propósito es facilitar la gestión digital de registros y la asignación de números de rifa. WebRifa no es el organizador ni el administrador de la rifa.</p>
                <p><strong>4.2. Responsabilidad Exclusiva del Tercero:</strong> La Asociación Cooperadora de ESCUELA N° 6 "MALVINAS ARGENTINAS" es la única responsable legal de:</p>
                <ul className="list-disc pl-5">
                  <li>La Organización, legalidad y ejecución del sorteo.</li>
                  <li>La Recaudación y destino final de los fondos.</li>
                  <li>La Adquisición, custodia y entrega del premio ofrecido.</li>
                </ul>
                <p><strong>4.3. Deslinde de Responsabilidad:</strong> El usuario acepta que WebRifa no tiene ninguna responsabilidad legal ni financiera por:</p>
                <ul className="list-disc pl-5">
                  <li>Cualquier incumplimiento de la Entidad Organizadora respecto a la entrega del premio.</li>
                  <li>Cualquier controversia relacionada con el sorteo o la gestión de los fondos.</li>
                </ul>
                <p>Cualquier reclamo relacionado con la ejecución de la rifa, el premio o los fondos debe ser dirigido directamente a la Entidad Organizadora.</p>
              </div>

              <h4 className="text-lg font-semibold text-gray-900 mb-2">5. ACEPTACIÓN</h4>
              <p className="text-gray-700">Al marcar la casilla de aceptación, usted declara haber leído y aceptado las condiciones de esta Política de Privacidad, incluyendo expresamente la Cláusula de Exención de Responsabilidad (Sección 4).</p>
            </section>

          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-semibold hover:opacity-90 transition-all shadow-lg"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}