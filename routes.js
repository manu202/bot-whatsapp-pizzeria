// routes.js
import express from 'express'
import { obtenerMenu, agregarProducto, actualizarProducto, eliminarProducto, registrarPedido, obtenerPedidosActivos, actualizarEstadoPedido } from './lib/supabase.js'

const router = express.Router()

// 🧾 MENÚ
router.get('/api/menu', async (req, res) => {
  try {
    const menu = await obtenerMenu()
    res.json(menu)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener el menú' })
  }
})

router.post('/api/menu', async (req, res) => {
  try {
    const result = await agregarProducto(req.body)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: 'Error al agregar producto' })
  }
})

router.put('/api/menu/:id', async (req, res) => {
  try {
    const result = await actualizarProducto(parseInt(req.params.id), req.body)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar producto' })
  }
})

router.delete('/api/menu/:id', async (req, res) => {
  try {
    const result = await eliminarProducto(parseInt(req.params.id))
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar producto' })
  }
})

// 📋 PEDIDOS
router.get('/api/pedidos/activos', async (req, res) => {
  try {
    const pedidos = await obtenerPedidosActivos()
    res.json(pedidos)
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener pedidos activos' })
  }
})

router.put('/api/pedidos/:id/estado', async (req, res) => {
  try {
    const { estado } = req.body
    await actualizarEstadoPedido(parseInt(req.params.id), estado)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar estado del pedido' })
  }
})

export default router
