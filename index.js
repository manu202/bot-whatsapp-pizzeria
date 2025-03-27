// index.js


import dotenv from 'dotenv'
dotenv.config()
console.log('🔍 ENV SUPABASE_URL:', process.env.SUPABASE_URL)
import express from 'express'
import routes from './routes.js'
import { startSock } from './bot/startSock.js'




const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())
app.use(routes) // ✅ Usa todas las rutas centralizadas

import fs from 'fs'

try {
  fs.rmSync('./auth', { recursive: true, force: true })
  console.log('🧹 Carpeta auth eliminada. Se pedirá nuevo QR.')
} catch (err) {
  console.log('ℹ️ No había carpeta auth previa')
}


startSock() // 🟢 Inicia el bot de WhatsApp

app.get('/', (req, res) => {
  res.send('✅ Bot WhatsApp activo con Baileys + Railway + Groq + Supabase')
})

app.listen(PORT, () => {
  console.log(`🚀 Servidor activo en el puerto ${PORT}`)
})
