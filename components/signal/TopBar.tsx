"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconRadar,
  IconLoader2,
} from "@tabler/icons-react";

interface Props {
  window?: string;
  onWindowChange?: (w: string) => void;
  onScanComplete?: () => void;
}

export function TopBar({ window, onWindowChange, onScanComplete }: Props) {
  const [scanning, setScanning] = useState(false);
  const [lastScanAgo, setLastScanAgo] = useState<string>("—");
  const pathname = usePathname();
  const isPipeline = pathname === "/pipeline";

  useEffect(() => {
    const es = new EventSource("/api/stream");
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === "pipeline_stage" && event.stage === "alert" && event.status === "done") {
          setScanning(false);
          setLastScanAgo("just now");
          onScanComplete?.();
        }
        if (event.type === "pipeline_error") {
          setScanning(false);
        }
      } catch {
        /* ignore */
      }
    };
    return () => es.close();
  }, [onScanComplete]);

  async function handleScan() {
    setScanning(true);
    await fetch("/api/pipeline/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword: "ZaloPay" }),
    });
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 flex items-center gap-3 px-3.5 h-11"
      style={{
        backgroundColor: "#ffffff",
        borderBottom: "0.5px solid #e5e7eb",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <div
          style={{
            width: 8,
            height: 8,
            backgroundColor: "#1D9E75",
            borderRadius: 2,
          }}
        />
        <span style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>Signal</span>
      </div>

      {/* Divider */}
      <div style={{ width: "0.5px", height: 20, backgroundColor: "#e5e7eb" }} />

      {/* Keyword */}
      <span style={{ fontSize: 11, color: "#999", letterSpacing: "0.03em" }}>Keyword</span>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#0F6E56",
          backgroundColor: "#E1F5EE",
          border: "0.5px solid #5DCAA5",
          borderRadius: 20,
          padding: "2px 10px",
        }}
      >
        ZaloPay
      </span>

      {/* Divider */}
      <div style={{ width: "0.5px", height: 20, backgroundColor: "#e5e7eb" }} />

      {/* Live badge */}
      <span
        className="flex items-center gap-1.5"
        style={{
          fontSize: 11,
          color: "#555",
          backgroundColor: "#f4f5f7",
          border: "0.5px solid #e5e7eb",
          borderRadius: 20,
          padding: "2px 10px",
        }}
      >
        <span className="signal-live-dot" />
        Live · {lastScanAgo}
      </span>

      {/* Nav links */}
      <div style={{ width: "0.5px", height: 20, backgroundColor: "#e5e7eb" }} />
      <Link
        href="/"
        style={{ fontSize: 11, color: isPipeline ? "#666" : "#1D9E75", fontWeight: isPipeline ? 400 : 600 }}
        className="hover:text-gray-900 transition-colors"
      >
        Dashboard
      </Link>
      <Link
        href="/pipeline"
        style={{ fontSize: 11, color: isPipeline ? "#1D9E75" : "#666", fontWeight: isPipeline ? 600 : 400 }}
        className="hover:text-gray-900 transition-colors"
      >
        Pipeline
      </Link>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-2">
        {window !== undefined && onWindowChange && (
          <select
            value={window}
            onChange={(e) => onWindowChange(e.target.value)}
            style={{
              fontSize: 11,
              color: "#444",
              backgroundColor: "#f4f5f7",
              border: "0.5px solid #e5e7eb",
              borderRadius: 6,
              padding: "4px 8px",
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        )}

        <button
          onClick={handleScan}
          disabled={scanning}
          className="flex items-center gap-1.5 transition-opacity hover:opacity-90"
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#ffffff",
            backgroundColor: scanning ? "#aaa" : "#1D9E75",
            border: "none",
            borderRadius: 6,
            padding: "5px 12px",
            cursor: scanning ? "not-allowed" : "pointer",
          }}
        >
          {scanning ? (
            <IconLoader2 size={13} className="animate-spin" />
          ) : (
            <IconRadar size={13} />
          )}
          {scanning ? "Scanning…" : "Scan now"}
        </button>
      </div>
    </header>
  );
}
