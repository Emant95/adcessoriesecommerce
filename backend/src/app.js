const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const config = require('./lib/config');
const { errorHandler } = require('./middleware/error');
const { notFound } = require('./lib/errors');

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
if (config.env !== 'test') app.use(morgan(config.isProd ? 'combined' : 'dev'));

app.use(
  '/api',
  rateLimit({ windowMs: 60 * 1000, limit: Number(process.env.API_RATE_LIMIT || 300), standardHeaders: 'draft-7', legacyHeaders: false }),
);

// Uploaded images. Served with long cache since filenames are unique.
app.use('/uploads', express.static(config.uploadDir, { maxAge: '30d', immutable: true }));

app.use('/api/admin', require('./routes/admin'));
app.use('/api', require('./routes/public'));

app.use((req, res, next) => next(notFound('Route not found')));
app.use(errorHandler);

module.exports = app;
