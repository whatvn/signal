import { db } from "../db";
import { posts, classifications } from "../db/schema";
import { ulid } from "ulid";

const SEED_POSTS = [
  {
    id: "tt_seed_001",
    platform: "tiktok",
    authorHandle: "user_vn123",
    contentText: "ZaloPay lừa đảo!!! Tài khoản của mình bị trừ tiền không rõ lý do, liên hệ CSKH không ai trả lời 😤 #zalopay #lừađảo",
    sourceUrl: "https://www.tiktok.com/@user_vn123/video/001",
    sentiment: "negative",
    subcategory: "fraud_scam",
    confidence: 0.94,
    commentCount: 341,
  },
  {
    id: "fb_seed_001",
    platform: "facebook",
    authorHandle: "Nguyễn Văn Minh",
    contentText: "ZaloPay cashback tháng này cực ngon! Hoàn 50k cho đơn đầu tiên, mình đã nhận được rồi. Anh em dùng thử đi 💸",
    sourceUrl: "https://www.facebook.com/post/seed001",
    sentiment: "positive",
    subcategory: "promotion_cashback",
    confidence: 0.97,
    commentCount: 88,
  },
  {
    id: "tt_seed_002",
    platform: "tiktok",
    authorHandle: "tech_review_vn",
    contentText: "App ZaloPay crash liên tục không vào được, đã thử cài lại nhưng vẫn lỗi. Ai gặp trường hợp này chưa? #bug #zalopay",
    sourceUrl: "https://www.tiktok.com/@tech_review_vn/video/002",
    sentiment: "negative",
    subcategory: "app_bugs",
    confidence: 0.91,
    commentCount: 127,
  },
  {
    id: "tt_seed_003",
    platform: "tiktok",
    authorHandle: "hanh_shopper",
    contentText: "Chuyển tiền ZaloPay nhanh vl, bấm xong là tiền đến ngay, không cần OTP phức tạp như mấy app khác 🔥 #zalopay #fintech",
    sourceUrl: "https://www.tiktok.com/@hanh_shopper/video/003",
    sentiment: "positive",
    subcategory: "ux_speed_praise",
    confidence: 0.93,
    commentCount: 204,
  },
  {
    id: "fb_seed_002",
    platform: "facebook",
    authorHandle: "Trần Thị Lan",
    contentText: "Giao dịch ZaloPay của mình bị treo 2 tiếng rồi, tiền đã trừ nhưng bên nhận chưa nhận được. Support nói chờ 24h 😤",
    sourceUrl: "https://www.facebook.com/post/seed002",
    sentiment: "negative",
    subcategory: "transaction_failure",
    confidence: 0.89,
    commentCount: 56,
  },
  {
    id: "fb_seed_003",
    platform: "facebook",
    authorHandle: "ZaloPay Official",
    contentText: "🎉 Tuần lễ mua sắm hoàn tiền! Thanh toán bằng ZaloPay được hoàn 20% cho tất cả giao dịch từ 100.000đ. Áp dụng đến hết 15/6!",
    sourceUrl: "https://www.facebook.com/zalopay/post/seed003",
    sentiment: "positive",
    subcategory: "promotion_cashback",
    confidence: 0.99,
    commentCount: 512,
  },
  {
    id: "tt_seed_004",
    platform: "tiktok",
    authorHandle: "quynh_daily",
    contentText: "Bạn bè mình đang dùng ZaloPay hết, mình cũng mới đổi sang dùng thử và thấy ổn lắm. Thanh toán ở Highlands Coffee, CoopMart đều có mã giảm giá 👍",
    sourceUrl: "https://www.tiktok.com/@quynh_daily/video/004",
    sentiment: "positive",
    subcategory: "recommendation",
    confidence: 0.88,
    commentCount: 73,
  },
  {
    id: "tt_seed_005",
    platform: "tiktok",
    authorHandle: "canhbao_online",
    contentText: "⚠️ Cảnh báo! Có tài khoản giả mạo ZaloPay đang nhắn tin lừa đảo, xin thông tin ngân hàng. Đây là scam, đừng cung cấp thông tin! #scam #zalopay",
    sourceUrl: "https://www.tiktok.com/@canhbao_online/video/005",
    sentiment: "negative",
    subcategory: "fraud_scam",
    confidence: 0.96,
    commentCount: 891,
  },
];

async function seed() {
  const now = Math.floor(Date.now() / 1000);

  for (const p of SEED_POSTS) {
    await db
      .insert(posts)
      .values({
        id: p.id,
        platform: p.platform,
        sourceUrl: p.sourceUrl,
        authorHandle: p.authorHandle,
        contentText: p.contentText,
        rawJson: JSON.stringify({}),
        fetchedAt: now - Math.floor(Math.random() * 3600),
        keyword: "ZaloPay",
      })
      .onConflictDoNothing();

    await db
      .insert(classifications)
      .values({
        id: ulid(),
        postId: p.id,
        sentiment: p.sentiment,
        subcategory: p.subcategory,
        confidence: p.confidence,
        commentCount: p.commentCount,
        classifiedAt: now - Math.floor(Math.random() * 3600),
        modelUsed: "seed",
        inputTokens: 0,
        outputTokens: 0,
      })
      .onConflictDoNothing();
  }

  console.log(`Seeded ${SEED_POSTS.length} posts`);
}

seed().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
