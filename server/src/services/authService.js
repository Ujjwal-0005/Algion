const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const AppError = require('../errors/AppError');
const auditService = require('./auditService');

const SALT_ROUNDS = 10;

async function register({ name, email, password }) {
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw AppError.conflict('An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: 'customer',
    addresses: []
  });

  await auditService.createAuditLog({
    actorId: user._id,
    actorRole: 'customer',
    action: 'user.register',
    entityType: 'User',
    entityId: user._id,
    after: { email: user.email, role: user.role }
  });

  const token = generateToken(user);
  return { user, token };
}

async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw AppError.unauthenticated('Invalid email or password');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw AppError.unauthenticated('Invalid email or password');
  }

  const token = generateToken(user);
  return { user, token };
}

async function getUserById(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw AppError.notFound('User not found');
  }
  return user;
}

async function addAddress(userId, addressData) {
  const user = await User.findById(userId);
  if (!user) {
    throw AppError.notFound('User not found');
  }

  if (user.addresses.length >= 10) {
    throw AppError.validation('Maximum 10 addresses allowed per user');
  }

  if (addressData.isDefault || user.addresses.length === 0) {
    user.addresses.forEach(a => { a.isDefault = false; });
    addressData.isDefault = true;
  }

  user.addresses.push(addressData);
  await user.save();
  return user;
}

async function updateAddress(userId, addressId, updateData) {
  const user = await User.findById(userId);
  if (!user) {
    throw AppError.notFound('User not found');
  }

  const address = user.addresses.id(addressId);
  if (!address) {
    throw AppError.notFound('Address not found');
  }

  if (updateData.isDefault) {
    user.addresses.forEach(a => { a.isDefault = false; });
  }

  Object.assign(address, updateData);
  await user.save();
  return user;
}

async function deleteAddress(userId, addressId) {
  const user = await User.findById(userId);
  if (!user) {
    throw AppError.notFound('User not found');
  }

  const address = user.addresses.id(addressId);
  if (!address) {
    throw AppError.notFound('Address not found');
  }

  const wasDefault = address.isDefault;
  user.addresses.pull({ _id: addressId });

  if (wasDefault && user.addresses.length > 0) {
    user.addresses[0].isDefault = true;
  }

  await user.save();
  return user;
}

function generateToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
      email: user.email
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

module.exports = {
  register,
  login,
  getUserById,
  addAddress,
  updateAddress,
  deleteAddress,
  generateToken
};

