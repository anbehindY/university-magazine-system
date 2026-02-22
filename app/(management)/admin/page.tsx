"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";

export default function AdminPanelPage() {
  const [automatic, setAutomatic] = useState(true);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    alert("Saved (UI only)");
  }

  return (
    <main className="w-full space-y-6 pt-4 pb-6 text-slate-900">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">Closure Dates</h1>
        <p className="text-slate-600">
          Configure system closure dates and maintenance windows
        </p>
      </header>

      <Separator className="bg-slate-200" />

      <Card className="border-slate-200 bg-white w-full">
        <CardHeader>
          <CardTitle>Closure Date Settings</CardTitle>
          <CardDescription className="text-slate-500">
            Configure system closure dates and maintenance windows
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSave} className="space-y-6">
            <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Automatic Closure</p>
                <p className="text-xs text-slate-500">
                  Automatically close system at scheduled time
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Switch checked={automatic} onCheckedChange={setAutomatic} />
                <span>{automatic ? "On" : "Off"}</span>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-slate-700">
                  Start Date
                </Label>
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Select start date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate" className="text-slate-700">
                  End Date
                </Label>
                <DatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="Select end date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime" className="text-slate-700">
                  Start Time
                </Label>
                <TimePicker
                  value={startTime}
                  onChange={setStartTime}
                  placeholder="Select start time"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime" className="text-slate-700">
                  End Time
                </Label>
                <TimePicker
                  value={endTime}
                  onChange={setEndTime}
                  placeholder="Select end time"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason" className="text-slate-700">
                Closure Reason
              </Label>
              <textarea
                id="reason"
                rows={3}
                className="w-full rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Write closure reason here."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message" className="text-slate-700">
                Notification Message
              </Label>
              <textarea
                id="message"
                rows={3}
                className="w-full rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write notification message here."
              />
            </div>

            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-start">
              <Button
                type="submit"
                className="bg-slate-900 text-white hover:bg-slate-800"
              >
                Save Changes
              </Button>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
