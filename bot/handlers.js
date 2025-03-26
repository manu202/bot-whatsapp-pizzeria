// bot/handlers.js
import { responderIA } from '../ia.js'
import {
  registrarPedido,
  consultarEstado,
  obtenerMenu,
  obtenerPromos,
  obtenerPedidosActivos,
  obtenerResumenDelDia
} from '../sheet.js'
import { estaDentroDelHorario, puedeHablar } from '../control.js'

const ADMIN_NUMEROS = ['595987654321@c.us'] // <-- actualizar si hace falta

export async function handleMessage(sock, msg) {
  if (!msg.message || msg.key.fromMe) return

  const numero = msg.key.remoteJid
  const texto = msg.message?.conversation || msg.message?.extendedTextMessage?.text
  const nombre = msg.pushName || ''
  if (!texto) return

  if (!estaDentroDelHorario()) {
    await sock.sendMessage(numero, { text: '🕐 Nuestro horario de atención es de 10:00 a 23:00. ¡Escribinos en ese horario!' })
    return
  }

  if (!puedeHablar(numero)) {
    await sock.sendMessage(numero, { text: '📵 Has alcanzado el límite de mensajes por hoy. Intentá mañana nuevamente.' })
    return
  }

  const textoLimpio = texto.trim().toLowerCase()

  if (ADMIN_NUMEROS.includes(numero) && textoLimpio === 'ver pedidos') {
    const activos = await obtenerPedidosActivos()
    if (activos.length === 0) {
      await sock.sendMessage(numero, { text: '📭 No hay pedidos activos por el momento.' })
      return
    }
    const resumen = activos.map(p => `📌 ${p.fecha} - ${p.cliente} (${p.numero})\n🧀 ${p.producto} x${p.cantidad} - ${p.estado}`).join('\n\n')
    await sock.sendMessage(numero, { text: `📋 Pedidos activos:\n\n${resumen}` })
    return
  }

  if (ADMIN_NUMEROS.includes(numero) && textoLimpio === 'ventas hoy') {
    const resumen = await obtenerResumenDelDia()
    await sock.sendMessage(numero, {
      text: `📈 Resumen de hoy:\n\n🧾 Total de pedidos: *${resumen.totalPedidos}*\n💰 Total vendido: *Gs. ${resumen.totalVentas}*`
    })
    return
  }

  if (textoLimpio.includes('estado') || textoLimpio.includes('pedido')) {
    const estado = await consultarEstado(numero)
    if (estado) {
      await sock.sendMessage(numero, { text: `🧾 Tu último pedido (${estado.producto}) está: *${estado.estado}*.` })
    } else {
      await sock.sendMessage(numero, { text: '🔎 No encontramos pedidos recientes con tu número.' })
    }
    return
  }

  const comandosMenu = ['menu', 'ver menu', 'el menu']
  const comandosPromo = ['promo', 'promos', 'promoción', 'promociones']

  if (comandosMenu.includes(textoLimpio)) {
    const menu = await obtenerMenu()
    if (menu.length === 0) {
      await sock.sendMessage(numero, { text: '📭 El menú está vacío por ahora.' })
      return
    }
    const lista = menu.map(item => `🍕 ${item.producto}: Gs. ${item.precio}`).join('\n')
    await sock.sendMessage(numero, { text: `📋 Nuestro menú:\n\n${lista}` })
    return
  }

  if (comandosPromo.includes(textoLimpio)) {
    const promos = await obtenerPromos()
    if (promos.length === 0) {
      await sock.sendMessage(numero, { text: '📭 No hay promociones activas en este momento.' })
      return
    }
    const lista = promos.map(p => `🎁 ${p.promo}: ${p.descripcion} (Gs. ${p.precio})`).join('\n')
    await sock.sendMessage(numero, { text: `🔥 Promos del día:\n\n${lista}` })
    return
  }

  try {
    const respuesta = await responderIA(texto)
    await sock.sendMessage(numero, { text: typeof respuesta === 'string' ? respuesta : respuesta.respuesta })

    if (typeof respuesta === 'object' && Array.isArray(respuesta.pedido)) {
      await registrarPedido({
        numero,
        cliente: nombre,
        pedido: respuesta.pedido,
        total: respuesta.total || 0
      })
    }
  } catch (err) {
    console.error('Error IA:', err.message)
  }
}