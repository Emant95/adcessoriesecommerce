const { badRequest } = require('../lib/errors');

// Validate req[source] against a zod schema and replace it with the parsed value.
const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return next(badRequest('Please check the highlighted fields', details));
  }
  req[source === 'query' ? 'validQuery' : source] = result.data;
  next();
};

module.exports = { validate };
