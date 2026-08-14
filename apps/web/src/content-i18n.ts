import type { Locale } from "./types";

type SectionCopy = { title: string; body: string };
type ContentCopy = {
  navigation: { home: string; features: string; about: string; contact: string; primaryLabel: string; brandTagline: string; homeLabel: string };
  features: { label: string; checker: string; checkerDescription: string; practice: string; practiceDescription: string; exam: string; examDescription: string };
  footer: { label: string; product: string; information: string; legal: string; about: string; contact: string; privacy: string };
  notFound: { title: string; description: string; action: string };
  practice: {
    writingPractice: string; examPractice: string; chooseTopic: string; timedExam: string; timeExpired: string;
    category: string; generalTopics: string; ieltsTopics: string; topic: string; chooseATopic: string; randomTopic: string;
    timer: string; noLimit: string; minutes: string; exam: string; variant: string; ieltsAcademic: string; ieltsGeneral: string;
    continuousTimer: string; eightQuestions: string; twoTasks: string; question: string; examVisual: string;
    requiredWords: string; recommendedMinimum: string; recommendedAllocation: string; responsePlaceholder: string;
    starting: string; startPractice: string; startExam: string; previous: string; next: string; submitting: string;
    finalize: string; submit: string; words: string; submitted: string; newSession: string;
    loadError: string; startError: string; randomError: string; submitError: string;
  };
  results: {
    ieltsBand: string; task1: string; task2: string; task1Criteria: string; task2Criteria: string;
    taskResponse: string; coherence: string; lexicalResource: string; grammar: string; toeicScore: string;
    questionFeedback: string; strengths: string; weaknesses: string; suggestions: string;
  };
  about: { eyebrow: string; title: string; intro: string; sections: SectionCopy[]; action: string };
  contact: { eyebrow: string; title: string; intro: string; emailTitle: string; emailBody: string; includeTitle: string; includeBody: string; note: string };
  privacy: { eyebrow: string; title: string; updated: string; intro: string; sections: SectionCopy[]; contactTitle: string; contactPrefix: string };
};

const en: ContentCopy = {
  navigation: { home: "Home", features: "Features", about: "About", contact: "Contact", primaryLabel: "Primary navigation", brandTagline: "Writing intelligence", homeLabel: "me2write home" },
  features: { label: "Writing features", checker: "Writing checker", checkerDescription: "Get CEFR-aligned feedback for your own English draft.", practice: "Writing practice", practiceDescription: "Write from guided general and IELTS-style topics.", exam: "Exam practice", examDescription: "Complete IELTS and TOEIC writing practice tasks." },
  footer: { label: "Footer navigation", product: "Product", information: "Information", legal: "Legal", about: "About me2write", contact: "Contact", privacy: "Privacy policy" },
  notFound: { title: "Page not found", description: "The page you requested does not exist.", action: "Return to me2write" },
  practice: { writingPractice: "Writing practice", examPractice: "Exam practice", chooseTopic: "Choose a topic and write", timedExam: "Timed writing exam", timeExpired: "Time expired", category: "Category", generalTopics: "General topics", ieltsTopics: "IELTS topics", topic: "Topic", chooseATopic: "Choose a topic", randomTopic: "Random topic", timer: "Timer", noLimit: "No limit", minutes: "minutes", exam: "Exam", variant: "Variant", ieltsAcademic: "IELTS Academic", ieltsGeneral: "IELTS General Training", continuousTimer: "One continuous 60-minute timer.", eightQuestions: "8 questions.", twoTasks: "Task 1 + Task 2.", question: "Question", examVisual: "Exam task visual", requiredWords: "Required words", recommendedMinimum: "Recommended minimum", recommendedAllocation: "Recommended allocation", responsePlaceholder: "Write your response here…", starting: "Starting…", startPractice: "Start practice", startExam: "Start exam", previous: "Previous", next: "Next", submitting: "Submitting…", finalize: "Finalize submission", submit: "Submit", words: "words", submitted: "Submitted for AI estimated feedback.", newSession: "Start a new session", loadError: "Unable to load practice content.", startError: "Unable to start the session.", randomError: "Unable to select a random topic.", submitError: "Submission failed." },
  results: { ieltsBand: "Estimated IELTS Writing Band", task1: "Task 1", task2: "Task 2", task1Criteria: "Task 1 criteria", task2Criteria: "Task 2 criteria", taskResponse: "Task response", coherence: "Coherence", lexicalResource: "Lexical resource", grammar: "Grammar", toeicScore: "Estimated TOEIC Writing Score", questionFeedback: "Question feedback", strengths: "Strengths", weaknesses: "Weaknesses", suggestions: "Improvement suggestions" },
  about: { eyebrow: "About us", title: "English writing practice with useful, structured feedback", intro: "me2write is a writing practice application for people who want to communicate more clearly in English and better understand their current writing level.", sections: [
    { title: "What me2write does", body: "The application analyzes English writing against CEFR-oriented criteria and returns practical feedback on grammar, vocabulary, coherence, cohesion, sentence complexity, naturalness, and communicative effectiveness. Learners can estimate their current level or compare a draft with a selected CEFR target." },
    { title: "Practice for different goals", body: "In addition to checking an existing draft, learners can choose guided general or IELTS-style topics, work with optional timers, and complete IELTS Academic, IELTS General Training, or TOEIC Writing practice sessions." },
    { title: "Who it is for", body: "me2write is intended for English learners preparing for study, work, exams, or everyday communication. Its automated estimates are practice guidance rather than official exam results or human expert assessment." },
    { title: "Our approach", body: "We focus on specific observations and actionable revisions. Feedback highlights strengths, priorities, corrections, and possible sentence or vocabulary improvements so learners can decide what to revise next." }
  ], action: "Start checking your writing" },
  contact: { eyebrow: "Contact", title: "Get in touch with me2write", intro: "We welcome clear, specific messages that help us understand your question or improve the product.", emailTitle: "Email support", emailBody: "Contact us about general feedback, bug reports, feature suggestions, partnership opportunities, or other product inquiries.", includeTitle: "What to include", includeBody: "For a technical problem, describe what you expected, what happened, and which browser or device you used. Do not email passwords, authentication cookies, API keys, or other sensitive credentials.", note: "Response times can vary. Sending a message does not create an emergency or real-time support channel." },
  privacy: { eyebrow: "Privacy policy", title: "How me2write handles your information", updated: "Last updated: August 14, 2026", intro: "This policy explains the information used by the current me2write application. It is a product notice and is not legal advice.", sections: [
    { title: "Information we collect", body: "When you sign in with Google, me2write receives account identifiers and may receive your email address, display name, and profile image. We store account and session records needed to authenticate you and operate the service." },
    { title: "Writing and analysis data", body: "We collect the writing you submit, selected practice or evaluation settings, word counts, generated feedback, result status, and technical usage information associated with an evaluation. Practice sessions also store their assigned tasks, answers, timing, and status." },
    { title: "How information is used", body: "We use this information to authenticate accounts, provide writing analysis and practice sessions, return and store results, prevent duplicate or excessive requests, maintain service reliability, investigate errors, and administer account access." },
    { title: "AI and service providers", body: "Submitted writing and relevant task context are sent to Cloudflare Workers AI to generate feedback. The application uses Cloudflare for website and API delivery, Neon for PostgreSQL data storage, and Google for sign-in. These providers process information as needed to deliver their services under their own terms and privacy practices." },
    { title: "Cookies and local storage", body: "me2write uses an essential, secure authentication cookie to keep signed-in sessions working. The website also stores your selected interface language in browser local storage. The current source does not include a separate advertising or behavioral analytics integration." },
    { title: "Storage, security, and retention", body: "Account, writing, result, session, and operational records are stored in the application's database. We use access controls, server-side authorization, restricted secrets, request validation, and secure cookie settings to reduce risk. No internet service can guarantee absolute security. The current application does not define a fixed automatic deletion period." },
    { title: "Your choices", body: "You can sign out to end the current browser session and change or clear the saved language preference through your browser. To ask about your personal information or request an available account or data action, contact us. Some records may need to be retained for security, integrity, or legal obligations." },
    { title: "Policy changes", body: "We may update this policy when the product or its data practices change. The visible Last updated date identifies the current version." }
  ], contactTitle: "Contact", contactPrefix: "Privacy questions can be sent to" }
};

const vi: ContentCopy = {
  navigation: { home: "Trang chủ", features: "Tính năng", about: "Giới thiệu", contact: "Liên hệ", primaryLabel: "Điều hướng chính", brandTagline: "Trí tuệ viết", homeLabel: "Trang chủ me2write" },
  features: { label: "Các tính năng luyện viết", checker: "Kiểm tra bài viết", checkerDescription: "Nhận phản hồi theo CEFR cho bài viết tiếng Anh của bạn.", practice: "Luyện viết", practiceDescription: "Viết theo các chủ đề phổ thông và dạng IELTS có hướng dẫn.", exam: "Luyện thi", examDescription: "Hoàn thành các bài luyện viết IELTS và TOEIC." },
  footer: { label: "Điều hướng chân trang", product: "Sản phẩm", information: "Thông tin", legal: "Pháp lý", about: "Giới thiệu me2write", contact: "Liên hệ", privacy: "Chính sách quyền riêng tư" },
  notFound: { title: "Không tìm thấy trang", description: "Trang bạn yêu cầu không tồn tại.", action: "Quay lại me2write" },
  practice: { writingPractice: "Luyện viết", examPractice: "Luyện thi", chooseTopic: "Chọn chủ đề và bắt đầu viết", timedExam: "Bài thi viết có tính giờ", timeExpired: "Đã hết giờ", category: "Danh mục", generalTopics: "Chủ đề phổ thông", ieltsTopics: "Chủ đề IELTS", topic: "Chủ đề", chooseATopic: "Chọn một chủ đề", randomTopic: "Chủ đề ngẫu nhiên", timer: "Hẹn giờ", noLimit: "Không giới hạn", minutes: "phút", exam: "Kỳ thi", variant: "Hình thức", ieltsAcademic: "IELTS Academic", ieltsGeneral: "IELTS General Training", continuousTimer: "Một bộ đếm 60 phút liên tục.", eightQuestions: "8 câu hỏi.", twoTasks: "Task 1 + Task 2.", question: "Câu", examVisual: "Hình minh họa đề thi", requiredWords: "Từ bắt buộc", recommendedMinimum: "Số từ tối thiểu khuyến nghị", recommendedAllocation: "Thời gian khuyến nghị", responsePlaceholder: "Viết câu trả lời tại đây…", starting: "Đang bắt đầu…", startPractice: "Bắt đầu luyện viết", startExam: "Bắt đầu bài thi", previous: "Trước", next: "Tiếp", submitting: "Đang nộp…", finalize: "Hoàn tất bài nộp", submit: "Nộp bài", words: "từ", submitted: "Đã nộp để AI ước tính và phản hồi.", newSession: "Bắt đầu phiên mới", loadError: "Không thể tải nội dung luyện tập.", startError: "Không thể bắt đầu phiên.", randomError: "Không thể chọn chủ đề ngẫu nhiên.", submitError: "Nộp bài không thành công." },
  results: { ieltsBand: "Điểm IELTS Writing ước tính", task1: "Task 1", task2: "Task 2", task1Criteria: "Tiêu chí Task 1", task2Criteria: "Tiêu chí Task 2", taskResponse: "Đáp ứng yêu cầu", coherence: "Mạch lạc và liên kết", lexicalResource: "Vốn từ", grammar: "Ngữ pháp", toeicScore: "Điểm TOEIC Writing ước tính", questionFeedback: "Phản hồi theo câu", strengths: "Điểm mạnh", weaknesses: "Điểm yếu", suggestions: "Gợi ý cải thiện" },
  about: { eyebrow: "Về chúng tôi", title: "Luyện viết tiếng Anh với phản hồi hữu ích và có cấu trúc", intro: "me2write là ứng dụng luyện viết dành cho những người muốn giao tiếp tiếng Anh rõ ràng hơn và hiểu đúng hơn về trình độ viết hiện tại.", sections: [
    { title: "me2write làm gì", body: "Ứng dụng phân tích bài viết tiếng Anh theo các tiêu chí định hướng CEFR và đưa ra phản hồi thực tế về ngữ pháp, từ vựng, tính mạch lạc, liên kết, độ phức tạp câu, sự tự nhiên và hiệu quả giao tiếp. Người học có thể ước tính trình độ hiện tại hoặc so sánh bài viết với một mục tiêu CEFR đã chọn." },
    { title: "Luyện tập cho nhiều mục tiêu", body: "Ngoài việc kiểm tra bài viết có sẵn, người học có thể chọn chủ đề phổ thông hoặc dạng IELTS, sử dụng bộ đếm thời gian tùy chọn và hoàn thành các phiên luyện IELTS Academic, IELTS General Training hoặc TOEIC Writing." },
    { title: "Dành cho ai", body: "me2write dành cho người học tiếng Anh phục vụ học tập, công việc, kỳ thi hoặc giao tiếp hằng ngày. Điểm ước tính tự động chỉ là hướng dẫn luyện tập, không phải kết quả thi chính thức hay đánh giá của chuyên gia." },
    { title: "Cách tiếp cận", body: "Chúng tôi tập trung vào nhận xét cụ thể và các chỉnh sửa có thể áp dụng. Phản hồi nêu bật điểm mạnh, ưu tiên, lỗi cần sửa và cách cải thiện câu hoặc từ vựng để người học biết bước tiếp theo." }
  ], action: "Bắt đầu kiểm tra bài viết" },
  contact: { eyebrow: "Liên hệ", title: "Liên hệ với me2write", intro: "Chúng tôi hoan nghênh các tin nhắn rõ ràng, cụ thể để hiểu câu hỏi của bạn hoặc cải thiện sản phẩm.", emailTitle: "Hỗ trợ qua email", emailBody: "Bạn có thể liên hệ về phản hồi chung, báo lỗi, đề xuất tính năng, cơ hội hợp tác hoặc các câu hỏi khác về sản phẩm.", includeTitle: "Thông tin nên cung cấp", includeBody: "Khi báo lỗi kỹ thuật, hãy mô tả kết quả mong đợi, điều đã xảy ra và trình duyệt hoặc thiết bị bạn sử dụng. Không gửi mật khẩu, cookie xác thực, khóa API hoặc thông tin đăng nhập nhạy cảm qua email.", note: "Thời gian phản hồi có thể thay đổi. Email này không phải kênh hỗ trợ khẩn cấp hoặc theo thời gian thực." },
  privacy: { eyebrow: "Chính sách quyền riêng tư", title: "Cách me2write xử lý thông tin của bạn", updated: "Cập nhật lần cuối: 14 tháng 8, 2026", intro: "Chính sách này giải thích thông tin được phiên bản me2write hiện tại sử dụng. Đây là thông báo về sản phẩm, không phải tư vấn pháp lý.", sections: [
    { title: "Thông tin chúng tôi thu thập", body: "Khi bạn đăng nhập bằng Google, me2write nhận mã định danh tài khoản và có thể nhận địa chỉ email, tên hiển thị và ảnh hồ sơ. Chúng tôi lưu thông tin tài khoản và phiên cần thiết để xác thực và vận hành dịch vụ." },
    { title: "Dữ liệu bài viết và phân tích", body: "Chúng tôi thu thập bài viết bạn gửi, cài đặt luyện tập hoặc đánh giá, số từ, phản hồi được tạo, trạng thái kết quả và thông tin sử dụng kỹ thuật liên quan. Phiên luyện tập cũng lưu đề được giao, câu trả lời, thời gian và trạng thái." },
    { title: "Cách sử dụng thông tin", body: "Thông tin được dùng để xác thực tài khoản, cung cấp phân tích và phiên luyện viết, trả về và lưu kết quả, ngăn yêu cầu trùng lặp hoặc quá mức, duy trì độ ổn định, điều tra lỗi và quản lý quyền truy cập." },
    { title: "AI và nhà cung cấp dịch vụ", body: "Bài viết cùng ngữ cảnh đề liên quan được gửi tới Cloudflare Workers AI để tạo phản hồi. Ứng dụng dùng Cloudflare để phân phối website và API, Neon để lưu dữ liệu PostgreSQL và Google để đăng nhập. Các nhà cung cấp xử lý thông tin cần thiết theo điều khoản và chính sách riêng của họ." },
    { title: "Cookie và bộ nhớ cục bộ", body: "me2write dùng cookie xác thực bảo mật và thiết yếu để duy trì phiên đăng nhập. Website cũng lưu ngôn ngữ giao diện đã chọn trong bộ nhớ cục bộ của trình duyệt. Mã nguồn hiện tại không có tích hợp quảng cáo hoặc phân tích hành vi riêng." },
    { title: "Lưu trữ, bảo mật và thời hạn", body: "Thông tin tài khoản, bài viết, kết quả, phiên và vận hành được lưu trong cơ sở dữ liệu. Chúng tôi dùng kiểm soát truy cập, phân quyền phía máy chủ, bí mật giới hạn, xác thực yêu cầu và cookie bảo mật để giảm rủi ro. Không dịch vụ internet nào đảm bảo an toàn tuyệt đối. Ứng dụng hiện chưa quy định thời hạn xóa tự động cố định." },
    { title: "Lựa chọn của bạn", body: "Bạn có thể đăng xuất để kết thúc phiên hiện tại và thay đổi hoặc xóa ngôn ngữ đã lưu trong trình duyệt. Hãy liên hệ để hỏi về thông tin cá nhân hoặc yêu cầu thao tác dữ liệu khả dụng. Một số hồ sơ có thể cần được giữ lại vì bảo mật, tính toàn vẹn hoặc nghĩa vụ pháp lý." },
    { title: "Thay đổi chính sách", body: "Chúng tôi có thể cập nhật chính sách khi sản phẩm hoặc cách xử lý dữ liệu thay đổi. Ngày Cập nhật lần cuối cho biết phiên bản hiện hành." }
  ], contactTitle: "Liên hệ", contactPrefix: "Câu hỏi về quyền riêng tư có thể gửi tới" }
};

const zh: ContentCopy = {
  navigation: { home: "首页", features: "功能", about: "关于", contact: "联系", primaryLabel: "主导航", brandTagline: "写作智能", homeLabel: "me2write 首页" },
  features: { label: "写作功能", checker: "写作检查", checkerDescription: "为您的英文草稿获取符合 CEFR 的反馈。", practice: "写作练习", practiceDescription: "根据通用和 IELTS 风格的引导主题进行写作。", exam: "考试练习", examDescription: "完成 IELTS 和 TOEIC 写作模拟任务。" },
  footer: { label: "页脚导航", product: "产品", information: "信息", legal: "法律", about: "关于 me2write", contact: "联系我们", privacy: "隐私政策" },
  notFound: { title: "找不到页面", description: "您请求的页面不存在。", action: "返回 me2write" },
  practice: { writingPractice: "写作练习", examPractice: "考试练习", chooseTopic: "选择主题并开始写作", timedExam: "限时写作考试", timeExpired: "时间已到", category: "类别", generalTopics: "通用主题", ieltsTopics: "IELTS 主题", topic: "主题", chooseATopic: "选择一个主题", randomTopic: "随机主题", timer: "计时器", noLimit: "不限时", minutes: "分钟", exam: "考试", variant: "类型", ieltsAcademic: "IELTS 学术类", ieltsGeneral: "IELTS 培训类", continuousTimer: "连续 60 分钟计时。", eightQuestions: "8 道题。", twoTasks: "Task 1 + Task 2。", question: "题目", examVisual: "考试题目图片", requiredWords: "必用词", recommendedMinimum: "建议最低字数", recommendedAllocation: "建议用时", responsePlaceholder: "在此输入答案…", starting: "正在开始…", startPractice: "开始练习", startExam: "开始考试", previous: "上一题", next: "下一题", submitting: "正在提交…", finalize: "完成提交", submit: "提交", words: "词", submitted: "已提交，等待 AI 估分反馈。", newSession: "开始新练习", loadError: "无法加载练习内容。", startError: "无法开始练习。", randomError: "无法选择随机主题。", submitError: "提交失败。" },
  results: { ieltsBand: "IELTS 写作预估分数", task1: "Task 1", task2: "Task 2", task1Criteria: "Task 1 评分标准", task2Criteria: "Task 2 评分标准", taskResponse: "任务回应", coherence: "连贯与衔接", lexicalResource: "词汇资源", grammar: "语法", toeicScore: "TOEIC 写作预估分数", questionFeedback: "逐题反馈", strengths: "优点", weaknesses: "不足", suggestions: "改进建议" },
  about: { eyebrow: "关于我们", title: "通过实用、结构化的反馈练习英语写作", intro: "me2write 是一款写作练习应用，帮助希望更清晰地使用英语沟通并了解当前写作水平的学习者。", sections: [
    { title: "me2write 的功能", body: "应用依据 CEFR 导向标准分析英语写作，并就语法、词汇、连贯性、衔接、句子复杂度、自然度和沟通效果提供实用反馈。学习者可以估算当前水平，或将草稿与所选 CEFR 目标进行比较。" },
    { title: "面向不同目标的练习", body: "除了检查已有草稿，学习者还可以选择通用或 IELTS 风格主题、使用可选计时器，并完成 IELTS Academic、IELTS General Training 或 TOEIC Writing 模拟练习。" },
    { title: "适用人群", body: "me2write 适合为学习、工作、考试或日常沟通而学习英语的人。自动估分仅作为练习指导，不是正式考试成绩或人工专家评估。" },
    { title: "我们的方法", body: "我们专注于具体观察和可执行的修改。反馈会指出优点、优先改进项、纠错建议以及句子或词汇优化方案，帮助学习者决定下一步。" }
  ], action: "开始检查写作" },
  contact: { eyebrow: "联系我们", title: "联系 me2write", intro: "欢迎发送清晰、具体的信息，帮助我们理解您的问题或改进产品。", emailTitle: "邮件支持", emailBody: "您可以就一般反馈、错误报告、功能建议、合作机会或其他产品问题联系我们。", includeTitle: "建议提供的信息", includeBody: "如遇技术问题，请说明预期结果、实际情况以及所用浏览器或设备。请勿通过邮件发送密码、身份验证 Cookie、API 密钥或其他敏感凭据。", note: "回复时间可能有所不同。此邮箱并非紧急或实时支持渠道。" },
  privacy: { eyebrow: "隐私政策", title: "me2write 如何处理您的信息", updated: "最后更新：2026年8月14日", intro: "本政策说明当前 me2write 应用使用的信息。这是产品说明，不构成法律建议。", sections: [
    { title: "我们收集的信息", body: "使用 Google 登录时，me2write 会接收账户标识符，并可能接收您的电子邮箱、显示名称和头像。我们保存账户和会话记录，以进行身份验证并运营服务。" },
    { title: "写作与分析数据", body: "我们收集您提交的写作、所选练习或评估设置、字数、生成的反馈、结果状态以及相关技术使用信息。练习会话还会保存分配的任务、答案、计时和状态。" },
    { title: "信息的使用方式", body: "这些信息用于验证账户、提供写作分析和练习、返回并保存结果、防止重复或过量请求、维护服务可靠性、调查错误以及管理账户访问。" },
    { title: "AI 与服务提供商", body: "提交的写作和相关任务上下文会发送到 Cloudflare Workers AI 生成反馈。应用使用 Cloudflare 提供网站和 API、使用 Neon 存储 PostgreSQL 数据，并使用 Google 登录。服务商会根据各自条款和隐私政策处理提供服务所需的信息。" },
    { title: "Cookie 与本地存储", body: "me2write 使用必要且安全的身份验证 Cookie 来维持登录会话。网站还会在浏览器本地存储中保存所选界面语言。当前源代码不包含独立的广告或行为分析集成。" },
    { title: "存储、安全与保留", body: "账户、写作、结果、会话和运营记录存储在应用数据库中。我们通过访问控制、服务端授权、受限密钥、请求验证和安全 Cookie 设置降低风险。任何互联网服务都无法保证绝对安全。当前应用未规定固定的自动删除期限。" },
    { title: "您的选择", body: "您可以退出登录以结束当前会话，也可以通过浏览器更改或清除已保存的语言偏好。如需咨询个人信息或请求可提供的账户或数据操作，请联系我们。出于安全、完整性或法律义务，部分记录可能需要保留。" },
    { title: "政策变更", body: "当产品或数据处理方式发生变化时，我们可能更新本政策。页面显示的最后更新日期标识当前版本。" }
  ], contactTitle: "联系我们", contactPrefix: "隐私相关问题可发送至" }
};

const ja: ContentCopy = {
  navigation: { home: "ホーム", features: "機能", about: "概要", contact: "お問い合わせ", primaryLabel: "メインナビゲーション", brandTagline: "ライティングインテリジェンス", homeLabel: "me2write ホーム" },
  features: { label: "ライティング機能", checker: "文章チェック", checkerDescription: "英語の下書きにCEFR準拠のフィードバックを受けられます。", practice: "ライティング練習", practiceDescription: "一般・IELTS形式のガイド付きトピックで練習します。", exam: "試験練習", examDescription: "IELTS・TOEIC形式のライティング課題に取り組みます。" },
  footer: { label: "フッターナビゲーション", product: "製品", information: "情報", legal: "法的情報", about: "me2writeについて", contact: "お問い合わせ", privacy: "プライバシーポリシー" },
  notFound: { title: "ページが見つかりません", description: "指定されたページは存在しません。", action: "me2writeに戻る" },
  practice: { writingPractice: "ライティング練習", examPractice: "試験練習", chooseTopic: "トピックを選んで書く", timedExam: "時間制ライティング試験", timeExpired: "時間切れ", category: "カテゴリー", generalTopics: "一般トピック", ieltsTopics: "IELTSトピック", topic: "トピック", chooseATopic: "トピックを選択", randomTopic: "ランダムトピック", timer: "タイマー", noLimit: "時間制限なし", minutes: "分", exam: "試験", variant: "種類", ieltsAcademic: "IELTS Academic", ieltsGeneral: "IELTS General Training", continuousTimer: "60分間の連続タイマーです。", eightQuestions: "8問です。", twoTasks: "Task 1 + Task 2です。", question: "問題", examVisual: "試験課題の画像", requiredWords: "必須語句", recommendedMinimum: "推奨最低語数", recommendedAllocation: "推奨時間", responsePlaceholder: "ここに解答を入力…", starting: "開始中…", startPractice: "練習を開始", startExam: "試験を開始", previous: "前へ", next: "次へ", submitting: "送信中…", finalize: "提出を確定", submit: "提出", words: "語", submitted: "AIによる推定フィードバックに提出しました。", newSession: "新しいセッションを開始", loadError: "練習内容を読み込めません。", startError: "セッションを開始できません。", randomError: "ランダムトピックを選択できません。", submitError: "提出に失敗しました。" },
  results: { ieltsBand: "IELTS Writing 推定バンド", task1: "Task 1", task2: "Task 2", task1Criteria: "Task 1 評価基準", task2Criteria: "Task 2 評価基準", taskResponse: "課題達成度", coherence: "一貫性と結束性", lexicalResource: "語彙力", grammar: "文法", toeicScore: "TOEIC Writing 推定スコア", questionFeedback: "問題別フィードバック", strengths: "強み", weaknesses: "弱点", suggestions: "改善提案" },
  about: { eyebrow: "私たちについて", title: "実用的で構造化されたフィードバックによる英語ライティング練習", intro: "me2writeは、英語でより明確に伝え、現在のライティング力を理解したい人のための練習アプリです。", sections: [
    { title: "me2writeの機能", body: "CEFRを基準に英語文章を分析し、文法、語彙、一貫性、結束性、文の複雑さ、自然さ、伝達効果について実用的なフィードバックを返します。現在のレベル推定や、選択したCEFR目標との比較ができます。" },
    { title: "目的に合わせた練習", body: "自分の下書きの確認に加え、一般・IELTS形式のトピック、任意のタイマー、IELTS Academic、IELTS General Training、TOEIC Writingの模擬練習を利用できます。" },
    { title: "対象となる方", body: "学習、仕事、試験、日常会話のために英語を学ぶ方を対象としています。自動推定は練習用の目安であり、公式試験結果や専門家による評価ではありません。" },
    { title: "私たちのアプローチ", body: "具体的な指摘と実行可能な修正を重視します。強み、優先課題、訂正、文や語彙の改善案を示し、次に直すべき点を判断しやすくします。" }
  ], action: "文章チェックを始める" },
  contact: { eyebrow: "お問い合わせ", title: "me2writeへのお問い合わせ", intro: "ご質問の理解や製品改善につながる、明確で具体的なメッセージをお待ちしています。", emailTitle: "メールサポート", emailBody: "一般的なご意見、不具合報告、機能提案、提携のご相談、その他製品に関するお問い合わせを受け付けています。", includeTitle: "記載していただきたい内容", includeBody: "技術的な問題の場合は、期待した動作、実際に起きたこと、使用したブラウザや端末をお知らせください。パスワード、認証Cookie、APIキーなどの機密情報は送信しないでください。", note: "返信までの時間は状況により異なります。このメールは緊急・リアルタイムサポート窓口ではありません。" },
  privacy: { eyebrow: "プライバシーポリシー", title: "me2writeにおける情報の取り扱い", updated: "最終更新日：2026年8月14日", intro: "本ポリシーは現在のme2writeアプリが利用する情報について説明する製品通知であり、法的助言ではありません。", sections: [
    { title: "収集する情報", body: "Googleでログインすると、me2writeはアカウント識別子を受け取り、メールアドレス、表示名、プロフィール画像を受け取る場合があります。認証とサービス運営に必要なアカウント・セッション記録を保存します。" },
    { title: "文章と分析データ", body: "提出した文章、選択した練習・評価設定、語数、生成されたフィードバック、結果状態、関連する技術的利用情報を収集します。練習セッションでは、割り当てられた課題、解答、時間、状態も保存します。" },
    { title: "情報の利用目的", body: "アカウント認証、文章分析と練習の提供、結果の返却・保存、重複または過剰なリクエストの防止、信頼性維持、エラー調査、アクセス管理に利用します。" },
    { title: "AIとサービス提供者", body: "提出文章と関連する課題コンテキストは、フィードバック生成のためCloudflare Workers AIに送信されます。ウェブサイトとAPI配信にCloudflare、PostgreSQLデータ保存にNeon、ログインにGoogleを利用します。各提供者はそれぞれの規約とプライバシー方針に従い必要な情報を処理します。" },
    { title: "Cookieとローカルストレージ", body: "ログイン状態の維持に必要な安全な認証Cookieを使用します。選択した表示言語はブラウザのローカルストレージに保存されます。現在のソースには独立した広告・行動分析機能は含まれていません。" },
    { title: "保存、セキュリティ、保持期間", body: "アカウント、文章、結果、セッション、運用記録はアプリのデータベースに保存されます。アクセス制御、サーバー側認可、制限された秘密情報、リクエスト検証、安全なCookie設定でリスクを軽減します。完全な安全を保証できるインターネットサービスはありません。現在、固定の自動削除期間は定めていません。" },
    { title: "利用者の選択", body: "ログアウトして現在のセッションを終了し、ブラウザで保存言語を変更・削除できます。個人情報や利用可能なアカウント・データ対応についてはお問い合わせください。セキュリティ、完全性、法的義務のため一部記録を保持する場合があります。" },
    { title: "ポリシーの変更", body: "製品やデータ取り扱いが変わった場合、本ポリシーを更新することがあります。表示される最終更新日が現在の版を示します。" }
  ], contactTitle: "お問い合わせ", contactPrefix: "プライバシーに関するご質問は次の宛先へ" }
};

const content: Record<Locale, ContentCopy> = { en, vi, zh, ja };
export const getContent = (locale: Locale): ContentCopy => content[locale];
