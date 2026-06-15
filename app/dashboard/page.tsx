"use client";

import { useCallback, useEffect, useState } from "react";
import { TopBar } from "@/components/signal/TopBar";
import { SummaryBar } from "@/components/signal/SummaryBar";
import { PlatformBlock, PlatformData } from "@/components/signal/PlatformBlock";

interface DashboardData {
  summary: {
    totalSignals: number;
    negativeCount: number;
    negativeChange: number;
    positiveCount: number;
    positiveChange: number;
    alertsCount: number;
    criticalAlert: string | null;
  };
  facebook: PlatformData;
  tiktok: PlatformData;
  threads: PlatformData;
  appstore: PlatformData;
  playstore: PlatformData;
}

const EMPTY_PLATFORM: PlatformData = {
  postsCount: 0,
  commentsCount: 0,
  negativeCount: 0,
  positiveCount: 0,
  alertsCount: 0,
  categories: [],
  topPosts: [],
  sparkline: [],
};

const EMPTY_DATA: DashboardData = {
  summary: {
    totalSignals: 0,
    negativeCount: 0,
    negativeChange: 0,
    positiveCount: 0,
    positiveChange: 0,
    alertsCount: 0,
    criticalAlert: null,
  },
  facebook: EMPTY_PLATFORM,
  tiktok: EMPTY_PLATFORM,
  threads: EMPTY_PLATFORM,
  appstore: EMPTY_PLATFORM,
  playstore: EMPTY_PLATFORM,
};

export default function DashboardPage() {
  const [window, setWindow] = useState("7d");
  const [profileId, setProfileId] = useState<number | undefined>(undefined);
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);

  // Fetch default profile id on mount
  useEffect(() => {
    fetch("/api/profiles")
      .then((r) => r.json())
      .then((list: { id: number; isDefault: boolean }[]) => {
        const def = list.find((p) => p.isDefault) ?? list[0];
        if (def) setProfileId(def.id);
      })
      .catch(() => {});
  }, []);

  const load = useCallback(() => {
    if (profileId === undefined) return;
    fetch(`/api/dashboard?window=${window}&profileId=${profileId}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [window, profileId]);

  useEffect(() => {
    if (profileId === undefined) return;
    setLoading(true);
    load();
  }, [load, profileId]);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F4F5F7", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <TopBar
        window={window}
        onWindowChange={setWindow}
        onScanComplete={load}
        profileId={profileId}
        onProfileChange={(id) => {
          setProfileId(id);
          setLoading(true);
        }}
      />

      <main
        style={{
          paddingTop: 44 + 14,
          paddingLeft: 14,
          paddingRight: 14,
          paddingBottom: 24,
          minWidth: 900,
        }}
      >
        {loading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 200,
              fontSize: 13,
              color: "#9ca3af",
            }}
          >
            Loading dashboard…
          </div>
        ) : (
          <>
            <SummaryBar summary={data.summary} window={window} />
            <PlatformBlock platform="appstore" data={data.appstore} window={window} onFetch={load} profileId={profileId} />
            <PlatformBlock platform="playstore" data={data.playstore} window={window} onFetch={load} profileId={profileId} />
            <PlatformBlock platform="tiktok" data={data.tiktok} window={window} onFetch={load} profileId={profileId} />
            <PlatformBlock platform="facebook" data={data.facebook} window={window} onFetch={load} profileId={profileId} />
            <PlatformBlock platform="threads" data={data.threads} window={window} onFetch={load} profileId={profileId} />
          </>
        )}
      </main>
    </div>
  );
}
