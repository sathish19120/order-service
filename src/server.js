const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'orders_db',
});

// Create table if not exists on startup
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      customer_name VARCHAR(255) NOT NULL,
      item VARCHAR(255) NOT NULL,
      quantity INTEGER NOT NULL,
      status VARCHAR(50) DEFAULT 'PENDING',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('Database ready — orders table exists');
}

// Health check endpoint — used by Kubernetes readiness/liveness probes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Order Service',
    version: '1.0.0',
    endpoints: ['/orders', '/orders/:id', '/health']
  });
});

// Create a new order
app.post('/orders', async (req, res) => {
  try {
    const { customer_name, item, quantity } = req.body;
    if (!customer_name || !item || !quantity) {
      return res.status(400).json({ error: 'customer_name, item and quantity are required' });
    }
    const result = await pool.query(
      `INSERT INTO orders (customer_name, item, quantity) VALUES ($1, $2, $3) RETURNING *`,
      [customer_name, item, quantity]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Get order by id
app.get('/orders/:id', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM orders WHERE id = $1`, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// List all orders
app.get('/orders', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM orders ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Update order status
app.patch('/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${allowed.join(', ')}` });
    }
    const result = await pool.query(
      `UPDATE orders SET status = $1 WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Start server after DB is ready
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Order Service running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database', err);
    process.exit(1);
  });
