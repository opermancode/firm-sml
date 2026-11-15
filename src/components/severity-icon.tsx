import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

export function SeverityIcon({
  severity,
  size = 15,
  className = "",
}: {
  severity: string;
  size?: number;
  className?: string;
}) {
  if (severity === "critical")
    return <XCircle size={size} className={`text-nd ${className}`} aria-label="Critical" />;
  if (severity === "warning")
    return (
      <AlertTriangle size={size} className={`text-warning ${className}`} aria-label="Warning" />
    );
  if (severity === "info")
    return <Info size={size} className={`text-info ${className}`} aria-label="Information" />;
  return (
    <CheckCircle2
      size={size}
      className={`text-healthy ${className}`}
      aria-label="Passed"
    />
  );
}

export function SeverityLabel({ severity }: { severity: string }) {
  const map: Record<string, { className: string; label: string }> = {
    critical: { className: "badge-nd", label: "Critical" },
    warning: { className: "badge-amber", label: "Warning" },
    info: { className: "badge-info", label: "Info" },
    pass: { className: "badge-healthy", label: "Pass" },
  };
  const meta = map[severity] ?? { className: "badge-slate", label: severity };
  return <span className={`badge ${meta.className}`}>{meta.label}</span>;
}
