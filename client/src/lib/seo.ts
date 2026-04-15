/**
 * useSEO — dynamically sets page title, meta description, and Open Graph tags.
 * Call this at the top of each page component.
 */
export function useSEO(options: {
  title: string;
  description: string;
  image?: string;
  url?: string;
}) {
  const siteName = "Quick Turf";
  const fullTitle = options.title.includes(siteName)
    ? options.title
    : `${options.title} | ${siteName}`;

  // Title
  document.title = fullTitle;

  // Helper to set or create a meta tag
  const setMeta = (selector: string, attr: string, value: string) => {
    let el = document.querySelector(selector) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(selector.includes("property") ? "property" : "name", attr);
      document.head.appendChild(el);
    }
    el.setAttribute("content", value);
  };

  setMeta('meta[name="description"]', "description", options.description);

  // Open Graph (for WhatsApp, Facebook, LinkedIn shares)
  setMeta('meta[property="og:title"]', "og:title", fullTitle);
  setMeta('meta[property="og:description"]', "og:description", options.description);
  setMeta('meta[property="og:type"]', "og:type", "website");
  if (options.image) setMeta('meta[property="og:image"]', "og:image", options.image);
  if (options.url) setMeta('meta[property="og:url"]', "og:url", options.url);

  // Twitter Card
  setMeta('meta[name="twitter:card"]', "twitter:card", "summary_large_image");
  setMeta('meta[name="twitter:title"]', "twitter:title", fullTitle);
  setMeta('meta[name="twitter:description"]', "twitter:description", options.description);
  if (options.image) setMeta('meta[name="twitter:image"]', "twitter:image", options.image);
}
