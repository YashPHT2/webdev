const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  // 1. Try to get token from cookie
  const token = req.cookies.token;

  if (!token) {
    // No token found
    if (req.originalUrl.startsWith('/api')) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }
    return res.redirect('/login');
  }

  try {
    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Find user in DB (and attach to request)
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      res.clearCookie('token');
      if (req.originalUrl.startsWith('/api')) {
        return res.status(401).json({ message: 'Not authorized, please login' });
      }
      return res.redirect('/login');
    }

    next(); // User is good, proceed to the page
  } catch (error) {
    console.error('Auth Error:', error.message);
    res.clearCookie('token');
    if (req.originalUrl.startsWith('/api')) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
    return res.redirect('/login');
  }
};

// Middleware to check if user is ALREADY logged in (to redirect away from login page)
const redirectIfLoggedIn = (req, res, next) => {
  const token = req.cookies.token;
  if (token) {
    try {
      jwt.verify(token, process.env.JWT_SECRET);
      return res.redirect('/'); // Already logged in, go to dashboard
    } catch (error) {
      next(); // Token invalid, let them see login page
    }
  } else {
    next(); // No token, let them see login page
  }
};

module.exports = { protect, redirectIfLoggedIn };
