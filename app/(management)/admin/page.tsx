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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function AdminPanelPage() {
  const [automatic, setAutomatic] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    alert("Saved (UI only)");
  }

  return (
    <main className="w-full space-y-6 pt-4 pb-6 text-white">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">Closure Dates</h1>
        <p className="text-white/70">
          Configure system closure dates and maintenance windows
        </p>
      </header>

      <Separator className="bg-white/10" />

      <Card className="border-white/10 bg-white/5 w-full">
        <CardHeader>
          <CardTitle>Closure Date Settings</CardTitle>
          <CardDescription className="text-white/60">
            Configure system closure dates and maintenance windows
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSave} className="space-y-6">
            <div className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-black/20 p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Automatic Closure</p>
                <p className="text-xs text-white/60">
                  Automatically close system at scheduled time
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-5 cursor-pointer accent-white"
                  checked={automatic}
                  onChange={(e) => setAutomatic(e.target.checked)}
                />
                <span>{automatic ? "On" : "Off"}</span>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="text-white">
                  Start Date
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  className="border-white/10 bg-black/40 text-white"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate" className="text-white">
                  End Date
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  className="border-white/10 bg-black/40 text-white"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime" className="text-white">
                  Start Time
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  className="border-white/10 bg-black/40 text-white"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime" className="text-white">
                  End Time
                </Label>
                <Input
                  id="endTime"
                  type="time"
                  className="border-white/10 bg-black/40 text-white"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason" className="text-white">
                Closure Reason
              </Label>
              <textarea
                id="reason"
                rows={3}
                className="w-full rounded-md border border-white/10 bg-black/40 p-3 text-sm text-white placeholder:text-white/40 focus:outline-none"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Write closure reason here."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message" className="text-white">
                Notification Message
              </Label>
              <textarea
                id="message"
                rows={3}
                className="w-full rounded-md border border-white/10 bg-black/40 p-3 text-sm text-white placeholder:text-white/40 focus:outline-none"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write notification message here."
              />
            </div>

            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-start">
              <Button
                type="submit"
                className="bg-white text-black hover:bg-gray-200"
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
