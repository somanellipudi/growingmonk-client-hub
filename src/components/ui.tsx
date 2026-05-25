import clsx from "clsx";
import Link from "next/link";

export function buttonClassName(
  variant: "primary" | "secondary" | "ghost" | "danger" = "primary",
  className?: string,
) {
  return clsx(
    "focus-ring inline-flex h-9 items-center justify-center gap-2 px-4 text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
    variant === "primary" &&
      "bg-gm-orange text-white hover:bg-[#cf5608] border border-gm-orange/80",
    variant === "secondary" &&
      "border border-stoneLine bg-paper text-ink hover:border-gm-orange/60 hover:text-gm-orange-muted",
    variant === "ghost" &&
      "border border-transparent bg-transparent text-muted hover:bg-stoneLine/40 hover:text-ink",
    variant === "danger" &&
      "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
    className,
  );
}

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button className={buttonClassName(variant, className)} {...props}>
      {children}
    </button>
  );
}

export function LinkButton({
  children,
  variant = "primary",
  className,
  ...props
}: React.ComponentProps<typeof Link> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <Link className={buttonClassName(variant, className)} {...props}>
      {children}
    </Link>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 grid min-w-0 gap-5 border-b border-stoneLine pb-6 lg:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.22em] text-gm-orange">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="max-w-4xl text-2xl font-semibold leading-[1.15] text-ink md:text-[28px]">
          {title}
        </h1>
        <p className="mt-2.5 max-w-3xl text-sm leading-6 text-muted">{description}</p>
      </div>
      {action ? (
        <div className="flex flex-wrap items-start gap-2 lg:justify-end">{action}</div>
      ) : null}
    </div>
  );
}

export function Panel({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={clsx(
        "min-w-0 border border-stoneLine bg-paper shadow-panel",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Panel className="min-h-[100px] overflow-hidden p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-3 text-2xl font-semibold leading-none text-ink">{value}</p>
      <p className="mt-2.5 text-xs leading-5 text-muted">{detail}</p>
    </Panel>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const label = status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const tone =
    status === "active"
      ? "border-green-200 bg-green-50 text-green-800"
      : status === "paused"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : status === "churned"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-stoneLine bg-ivory text-muted";
  return (
    <span
      className={clsx(
        "inline-flex whitespace-nowrap border px-2.5 py-1 text-[11px] font-semibold",
        tone,
      )}
    >
      {label}
    </span>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <Panel className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
      <div className="mb-5 grid h-12 w-12 place-items-center border border-gm-orange/30 bg-gm-orange-light text-sm font-bold text-gm-orange">
        GM
      </div>
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted">{body}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </Panel>
  );
}
