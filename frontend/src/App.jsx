import React, { useEffect, useRef, useState } from "react";
import { signPdf } from "./api.js";

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function isPdf(file) {
  return file && (file.type === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf"));
}

export default function App() {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  // msgType: "success" | "error" | ""
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("");
  const [showSuccessTick, setShowSuccessTick] = useState(false);

  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  // ✅ auto-hide success message after 3s
  useEffect(() => {
    if (msgType !== "success" || !msg) return;
    const t = setTimeout(() => {
      setMsg("");
      setMsgType("");
      setShowSuccessTick(false);
    }, 3000);
    return () => clearTimeout(t);
  }, [msg, msgType]);

  const setPdfFile = (f) => {
    if (!f) return;
    if (!isPdf(f)) {
      setMsgType("error");
      setMsg("Only PDF files are allowed.");
      return;
    }
    setMsg("");
    setMsgType("");
    setFile(f);
  };

  const onPick = (e) => setPdfFile(e.target.files?.[0] || null);

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    setPdfFile(f);
  };

  const onDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); };
  const onDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); };
  const onDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); };

  const onZoneClick = () => {
    if (busy) return;
    inputRef.current?.click();
  };

  const onSign = async () => {
    setMsg("");
    setMsgType("");
    setShowSuccessTick(false);

    if (!file) {
      setMsgType("error");
      return setMsg("Please select a PDF file.");
    }

    try {
      setBusy(true);
      const { blob, filename } = await signPdf({ file });
      downloadBlob(blob, filename);

      // ✅ reset file selection after download
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";

      // ✅ show success + tick animation
      setMsgType("success");
      setMsg("Signed PDF downloaded successfully.");
      setShowSuccessTick(true);
    } catch (e) {
      setMsgType("error");
      setMsg(e.message || "Signing failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wrap">
      <div className="card">
        <h1 className="title">VKon Consultants Digital Signing Portal</h1>
        <p className="sub">
          Drag & drop a PDF or click to select. It is stamped on every page and digitally signed.
        </p>

        <div
          className={`uploadBox ${dragActive ? "dragActive" : ""} ${busy ? "disabled" : ""}`}
          onClick={onZoneClick}
          onDrop={onDrop}
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" ? onZoneClick() : null)}
        >
          <div className="uploadIcon" aria-hidden="true">📄</div>

          <div className="uploadText">
            <div className="uploadMain">
              {file ? file.name : "Drop your PDF here, or click to browse"}
            </div>
            <div className="uploadHint">PDF only • Instant download • No file storage</div>
          </div>

          <div className="uploadBtn" aria-hidden="true">
            {file ? "Change File" : "Select PDF"}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            onChange={onPick}
            hidden
          />
        </div>

        <button className="primaryBtn" disabled={busy || !file} onClick={onSign}>
          {busy ? "Signing..." : "Sign & Download"}
        </button>

        {msg && (
          <div className={`msg ${msgType === "success" ? "msgSuccess" : "msgError"}`}>
            {msgType === "success" && (
              <span className={`tick ${showSuccessTick ? "tickShow" : ""}`} aria-hidden="true">
                ✓
              </span>
            )}
            <span>{msg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
