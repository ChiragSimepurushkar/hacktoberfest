import { useState } from "react";

/** Upload / camera-capture UI. Props: onExtract(formData), loading */
export default function Upload({ onExtract, loading }) {
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);

  function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!file) return;
    const fd = new FormData();
    fd.append("image", file);
    onExtract(fd);
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* File upload */}
      <label>
        Upload or capture a notebook photo
        <input type="file" accept="image/*" onChange={handleFile} />
      </label>

      {/* Camera capture (mobile) */}
      <label>
        Use Camera
        <input type="file" accept="image/*" capture="environment" onChange={handleFile} />
      </label>

      {preview && <img src={preview} alt="preview" style={{ maxHeight: 200 }} />}

      <button type="submit" disabled={!file || loading}>
        {loading ? "Processing…" : "Analyse"}
      </button>
    </form>
  );
}
