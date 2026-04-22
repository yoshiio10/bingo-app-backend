const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'authorization']
}));

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const solicitudesRoutes = require('./routes/solicitudes');
app.use('/api/solicitudes', solicitudesRoutes);

const puntosRoutes = require('./routes/puntos');
app.use('/api/puntos', puntosRoutes);

app.get('/', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ mensaje: '✅ Servidor funcionando y conectado a la BD' });
  } catch (error) {
    res.status(500).json({ error: '❌ Error conectando a la BD' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});