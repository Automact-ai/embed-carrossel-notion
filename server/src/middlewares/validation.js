const { body, validationResult } = require('express-validator');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// Middleware para verificar erros de validação
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: errors.array()
    });
  }
  next();
};

// Middleware para sanitizar HTML
const sanitizeHtml = (field) => {
  return (req, res, next) => {
    if (req.body[field]) {
      req.body[field] = DOMPurify.sanitize(req.body[field], {
        ALLOWED_TAGS: ['br', 'p', 'strong', 'em', 'u'],
        ALLOWED_ATTR: []
      });
    }
    next();
  };
};

// Validações para criação de carrossel
const validateCreateCarousel = [
  body('title')
    .notEmpty()
    .withMessage('Título é obrigatório')
    .isLength({ min: 1, max: 100 })
    .withMessage('Título deve ter entre 1 e 100 caracteres')
    .trim(),
  
  body('caption')
    .optional()
    .isLength({ max: 2200 })
    .withMessage('Legenda não pode ter mais de 2200 caracteres')
    .trim(),
  
  sanitizeHtml('caption'),
  handleValidationErrors
];

// Validações para atualização de carrossel
const validateUpdateCarousel = [
  body('title')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Título deve ter entre 1 e 100 caracteres')
    .trim(),
  
  body('caption')
    .optional()
    .isLength({ max: 2200 })
    .withMessage('Legenda não pode ter mais de 2200 caracteres')
    .trim(),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive deve ser um valor booleano'),
  
  sanitizeHtml('caption'),
  handleValidationErrors
];

// Validação para parâmetros de ID
const validateId = [
  body('id')
    .optional()
    .matches(/^[a-zA-Z0-9]+$/)
    .withMessage('ID deve conter apenas caracteres alfanuméricos'),
  
  handleValidationErrors
];

module.exports = {
  validateCreateCarousel,
  validateUpdateCarousel,
  validateId,
  handleValidationErrors,
  sanitizeHtml
}; 