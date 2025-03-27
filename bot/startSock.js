// bot/startSock.js
import {
  makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import { handleMessage } from './handlers.js'

export async function startSock() {
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    printQRInTerminal: true, // Siempre muestra el QR en consola
    auth: undefined, // No guarda ni carga sesión
    defaultQueryTimeoutMs: undefined
  })

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      const qrLink = `https://quickchart.io/qr?text=${encodeURIComponent(qr)}`
      console.log('📱 Escaneá este QR desde WhatsApp:')
      console.log(qrLink)
    }

    if (connection === 'close') {
      const shouldReconnect = !(
        lastDisconnect?.error instanceof Boom &&
        lastDisconnect.error.output?.statusCode === DisconnectReason.loggedOut
      )

      console.log('❌ Conexión cerrada. Reintentando:', shouldReconnect)
      if (shouldReconnect) startSock()
    } else if (connection === 'open') {
      console.log('✅ Bot conectado a WhatsApp')
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    await handleMessage(sock, msg)
  })
}
