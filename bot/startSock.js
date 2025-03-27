import pkg from '@whiskeysockets/baileys'
const {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = pkg

import { Boom } from '@hapi/boom'
import { handleMessage } from './handlers.js'
import fs from 'fs'

export async function startSock() {
  try {
    fs.rmSync('./auth', { recursive: true, force: true })
    console.log('🧹 Sesión anterior eliminada')
  } catch {
    console.log('ℹ️ No había sesión previa para borrar')
  }

  const { state, saveCreds } = await useMultiFileAuthState('./auth')
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true, // 👈 Esto mostrará el QR en tu consola
    defaultQueryTimeoutMs: undefined
  })

  sock.ev.on('connection.update', ({ connection }) => {
    if (connection === 'close') {
      console.log('❌ Conexión cerrada. Reintentando...')
      startSock()
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
