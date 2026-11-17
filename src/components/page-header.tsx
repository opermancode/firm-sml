import { InfoTip } from "@/components/info-tip";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  help,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  help?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1.5 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-brand">
              {eyebrow}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <h1 className="font-display text-[24px] font-semibold leading-tight tracking-[-0.025em] text-ink sm:text-[26px]">
            {title}
          </h1>
          {help && <InfoTip text={help} label={`About ${title}`} />}
        </div>
        {description && (
          <p className="mt-1.5 max-w-3xl text-[12.5px] leading-relaxed text-muted">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
