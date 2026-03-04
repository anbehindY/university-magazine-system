"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

type DateTimePickerProps = {
  value?: Date
  onChange: (value: Date | undefined) => void
  placeholder?: string
  className?: string
}

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"))

function parseParts(value?: Date): { hour: string; minute: string; period: "AM" | "PM" } {
  if (!value) return { hour: "11", minute: "59", period: "PM" }
  const h = value.getHours()
  const m = value.getMinutes()
  return {
    hour: String(h % 12 || 12),
    minute: String(m).padStart(2, "0"),
    period: h >= 12 ? "PM" : "AM",
  }
}

function applyTime(date: Date, hour: string, minute: string, period: "AM" | "PM"): Date {
  const result = new Date(date)
  let h = Number(hour) % 12
  if (period === "PM") h += 12
  result.setHours(h, Number(minute), 0, 0)
  return result
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick date & time",
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const parts = parseParts(value)
  const [hour, setHour] = React.useState(parts.hour)
  const [minute, setMinute] = React.useState(parts.minute)
  const [period, setPeriod] = React.useState<"AM" | "PM">(parts.period)
  const [displayMonth, setDisplayMonth] = React.useState<Date>(value ?? new Date())

  React.useEffect(() => {
    const p = parseParts(value)
    setHour(p.hour)
    setMinute(p.minute)
    setPeriod(p.period)
  }, [value])

  // Reset displayed month to selected value's month when popover opens
  React.useEffect(() => {
    if (open) setDisplayMonth(value ?? new Date())
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleDateSelect(date: Date | undefined) {
    if (!date) { onChange(undefined); return }
    onChange(applyTime(date, hour, minute, period))
    setOpen(false)
  }

  function handleHour(h: string) {
    setHour(h)
    if (value) onChange(applyTime(value, h, minute, period))
  }

  function handleMinute(m: string) {
    setMinute(m)
    if (value) onChange(applyTime(value, hour, m, period))
  }

  function handlePeriod(p: "AM" | "PM") {
    setPeriod(p)
    if (value) onChange(applyTime(value, hour, minute, p))
  }

  const displayText = value
    ? `${format(value, "PPP")}, ${hour}:${minute} ${period}`
    : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
          <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
          {displayText ?? placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" avoidCollisions sideOffset={4}>
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleDateSelect}
          month={displayMonth}
          onMonthChange={setDisplayMonth}
          startMonth={new Date(new Date().getFullYear() - 10, 0)}
          endMonth={new Date(new Date().getFullYear() + 20, 11)}
          initialFocus
        />
        <Separator className="bg-slate-100" />
        <div className="flex items-center gap-2 p-3">
          <Select value={hour} onValueChange={handleHour}>
            <SelectTrigger className="w-16 border-slate-200">
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
            <SelectTrigger className="w-16 border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-48">
              {MINUTES.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={(v) => handlePeriod(v as "AM" | "PM")}>
            <SelectTrigger className="w-20 border-slate-200">
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
