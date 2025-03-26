// index.js
import express from 'express'
import * as crypto from 'crypto'
import * as qrcode from 'qrcode'
import { Boom } from '@hapi/boom'
import dotenv from 'dotenv'
dotenv.config()

import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys'

import { responderIA } from './ia.js'
import { registrarPedido, consultarEstado, obtenerMenu, obtenerPromos, obtenerPedidosActivos, obtenerResumenDelDia } from './sheet.js'
import { estaDentroDelHorario, puedeHablar } from './control.js'

const ADMIN_NUMEROS = ['595987654321@c.us'] // <-- tu número aquí

global.crypto = crypto
const app = express()
const PORT = process.env.PORT || 3000
app.use(express.json())

const startSock = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('auth')
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    defaultQueryTimeoutMs: undefined
  })

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      const qrLink = `https://quickchart.io/qr?text=${encodeURIComponent(qr)}`
      console.log('📱 Escaneá este QR desde WhatsApp:')
      console.log(qrLink)
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      console.log('❌ Conexión cerrada. Reintentando:', shouldReconnect)
      if (shouldReconnect) startSock()
    } else if (connection === 'open') {
      console.log('✅ Bot conectado a WhatsApp')
    }
  })

  sock.ev.on('creds.update', saveCreds)

  // IA: responder mensajes y registrar pedidos si aplica
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return // Ignorar salientes

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

    // ADMIN: ver pedidos activos
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

    // ADMIN: resumen de ventas del día
    if (ADMIN_NUMEROS.includes(numero) && textoLimpio === 'ventas hoy') {
      const resumen = await obtenerResumenDelDia()
      await sock.sendMessage(numero, {
        text: `📈 Resumen de hoy:\n
🧾 Total de pedidos: *${resumen.totalPedidos}*\n💰 Total vendido: *Gs. ${resumen.totalVentas}*`
      })
      return
    }

    // Estado del pedido
    if (textoLimpio.includes('estado') || textoLimpio.includes('pedido')) {
      const estado = await consultarEstado(numero)
      if (estado) {
        await sock.sendMessage(numero, { text: `🧾 Tu último pedido (${estado.producto}) está: *${estado.estado}*.` })
      } else {
        await sock.sendMessage(numero, { text: '🔎 No encontramos pedidos recientes con tu número.' })
      }
      return
    }

    // Comandos exactos para menú y promociones
    const comandosMenu = ['menu', 'ver menu', 'el menu']
    const comandosPromo = ['promo', 'promos', 'promoción', 'promociones']

    if (comandosMenu.includes(textoLimpio)) {
      const menu = await obtenerMenu()
      if (menu.length === 0) {
        await sock.sendMessage(numero, { text: '📭 El menú está vacío por ahora.' })
        return
      }
      const lista = menu.map(item => `🍕 ${item.producto}: Gs. ${item.precio}`).join('\n')
      await sock.sendMessage(numero, { text: `📋 Nuestro menú:

${lista}` })
      return
    }

    if (comandosPromo.includes(textoLimpio)) {
      const promos = await obtenerPromos()
      if (promos.length === 0) {
        await sock.sendMessage(numero, { text: '📭 No hay promociones activas en este momento.' })
        return
      }
      const lista = promos.map(p => `🎁 ${p.promo}: ${p.descripcion} (Gs. ${p.precio})`).join('\n')
      await sock.sendMessage(numero, { text: `🔥 Promos del día:

${lista}` })
      return
    }

    // Procesar con IA
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
  })

  // Endpoint manual para enviar mensajes
  app.post('/send', async (req, res) => {
    const { numero, mensaje } = req.body
    if (!numero || !mensaje) {
      return res.status(400).json({ status: 'error', message: 'Faltan datos' })
    }
    try {
      const jid = numero.includes('@s.whatsapp.net') ? numero : numero + '@s.whatsapp.net'
      await sock.sendMessage(jid, { text: mensaje })
      return res.json({ status: 'ok', message: 'Mensaje enviado' })
    } catch (error) {
      return res.status(500).json({ status: 'error', message: error.message })
    }
  })
}

startSock()

app.get('/', (req, res) => {
  res.send('✅ Bot WhatsApp activo con Baileys + Railway + Groq + Sheets')
})

app.listen(PORT, () => console.log(`🚀 Servidor activo en el puerto ${PORT}`))

