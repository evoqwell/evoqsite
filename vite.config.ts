import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const siteUrl = env.VITE_SITE_URL || 'https://evoqwell.netlify.app';

  return {
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          shop: resolve(__dirname, 'shop.html'),
          about: resolve(__dirname, 'about.html'),
          contact: resolve(__dirname, 'contact.html'),
          checkout: resolve(__dirname, 'checkout.html'),
          admin: resolve(__dirname, 'admin.html'),
        },
      },
      copyPublicDir: true,
    },
    publicDir: 'public',
    plugins: [
      {
        name: 'html-transform',
        transformIndexHtml(html, ctx) {
          // Get the page path from the filename
          const pagePath = ctx.filename.split('/').pop() === 'index.html' ? '' : ctx.filename.split('/').pop();
          const canonicalUrl = pagePath ? `${siteUrl}/${pagePath}` : siteUrl;

          // Replace canonical URL and Open Graph URLs
          return html
            .replace(/(<link rel="canonical" href=")[^"]+(")/, `$1${canonicalUrl}$2`)
            .replace(/(<meta property="og:url" content=")[^"]+(")/, `$1${canonicalUrl}$2`)
            .replace(/(<meta property="twitter:url" content=")[^"]+(")/, `$1${canonicalUrl}$2`)
            .replace(/(<meta property="og:image" content=")[^"]*\/Logo\.PNG(")/, `$1${siteUrl}/Logo.PNG$2`)
            .replace(/(<meta property="twitter:image" content=")[^"]*\/Logo\.PNG(")/, `$1${siteUrl}/Logo.PNG$2`);
        },
      },
    ],
  };
});
