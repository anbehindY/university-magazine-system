"use client"

import * as React from "react"
import { Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type TimePickerProps = {
  value?: string
  onChange: (value: string) => void
  intervalMinutes?: number
  placeholder?: string
  className?: string
}

function buildTimes(intervalMinutes: number) {
  const times: string[] = []
  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      const label = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
      times.push(label)
    }
  }
  return times
}

export function TimePicker({
  value,
  onChange,
  intervalMinutes = 15,
  placeholder = "Select time",
  className,
}: TimePickerProps) {
  const times = React.useMemo(() => buildTimes(intervalMinutes), [intervalMinutes])

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
          {value ?? placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="start">
        <div className="max-h-56 overflow-auto">
          {times.map((time) => (
            <button
              key={time}
              type="button"
              onClick={() => onChange(time)}
              className={cn(
                "flex w-full items-center rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100",
                value === time && "bg-slate-900 text-white hover:bg-slate-900"
              )}
            >
              {time}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
