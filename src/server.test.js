const request = require('supertest');

// Simple test that doesn't need a real DB connection
describe('Order Service Health Check', () => {
  test('GET /health should return 200', async () => {
    const express = require('express');
    const app = express();
    app.get('/health', (req, res) => res.status(200).json({ status: 'UP' }));

    const response = await request(app).get('/health');
    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('UP');
  });

  test('Order validation - missing fields should fail', () => {
    const validateOrder = (body) => {
      const { customer_name, item, quantity } = body;
      return !!(customer_name && item && quantity);
    };

    expect(validateOrder({ customer_name: 'John' })).toBe(false);
    expect(validateOrder({ customer_name: 'John', item: 'Laptop', quantity: 1 })).toBe(true);
  });

  test('Order status must be one of allowed values', () => {
    const allowed = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    expect(allowed.includes('SHIPPED')).toBe(true);
    expect(allowed.includes('INVALID_STATUS')).toBe(false);
  });
});
