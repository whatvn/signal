"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/signal/TopBar";
import { ProfileForm, ProfileFormData } from "@/components/settings/ProfileForm";
import { IconPlus, IconPencil, IconTrash, IconCheck } from "@tabler/icons-react";

const PROFILE_SETTINGS_LOCKED = true;

interface Profile extends ProfileFormData {
  id: number;
  createdAt: number;
  updatedAt: number;
}

export default function SettingsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/profiles");
    const data = await res.json();
    setProfiles(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(form: ProfileFormData) {
    const res = await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "Create failed");
    }
    setAdding(false);
    await load();
  }

  async function handleUpdate(id: number, form: ProfileFormData) {
    const res = await fetch(`/api/profiles/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "Update failed");
    }
    setEditing(null);
    await load();
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this profile? This cannot be undone.")) return;
    const res = await fetch(`/api/profiles/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error ?? "Delete failed");
      return;
    }
    await load();
  }

  async function handleSetDefault(id: number) {
    await fetch(`/api/profiles/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    await load();
  }

  const inputStyle: React.CSSProperties = {
    fontSize: 12,
    color: "#444",
    backgroundColor: "#f4f5f7",
    border: "0.5px solid #e5e7eb",
    borderRadius: 6,
    padding: "4px 8px",
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F4F5F7", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <TopBar />

      <main style={{ paddingTop: 44 + 20, paddingLeft: 20, paddingRight: 20, paddingBottom: 40, maxWidth: 760, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>Profiles</h1>
            <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 3 }}>
              Manage monitoring profiles — each defines which sources and keywords to track.
              <br />
              <strong>Profile change temporarily disabled to prevent naughty kid from doing something wrong</strong>
            </p>
          </div>
          <button
            onClick={() => { setAdding(true); setEditing(null); }}
            disabled={PROFILE_SETTINGS_LOCKED}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#fff", backgroundColor: PROFILE_SETTINGS_LOCKED ? "#9ca3af" : "#1D9E75", border: "none", borderRadius: 6, padding: "7px 14px", cursor: PROFILE_SETTINGS_LOCKED ? "not-allowed" : "pointer" }}
          >
            <IconPlus size={13} />
            Add Profile
          </button>
        </div>

        {PROFILE_SETTINGS_LOCKED && (
          <div style={{ fontSize: 12, color: "#6b7280", backgroundColor: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 6, padding: "10px 12px", marginBottom: 16 }}>
            Profile settings changes are temporarily disabled. Existing profiles remain available for dashboard filtering and pipeline runs.
          </div>
        )}

        {error && (
          <div style={{ fontSize: 12, color: "#e53e3e", backgroundColor: "#FFF5F5", border: "0.5px solid #feb2b2", borderRadius: 6, padding: "8px 12px", marginBottom: 16 }}>
            {error}
            <button onClick={() => setError(null)} style={{ marginLeft: 8, background: "none", border: "none", cursor: "pointer", color: "#e53e3e" }}>✕</button>
          </div>
        )}

        {/* Add form */}
        {adding && !PROFILE_SETTINGS_LOCKED && (
          <div style={{ backgroundColor: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 10, padding: 20, marginBottom: 16 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginBottom: 16 }}>New Profile</h2>
            <ProfileForm
              onSubmit={handleCreate}
              onCancel={() => setAdding(false)}
              submitLabel="Create Profile"
            />
          </div>
        )}

        {loading ? (
          <div style={{ fontSize: 13, color: "#9ca3af", padding: 40, textAlign: "center" }}>Loading…</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {profiles.map((profile) => (
              <div key={profile.id} style={{ backgroundColor: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                {editing?.id === profile.id && !PROFILE_SETTINGS_LOCKED ? (
                  <div style={{ padding: 20 }}>
                    <h2 style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginBottom: 16 }}>Edit: {profile.name}</h2>
                    <ProfileForm
                      initial={profile}
                      onSubmit={(form) => handleUpdate(profile.id, form)}
                      onCancel={() => setEditing(null)}
                      submitLabel="Save Changes"
                    />
                  </div>
                ) : (
                  <div style={{ padding: 16 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>{profile.name}</span>
                        {profile.isDefault && (
                          <span style={{ fontSize: 10, fontWeight: 600, color: "#0F6E56", backgroundColor: "#E1F5EE", border: "0.5px solid #5DCAA5", borderRadius: 20, padding: "2px 8px" }}>
                            Default
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {!profile.isDefault && (
                          <button
                            onClick={() => handleSetDefault(profile.id)}
                            title="Set as default"
                            disabled={PROFILE_SETTINGS_LOCKED}
                            style={{ ...inputStyle, cursor: PROFILE_SETTINGS_LOCKED ? "not-allowed" : "pointer", opacity: PROFILE_SETTINGS_LOCKED ? 0.55 : 1, display: "flex", alignItems: "center", gap: 4 }}
                          >
                            <IconCheck size={12} />
                            <span>Set default</span>
                          </button>
                        )}
                        <button
                          onClick={() => { setEditing(profile); setAdding(false); }}
                          title="Edit"
                          disabled={PROFILE_SETTINGS_LOCKED}
                          style={{ ...inputStyle, cursor: PROFILE_SETTINGS_LOCKED ? "not-allowed" : "pointer", opacity: PROFILE_SETTINGS_LOCKED ? 0.55 : 1, display: "flex", alignItems: "center", gap: 4 }}
                        >
                          <IconPencil size={12} />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(profile.id)}
                          title="Delete"
                          disabled={PROFILE_SETTINGS_LOCKED}
                          style={{ ...inputStyle, cursor: PROFILE_SETTINGS_LOCKED ? "not-allowed" : "pointer", opacity: PROFILE_SETTINGS_LOCKED ? 0.55 : 1, color: "#c53030", display: "flex", alignItems: "center", gap: 4 }}
                        >
                          <IconTrash size={12} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "6px 20px" }}>
                      <ConfigRow label="TikTok Keywords" value={profile.tiktokKeywords} />
                      <ConfigRow label="TikTok Hashtags" value={profile.tiktokHashtags} />
                      <ConfigRow label="Threads Keywords" value={profile.threadsKeywords} />
                      <ConfigRow label="Facebook Pages" value={profile.facebookPageUrls} />
                      <ConfigRow label="App Store ID" value={profile.appStoreId ? `${profile.appStoreId} (${profile.appStoreCountry})` : null} />
                      <ConfigRow label="Play Store ID" value={profile.playStoreId} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: string[] | string | null | undefined }) {
  const display = Array.isArray(value)
    ? value.length === 0 ? null : value.join(", ")
    : value || null;

  return (
    <div style={{ fontSize: 11 }}>
      <span style={{ color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}: </span>
      <span style={{ color: display ? "#444" : "#c4c9d4" }}>{display ?? "—"}</span>
    </div>
  );
}
