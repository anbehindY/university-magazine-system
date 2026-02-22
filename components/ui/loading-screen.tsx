import { cn } from "@/lib/utils";

type LoadingScreenProps = {
  className?: string;
  spinnerClassName?: string;
};

export function LoadingScreen({ className, spinnerClassName }: LoadingScreenProps) {
  return (
    <div
      className={cn(
        "flex min-h-[40vh] items-center justify-center text-slate-600",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div
        className={cn(
          "h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500",
          spinnerClassName
        )}
      />
    </div>
  );
}
