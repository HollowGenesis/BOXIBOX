import { useRef, useState } from "react";
import { fileToCompressedDataUrl } from "../storage";

interface Props {
  onPhotos: (dataUrls: { dataUrl: string; name: string }[]) => void;
  label?: string;
  multiple?: boolean;
}

export default function PhotoPicker({ onPhotos, label = "Добавить фото", multiple = true }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const results: { dataUrl: string; name: string }[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const dataUrl = await fileToCompressedDataUrl(file);
        results.push({ dataUrl, name: file.name || `photo-${Date.now()}.jpg` });
      }
      if (results.length) onPhotos(results);
    } catch (e) {
      console.error(e);
      alert("Не удалось обработать фото");
    } finally {
      setBusy(false);
      if (cameraRef.current) cameraRef.current.value = "";
      if (galleryRef.current) galleryRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => cameraRef.current?.click()}
          className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50 p-3 text-sm font-medium text-indigo-700 transition active:scale-95 disabled:opacity-50"
        >
          <span>📷</span> Камера
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => galleryRef.current?.click()}
          className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-3 text-sm font-medium text-slate-700 transition active:scale-95 disabled:opacity-50"
        >
          <span>🖼️</span> Галерея
        </button>
      </div>
      {busy && (
        <p className="text-center text-xs text-slate-500">Обработка фото...</p>
      )}
      <p className="text-center text-xs text-slate-400">{label}</p>
    </div>
  );
}
