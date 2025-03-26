// index.js

import dotenv from 'dotenv'
import express from 'express'
import routes from './routes.js'
import { startSock } from './bot/startSock.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())
app.use(routes) // ✅ Usa todas las rutas centralizadas

startSock() // 🟢 Inicia el bot de WhatsApp

app.get('/', (req, res) => {
  res.send('✅ Bot WhatsApp activo con Baileys + Railway + Groq + Supabase')
})

app.listen(PORT, () => {
  console.log(`🚀 Servidor activo en el puerto ${PORT}`)
})
