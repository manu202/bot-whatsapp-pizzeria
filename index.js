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
import { registrarPedido } from './sheet.js'

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
    if (!msg.message) return

    const numero = msg.key.remoteJid
    const texto = msg.message?.conversation || msg.message?.extendedTextMessage?.text
    if (!texto) return

    try {
      const respuesta = await responderIA(texto)
      await sock.sendMessage(numero, { text: typeof respuesta === 'string' ? respuesta : respuesta.text })

      if (typeof respuesta === 'object' && respuesta.pedido) {
        await registrarPedido({
          cliente: '',
          numero,
          producto: respuesta.pedido.producto,
          cantidad: respuesta.pedido.cantidad,
          precioUnitario: respuesta.pedido.precio,
          observaciones: respuesta.pedido.observaciones || ''
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
