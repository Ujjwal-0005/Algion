const AppError = require('../errors/AppError');

function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const dataToValidate = req[source];
      const parsed = schema.parse(dataToValidate);
      req[source] = parsed;
      next();
    } catch (err) {
      if (err.name === 'ZodError') {
        const details = err.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }));
        return next(AppError.validation('Request validation failed', details));
      }
      next(err);
    }
  };
}

module.exports = validate;

