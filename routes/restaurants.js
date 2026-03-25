const express = require('express');
const router = express.Router();
const {
  getAll,
  getFeatured,
  getById,
} = require('../controllers/restaurantController');

// QUAN TRỌNG: /featured phải đặt TRƯỚC /:id
// nếu không Express sẽ hiểu "featured" là một :id

// GET /api/restaurants/featured
router.get('/featured', getFeatured);

// GET /api/restaurants?city=&cuisine=&category=&search=
router.get('/', getAll);

// GET /api/restaurants/:id
router.get('/:id', getById);

module.exports = router;