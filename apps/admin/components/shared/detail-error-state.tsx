import Link from 'next/link';
import { ErrorState } from '@/components/shared/error-state';
import { buttonVariants } from '@/components/ui/button';
import { isNotFoundOrForbidden } from '@/lib/api-errors';

type DetailErrorStateProps = {
  error: unknown;
  /** e.g. "Véhicule introuvable". */
  notFoundTitle: string;
  /** e.g. "Impossible de charger le véhicule". */
  errorTitle: string;
  backHref: string;
  backLabel: string;
  onRetry: () => void;
  retrying?: boolean;
};

/** Error of a detail page: "not found / outside your scope" gets a way back, other errors a retry. */
export function DetailErrorState({
  error,
  notFoundTitle,
  errorTitle,
  backHref,
  backLabel,
  onRetry,
  retrying,
}: DetailErrorStateProps) {
  if (isNotFoundOrForbidden(error)) {
    return (
      <ErrorState
        title={notFoundTitle}
        message="Cet élément n’existe pas ou ne fait pas partie de votre périmètre."
        action={
          <Link href={backHref} className={buttonVariants({ variant: 'outline', className: 'mt-5' })}>
            {backLabel}
          </Link>
        }
      />
    );
  }
  return <ErrorState title={errorTitle} onRetry={onRetry} retrying={retrying} />;
}
