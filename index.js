// Proyecto base Baileys para Railway
// index.js
import * as crypto from 'crypto'
global.crypto = crypto

import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys'

import express from 'express';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const startSock = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    printQRInTerminal: true,
    auth: state,
    defaultQueryTimeoutMs: undefined
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) qrcode.generate(qr, { small: true });

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('connection closed due to', lastDisconnect?.error, ', reconnecting', shouldReconnect);
      if (shouldReconnect) startSock();
    } else if (connection === 'open') {
      console.log('Conectado a WhatsApp ✅');
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // Endpoint para enviar mensajes
  app.post('/send', async (req, res) => {
    const { numero, mensaje } = req.body;
    if (!numero || !mensaje) {
      return res.status(400).json({ status: 'error', message: 'Faltan datos' });
    }
    try {
      const jid = numero.includes('@s.whatsapp.net') ? numero : numero + '@s.whatsapp.net';
      await sock.sendMessage(jid, { text: mensaje });
      return res.json({ status: 'ok', message: 'Mensaje enviado' });
    } catch (error) {
      return res.status(500).json({ status: 'error', message: error.message });
    }
  });
};

startSock();

app.get('/', (req, res) => {
  res.send('Bot WhatsApp con Baileys activo 🚀');
});

app.listen(PORT, () => console.log(`Servidor escuchando en el puerto ${PORT}`));
