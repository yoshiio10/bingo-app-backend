const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Middleware para verificar token
const verificarToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// CREAR SOLICITUD (solo residentes)
router.post('/', verificarToken, async (req, res) => {
  if (req.usuario.rol !== 'residente') {
    return res.status(403).json({ error: 'Solo los residentes pueden crear solicitudes' });
  }
  const { descripcion, tipo_residuo, lat, lng, direccion } = req.body;
  try {
    const resultado = await pool.query(
      `INSERT INTO solicitudes (usuario_id, descripcion, tipo_residuo, lat, lng, direccion)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.usuario.id, descripcion, tipo_residuo, lat, lng, direccion]
    );
    res.status(201).json({ mensaje: 'Solicitud creada', solicitud: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear solicitud' });
  }
});

// VER SOLICITUDES PENDIENTES (solo recicladores)
router.get('/pendientes', verificarToken, async (req, res) => {
  if (req.usuario.rol !== 'reciclador') {
    return res.status(403).json({ error: 'Solo los recicladores pueden ver solicitudes pendientes' });
  }
  try {
    const resultado = await pool.query(
      `SELECT s.*, u.nombre as nombre_residente, u.telefono
       FROM solicitudes s
       JOIN usuarios u ON s.usuario_id = u.id
       WHERE s.estado = 'pendiente'
       ORDER BY s.creado_en DESC`
    );
    res.json({ solicitudes: resultado.rows });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
});

// VER MIS SOLICITUDES (residente ve las suyas)
router.get('/mis-solicitudes', verificarToken, async (req, res) => {
  if (req.usuario.rol !== 'residente') {
    return res.status(403).json({ error: 'Solo los residentes pueden ver sus solicitudes' });
  }
  try {
    const resultado = await pool.query(
      `SELECT * FROM solicitudes WHERE usuario_id = $1 ORDER BY creado_en DESC`,
      [req.usuario.id]
    );
    res.json({ solicitudes: resultado.rows });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
});

// ACEPTAR SOLICITUD (solo recicladores)
router.put('/:id/aceptar', verificarToken, async (req, res) => {
  if (req.usuario.rol !== 'reciclador') {
    return res.status(403).json({ error: 'Solo los recicladores pueden aceptar solicitudes' });
  }
  try {
    await pool.query(
      `UPDATE solicitudes SET estado = 'aceptada' WHERE id = $1 AND estado = 'pendiente'`,
      [req.params.id]
    );
    await pool.query(
      `INSERT INTO asignaciones (solicitud_id, reciclador_id) VALUES ($1, $2)`,
      [req.params.id, req.usuario.id]
    );
    res.json({ mensaje: 'Solicitud aceptada correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al aceptar solicitud' });
  }
});

// COMPLETAR SOLICITUD (solo recicladores)
router.put('/:id/completar', verificarToken, async (req, res) => {
  if (req.usuario.rol !== 'reciclador') {
    return res.status(403).json({ error: 'Solo los recicladores pueden completar solicitudes' });
  }
  try {
    await pool.query(
      `UPDATE solicitudes SET estado = 'completada', completado_en = NOW() WHERE id = $1`,
      [req.params.id]
    );
    res.json({ mensaje: 'Solicitud completada correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al completar solicitud' });
  }
});

module.exports = router;