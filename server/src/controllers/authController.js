const authService = require('../services/authService');
const config = require('../config');

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: config.nodeEnv === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

async function register(req, res, next) {
  try {
    const { user, token } = await authService.register(req.body);
    res.cookie('token', token, COOKIE_OPTIONS);
    return res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { user, token } = await authService.login(req.body);
    res.cookie('token', token, COOKIE_OPTIONS);
    return res.status(200).json({ user, token });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    res.clearCookie('token', COOKIE_OPTIONS);
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await authService.getUserById(req.user.userId);
    return res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

async function addAddress(req, res, next) {
  try {
    const user = await authService.addAddress(req.user.userId, req.body);
    return res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

async function updateAddress(req, res, next) {
  try {
    const user = await authService.updateAddress(req.user.userId, req.params.addressId, req.body);
    return res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

async function deleteAddress(req, res, next) {
  try {
    const user = await authService.deleteAddress(req.user.userId, req.params.addressId);
    return res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  logout,
  getMe,
  addAddress,
  updateAddress,
  deleteAddress
};

