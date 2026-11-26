const { Prisma } = require('@prisma/client');
const multer = require('multer');
const { HttpError } = require('../lib/errors');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = 500;
  let message = 'Something went wrong';
  let details;

  if (err instanceof HttpError) {
    ({ status, message, details } = err);
  } else if (err instanceof multer.MulterError) {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Image is too large' : err.message;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      status = 409;
      message = `A record with this ${(err.meta && err.meta.target) || 'value'} already exists`;
    } else if (err.code === 'P2025') {
      status = 404;
      message = 'Not found';
    } else if (err.code === 'P2003') {
      status = 409;
      message = 'This record is still in use by other records';
    }
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid JSON body';
  }

  if (status >= 500) console.error(err);
  res.status(status).json({ error: { message, ...(details ? { details } : {}) } });
}

module.exports = { errorHandler };
