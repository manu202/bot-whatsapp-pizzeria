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
  const authPath = './auth'

  // Solo borra la carpeta la primera vez
  if (!fs.existsSync(authPath)) {
    console.log('🧹 No hay sesión previa, creando carpeta nueva.')
  } else {
    console.log('🔒 Sesión previa detectada. Intentando reconectar sin QR.')
  }

  const { state, saveCreds } = await useMultiFileAuthState(authPath)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: !fs.existsSync(`${authPath}/creds.json`), // Solo muestra el QR si no hay sesión
    defaultQueryTimeoutMs: undefined
  })

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
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

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    await handleMessage(sock, msg)
  })
}
