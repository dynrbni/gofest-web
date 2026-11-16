import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { fromBuffer } from 'file-type';
import { env } from '../config/env';
import { BadRequestError } from './errors';

const publicRoot = path.resolve(env.STORAGE_DIR, 'public');
const privateRoot = path.resolve(env.STORAGE_DIR, 'private');

export interface StoredImage {
  key: string;
  url: string;
  width: number;
  height: number;
  byteSize: number;
}

function safeKey(key: string): string {
  const normalized = path.normalize(key).replaceAll('\\', '/');
  if (normalized.startsWith('..') || path.isAbsolute(normalized)) {
    throw new BadRequestError('Lokasi file tidak valid');
  }
  return normalized;
}

export async function validateImage(buffer: Buffer, mimeType: string, maxBytes: number) {
  if (!buffer.length || buffer.length > maxBytes) {
    throw new BadRequestError(`Ukuran gambar maksimal ${maxBytes / 1024 / 1024} MB`);
  }
  const signature = await fromBuffer(buffer).catch(() => undefined);
  if (
    !['image/jpeg', 'image/png', 'image/webp'].includes(mimeType) ||
    signature?.mime !== mimeType
  ) {
    throw new BadRequestError('Format dan isi gambar harus cocok: JPG, PNG, atau WebP');
  }
}

export async function storePublicImage(buffer: Buffer, folder: string): Promise<StoredImage> {
  let pipeline: sharp.Sharp;
  try {
    pipeline = sharp(buffer, { limitInputPixels: 40_000_000 });
    const metadata = await pipeline.metadata();
    if (!metadata.format || !['jpeg', 'png', 'webp'].includes(metadata.format)) {
      throw new BadRequestError('Format gambar harus JPG, PNG, atau WebP');
    }
    if (!metadata.width || !metadata.height) {
      throw new BadRequestError('Gambar tidak dapat dibaca');
    }
  } catch (error) {
    if (error instanceof BadRequestError) throw error;
    throw new BadRequestError('File yang diunggah bukan gambar yang valid');
  }

  const result = await pipeline
    .rotate()
    .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true })
    .catch(() => {
      throw new BadRequestError('File yang diunggah bukan gambar yang valid');
    });

  const key = `${folder}/${randomUUID()}.webp`;
  const target = path.join(publicRoot, safeKey(key));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, result.data);

  return {
    key,
    url: `/uploads/${key}`,
    width: result.info.width,
    height: result.info.height,
    byteSize: result.data.length,
  };
}

export async function removePublicObject(key: string): Promise<void> {
  try {
    await unlink(path.join(publicRoot, safeKey(key)));
  } catch {
    // Deleting an already-missing file is not an error for the caller.
  }
}

export async function storePrivateFile(buffer: Buffer, folder: string, extension = 'png') {
  const key = `${folder}/${randomUUID()}.${extension}`;
  const target = path.join(privateRoot, safeKey(key));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buffer);
  return key;
}

export async function readPrivateFile(key: string): Promise<Buffer> {
  return readFile(path.join(privateRoot, safeKey(key)));
}

export async function removePrivateObject(key: string): Promise<void> {
  try {
    await unlink(path.join(privateRoot, safeKey(key)));
  } catch {
    // Deleting an already-missing file is not an error for the caller.
  }
}
