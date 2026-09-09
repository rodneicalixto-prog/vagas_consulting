import Link from "next/link";
import { IconChevronLeft } from "@/components/icons";

export function Tag({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-block rounded-md px-2 py-1 text-[10.5px] font-extrabold ${className}`}>
      {children}
    </span>
  );
}

export function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10.5px] font-extrabold ${className}`}>
      {children}
    </span>
  );
}

export function PrimaryButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="w-full rounded-xl bg-gold px-0 py-3.5 text-[14.5px] font-extrabold text-[#1c1508] transition-transform active:scale-[0.99] disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function PrimaryLinkButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="block w-full rounded-xl bg-gold px-0 py-3.5 text-center text-[14.5px] font-extrabold text-[#1c1508] transition-transform active:scale-[0.99]"
    >
      {children}
    </Link>
  );
}

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border border-border bg-surface p-4 ${className}`}>
      {children}
    </div>
  );
}

export function BackHeader({ title, backHref }: { title: string; backHref: string }) {
  return (
    <div className="flex items-center gap-3 px-5 pt-6 pb-3 md:px-8 md:pt-8">
      <Link
        href={backHref}
        className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg border border-border bg-surface"
        aria-label="Voltar"
      >
        <IconChevronLeft />
      </Link>
      <h1 className="text-[16px] font-extrabold text-navy md:text-lg">{title}</h1>
    </div>
  );
}
