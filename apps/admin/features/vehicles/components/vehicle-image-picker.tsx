'use client';

import { useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  VEHICLE_IMAGE_ACCEPT,
  checkVehicleImageFile,
  readAsDataUrl,
} from '@/features/vehicles/lib/prepare-vehicle-image';
import { VehicleImageFrame } from './vehicle-image-frame';

type VehicleImagePickerProps = {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
};

/** Optional photo chosen before the vehicle exists; it is uploaded right after creation. */
export function VehicleImagePicker({ file, onChange, disabled = false }: VehicleImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = async (picked: File | undefined) => {
    if (inputRef.current) inputRef.current.value = '';
    if (!picked) return;
    const issue = checkVehicleImageFile(picked);
    setError(issue);
    if (issue) return;
    try {
      setPreview(await readAsDataUrl(picked));
      onChange(picked);
    } catch {
      setError('Impossible de lire cette image.');
    }
  };

  return (
    <div className="space-y-2 @md:col-span-2">
      <VehicleImageFrame src={preview} alt="Aperçu de la photo du véhicule" className="max-w-md" />
      <input
        ref={inputRef}
        type="file"
        accept={VEHICLE_IMAGE_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => void pick(event.target.files?.[0])}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => inputRef.current?.click()}>
          <ImagePlus aria-hidden />
          {file ? 'Changer la photo' : 'Choisir une photo'}
        </Button>
        {file ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => {
              setError(null);
              setPreview(null);
              onChange(null);
            }}
          >
            <X aria-hidden />
            Retirer
          </Button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        <p className="type-meta">JPEG, PNG ou WebP. L’image est redimensionnée automatiquement.</p>
      )}
    </div>
  );
}
