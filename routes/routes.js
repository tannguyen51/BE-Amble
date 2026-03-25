const express = require('express');
const router = express.Router();
const { getAllRoutes, getRoute, getPopularRoutes } = require('../controllers/routeController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getAllRoutes);
router.get('/popular', protect, getPopularRoutes);
router.get('/:id', protect, getRoute);

module.exports = router;