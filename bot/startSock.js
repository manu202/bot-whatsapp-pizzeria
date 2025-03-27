// bot/startSock.js
import fs from 'fs'
import { Boom } from '@hapi/boom'
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys'

import { handleMessage } from './handlers.js'

// 🔁 Borrar la carpeta auth antes de iniciar sesión
try {
  fs.rmSync('./auth', { recursive: true, force: true })
  console.log('🧹 Auth eliminado antes de iniciar sesión')
} catch (err) {
  console.error('No se pudo borrar /auth:', err.message)
}

export async function startSock(server) {
  const { state, saveCreds } = await useMultiFileAuthState('auth')
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true, // También muestra el QR en consola
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

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    await handleMessage(sock, msg)
  })
}
