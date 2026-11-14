import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../../middleware/auth';
import { rateLimit } from 'express-rate-limit';
import { env } from '../../config/env';
import { BadRequestError } from '../../lib/errors';
import { created } from '../../lib/response';
import { storePublicImage } from '../../lib/storage';

const ALLOWED_FOLDERS = new Set(['events', 'organizers', 'avatars']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
    files: 1,
    fields: 4,
  },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.isTest,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      data: null,
      meta: null,
      error: {
        code: 'RATE_LIMITED',
        message: 'Terlalu banyak unggahan. Tunggu sebentar lalu coba lagi.',
        requestId: req.id,
      },
    });
  },
});

export const uploadRouter = Router();

uploadRouter.post('/', requireAuth, uploadLimiter, (req, res, next) => {
  upload.single('file')(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return next(
          new BadRequestError(
            `Ukuran gambar maksimal ${env.MAX_UPLOAD_SIZE_MB} MB`,
            [{ path: 'file', message: 'File terlalu besar' }],
          ),
        );
      }
      return next(new BadRequestError('Unggahan tidak valid'));
    }
    if (error) return next(error);
    return next();
  });
}, async (req, res) => {
  if (!req.file) {
    throw new BadRequestError('Pilih gambar yang ingin diunggah', [
      { path: 'file', message: 'File wajib diisi' },
    ]);
  }
  const folder = typeof req.body.folder === 'string' ? req.body.folder : 'events';
  if (!ALLOWED_FOLDERS.has(folder)) {
    throw new BadRequestError('Folder unggahan tidak dikenal');
  }
  const stored = await storePublicImage(req.file.buffer, folder);
  return created(res, stored);
});
