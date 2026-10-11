const router = require('express').Router();

// Betreiberangaben für Impressum und Datenschutzerklärung. Kommen aus
// Umgebungsvariablen, damit jede Instanz ihre eigenen Angaben hinterlegen
// kann, ohne dass Code geändert werden muss (siehe README "Rechtliches").
// Öffentlich (ohne Login), weil Impressum/Datenschutz auch auf der
// Anmeldeseite erreichbar sein müssen.
router.get('/', (req, res) => {
  const env = process.env;
  res.json({
    operatorName: env.LEGAL_OPERATOR_NAME || '',
    operatorAddress: env.LEGAL_OPERATOR_ADDRESS || '',
    operatorEmail: env.LEGAL_OPERATOR_EMAIL || '',
    operatorPhone: env.LEGAL_OPERATOR_PHONE || '',
    registrationOpen: env.REGISTRATION_OPEN === 'true',
  });
});

module.exports = router;
