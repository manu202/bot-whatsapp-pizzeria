import express from 'express'
import * as crypto from 'crypto'
import * as qrcode from 'qrcode'
import { Boom } from '@hapi/boom'
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys'

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

  // Manejador de mensajes entrantes con lógica tipo IA
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
    const numero = msg.key.remoteJid

    let respuesta = ''
    if (texto.toLowerCase().includes('hola')) {
      respuesta = '¡Hola! ¿Cómo estás? 😊'
    } else if (texto.toLowerCase().includes('precio')) {
      respuesta = 'Tenemos promo de muzzarella a Gs. 25.000 🍕'
    } else {
      respuesta = 'No entendí muy bien 😅 ¿Podés repetir?'
    }

    await sock.sendMessage(numero, { text: respuesta })
  })

  // Endpoint para enviar mensajes
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
  res.send('✅ Bot WhatsApp activo con Baileys + Railway')
})

app.listen(PORT, () => console.log(`🚀 Servidor activo en el puerto ${PORT}`))
