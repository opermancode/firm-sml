import { CalendarX2, ShieldCheck } from "lucide-react";
import { dateLabel } from "@/lib/format";

export interface CertificateView {
  key: string;
  label: string;
  expiry: string | null;
  graceEnd: string | null;
  days: number | null;
  lapsed: boolean;
}

export function CertificateRow({ certificate }: { certificate: CertificateView }) {
  const { label, expiry, graceEnd, days, lapsed } = certificate;
  const status = lapsed
    ? { className: "badge-nd", label: "Lapsed" }
    : expiry
      ? { className: "badge-healthy", label: "Valid" }
      : { className: "badge-amber", label: "Not reported" };

  return (
    <div
      className={`rounded-lg border px-3 py-2.5 ${
        lapsed ? "border-[color-mix(in_srgb,var(--nd)_30%,transparent)] bg-nd-soft" : "border-line bg-panel"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          {lapsed ? (
            <CalendarX2 size={13} className="mt-0.5 shrink-0 text-nd" />
          ) : (
            <ShieldCheck size={13} className="mt-0.5 shrink-0 text-faint" />
          )}
          <div>
            <div className="text-[11.5px] font-medium text-ink">{label}</div>
            <div className="mt-0.5 text-[10.5px] leading-relaxed text-muted">
              {expiry ? (
                <>
                  Expires {dateLabel(expiry)}
                  {graceEnd ? ` · grace to ${dateLabel(graceEnd)}` : ""}
                </>
              ) : (
                "Expiry date missing from source data"
              )}
            </div>
            {expiry && days != null && (
              <div className={`mono mt-0.5 text-[10px] ${days < 0 ? "text-nd-ink" : "text-faint"}`}>
                {days < 0 ? `${Math.abs(days)} days ago` : `${days} days remaining`}
              </div>
            )}
          </div>
        </div>
        <span className={`badge ${status.className}`}>{status.label}</span>
      </div>
    </div>
  );
}
