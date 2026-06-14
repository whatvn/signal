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
};

export default function DashboardPage() {
  const [window, setWindow] = useState("24h");
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch(`/api/dashboard?window=${window}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [window]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  function handleWindowChange(w: string) {
    setWindow(w);
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F4F5F7", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <TopBar window={window} onWindowChange={handleWindowChange} onScanComplete={load} />

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
            <PlatformBlock platform="facebook" data={data.facebook} window={window} />
            <PlatformBlock platform="tiktok" data={data.tiktok} window={window} />
            <PlatformBlock platform="threads" data={data.threads} window={window} />
          </>
        )}
      </main>
    </div>
  );
}
