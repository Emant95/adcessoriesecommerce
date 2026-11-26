const path = require('path');

const env = process.env.NODE_ENV || 'development';

const config = {
  env,
  isProd: env === 'production',
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  uploadDir: path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads')),
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB || 5),
  publicSiteUrl: (process.env.PUBLIC_SITE_URL || 'http://localhost:8080').replace(/\/$/, ''),
  cookieSecure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : env === 'production',
};

if (!config.jwtSecret) {
  if (config.isProd) {
    throw new Error('JWT_SECRET must be set in production');
  }
  config.jwtSecret = 'dev-only-insecure-secret-change-me';
}

module.exports = config;
