import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { INDEXABLE_PATHS, SITE_ORIGIN } from "./src/site-config";

const siteFiles = (): Plugin => ({
  name: "me2write-site-files",
  transformIndexHtml: (html: string) => html.replaceAll("__SITE_ORIGIN__", SITE_ORIGIN),
  generateBundle() {
    const urls = INDEXABLE_PATHS.map((path) => `  <url><loc>${SITE_ORIGIN}${path}</loc></url>`).join("\n");
    this.emitFile({ type: "asset", fileName: "sitemap.xml", source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n` });
    this.emitFile({ type: "asset", fileName: "robots.txt", source: `User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n` });
  }
});

export default defineConfig({
  plugins: [react(), siteFiles()],
  build: {
    rollupOptions: {
      input: {
        home: "index.html",
        writingChecker: "writing-checker.html",
        writingPractice: "writing-practice.html",
        examPractice: "exam-practice.html",
        about: "about.html",
        contact: "contact.html",
        privacy: "privacy.html",
        admin: "admin.html"
      }
    }
  }
});
