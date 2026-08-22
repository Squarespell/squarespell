/**
 * Tailwind CSS is used only by the post-audit dashboard (src/components/dashboard/**),
 * loaded through src/app/dashboard.css. That file is imported exclusively from the
 * dashboard component tree (dynamically, via next/dynamic), never from
 * src/app/layout.tsx or globals.css, so this plugin never touches the marketing
 * homepage, /privacy, /squarespace-seo-issues, or Chrome.tsx.
 */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
