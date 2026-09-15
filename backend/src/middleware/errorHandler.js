function notFound(req, res) {
  res.status(404).json({ error: 'Route nicht gefunden.' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.name === 'ZodError') {
    return res.status(400).json({ error: 'Validierungsfehler.', details: err.errors });
  }

  if (err instanceof require('multer').MulterError) {
    return res.status(400).json({ error: err.message });
  }

  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Interner Serverfehler.' });
}

module.exports = { notFound, errorHandler };
