// sheet.js
import { google } from 'googleapis'
import dotenv from 'dotenv'

dotenv.config()
console.log('GOOGLE_CREDENTIALS_B64 LENGTH:', process.env.GOOGLE_CREDENTIALS_B64?.length)

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
  

  export async function registrarPedido({ numero, mensaje }) {
    const fecha = new Date().toLocaleString('es-PY', {
      timeZone: 'America/Asuncion',
      hour12: false,
    });
  
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'Pedidos!A:D',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[fecha, numero, mensaje, '']],
      },
    });
  }
  