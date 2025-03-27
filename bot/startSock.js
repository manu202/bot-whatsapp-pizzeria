// bot/startSock.js
import {
  makeWASocket,
  useSingleFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import { handleMessage } from './handlers.js'
import fs from 'fs'

export async function startSock() {
  // 🧹 Elimina la sesión anterior para forzar QR nuevo
  try {
    fs.unlinkSync('./session.json')
    console.log('🧹 Sesión anterior eliminada')
  } catch (err) {
    console.log('ℹ️ No había sesión previa para borrar')
  }

  const { state, saveState } = await useSingleFileAuthState('./session.json')
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
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
      const shouldReconnect =
        !(
          lastDisconnect?.error instanceof Boom &&
          lastDisconnect.error.output?.statusCode === DisconnectReason.loggedOut
        )

      console.log('❌ Conexión cerrada. Reintentando:', shouldReconnect)
      if (shouldReconnect) startSock()
    } else if (connection === 'open') {
      console.log('✅ Bot conectado a WhatsApp')
    }
  })

  sock.ev.on('creds.update', saveState)

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    await handleMessage(sock, msg)
  })
}
