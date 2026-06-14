import { PipelinePanel } from "@/components/dashboard/PipelinePanel";
import { TopBar } from "@/components/signal/TopBar";

export default function PipelinePage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F4F5F7", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <TopBar />

      <main
        style={{
          paddingTop: 44 + 14,
          paddingLeft: 14,
          paddingRight: 14,
          paddingBottom: 24,
          minWidth: 900,
        }}
      >
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#9ca3af",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Agent Pipeline
          </h2>
          <PipelinePanel />
        </div>
      </main>
    </div>
  );
}
