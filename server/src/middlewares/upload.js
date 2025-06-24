const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Garantir que a pasta uploads existe
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuração do storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `carousel-${uniqueSuffix}${ext}`);
  }
});

// Filtro de arquivos
const fileFilter = (req, file, cb) => {
  // Verificar tipo MIME
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Apenas imagens JPEG, PNG e WebP são permitidas'), false);
  }
};

// Configuração do multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10 // Máximo 10 arquivos
  }
});

// Middleware para processar imagens após upload
const processImages = async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next();
  }

  try {
    const processedFiles = [];

    for (const file of req.files) {
      // Verificar se é realmente uma imagem usando sharp
      try {
        const metadata = await sharp(file.path).metadata();
        
        // Criar versão otimizada
        const optimizedPath = file.path.replace(path.extname(file.path), '-optimized.webp');
        
        await sharp(file.path)
          .resize(1080, 1080, { 
            fit: 'inside', 
            withoutEnlargement: true 
          })
          .webp({ quality: 85 })
          .toFile(optimizedPath);

        // Criar thumbnail
        const thumbnailPath = file.path.replace(path.extname(file.path), '-thumb.webp');
        
        await sharp(file.path)
          .resize(300, 300, { 
            fit: 'cover' 
          })
          .webp({ quality: 80 })
          .toFile(thumbnailPath);

        processedFiles.push({
          ...file,
          optimizedPath,
          thumbnailPath,
          width: metadata.width,
          height: metadata.height
        });

      } catch (sharpError) {
        // Se sharp falhar, o arquivo não é uma imagem válida
        fs.unlinkSync(file.path); // Remover arquivo inválido
        throw new Error(`Arquivo ${file.originalname} não é uma imagem válida`);
      }
    }

    req.processedFiles = processedFiles;
    next();

  } catch (error) {
    // Limpar arquivos em caso de erro
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    
    next(error);
  }
};

module.exports = {
  upload: upload.array('images', 10),
  processImages
}; 