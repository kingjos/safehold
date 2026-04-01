import { useState, useRef } from "react";
import { Upload, X, FileText, Image } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  preview?: string;
}

interface EvidenceUploadProps {
  onFilesChange?: (files: UploadedFile[]) => void;
  onRawFilesChange?: (files: File[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}

export const EvidenceUpload = ({ onFilesChange, onRawFilesChange, maxFiles = 5, disabled = false }: EvidenceUploadProps) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [rawFiles, setRawFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const added: UploadedFile[] = [];
    for (let i = 0; i < newFiles.length && files.length + added.length < maxFiles; i++) {
      const file = newFiles[i];
      const isImage = file.type.startsWith("image/");
      added.push({
        id: crypto.randomUUID(),
        name: file.name,
        type: isImage ? "image" : "document",
        preview: isImage ? URL.createObjectURL(file) : undefined,
      });
    }
    const updated = [...files, ...added];
    setFiles(updated);
    onFilesChange?.(updated);
  };

  const removeFile = (id: string) => {
    const updated = files.filter((f) => f.id !== id);
    setFiles(updated);
    onFilesChange?.(updated);
  };

  return (
    <div className="space-y-3">
      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer
          ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
          ${disabled ? "opacity-50 pointer-events-none" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          accept="image/*,.pdf,.doc,.docx"
          onChange={(e) => addFiles(e.target.files)}
        />
        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-medium">Drag & drop files here or click to upload</p>
        <p className="text-xs text-muted-foreground mt-1">
          PNG, JPG, PDF up to 10MB • Max {maxFiles} files
        </p>
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {files.map((file) => (
            <div key={file.id} className="relative group rounded-lg border border-border overflow-hidden bg-muted">
              {file.preview ? (
                <img src={file.preview} alt={file.name} className="w-full h-24 object-cover" />
              ) : (
                <div className="w-full h-24 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <div className="px-2 py-1.5">
                <p className="text-xs truncate">{file.name}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
