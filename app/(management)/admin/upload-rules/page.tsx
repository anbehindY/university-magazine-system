"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
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

export default function UploadRulesPage() {
  const [enableUploads, setEnableUploads] = useState(true);
  const [virusScanning, setVirusScanning] = useState(true);
  const [requireAuth, setRequireAuth] = useState(true);
  const [autoDelete, setAutoDelete] = useState(false);
  const [maxSize, setMaxSize] = useState("");
  const [maxFiles, setMaxFiles] = useState("");
  const [allowedTypeInput, setAllowedTypeInput] = useState("");
  const [allowedTypes, setAllowedTypes] = useState<string[]>([]);

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    alert("Saved (UI only)");
  }

  function addType() {
    const raw = allowedTypeInput.trim();
    if (!raw) return;
    const normalized = raw.replace(/^\./, "").toUpperCase();
    if (allowedTypes.includes(normalized)) {
      setAllowedTypeInput("");
      return;
    }
    setAllowedTypes((prev) => [...prev, normalized]);
    setAllowedTypeInput("");
  }

  function removeType(type: string) {
    setAllowedTypes((prev) => prev.filter((item) => item !== type));
  }

  return (
    <main className="w-full space-y-6 pt-4 pb-6 text-slate-900">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">Upload Rules</h1>
        <p className="text-slate-600">
          Configure file upload restrictions and validation rules
        </p>
      </header>

      <Separator className="bg-slate-200" />

      <Card className="border-slate-200 bg-white w-full">
        <CardHeader>
          <CardTitle>Upload Rules Configuration</CardTitle>
          <CardDescription className="text-slate-500">
            Configure file upload restrictions and validation rules
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <form onSubmit={onSave} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Enable File Upload</p>
                  <p className="text-xs text-slate-500">
                    Allow users to upload files to the system
                  </p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-5 cursor-pointer accent-slate-900"
                    checked={enableUploads}
                    onChange={(e) => setEnableUploads(e.target.checked)}
                  />
                  <span>{enableUploads ? "On" : "Off"}</span>
                </label>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Virus Scanning</p>
                  <p className="text-xs text-slate-500">
                    Scan all uploads for malware and threats
                  </p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-5 cursor-pointer accent-slate-900"
                    checked={virusScanning}
                    onChange={(e) => setVirusScanning(e.target.checked)}
                  />
                  <span>{virusScanning ? "On" : "Off"}</span>
                </label>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maxSize" className="text-slate-700">
                  Maximum File Size (MB)
                </Label>
                <Input
                  id="maxSize"
                  type="number"
                  min="1"
                  className="border-slate-200 bg-white text-slate-900"
                  value={maxSize}
                  onChange={(e) => setMaxSize(e.target.value)}
                  placeholder="25"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxFiles" className="text-slate-700">
                  Maximum Files Per Upload
                </Label>
                <Input
                  id="maxFiles"
                  type="number"
                  min="1"
                  className="border-slate-200 bg-white text-slate-900"
                  value={maxFiles}
                  onChange={(e) => setMaxFiles(e.target.value)}
                  placeholder="10"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="allowedTypes" className="text-slate-700">
                  Allowed File Types
                </Label>
                <p className="text-xs text-slate-500">
                  Add allowed file extensions for uploads
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {allowedTypes.length === 0 ? (
                  <span className="text-xs text-slate-500">
                    No file types added yet
                  </span>
                ) : (
                  allowedTypes.map((type) => (
                    <Badge
                      key={type}
                      variant="outline"
                      className="border-slate-200 bg-slate-100 text-slate-700"
                    >
                      {type}
                      <button
                        type="button"
                        className="ml-1 text-slate-500 hover:text-slate-900"
                        onClick={() => removeType(type)}
                      >
                        ×
                      </button>
                    </Badge>
                  ))
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                <Input
                  id="allowedTypes"
                  className="border-slate-200 bg-white text-slate-900 md:max-w-xs"
                  value={allowedTypeInput}
                  onChange={(e) => setAllowedTypeInput(e.target.value)}
                  placeholder="e.g. PDF, DOCX, PNG"
                />
                <Button type="button" variant="outline" onClick={addType}>
                  Add Type
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Require Authentication</p>
                  <p className="text-xs text-slate-500">
                    Only authenticated users can upload files
                  </p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-5 cursor-pointer accent-slate-900"
                    checked={requireAuth}
                    onChange={(e) => setRequireAuth(e.target.checked)}
                  />
                  <span>{requireAuth ? "On" : "Off"}</span>
                </label>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Auto-Delete Temp Files</p>
                  <p className="text-xs text-slate-500">
                    Remove temporary files after upload processing
                  </p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-5 cursor-pointer accent-slate-900"
                    checked={autoDelete}
                    onChange={(e) => setAutoDelete(e.target.checked)}
                  />
                  <span>{autoDelete ? "On" : "Off"}</span>
                </label>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-start">
              <Button
                type="submit"
                className="w-48 bg-slate-900 text-white hover:bg-slate-800"
              >
                Save Configuration
              </Button>
              <Button type="button" variant="outline" className="w-48">
                Reset to Default
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
