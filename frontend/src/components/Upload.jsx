import { useState, useRef } from "react";

/**
 * Upload & Camera capture UI with dark-theme styling, drag-and-drop, and preview.
 * Props: onExtract(formData), loading
 */
export default function Upload({ onExtract, loading }) {
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  function handleFileSelected(selectedFile) {
    if (!selectedFile) return;
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
  }

  function handleInputChange(e) {
    const f = e.target.files?.[0];
    if (f) handleFileSelected(f);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith("image/")) {
      handleFileSelected(f);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!file) return;
    const fd = new FormData();
    fd.append("image", file);
    onExtract(fd);
  }

  function handleClear() {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  return (
    <div
      style={{
        background: "#161b22",
        border: "1px solid #30363d",
        borderRadius: "8px",
        padding: "1.25rem",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      }}
    >
      <form onSubmit={handleSubmit}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#c9d1d9" }}>
            📷 Upload Notebook Page / Diagram
          </span>
          {file && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                background: "transparent",
                border: "none",
                color: "#8b949e",
                cursor: "pointer",
                fontSize: "0.8rem",
                textDecoration: "underline",
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: isDragOver ? "2px dashed #58a6ff" : "1px dashed #30363d",
            borderRadius: "6px",
            padding: "1.25rem",
            textAlign: "center",
            background: isDragOver ? "#1f242c" : "#0d1117",
            cursor: "pointer",
            transition: "all 0.2s ease",
            marginBottom: "0.75rem",
          }}
        >
          {preview ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
              <img
                src={preview}
                alt="Upload preview"
                style={{
                  maxHeight: 90,
                  maxWidth: 150,
                  borderRadius: "4px",
                  objectFit: "contain",
                  border: "1px solid #30363d",
                }}
              />
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#58a6ff" }}>{file?.name}</div>
                <div style={{ fontSize: "0.75rem", color: "#8b949e" }}>
                  {(file?.size / 1024).toFixed(1)} KB — Click or drag another image to replace
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: "1.2rem", marginBottom: "0.25rem" }}>📁</div>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#c9d1d9" }}>
                Drag and drop notebook photo here, or <span style={{ color: "#58a6ff" }}>browse files</span>
              </p>
              <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: "#8b949e" }}>
                Supports Free-Body Diagrams, Circuits & State Machines (JPG, PNG)
              </p>
            </div>
          )}
        </div>

        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleInputChange}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={handleInputChange}
        />

        {/* Action bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              style={{
                background: "#21262d",
                border: "1px solid #30363d",
                color: "#c9d1d9",
                padding: "6px 12px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "0.8rem",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              📸 Camera
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: "#21262d",
                border: "1px solid #30363d",
                color: "#c9d1d9",
                padding: "6px 12px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "0.8rem",
              }}
            >
              Select Image
            </button>
          </div>

          <button
            type="submit"
            disabled={!file || loading}
            style={{
              background: !file || loading ? "#21262d" : "#238636",
              color: !file || loading ? "#8b949e" : "#ffffff",
              border: "1px solid rgba(240, 246, 252, 0.1)",
              padding: "7px 18px",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: !file || loading ? "not-allowed" : "pointer",
              transition: "background 0.2s ease",
            }}
          >
            {loading ? "⚡ Compiling with Gemma 4…" : "Analyse & Simulate"}
          </button>
        </div>
      </form>
    </div>
  );
}
