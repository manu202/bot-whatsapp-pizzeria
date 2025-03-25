// sheet.js
import { google } from 'googleapis'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config()

const SHEET_ID = process.env.SHEET_ID
const credentials = JSON.parse(fs.readFileSync('./credentials.json'))

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
})

const sheets = google.sheets({ version: 'v4', auth })

export async function obtenerMenu() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Menu!A2:D'
  })

  const rows = res.data.values
  if (!rows || rows.length === 0) return []

  return rows
    .filter(row => row[3]?.toLowerCase() === 'sí')
    .map(([producto, descripcion, precio, disponible]) => ({
      producto,
      descripcion,
      precio: parseInt(precio),
      disponible
    }))
}

export async function obtenerPromos() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Promos!A2:B'
  })

  const rows = res.data.values
  if (!rows || rows.length === 0) return []

  return rows.map(([promo, descripcion]) => ({ promo, descripcion }))
}

export async function registrarPedido({ cliente, numero, producto, cantidad, precioUnitario, observaciones }) {
  const fecha = new Date().toLocaleString('es-PY', { timeZone: 'America/Asuncion' })
  const total = cantidad * precioUnitario
  const fila = [
    fecha,
    cliente || '',
    numero,
    producto,
    cantidad,
    precioUnitario,
    total,
    'Pendiente',
    observaciones || ''
  ]

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Pedidos!A:I',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [fila]
    }
  })
} 
