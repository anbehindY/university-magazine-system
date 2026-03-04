"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

const FILE_TYPE_OPTIONS = [
  { group: "Documents", types: ["DOC", "DOCX"] },
  { group: "Images", types: ["PNG", "JPG", "JPEG", "GIF", "SVG", "WEBP"] },
] as const;

const ALL_TYPES = FILE_TYPE_OPTIONS.flatMap((g) => g.types);

export default function UploadRulesPage() {
  const [enableUploads, setEnableUploads] = useState(true);
  const [maxSize, setMaxSize] = useState("25");
  const [maxFiles, setMaxFiles] = useState("10");
  const [allowedTypes, setAllowedTypes] = useState<string[]>(["DOC", "DOCX"]);
  const [customInput, setCustomInput] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const customInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      try {
        const response = await fetch("/api/admin/upload-rules");
        if (!response.ok) throw new Error("Failed to load upload rules.");

        const payload = (await response.json()) as {
          settings: Record<string, string>;
        };

        if (!isMounted) return;

        const settings = payload.settings ?? {};
        setEnableUploads(settings.enable_uploads !== undefined ? settings.enable_uploads === "true" : true);
        setMaxSize(settings.max_upload_size_mb ?? "25");
        setMaxFiles(settings.max_files_per_upload ?? "10");
        setAllowedTypes(
          settings.allowed_file_types
            ? settings.allowed_file_types.split(",").map((v) => v.trim().toUpperCase()).filter(Boolean)
            : ["DOC", "DOCX"]
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
    return () => { isMounted = false; };
  }, []);

  function toggleType(type: string, checked: boolean) {
    setAllowedTypes((prev) =>
      checked ? [...prev, type] : prev.filter((t) => t !== type)
    );
  }

  function toggleGroup(types: readonly string[], checked: boolean) {
    setAllowedTypes((prev) => {
      const without = prev.filter((t) => !types.includes(t as never));
      return checked ? [...without, ...types] : without;
    });
  }

  function addCustomType() {
    const value = customInput.trim().toUpperCase().replace(/^\./, "");
    if (!value) return;
    if (!allowedTypes.includes(value)) {
      setAllowedTypes((prev) => [...prev, value]);
    }
    setCustomInput("");
    customInputRef.current?.focus();
  }

  const customTypes = allowedTypes.filter((t) => !ALL_TYPES.includes(t as never));

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
      setErrorMessage("Select at least one allowed file type.");
      return;
    }

    setStatus("saving");

    try {
      const response = await fetch("/api/admin/upload-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            enable_uploads: String(enableUploads),
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

      toast.success("Upload rules saved successfully.");
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Failed to save upload rules.");
    }
  }

  const allChecked = ALL_TYPES.every((t) => allowedTypes.includes(t));
  const someChecked = ALL_TYPES.some((t) => allowedTypes.includes(t));

  return (
    <main className="space-y-6 text-slate-900">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">Upload Rules</h1>
        <p className="text-slate-600">
          Configure file upload restrictions and validation rules
        </p>
      </header>

      <Separator className="bg-slate-200" />

      <Card className="w-full border-slate-200 bg-white">
        <CardHeader>
          <CardTitle>Upload Rules Configuration</CardTitle>
          <CardDescription className="text-slate-500">
            Configure file upload restrictions and validation rules
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <form onSubmit={onSave} className="space-y-6">

            {/* Enable uploads toggle */}
            <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Enable File Upload</p>
                <p className="text-xs text-slate-500">
                  Allow students to upload files to their submissions
                </p>
              </div>
              <Switch
                checked={enableUploads}
                onCheckedChange={setEnableUploads}
                disabled={loading}
              />
            </div>

            {/* Size and count limits */}
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
                  Maximum Files Per Submission
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

            {/* Allowed file types — checkbox groups */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-slate-700">Allowed File Types</Label>
                <p className="text-xs text-slate-500">
                  Select which file formats students may upload
                </p>
              </div>

              {/* Select all */}
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                <Checkbox
                  checked={allChecked ? true : someChecked ? "indeterminate" : false}
                  onCheckedChange={(checked) =>
                    toggleGroup(ALL_TYPES, checked === true)
                  }
                  disabled={loading}
                />
                Select all
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                {FILE_TYPE_OPTIONS.map(({ group, types }) => {
                  const groupChecked = types.every((t) => allowedTypes.includes(t));
                  const groupPartial = types.some((t) => allowedTypes.includes(t));
                  return (
                    <div key={group} className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                        <Checkbox
                          checked={groupChecked ? true : groupPartial ? "indeterminate" : false}
                          onCheckedChange={(checked) =>
                            toggleGroup(types, checked === true)
                          }
                          disabled={loading}
                        />
                        {group}
                      </label>
                      <div className="ml-6 space-y-2">
                        {types.map((type) => (
                          <label
                            key={type}
                            className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer"
                          >
                            <Checkbox
                              checked={allowedTypes.includes(type)}
                              onCheckedChange={(checked) =>
                                toggleType(type, checked === true)
                              }
                              disabled={loading}
                            />
                            .{type.toLowerCase()}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Custom file types */}
              <div className="space-y-2">
                <Label className="text-slate-700">Custom File Types</Label>
                <p className="text-xs text-slate-500">
                  Add file extensions not listed above (e.g. PDF, MP4)
                </p>
                <div className="flex gap-2">
                  <Input
                    ref={customInputRef}
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomType(); } }}
                    placeholder="e.g. PDF"
                    className="w-36 border-slate-200 bg-white text-slate-900 uppercase placeholder:normal-case"
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="border-slate-200"
                    onClick={addCustomType}
                    disabled={loading || !customInput.trim()}
                  >
                    Add
                  </Button>
                </div>
                {customTypes.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {customTypes.map((type) => (
                      <span
                        key={type}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-sm text-slate-700"
                      >
                        .{type.toLowerCase()}
                        <button
                          type="button"
                          onClick={() => setAllowedTypes((prev) => prev.filter((t) => t !== type))}
                          className="ml-0.5 text-slate-400 hover:text-slate-700"
                          aria-label={`Remove ${type}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
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

            {status === "error" && (
              <p className="text-sm text-rose-600">{errorMessage}</p>
            )}
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
