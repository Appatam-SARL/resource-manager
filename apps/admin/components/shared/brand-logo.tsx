import Image from 'next/image';
import { cn } from 'cn';

const LOGO_SRC = '/suzang-hub-logo.png';
const MARK_SRC = '/suzang-hub-mark.png';
const LOGO_ALT = 'SUZANG HUB';
/** Wordmark aspect ratio (800×400). */
const LOGO_ASPECT = 2;

type BrandLogoProps = {
  /** Show only the S mark (sidebar collapsed). */
  iconOnly?: boolean;
  className?: string;
  /** Intrinsic height of the rendered image in CSS pixels. */
  height?: number;
  priority?: boolean;
};

/**
 * SUZANG HUB brand mark. Full wordmark by default; `iconOnly` uses the square S mark.
 */
export function BrandLogo({
  iconOnly = false,
  className,
  height = 36,
  priority = false,
}: BrandLogoProps) {
  if (iconOnly) {
    return (
      <Image
        src={MARK_SRC}
        alt={LOGO_ALT}
        width={height}
        height={height}
        priority={priority}
        className={cn('shrink-0 object-contain', className)}
      />
    );
  }

  const width = Math.round(height * LOGO_ASPECT);

  return (
    <Image
      src={LOGO_SRC}
      alt={LOGO_ALT}
      width={width}
      height={height}
      priority={priority}
      className={cn('h-auto w-auto max-w-full object-contain object-left', className)}
      style={{ height }}
    />
  );
}
