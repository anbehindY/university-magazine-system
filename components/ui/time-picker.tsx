"use client"

import * as React from "react"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type TimePickerProps = {
  value?: string   // "HH:MM" 24-hour
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

function parse24h(value?: string): { hour: string; minute: string; period: "AM" | "PM" } {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) {
    return { hour: "12", minute: "00", period: "AM" }
  }
  const [h, m] = value.split(":").map(Number)
  const hour12 = h % 12 || 12
  return {
    hour: String(hour12),
    minute: String(m).padStart(2, "0"),
    period: h >= 12 ? "PM" : "AM",
  }
}

function to24h(hour: string, minute: string, period: "AM" | "PM"): string {
  let h = Number(hour) % 12
  if (period === "PM") h += 12
  return `${String(h).padStart(2, "0")}:${minute}`
}

function formatDisplay(value?: string): string {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return ""
  const { hour, minute, period } = parse24h(value)
  return `${hour}:${minute} ${period}`
}

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"))

export function TimePicker({
  value,
  onChange,
  placeholder = "Pick a time",
  className,
}: TimePickerProps) {
  const parsed = parse24h(value)
  const [hour, setHour] = React.useState(parsed.hour)
  const [minute, setMinute] = React.useState(parsed.minute)
  const [period, setPeriod] = React.useState<"AM" | "PM">(parsed.period)

  React.useEffect(() => {
    const p = parse24h(value)
    setHour(p.hour)
    setMinute(p.minute)
    setPeriod(p.period)
  }, [value])

  function handleHour(h: string) {
    setHour(h)
    onChange(to24h(h, minute, period))
  }

  function handleMinute(m: string) {
    setMinute(m)
    onChange(to24h(hour, m, period))
  }

  function handlePeriod(p: "AM" | "PM") {
    setPeriod(p)
    onChange(to24h(hour, minute, p))
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start border-slate-200 bg-white text-left font-normal text-slate-900",
            !value && "text-slate-400",
            className
          )}
        >
          <Clock className="mr-2 h-4 w-4 text-slate-400" />
          {value ? formatDisplay(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="flex items-center gap-2">
          <Select value={hour} onValueChange={handleHour}>
            <SelectTrigger className="w-14 border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-48">
              {HOURS.map((h) => (
                <SelectItem key={h} value={h}>{h}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="font-medium text-slate-500">:</span>
          <Select value={minute} onValueChange={handleMinute}>
            <SelectTrigger className="w-14 border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-48">
              {MINUTES.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={(v) => handlePeriod(v as "AM" | "PM")}>
            <SelectTrigger className="w-18 border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AM">AM</SelectItem>
              <SelectItem value="PM">PM</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  )
}
