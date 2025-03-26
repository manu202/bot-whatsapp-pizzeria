// control.js
const HORARIO = {
    desde: 10, // 10:00 AM
    hasta: 23  // 23:00 PM
  }
  
  const usuarios = new Map()
  const LIMITE_MENSAJES = 10
  
  export function estaDentroDelHorario() {
    const hora = new Date().toLocaleTimeString('es-PY', { hour: '2-digit', hour12: false, timeZone: 'America/Asuncion' })
    return hora >= HORARIO.desde && hora < HORARIO.hasta
  }
  
  export function puedeHablar(numero) {
    const hoy = new Date().toLocaleDateString('es-PY')
    const registro = usuarios.get(numero) || { fecha: hoy, mensajes: 0 }
  
    if (registro.fecha !== hoy) {
      registro.fecha = hoy
      registro.mensajes = 0
    }
  
    if (registro.mensajes >= LIMITE_MENSAJES) return false
  
    registro.mensajes++
    usuarios.set(numero, registro)
    return true
  }
  
  export function resetearUsuario(numero) {
    usuarios.delete(numero)
  }
  