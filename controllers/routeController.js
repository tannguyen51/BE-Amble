const Route = require('../models/Route');

// Get all routes
exports.getAllRoutes = async (req, res) => {
  try {
    const { difficulty, search } = req.query;
    let filter = {};

    if (difficulty && difficulty !== 'all') filter.difficulty = difficulty;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const routes = await Route.find(filter).sort({ isPopular: -1, rating: -1 });
    return res.status(200).json({ success: true, routes });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Get single route
exports.getRoute = async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);
    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found.' });
    }
    return res.status(200).json({ success: true, route });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// Get popular routes
exports.getPopularRoutes = async (req, res) => {
  try {
    const routes = await Route.find({ isPopular: true }).limit(6);
    return res.status(200).json({ success: true, routes });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};