const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Priority 1: server/.env
const serverEnvPath = path.resolve(__dirname, '../../.env');
// Priority 2: root .env (parent folder)
const rootEnvPath = path.resolve(__dirname, '../../../.env');

if (fs.existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  dotenv.config();
}

const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieSecret: process.env.COOKIE_SECRET,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  taxRateBps: parseInt(process.env.TAX_RATE_BPS || '1800', 10),
  shippingFlatMinor: parseInt(process.env.SHIPPING_FLAT_MINOR || '4900', 10),
  freeShippingMinMinor: parseInt(process.env.FREE_SHIPPING_MIN_MINOR || '99900', 10),
  lowStockThreshold: parseInt(process.env.LOW_STOCK_THRESHOLD || '5', 10)
};

module.exports = config;
