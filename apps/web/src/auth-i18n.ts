import type { Locale } from "./types";

export type AuthDialogCopy = {
  title: string;
  description: string;
  signIn: string;
  cancel: string;
  close: string;
};

const copies: Record<Locale, AuthDialogCopy> = {
  en: { title: "Sign in to continue", description: "Your writing is ready. Sign in to receive your evaluation and keep this draft saved while you continue.", signIn: "Continue with Google", cancel: "Maybe later", close: "Close sign-in dialog" },
  vi: { title: "Đăng nhập để tiếp tục", description: "Bài viết của bạn đã sẵn sàng. Hãy đăng nhập để nhận đánh giá và giữ lại bản nháp khi tiếp tục.", signIn: "Tiếp tục với Google", cancel: "Để sau", close: "Đóng hộp thoại đăng nhập" },
  zh: { title: "登录后继续", description: "您的文章已经准备好了。登录后即可获取评估，继续操作时草稿也会保留。", signIn: "使用 Google 继续", cancel: "稍后再说", close: "关闭登录对话框" },
  ja: { title: "ログインして続行", description: "文章の準備ができました。ログインすると評価を受けられ、続行中も下書きが保持されます。", signIn: "Google で続行", cancel: "後で", close: "ログインダイアログを閉じる" }
};

export const getAuthDialogCopy = (locale: Locale): AuthDialogCopy => copies[locale] ?? copies.en;
