const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }  // 👈 agrega esta línea
});

// REGISTRO
router.post('/registro', async (req, res) => {
  const { nombre, email, telefono, contrasena, rol, colonia } = req.body;
  try {
    // Verificar si el email ya existe
    const existe = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existe.rows.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }
    // Encriptar contraseña
    const hash = await bcrypt.hash(contrasena, 10);
    // Guardar usuario
    const resultado = await pool.query(
      `INSERT INTO usuarios (nombre, email, telefono, contrasena_hash, rol, colonia)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, nombre, email, rol`,
      [nombre, email, telefono, hash, rol, colonia]
    );
    res.status(201).json({ mensaje: 'Usuario registrado correctamente', usuario: resultado.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  const { email, contrasena } = req.body;
  try {
    // Buscar usuario
    const resultado = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (resultado.rows.length === 0) {
      return res.status(400).json({ error: 'Email o contraseña incorrectos' });
    }
    const usuario = resultado.rows[0];
    // Verificar contraseña
    const valida = await bcrypt.compare(contrasena, usuario.contrasena_hash);
    if (!valida) {
      return res.status(400).json({ error: 'Email o contraseña incorrectos' });
    }
    // Generar token
    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      mensaje: 'Login exitoso',
      token,
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

module.exports = router;