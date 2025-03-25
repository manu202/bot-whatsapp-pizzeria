// ia.js
import fetch from 'node-fetch'
import dotenv from 'dotenv'
import { obtenerMenu, obtenerPromos } from './sheet.js'
dotenv.config()

const GROQ_API_KEY = process.env.GROQ_API_KEY

export async function responderIA(prompt) {
  try {
    const menu = await obtenerMenu()
    const promos = await obtenerPromos()

    const menuTexto = menu.map(item => `- ${item.producto}: Gs. ${item.precio}`).join('\n')
    const promosTexto = promos.map(p => `- ${p.promo}: ${p.descripcion}`).join('\n')

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-r1-distill-qwen-32b',
        messages: [
          {
            role: 'system',
            content: `Sos un asistente de pedidos para una pizzería en Paraguay. Respondé en castellano, sé amable, claro y directo. El menú es:\n${menuTexto}\n\nPromociones del día:\n${promosTexto}\n\nSi el usuario hace un pedido, confirmalo con precio total. Si pregunta algo, respondé con base en el menú. Al final, si el mensaje es un pedido, devolvé un JSON con la respuesta y los campos: producto, cantidad, precio, observaciones.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7
      })
    })

    if (!response.ok) {
      console.error(`❌ Error de Groq: ${response.statusText}`)
      return 'Ocurrió un error al generar la respuesta.'
    }

    const data = await response.json()
    const contenido = data.choices?.[0]?.message?.content || 'Lo siento, no pude generar una respuesta.'

    try {
      const parsed = JSON.parse(contenido)
      return parsed
    } catch {
      return contenido
    }
  } catch (err) {
    console.error('❌ Error al conectarse con Groq:', err)
    return 'Error al contactar la IA. Intentá más tarde.'
  }
}
