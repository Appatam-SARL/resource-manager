export const VEHICLE_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';

const ACCEPTED_TYPES = new Set(VEHICLE_IMAGE_ACCEPT.split(','));
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

export class VehicleImageError extends Error {}

export function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(blob);
  });
}

/** Returns a French error message, or null when the picked file can be processed. */
export function checkVehicleImageFile(file: File): string | null {
  if (!ACCEPTED_TYPES.has(file.type)) {
    return 'Format non pris en charge : choisissez une image JPEG, PNG ou WebP.';
  }
  if (file.size > MAX_SOURCE_BYTES) {
    return 'Image trop lourde (15 Mo maximum avant redimensionnement).';
  }
  return null;
}

/**
 * Downsizes the photo to 1600 px max and re-encodes it as JPEG so uploads stay well under
 * the API limit (2 Mo). The API still validates the result.
 */
export async function prepareVehicleImage(file: File): Promise<Blob> {
  const issue = checkVehicleImageFile(file);
  if (issue) throw new VehicleImageError(issue);

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new VehicleImageError('Impossible de lire cette image.');
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new VehicleImageError('Impossible de préparer cette image.');
  }
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  );
  if (!blob) throw new VehicleImageError('Impossible de préparer cette image.');
  if (blob.size > MAX_OUTPUT_BYTES) {
    throw new VehicleImageError('L’image reste trop lourde après redimensionnement (2 Mo maximum).');
  }
  return blob;
}
