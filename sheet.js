// sheet.js
import { google } from 'googleapis'
import dotenv from 'dotenv'

dotenv.config()

const SHEET_ID = process.env.SHEET_ID

const credentials = JSON.parse(
  Buffer.from(process.env.GOOGLE_CREDENTIALS_B64, 'base64').toString('utf-8')
)

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
    range: 'Promos!A2:C'
  })

  const rows = res.data.values
  if (!rows || rows.length === 0) return []

  return rows.map(([promo, descripcion, precio]) => ({
    promo,
    descripcion,
    precio: parseInt(precio)
  }))
}

export async function registrarPedido({ numero, cliente, pedido, total }) {
  const fecha = new Date().toLocaleString('es-PY', {
    timeZone: 'America/Asuncion',
    hour12: false,
  })

  const valores = pedido.map(item => [
    fecha,
    cliente,
    numero,
    item.producto,
    item.cantidad,
    item.precio,
    item.cantidad * item.precio,
    total,
    'pendiente'
  ])

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Pedidos!A:I',
    valueInputOption: 'RAW',
    requestBody: {
      values: valores
    }
  })
}

export async function consultarEstado(numero) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Pedidos!A:I'
  })

  const rows = res.data.values
  if (!rows || rows.length === 0) return null

  const pedidosDelUsuario = rows.filter(row => row[2] === numero)
  const ultimo = pedidosDelUsuario[pedidosDelUsuario.length - 1]

  if (!ultimo) return null

  return {
    producto: ultimo[3],
    estado: ultimo[8]
  }
}

export async function obtenerPedidosActivos() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Pedidos!A:I'
  })

  const rows = res.data.values || []

  const activos = rows.filter(row => row[8] && row[8].toLowerCase() !== 'entregado')

  return activos.map(([fecha, cliente, numero, producto, cantidad, , , total, estado]) => ({
    fecha,
    cliente,
    numero,
    producto,
    cantidad,
    total,
    estado
  }))
}

export async function obtenerResumenDelDia() {
  const hoy = new Date().toLocaleDateString('es-PY')
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Pedidos!A:I'
  })

  const rows = res.data.values || []
  const pedidosDeHoy = rows.filter(row => row[0]?.startsWith(hoy))

  const totalPedidos = pedidosDeHoy.length
  const totalVentas = pedidosDeHoy.reduce((acc, row) => acc + parseInt(row[7] || 0), 0)

  return { totalPedidos, totalVentas }
}

