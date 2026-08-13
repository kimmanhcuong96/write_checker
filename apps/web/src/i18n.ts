import type { Locale } from "./types";

const en = {
  product: "ME2WRITE · WRITING INTELLIGENCE", title: "Write with precision.", subtitle: "CEFR-aligned feedback for clearer, more confident English.",
  connected: "AI evaluator online", estimate: "Estimate my level", targeted: "Verify a target level", estimateDesc: "Discover your current CEFR level and priorities.", targetedDesc: "Test whether your writing meets a selected CEFR level and get sentence and vocabulary upgrades.",
  targetLevel: "Target CEFR level", draft: "Your draft", draftTitle: "What are you working on?", placeholder: "Paste an essay, email, journal entry, or any English writing…", helper: "A few complete sentences give the evaluator stronger evidence.", check: "Analyze writing", checking: "Analyzing…", signInTitle: "Sign in to start", signInCopy: "Save evaluations to your independent me2write account.", signIn: "Continue with Google", signOut: "Sign out", admin: "Admin console", speaking: "Practice speaking ↗", language: "Language", account: "Account", role: "Role", administrator: "Administrator", member: "Member", blocked: "Evaluation access suspended", estimatedLevel: "Estimated CEFR level", scores: "Writing signals", works: "What works", priorities: "Priorities", corrections: "Useful corrections", original: "Original", better: "Better", next: "Your next move", targetReview: "Target-level verification", meets: "Target achieved", notMeets: "Not yet at target", gaps: "Gaps to close", sentenceUpgrades: "Sentence upgrades", vocabularyUpgrades: "Vocabulary upgrades", alternatives: "Alternatives", overview: "Overview", users: "Users", usageTitle: "Usage & user operations", usageSubtitle: "Monitor evaluation volume, token consumption, reliability, and account access.", today: "Today", week: "This week", month: "This month", year: "This year", requests: "requests", successful: "Successful", failed: "Failed", inputTokens: "Input tokens", outputTokens: "Output tokens", totalTokens: "Total tokens", providerModel: "Provider & model", user: "User", activity: "Evaluations", lastActive: "Last active", status: "Status", active: "Active", suspended: "Suspended", permanent: "Permanent", actions: "Actions", manage: "Manage", suspendDays: "Suspend for days", blockPermanent: "Block permanently", unblock: "Restore access", days: "Days", reason: "Reason", apply: "Apply", cancel: "Cancel", searchUsers: "Search users", noUsers: "No matching users.", loading: "Loading…", reference: "Reference", previous: "Previous", nextPage: "Next"
} as const;

type Key = keyof typeof en;
const vi: Record<Key, string> = { ...en, product:"ME2WRITE · TRÍ TUỆ VIẾT", title:"Viết chính xác hơn.", subtitle:"Phản hồi theo CEFR để tiếng Anh rõ ràng và tự tin hơn.", connected:"AI đánh giá đang hoạt động", estimate:"Ước lượng trình độ", targeted:"Xác minh trình độ mục tiêu", estimateDesc:"Khám phá trình độ CEFR hiện tại và các ưu tiên cải thiện.", targetedDesc:"Kiểm tra bài viết có đạt CEFR đã chọn và nhận gợi ý nâng cấp câu, từ vựng.", targetLevel:"Trình độ CEFR mục tiêu", draft:"Bản nháp", draftTitle:"Bạn đang viết nội dung gì?", placeholder:"Dán bài luận, email, nhật ký hoặc nội dung tiếng Anh…", helper:"Một vài câu hoàn chỉnh sẽ giúp đánh giá chính xác hơn.", check:"Phân tích bài viết", checking:"Đang phân tích…", signInTitle:"Đăng nhập để bắt đầu", signInCopy:"Lưu kết quả trong tài khoản me2write độc lập.", signIn:"Tiếp tục với Google", signOut:"Đăng xuất", admin:"Trang quản trị", speaking:"Luyện nói ↗", language:"Ngôn ngữ", account:"Tài khoản", role:"Vai trò", administrator:"Quản trị viên", member:"Thành viên", blocked:"Quyền đánh giá đang bị tạm ngưng", estimatedLevel:"Trình độ CEFR ước tính", scores:"Tín hiệu bài viết", works:"Điểm tốt", priorities:"Ưu tiên", corrections:"Các sửa đổi hữu ích", original:"Bản gốc", better:"Tốt hơn", next:"Bước tiếp theo", targetReview:"Xác minh trình độ mục tiêu", meets:"Đã đạt mục tiêu", notMeets:"Chưa đạt mục tiêu", gaps:"Khoảng trống cần cải thiện", sentenceUpgrades:"Nâng cấp câu", vocabularyUpgrades:"Nâng cấp từ vựng", alternatives:"Cách thay thế", overview:"Tổng quan", users:"Người dùng", usageTitle:"Sử dụng & vận hành người dùng", usageSubtitle:"Theo dõi lượt đánh giá, token, độ ổn định và quyền truy cập.", today:"Hôm nay", week:"Tuần này", month:"Tháng này", year:"Năm nay", requests:"lượt", successful:"Thành công", failed:"Thất bại", inputTokens:"Token đầu vào", outputTokens:"Token đầu ra", totalTokens:"Tổng token", providerModel:"Nhà cung cấp & model", user:"Người dùng", activity:"Lượt đánh giá", lastActive:"Hoạt động gần nhất", status:"Trạng thái", active:"Hoạt động", suspended:"Tạm cấm", permanent:"Vĩnh viễn", actions:"Thao tác", manage:"Quản lý", suspendDays:"Cấm theo số ngày", blockPermanent:"Cấm vĩnh viễn", unblock:"Mở lại quyền", days:"Số ngày", reason:"Lý do", apply:"Áp dụng", cancel:"Hủy", searchUsers:"Tìm người dùng", noUsers:"Không có người dùng phù hợp.", loading:"Đang tải…", reference:"Mã tham chiếu" };
const zh: Record<Key, string> = { ...en, title:"精准写作。", subtitle:"基于 CEFR 的反馈，让英语更清晰、更自信。", connected:"AI 评估器在线", estimate:"评估当前等级", targeted:"验证目标等级", estimateDesc:"了解当前 CEFR 等级和改进重点。", targetedDesc:"验证文章是否达到所选 CEFR 等级，并获取句子和词汇优化。", targetLevel:"目标 CEFR 等级", draft:"草稿", draftTitle:"您正在写什么？", placeholder:"粘贴英文文章、邮件、日记或其他内容…", helper:"完整的句子能提供更可靠的评估依据。", check:"分析写作", checking:"分析中…", signInTitle:"登录后开始", signInCopy:"将评估保存在独立的 me2write 帐户中。", signIn:"使用 Google 继续", signOut:"退出登录", admin:"管理控制台", speaking:"练习口语 ↗", language:"语言", account:"账户", role:"角色", administrator:"管理员", member:"成员", blocked:"评估权限已暂停", estimatedLevel:"预估 CEFR 等级", scores:"写作指标", works:"优点", priorities:"改进重点", corrections:"实用修改", original:"原句", better:"优化后", next:"下一步", targetReview:"目标等级验证", meets:"已达到目标", notMeets:"尚未达到目标", gaps:"待改进差距", sentenceUpgrades:"句子优化", vocabularyUpgrades:"词汇优化", alternatives:"替代表达", overview:"概览", users:"用户", usageTitle:"使用情况与用户管理", usageSubtitle:"监控评估量、Token 消耗、稳定性和账户权限。", today:"今天", week:"本周", month:"本月", year:"今年", requests:"次请求", successful:"成功", failed:"失败", inputTokens:"输入 Token", outputTokens:"输出 Token", totalTokens:"总 Token", providerModel:"提供商与模型", user:"用户", activity:"评估次数", lastActive:"最近活动", status:"状态", active:"正常", suspended:"已暂停", permanent:"永久", actions:"操作", manage:"管理", suspendDays:"暂停指定天数", blockPermanent:"永久封禁", unblock:"恢复权限", days:"天数", reason:"原因", apply:"应用", cancel:"取消", searchUsers:"搜索用户", noUsers:"没有匹配的用户。", loading:"加载中…", reference:"参考编号" };
const ja: Record<Key, string> = { ...en, title:"精度の高い文章を。", subtitle:"CEFR に沿ったフィードバックで、より明確で自信のある英語へ。", connected:"AI 評価システム稼働中", estimate:"レベルを推定", targeted:"目標レベルを検証", estimateDesc:"現在の CEFR レベルと改善点を確認します。", targetedDesc:"選択した CEFR レベルに達しているかを検証し、文と語彙の改善案を得ます。", targetLevel:"目標 CEFR レベル", draft:"下書き", draftTitle:"何を書いていますか？", placeholder:"英語のエッセイ、メール、日記などを貼り付けてください…", helper:"完全な文が数文あると、より正確に評価できます。", check:"文章を分析", checking:"分析中…", signInTitle:"ログインして開始", signInCopy:"評価結果を独立した me2write アカウントに保存します。", signIn:"Google で続行", signOut:"ログアウト", admin:"管理コンソール", speaking:"スピーキング練習 ↗", language:"言語", account:"アカウント", role:"権限", administrator:"管理者", member:"メンバー", blocked:"評価機能は停止されています", estimatedLevel:"推定 CEFR レベル", scores:"ライティング指標", works:"良い点", priorities:"改善点", corrections:"役立つ修正", original:"原文", better:"改善例", next:"次のステップ", targetReview:"目標レベル検証", meets:"目標達成", notMeets:"目標未達", gaps:"改善すべき差", sentenceUpgrades:"文の改善", vocabularyUpgrades:"語彙の改善", alternatives:"代替表現", overview:"概要", users:"ユーザー", usageTitle:"利用状況とユーザー管理", usageSubtitle:"評価数、トークン、安定性、アクセス権を監視します。", today:"今日", week:"今週", month:"今月", year:"今年", requests:"リクエスト", successful:"成功", failed:"失敗", inputTokens:"入力トークン", outputTokens:"出力トークン", totalTokens:"総トークン", providerModel:"プロバイダーとモデル", user:"ユーザー", activity:"評価回数", lastActive:"最終利用", status:"状態", active:"有効", suspended:"停止中", permanent:"永久", actions:"操作", manage:"管理", suspendDays:"日数指定で停止", blockPermanent:"永久停止", unblock:"アクセスを復元", days:"日数", reason:"理由", apply:"適用", cancel:"キャンセル", searchUsers:"ユーザー検索", noUsers:"該当するユーザーはいません。", loading:"読み込み中…", reference:"参照 ID" };

const dictionaries: Record<Locale, Record<Key, string>> = { en, vi, zh, ja };
const paginationLabels: Record<Locale, { previous: string; nextPage: string }> = {
  en: { previous: "Previous", nextPage: "Next" },
  vi: { previous: "Trước", nextPage: "Tiếp" },
  zh: { previous: "上一页", nextPage: "下一页" },
  ja: { previous: "前へ", nextPage: "次へ" }
};
type ReviewKey = "retry" | "reportTimeZone" | "expires" | "currentReason" | "successFailed" | "currentRestriction";
const reviewLabels: Record<Locale, Record<ReviewKey | "connected", string>> = {
  en: { connected: "Evaluation workspace ready", retry: "Retry evaluation", reportTimeZone: "Reporting time zone", expires: "Expires", currentReason: "Reason", successFailed: "Success / failed", currentRestriction: "Current restriction" },
  vi: { connected: "Không gian đánh giá đã sẵn sàng", retry: "Thử đánh giá lại", reportTimeZone: "Múi giờ báo cáo", expires: "Hết hạn", currentReason: "Lý do", successFailed: "Thành công / thất bại", currentRestriction: "Hạn chế hiện tại" },
  zh: { connected: "评估工作区已就绪", retry: "重试评估", reportTimeZone: "报告时区", expires: "到期时间", currentReason: "原因", successFailed: "成功 / 失败", currentRestriction: "当前限制" },
  ja: { connected: "評価ワークスペースの準備完了", retry: "評価を再試行", reportTimeZone: "レポートのタイムゾーン", expires: "期限", currentReason: "理由", successFailed: "成功 / 失敗", currentRestriction: "現在の制限" }
};
export type TranslationKey = Key | ReviewKey;
export const translate = (locale: Locale, key: TranslationKey): string => {
  if (key in reviewLabels[locale]) return reviewLabels[locale][key as ReviewKey | "connected"];
  return key === "previous" || key === "nextPage" ? paginationLabels[locale][key] : dictionaries[locale][key as Key];
};
export const localeLabels: Record<Locale, string> = { en: "English", vi: "Tiếng Việt", zh: "中文", ja: "日本語" };
export const localeFlags: Record<Locale, string> = { en: "EN", vi: "VI", zh: "中", ja: "日" };
const apiErrorMessages: Record<Locale, Record<string, string>> = {
  en: {
    AUTH_REQUIRED: "Please sign in again.", USER_BLOCKED: "This account cannot submit evaluations.",
    INVALID_INPUT: "Please check the submitted information.", WRITING_TOO_LONG: "This writing exceeds the word limit.",
    RATE_LIMITED: "The daily evaluation limit has been reached.", AI_QUOTA_UNAVAILABLE: "The AI quota is temporarily unavailable.",
    PROVIDER_UNAVAILABLE: "The writing evaluator is temporarily unavailable.", INVALID_PROVIDER_OUTPUT: "The evaluator returned an invalid response.",
    EVALUATION_FAILED: "The evaluation could not be completed.", DUPLICATE_REQUEST: "This request has already been submitted.",
    EVALUATION_IN_PROGRESS: "This evaluation is already in progress.", FORBIDDEN: "You do not have permission for this action.",
    INTERNAL_ERROR: "An unexpected error occurred.", UNKNOWN_ERROR: "We couldn't complete this request. Please try again."
  },
  vi: {
    AUTH_REQUIRED: "Vui lòng đăng nhập lại.", USER_BLOCKED: "Tài khoản này không thể gửi bài đánh giá.",
    INVALID_INPUT: "Vui lòng kiểm tra thông tin đã gửi.", WRITING_TOO_LONG: "Bài viết vượt quá giới hạn từ.",
    RATE_LIMITED: "Đã đạt giới hạn đánh giá trong ngày.", AI_QUOTA_UNAVAILABLE: "Hạn mức AI đang tạm thời không khả dụng.",
    PROVIDER_UNAVAILABLE: "Hệ thống đánh giá bài viết đang tạm thời không khả dụng.", INVALID_PROVIDER_OUTPUT: "Hệ thống đánh giá trả về dữ liệu không hợp lệ.",
    EVALUATION_FAILED: "Không thể hoàn tất đánh giá.", DUPLICATE_REQUEST: "Yêu cầu này đã được gửi.",
    EVALUATION_IN_PROGRESS: "Bài viết này đang được đánh giá.", FORBIDDEN: "Bạn không có quyền thực hiện thao tác này.",
    INTERNAL_ERROR: "Đã xảy ra lỗi không mong muốn.", UNKNOWN_ERROR: "Không thể hoàn tất yêu cầu. Vui lòng thử lại."
  },
  zh: {
    AUTH_REQUIRED: "请重新登录。", USER_BLOCKED: "此账户无法提交评估。", INVALID_INPUT: "请检查提交的信息。",
    WRITING_TOO_LONG: "文章超过字数限制。", RATE_LIMITED: "已达到每日评估上限。", AI_QUOTA_UNAVAILABLE: "AI 配额暂时不可用。",
    PROVIDER_UNAVAILABLE: "写作评估服务暂时不可用。", INVALID_PROVIDER_OUTPUT: "评估服务返回了无效数据。", EVALUATION_FAILED: "无法完成评估。",
    DUPLICATE_REQUEST: "此请求已经提交。", EVALUATION_IN_PROGRESS: "此评估正在进行中。", FORBIDDEN: "您无权执行此操作。",
    INTERNAL_ERROR: "发生意外错误。", UNKNOWN_ERROR: "无法完成请求，请重试。"
  },
  ja: {
    AUTH_REQUIRED: "再度ログインしてください。", USER_BLOCKED: "このアカウントは評価を送信できません。", INVALID_INPUT: "送信内容を確認してください。",
    WRITING_TOO_LONG: "文章が単語数の上限を超えています。", RATE_LIMITED: "1日の評価上限に達しました。", AI_QUOTA_UNAVAILABLE: "AI の利用枠は一時的に使用できません。",
    PROVIDER_UNAVAILABLE: "文章評価サービスは一時的に利用できません。", INVALID_PROVIDER_OUTPUT: "評価サービスから無効なデータが返されました。", EVALUATION_FAILED: "評価を完了できませんでした。",
    DUPLICATE_REQUEST: "このリクエストはすでに送信されています。", EVALUATION_IN_PROGRESS: "この評価はすでに処理中です。", FORBIDDEN: "この操作を行う権限がありません。",
    INTERNAL_ERROR: "予期しないエラーが発生しました。", UNKNOWN_ERROR: "リクエストを完了できませんでした。もう一度お試しください。"
  }
};
export const localizeApiError = (locale: Locale, code: string, fallback: string): string =>
  apiErrorMessages[locale][code] ?? fallback;
export const resolveLocale = (): Locale => {
  const saved = window.localStorage.getItem("me2write_locale");
  if (saved === "en" || saved === "vi" || saved === "zh" || saved === "ja") return saved;
  for (const language of navigator.languages.length ? navigator.languages : [navigator.language]) {
    const base = language.toLowerCase().split("-")[0];
    if (base === "vi" || base === "zh" || base === "ja" || base === "en") return base;
  }
  return "en";
};
