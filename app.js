// Importa las bibliotecas necesarias
import express from 'express'; // Framework web para Node.js
import sqlite3 from 'sqlite3'; // Módulo para interactuar con bases de datos SQLite
import fs from 'fs'; // Módulo del sistema de archivos para leer archivos como el CSV
import csv from 'csv-parser'; // Módulo para leer archivos CSV en formato legible por JS
import path from 'path'; // Utilidades para trabajar con rutas de archivos

// Inicializa una aplicación de Express
const app = express();

// Define el puerto donde se ejecutará el servidor
const PORT = 7050;

// Middleware para parsear JSON en solicitudes POST
app.use(express.json());

// Middleware para servir archivos estáticos desde la carpeta "public"
app.use(express.static('public'));

// Ruta a la base de datos SQLite
const dbPath = './data/ventas';

// Conecta a la base de datos SQLite
const db = new sqlite3.Database(dbPath);

// Crea las tablas si no existen
db.serialize(() => {
  // Tabla "Alimentos" para registrar categorías de productos
  db.run(`CREATE TABLE IF NOT EXISTS Alimentos (
    id_alimento INTEGER PRIMARY KEY AUTOINCREMENT, // ID único autoincremental
    nombre TEXT UNIQUE NOT NULL,                   // Nombre del alimento, único
    descripcion TEXT                               // Descripción opcional
  )`);

  // Tabla "Ventas" para registrar ventas por fecha, producto y cantidad
  db.run(`CREATE TABLE IF NOT EXISTS Ventas (
    id_venta INTEGER PRIMARY KEY AUTOINCREMENT,    // ID de la venta
    fecha TEXT NOT NULL,                           // Fecha de la venta
    id_alimento INTEGER NOT NULL,                  // ID del alimento vendido
    cantidad INTEGER NOT NULL,                     // Cantidad vendida
    FOREIGN KEY (id_alimento) REFERENCES Alimentos(id_alimento) // Clave foránea
  )`);
});

/**
 * Carga los datos del archivo CSV si aún no hay registros en la tabla "Ventas"
 */
function cargarDatosCSV() {
  // Consulta para verificar si ya hay datos en la tabla "Ventas"
  db.get('SELECT COUNT(*) as count FROM Ventas', (err, row) => {
    if (err || row.count > 0) return; // Si hay error o ya hay datos, no se carga

    console.log('Cargando y transformando datos desde el CSV...');

    // Categorías de productos esperadas en el archivo CSV
    const categoriasAlimentos = [
      'Carnes', 'Verduras', 'Frutas', 'Bebidas', 'Lacteos',
      'Panificados', 'Limpieza', 'Perfumeria', 'Alimentos Secos',
      'Congelados', 'Fiambres'
    ];

    db.serialize(() => {
      db.run('BEGIN TRANSACTION'); // Inicia una transacción para inserciones masivas

      // Inserta las categorías como alimentos si no existen
      const stmtAlimentos = db.prepare('INSERT OR IGNORE INTO Alimentos (nombre, descripcion) VALUES (?, ?)');
      categoriasAlimentos.forEach(cat =>
        stmtAlimentos.run(cat, `Categoría: ${cat}`)
      );
      stmtAlimentos.finalize();

      // Consulta los IDs de las categorías insertadas para mapearlos luego
      db.all('SELECT id_alimento, nombre FROM Alimentos', (err, alimentos) => {
        if (err) { db.run('ROLLBACK'); return; } // Si hay error, se revierte la transacción

        // Crea un mapa: { nombre: id_alimento }
        const mapaAlimentos = alimentos.reduce(
          (acc, alim) => ({ ...acc, [alim.nombre]: alim.id_alimento }),
          {}
        );

        // Prepara la sentencia de inserción de ventas
        const stmtVentas = db.prepare('INSERT INTO Ventas (fecha, id_alimento, cantidad) VALUES (?, ?, ?)');

        // Lee el archivo CSV
        fs.createReadStream('./data/VentasProductosSupermercados.csv')
          .pipe(csv())
          .on('data', (row) => {
            // Para cada fila del CSV, se verifica cada categoría
            for (const categoria in mapaAlimentos) {
              if (row[categoria]) {
                // Si hay datos para esa categoría, inserta la venta
                stmtVentas.run(row.indice_tiempo, mapaAlimentos[categoria], parseInt(row[categoria], 10));
              }
            }
          })
          .on('end', () => {
            // Finaliza la transacción una vez que se insertaron todos los datos
            stmtVentas.finalize(() => {
              db.run('COMMIT');
              console.log('Carga de datos completada.');
            });
          });
      });
    });
  });
}

/**
 * API: Devuelve todas las categorías de alimentos
 */
app.get('/api/alimentos', (req, res) => {
  db.all('SELECT * FROM Alimentos ORDER BY nombre', (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error al consultar alimentos' });
    res.json({ data: rows });
  });
});

/**
 * API: Devuelve todas las ventas registradas
 */
app.get('/api/ventas', (req, res) => {
  const sql = `
    SELECT V.id_venta, V.fecha, A.nombre as producto, V.cantidad 
    FROM Ventas V 
    JOIN Alimentos A ON V.id_alimento = A.id_alimento
    ORDER BY V.fecha, producto
  `;
  db.all(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error al consultar ventas' });
    res.json({ data: rows });
  });
});

/**
 * API: Devuelve ventas de una fecha específica (formato exacto)
 */
app.get('/api/ventas/fecha/:fecha', (req, res) => {
  const { fecha } = req.params;
  const sql = `
    SELECT V.id_venta, V.fecha, A.nombre as producto, V.cantidad 
    FROM Ventas V 
    JOIN Alimentos A ON V.id_alimento = A.id_alimento
    WHERE V.fecha = ? ORDER BY producto
  `;
  db.all(sql, [fecha], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error al consultar ventas por fecha' });
    if (!rows.length) return res.status(404).json({ mensaje: 'No se encontraron ventas para esa fecha.' });
    res.json({ data: rows });
  });
});

/**
 * API: Devuelve ventas en un rango de fechas usando parámetros de consulta
 * Ejemplo: /api/ventas/rango_fecha?desde=2023-01-01&hasta=2023-02-01
 */
app.get('/api/ventas/rango_fecha', (req, res) => {
  const { desde, hasta } = req.query;
  if (!desde || !hasta) return res.status(400).json({ error: 'Se requieren fechas "desde" y "hasta".' });

  const sql = `
    SELECT V.id_venta, V.fecha, A.nombre as producto, V.cantidad 
    FROM Ventas V 
    JOIN Alimentos A ON V.id_alimento = A.id_alimento
    WHERE V.fecha BETWEEN ? AND ? 
    ORDER BY V.fecha, producto
  `;
  db.all(sql, [desde, hasta], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error al consultar ventas por rango de fecha' });
    res.json({ data: rows });
  });
});

/**
 * API: Agrega una nueva venta
 */
app.post('/api/ventas', (req, res) => {
  const { fecha, id_alimento, cantidad } = req.body;

  if (!fecha || !id_alimento || cantidad == null)
    return res.status(400).json({ error: 'Faltan datos.' });

  const sql = 'INSERT INTO Ventas (fecha, id_alimento, cantidad) VALUES (?, ?, ?)';
  db.run(sql, [fecha, id_alimento, cantidad], function(err) {
    if (err) return res.status(500).json({ error: 'Error al crear la venta' });
    res.status(201).json({ mensaje: 'Venta agregada', id_venta: this.lastID, ...req.body });
  });
});

/**
 * API: Actualiza la cantidad de una venta existente
 */
app.put('/api/ventas/:id', (req, res) => {
  const { id } = req.params;
  const { cantidad } = req.body;

  if (cantidad == null)
    return res.status(400).json({ error: 'Se requiere la nueva cantidad.' });

  const sql = 'UPDATE Ventas SET cantidad = ? WHERE id_venta = ?';
  db.run(sql, [cantidad, id], function(err) {
    if (err) return res.status(500).json({ error: `Error al actualizar la venta ${id}` });
    if (this.changes === 0)
      return res.status(404).json({ error: `Venta con ID ${id} no encontrada.` });

    res.json({ mensaje: 'Venta actualizada', cambios: this.changes });
  });
});

/**
 * API: Elimina una venta por su ID
 */
app.delete('/api/ventas/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM Ventas WHERE id_venta = ?';
  db.run(sql, id, function(err) {
    if (err) return res.status(500).json({ error: `Error al eliminar la venta ${id}` });
    if (this.changes === 0)
      return res.status(404).json({ error: `Venta con ID ${id} no encontrada.` });

    res.json({ mensaje: 'Venta eliminada', cambios: this.changes });
  });
});

// Inicia el servidor y llama a la función para cargar los datos desde el CSV
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  cargarDatosCSV(); // Solo si no hay datos en la tabla "Ventas"
});
