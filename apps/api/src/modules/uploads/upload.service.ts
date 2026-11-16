import type { AuthContext } from '../auth/auth.types';
import { prisma } from '../../lib/prisma';
import { BadRequestError, ForbiddenError } from '../../lib/errors';
import { removePublicObject, storePublicImage, validateImage } from '../../lib/storage';

export const imageFolders = ['events', 'organizers', 'avatars', 'cms'] as const;
export type ImageFolder = (typeof imageFolders)[number];

export async function saveUploadedImage(
  file: Express.Multer.File,
  folder: ImageFolder,
  auth: AuthContext,
) {
  if (folder === 'cms' && auth.role !== 'SUPERADMIN') {
    throw new ForbiddenError('Media website hanya dapat diunggah Superadmin');
  }
  if (folder === 'events' || folder === 'organizers') {
    if (!['ADMIN', 'SUPERADMIN'].includes(auth.role) && auth.organizerStatus !== 'ACTIVE') {
      throw new ForbiddenError('Profil kreator aktif diperlukan untuk mengunggah gambar ini');
    }
  }
  await validateImage(file.buffer, file.mimetype, (folder === 'avatars' ? 2 : 8) * 1024 * 1024);
  const stored = await storePublicImage(file.buffer, folder);
  try {
    const asset = await prisma.mediaAsset.create({
      data: {
        ...stored,
        folder,
        ownerId: auth.userId,
        mimeType: 'image/webp',
        originalName: file.originalname.replaceAll('\\', '/').split('/').pop()!.slice(0, 255),
      },
    });
    return { ...stored, id: asset.id, mimeType: asset.mimeType, originalName: asset.originalName };
  } catch (error) {
    await removePublicObject(stored.key);
    throw error;
  }
}

export function normalizeImageKey(value: string): string {
  return value.startsWith('/uploads/') ? value.slice('/uploads/'.length) : value;
}

export async function assertOwnedImage(
  key: string | null | undefined,
  ownerId: string,
  folder: ImageFolder,
  allowAdmin = false,
) {
  if (!key) return;
  const asset = await prisma.mediaAsset.findUnique({ where: { key: normalizeImageKey(key) } });
  if (!asset || asset.folder !== folder)
    throw new BadRequestError('Pilih gambar yang sudah diunggah untuk bagian ini');
  if (asset.ownerId !== ownerId && !allowAdmin)
    throw new ForbiddenError('Gambar ini bukan milik akunmu');
}
