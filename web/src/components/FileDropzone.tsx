"use client";

import { useDropzone } from "react-dropzone";

export default function FileDropzone({
  onFile,
  loading
}: {
  onFile: (file: File) => void;
  loading: boolean;
}) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: false,
    accept: {
      "text/csv": [".csv"]
    },
    onDrop: (files) => {
      const f = files?.[0];
      if (f) onFile(f);
    }
  });

  return (
    <div
      {...getRootProps()}
      className={[
        "cursor-pointer rounded-2xl border border-dashed p-5 transition",
        isDragActive
          ? "border-emerald-400 bg-emerald-500/10"
          : "border-zinc-700 bg-zinc-950/40",
        loading ? "pointer-events-none opacity-60" : ""
      ].join(" ")}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">
          {isDragActive
            ? "Drop your CSV here"
            : "Drag & drop CSV here (or click to choose)"}
        </p>
        <p className="text-xs text-zinc-400">
          Works best with columns like: date, description, amount
        </p>
      </div>
    </div>
  );
}
