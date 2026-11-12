import { AlertTriangle, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

type FeatureUnavailableProps = {
  title: string;
  message: string;
  actionLabel: string;
  actionHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
};

export default function FeatureUnavailable({
  title,
  message,
  actionLabel,
  actionHref,
  secondaryLabel,
  secondaryHref,
}: FeatureUnavailableProps) {
  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16" aria-live="polite">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
        <AlertTriangle className="h-8 w-8 text-amber-700 mb-4" aria-hidden="true" />
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-700">{message}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={actionHref}>
            <Button className="gap-2">
              {actionLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          {secondaryLabel && secondaryHref && (
            <Link href={secondaryHref}>
              <Button variant="outline">{secondaryLabel}</Button>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
