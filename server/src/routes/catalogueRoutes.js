const express = require('express');
const catalogueController = require('../controllers/catalogueController');

const router = express.Router();

// GET /api/categories
router.get('/categories', catalogueController.listCategories);

// GET /api/products
router.get('/products', catalogueController.listProducts);

// GET /api/products/:slug
router.get('/products/:slug', catalogueController.getProductBySlug);

module.exports = router;

