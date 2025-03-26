// sheet.js (migrado a Supabase optimizado)

export async function registrarPedido({ numero, cliente, pedido }) {
  const registros = pedido.map(p => ({
    numero,
    cliente,
    producto: p.producto,
    cantidad: p.cantidad,
    total: p.precio * p.cantidad,
    estado: 'pendiente'
    // fecha ya se guarda automáticamente con DEFAULT now()
  }))

  await supabase.from('pedidos').insert(registros).throwIfError()
}

export async function obtenerPedidosActivos() {
  const { data, error } = await supabase
    .from('pedidos')
    .select('*')
    .eq('estado', 'pendiente')
    .order('fecha', { ascending: false })

  if (error) throw error
  return data
}

export async function obtenerResumenDelDia() {
  const hoy = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('pedidos')
    .select('*')
    .gte('fecha', `${hoy}T00:00:00`)

  if (error) throw error

  const totalPedidos = data.length
  const totalVentas = data.reduce((sum, p) => sum + Number(p.total || 0), 0)

  return { totalPedidos, totalVentas }
}

export async function consultarEstado(numero) {
  const { data, error } = await supabase
    .from('pedidos')
    .select('producto, estado')
    .eq('numero', numero)
    .order('fecha', { ascending: false })
    .limit(1)

  if (error) throw error
  return data[0] || null
}

export async function actualizarEstadoPedido(id, nuevoEstado) {
  await supabase
    .from('pedidos')
    .update({ estado: nuevoEstado })
    .eq('id', id)
    .throwIfError()
}

export async function eliminarPedido(id) {
  await supabase
    .from('pedidos')
    .delete()
    .eq('id', id)
    .throwIfError()
}   