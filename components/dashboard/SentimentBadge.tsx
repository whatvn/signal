"use client";

const SUBCATEGORY_LABELS: Record<string, string> = {
  fraud_scam: "Fraud / Scam",
  fund_loss: "Fund Loss",
  app_bugs: "App Bugs",
  transaction_failure: "Txn Failure",
  poor_support: "Poor Support",
  feature_gap: "Feature Gap",
  promotion_cashback: "Promo / Cashback",
  feature_praise: "Feature Praise",
  ux_speed_praise: "UX / Speed",
  recommendation: "Recommendation",
};

const NEGATIVE_SUBCATEGORIES = new Set([
  "fraud_scam",
  "fund_loss",
  "app_bugs",
  "transaction_failure",
  "poor_support",
  "feature_gap",
]);

interface Props {
  subcategory: string;
}

export function SentimentBadge({ subcategory }: Props) {
  const isNegative = NEGATIVE_SUBCATEGORIES.has(subcategory);
  const label = SUBCATEGORY_LABELS[subcategory] ?? subcategory;

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{
        backgroundColor: isNegative
          ? "rgba(255, 107, 107, 0.15)"
          : "rgba(78, 205, 196, 0.15)",
        color: isNegative ? "#FF6B6B" : "#4ECDC4",
        border: `1px solid ${isNegative ? "rgba(255,107,107,0.4)" : "rgba(78,205,196,0.4)"}`,
      }}
    >
      {label}
    </span>
  );
}

export { NEGATIVE_SUBCATEGORIES };
