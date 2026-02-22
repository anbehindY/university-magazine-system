"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type TimePickerProps = {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

const TIME_INPUT_REGEX = /^\d{0,2}:?\d{0,2}$/

function toDisplayParts(value?: string) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) {
    return { time: "", period: "AM" as const }
  }

  const [hourStr, minute] = value.split(":")
  const hour = Number(hourStr)
  const isPM = hour >= 12
  const period = isPM ? "PM" : "AM"
  const twelveHour = hour % 12 || 12
  const paddedHour = String(twelveHour).padStart(2, "0")

  return { time: `${paddedHour}:${minute}`, period }
}

function to24Hour(time: string, period: "AM" | "PM") {
  if (!/^\d{2}:\d{2}$/.test(time)) return null
  const [hourStr, minuteStr] = time.split(":")
  let hour = Number(hourStr)
  const minute = Number(minuteStr)

  if (Number.isNaN(hour) || Number.isNaN(minute)) return null
  if (hour > 12 || minute > 59) return null
  if (hour === 0) hour = 12

  let hour24 = hour % 12
  if (period === "PM") {
    hour24 += 12
  }
  if (period === "AM" && hour24 === 12) {
    hour24 = 0
  }

  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

function normalizeTimeInput(value: string) {
  const sanitized = value.replace(/[^0-9:]/g, "").slice(0, 5)
  if (!sanitized.includes(":")) {
    if (sanitized.length <= 2) return sanitized
    return `${sanitized.slice(0, 2)}:${sanitized.slice(2)}`
  }
  const [h, m = ""] = sanitized.split(":")
  return `${h.slice(0, 2)}:${m.slice(0, 2)}${m.length > 2 ? m.slice(2) : ""}`.slice(0, 5)
}

export function TimePicker({
  value,
  onChange,
  placeholder = "hh:mm",
  className,
}: TimePickerProps) {
  const initial = React.useMemo(() => toDisplayParts(value), [value])
  const [time, setTime] = React.useState(initial.time)
  const [period, setPeriod] = React.useState<"AM" | "PM">(initial.period)

  React.useEffect(() => {
    setTime(initial.time)
    setPeriod(initial.period)
  }, [initial.time, initial.period])

  const emitChange = React.useCallback(
    (nextTime: string, nextPeriod: "AM" | "PM") => {
      const converted = to24Hour(nextTime, nextPeriod)
      if (converted) {
        onChange(converted)
      }
    },
    [onChange]
  )

  function handleTimeChange(event: React.ChangeEvent<HTMLInputElement>) {
    const raw = normalizeTimeInput(event.target.value)
    if (!TIME_INPUT_REGEX.test(raw)) return
    setTime(raw)
    if (/^\d{2}:\d{2}$/.test(raw)) {
      emitChange(raw, period)
    }
  }

  function handleBlur() {
    if (!/^\d{2}:\d{2}$/.test(time)) {
      const fallback = initial.time || ""
      setTime(fallback)
      return
    }
    emitChange(time, period)
  }

  function handlePeriodChange(nextPeriod: "AM" | "PM") {
    setPeriod(nextPeriod)
    if (/^\d{2}:\d{2}$/.test(time)) {
      emitChange(time, nextPeriod)
    }
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Input
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={time}
        onChange={handleTimeChange}
        onBlur={handleBlur}
        className="flex-1 border-slate-200"
      />
      <Select value={period} onValueChange={(value) => handlePeriodChange(value as "AM" | "PM")}>
        <SelectTrigger className="w-24 border-slate-200">
          <SelectValue placeholder="AM" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
