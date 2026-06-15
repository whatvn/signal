"use client";

import { useState, KeyboardEvent } from "react";
import { IconX, IconPlus } from "@tabler/icons-react";

export interface ProfileFormData {
  name: string;
  isDefault: boolean;
  tiktokKeywords: string[];
  tiktokHashtags: string[];
  threadsKeywords: string[];
  facebookPageUrls: string[];
  appStoreId: string;
  appStoreCountry: string;
  playStoreId: string;
}

interface Props {
  initial?: Partial<ProfileFormData>;
  onSubmit: (data: ProfileFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

function TagInput({
  label,
  placeholder,
  tags,
  onChange,
}: {
  label: string;
  placeholder: string;
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = useState("");

  function add() {
    const val = input.trim();
    if (val && !tags.includes(val)) onChange([...tags, val]);
    setInput("");
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    } else if (e.key === "Backspace" && input === "" && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: "#555", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </label>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          padding: "6px 8px",
          border: "0.5px solid #e5e7eb",
          borderRadius: 6,
          backgroundColor: "#fff",
          minHeight: 36,
          cursor: "text",
        }}
        onClick={() => document.getElementById(`tag-input-${label}`)?.focus()}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              fontWeight: 500,
              color: "#0F6E56",
              backgroundColor: "#E1F5EE",
              border: "0.5px solid #5DCAA5",
              borderRadius: 20,
              padding: "2px 8px",
            }}
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#5DCAA5", lineHeight: 1 }}
            >
              <IconX size={10} />
            </button>
          </span>
        ))}
        <input
          id={`tag-input-${label}`}
          type="text"
          value={input}
          placeholder={tags.length === 0 ? placeholder : ""}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          onBlur={add}
          style={{
            border: "none",
            outline: "none",
            fontSize: 11,
            color: "#1a1a1a",
            background: "transparent",
            flexGrow: 1,
            minWidth: 80,
          }}
        />
      </div>
      <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 3 }}>Press Enter or comma to add</p>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: "#555", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}{required && <span style={{ color: "#e53e3e" }}> *</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        style={{
          width: "100%",
          fontSize: 12,
          color: "#1a1a1a",
          border: "0.5px solid #e5e7eb",
          borderRadius: 6,
          padding: "7px 10px",
          outline: "none",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}

export function ProfileForm({ initial, onSubmit, onCancel, submitLabel = "Save" }: Props) {
  const [form, setForm] = useState<ProfileFormData>({
    name: initial?.name ?? "",
    isDefault: initial?.isDefault ?? false,
    tiktokKeywords: initial?.tiktokKeywords ?? [],
    tiktokHashtags: initial?.tiktokHashtags ?? [],
    threadsKeywords: initial?.threadsKeywords ?? [],
    facebookPageUrls: initial?.facebookPageUrls ?? [],
    appStoreId: initial?.appStoreId ?? "",
    appStoreCountry: initial?.appStoreCountry ?? "vn",
    playStoreId: initial?.playStoreId ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ProfileFormData>(key: K, value: ProfileFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <TextInput label="Profile name" value={form.name} onChange={(v) => set("name", v)} placeholder="e.g. ZaloPay" required />

      <TagInput
        label="TikTok Keywords"
        placeholder="e.g. ZaloPay"
        tags={form.tiktokKeywords}
        onChange={(v) => set("tiktokKeywords", v)}
      />
      <TagInput
        label="TikTok Hashtags"
        placeholder="e.g. ZaloPay"
        tags={form.tiktokHashtags}
        onChange={(v) => set("tiktokHashtags", v)}
      />
      <TagInput
        label="Threads Keywords"
        placeholder="e.g. ZaloPay"
        tags={form.threadsKeywords}
        onChange={(v) => set("threadsKeywords", v)}
      />
      <TagInput
        label="Facebook Page URLs"
        placeholder="e.g. https://www.facebook.com/zalopay"
        tags={form.facebookPageUrls}
        onChange={(v) => set("facebookPageUrls", v)}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
        <TextInput label="App Store ID" value={form.appStoreId} onChange={(v) => set("appStoreId", v)} placeholder="e.g. 1112407590" />
        <TextInput label="Country" value={form.appStoreCountry} onChange={(v) => set("appStoreCountry", v)} placeholder="vn" />
      </div>

      <TextInput label="Play Store App ID" value={form.playStoreId} onChange={(v) => set("playStoreId", v)} placeholder="e.g. vn.com.vng.zalopay" />

      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#444", marginBottom: 20, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={(e) => set("isDefault", e.target.checked)}
        />
        Set as default profile
      </label>

      {error && (
        <p style={{ fontSize: 12, color: "#e53e3e", marginBottom: 12 }}>{error}</p>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={onCancel}
          style={{ fontSize: 12, color: "#666", background: "none", border: "0.5px solid #e5e7eb", borderRadius: 6, padding: "6px 14px", cursor: "pointer" }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          style={{ fontSize: 12, fontWeight: 600, color: "#fff", backgroundColor: saving ? "#aaa" : "#1D9E75", border: "none", borderRadius: 6, padding: "6px 16px", cursor: saving ? "not-allowed" : "pointer" }}
        >
          {saving ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
