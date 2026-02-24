"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast rounded-xl border border-slate-200 bg-white text-slate-900 shadow-lg shadow-slate-900/10",
          title: "text-sm font-semibold",
          description: "text-xs text-slate-600",
          actionButton:
            "bg-amber-400 text-slate-900 hover:bg-amber-300 rounded-md",
          cancelButton:
            "bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md",
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--card)",
          "--normal-text": "var(--foreground)",
          "--normal-border": "var(--border)",
          "--success-bg": "oklch(0.96 0.08 140)",
          "--success-text": "oklch(0.23 0.07 145)",
          "--error-bg": "oklch(0.95 0.07 25)",
          "--error-text": "oklch(0.35 0.16 30)",
          "--warning-bg": "oklch(0.96 0.08 85)",
          "--warning-text": "oklch(0.28 0.08 85)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
