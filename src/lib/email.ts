import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendComprobantRecibido(userEmail: string, orderId: string, total: number) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'noreply@tudominio.com',
      to: [userEmail],
      subject: '📄 Comprobante recibido - Rifa Digital',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">¡Comprobante recibido! 📄</h2>
          
          <p>Hola,</p>
          
          <p>Hemos recibido tu comprobante de pago para la orden <strong>#${orderId}</strong></p>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Total pagado:</strong> $${total.toLocaleString('es-AR')} ARS</p>
            <p><strong>Estado:</strong> En revisión</p>
          </div>
          
          <p>Nuestro equipo revisará tu pago en las próximas <strong>24 horas</strong>.</p>
          <p>Una vez confirmado, te enviaremos otro email con tus números asignados.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px;">
            Gracias por participar en nuestra rifa digital.<br>
            Si tienes dudas, contáctanos por WhatsApp.
          </p>
        </div>
      `
    })

    if (error) {
      console.error('Error enviando email de comprobante:', error)
      return { success: false, error }
    }

    console.log('Email de comprobante enviado:', data?.id)
    return { success: true, data }
  } catch (error) {
    console.error('Error en sendComprobantRecibido:', error)
    return { success: false, error }
  }
}

export async function sendPagoConfirmado(userEmail: string, orderId: string, numbers: number[], total: number) {
  try {
    const numbersText = numbers.sort((a, b) => a - b).join(', ')
    
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'noreply@tudominio.com',
      to: [userEmail],
      subject: '🎉 ¡Pago confirmado! Tus números de la rifa',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">🎉 ¡Pago confirmado!</h2>
          
          <p>¡Excelente noticia!</p>
          
          <p>Tu pago ha sido <strong>confirmado</strong> y tus números ya están asignados.</p>
          
          <div style="background: #f0fdf4; border: 2px solid #16a34a; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #16a34a;">Tus números de la rifa:</h3>
            <p style="font-size: 18px; font-weight: bold; color: #333; margin: 0;">
              ${numbersText}
            </p>
          </div>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Orden:</strong> #${orderId}</p>
            <p><strong>Cantidad de números:</strong> ${numbers.length}</p>
            <p><strong>Total pagado:</strong> $${total.toLocaleString('es-AR')} ARS</p>
            <p><strong>Estado:</strong> ✅ Pagado</p>
          </div>
          
          <p>🍀 ¡Buena suerte en el sorteo!</p>
          <p>Te notificaremos cuando se realice el sorteo y si resultas ganador.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px;">
            Gracias por participar en nuestra rifa digital.<br>
            Conserva este email como comprobante de tu participación.
          </p>
        </div>
      `
    })

    if (error) {
      console.error('Error enviando email de confirmación:', error)
      return { success: false, error }
    }

    console.log('Email de confirmación enviado:', data?.id)
    return { success: true, data }
  } catch (error) {
    console.error('Error en sendPagoConfirmado:', error)
    return { success: false, error }
  }
}