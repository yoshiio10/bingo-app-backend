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

// VER TODOS LOS PUNTOS
router.get('/', verificarToken, async (req, res) => {
  try {
    const resultado = await pool.query(
      'SELECT * FROM puntos_recoleccion WHERE activo = true ORDER BY nombre'
    );
    res.json({ puntos: resultado.rows });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener puntos' });
  }
});

// AGREGAR PUNTO (cualquier usuario)
router.post('/', verificarToken, async (req, res) => {
  const { nombre, direccion, lat, lng, tipos_residuos, horario_apertura, horario_cierre } = req.body;
  try {
    const resultado = await pool.query(
      `INSERT INTO puntos_recoleccion (nombre, direccion, lat, lng, tipos_residuos, horario_apertura, horario_cierre)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [nombre, direccion, lat, lng, tipos_residuos, horario_apertura, horario_cierre]
    );
    res.status(201).json({ mensaje: 'Punto agregado', punto: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error al agregar punto' });
  }
});

module.exports = router;