const jwt = require('jsonwebtoken');
const config = require('../config');
const AppError = require('../errors/AppError');

function requireAuth(req, res, next) {
  let token = null;

  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7);
  }

  if (!token) {
    return next(AppError.unauthenticated('Authentication token missing'));
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    return next(AppError.unauthenticated('Invalid or expired authentication token'));
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return next(AppError.unauthenticated('Authentication required'));
    }
    if (req.user.role !== role) {
      return next(AppError.forbidden(`Access restricted to ${role} role`));
    }
    next();
  };
}

module.exports = {
  requireAuth,
  requireRole
};

