"use client";

import { useEffect, useState } from "react";
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
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      try {
        const response = await fetch("/api/admin/upload-rules");
        if (!response.ok) {
          throw new Error("Failed to load upload rules.");
        }

        const payload = (await response.json()) as {
          settings: Record<string, string>;
        };

        if (!isMounted) return;

        const settings = payload.settings ?? {};
        setEnableUploads(settings.enable_uploads === "true");
        setVirusScanning(settings.virus_scanning === "true");
        setRequireAuth(settings.require_auth === "true");
        setAutoDelete(settings.auto_delete === "true");
        setMaxSize(settings.max_upload_size_mb ?? "");
        setMaxFiles(settings.max_files_per_upload ?? "");
        setAllowedTypes(
          settings.allowed_file_types
            ? settings.allowed_file_types
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean)
            : []
        );
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(error instanceof Error ? error.message : "Failed to load upload rules.");
        setStatus("error");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");
    setStatus("idle");

    const maxSizeValue = Number(maxSize);
    const maxFilesValue = Number(maxFiles);

    if (!Number.isFinite(maxSizeValue) || maxSizeValue <= 0) {
      setStatus("error");
      setErrorMessage("Maximum file size must be a positive number.");
      return;
    }

    if (!Number.isFinite(maxFilesValue) || maxFilesValue <= 0) {
      setStatus("error");
      setErrorMessage("Maximum files per upload must be a positive number.");
      return;
    }

    if (allowedTypes.length === 0) {
      setStatus("error");
      setErrorMessage("Please add at least one allowed file type.");
      return;
    }

    setStatus("saving");

    try {
      const response = await fetch("/api/admin/upload-rules", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          settings: {
            enable_uploads: String(enableUploads),
            virus_scanning: String(virusScanning),
            require_auth: String(requireAuth),
            auto_delete: String(autoDelete),
            max_upload_size_mb: maxSize,
            max_files_per_upload: maxFiles,
            allowed_file_types: allowedTypes.join(","),
          },
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Failed to save upload rules.");
      }

      setStatus("success");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Failed to save upload rules.");
    }
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
                    disabled={loading}
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
                    disabled={loading}
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
                  disabled={loading}
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
                  disabled={loading}
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
                  disabled={loading}
                />
                <Button type="button" variant="outline" onClick={addType} disabled={loading}>
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
                    disabled={loading}
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
                    disabled={loading}
                  />
                  <span>{autoDelete ? "On" : "Off"}</span>
                </label>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-start">
              <Button
                type="submit"
                className="w-48 bg-slate-900 text-white hover:bg-slate-800"
                disabled={loading || status === "saving"}
              >
                {status === "saving" ? "Saving..." : "Save Configuration"}
              </Button>
            </div>
            {status === "success" ? (
              <p className="text-sm text-emerald-600">Saved successfully.</p>
            ) : null}
            {status === "error" ? (
              <p className="text-sm text-rose-600">{errorMessage}</p>
            ) : null}
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
