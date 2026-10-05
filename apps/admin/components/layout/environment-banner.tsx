import {
  formatBuildLabel,
  isNonProductionEnvironment,
  type RuntimeConfig,
} from '@/lib/runtime-config';

const ENVIRONMENT_LABELS = {
  staging: 'STAGING',
  preprod: 'PRÉPRODUCTION',
} as const;

/** Visible on staging and preprod only, so nobody mistakes test data for production. */
export function EnvironmentBanner({ config }: { config: RuntimeConfig }) {
  if (!isNonProductionEnvironment(config.environment)) return null;

  const isStaging = config.environment === 'staging';
  return (
    <div
      role="status"
      className={
        isStaging
          ? 'flex h-6 shrink-0 items-center justify-center gap-2 bg-amber-400 text-[11px] font-semibold tracking-wide text-amber-950'
          : 'flex h-6 shrink-0 items-center justify-center gap-2 bg-violet-600 text-[11px] font-semibold tracking-wide text-white'
      }
    >
      <span>Environnement {ENVIRONMENT_LABELS[config.environment]}</span>
      <span aria-hidden>·</span>
      <span className="font-mono font-normal opacity-80">{formatBuildLabel(config)}</span>
    </div>
  );
}
