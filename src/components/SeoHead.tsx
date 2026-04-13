import { useEffect } from "react";

type SeoHeadProps = {
  title: string;
  description: string;
  canonicalUrl: string;
  ogImage: string;
};

const ensureMetaTag = (
  attrName: "name" | "property",
  attrValue: string,
  content: string
) => {
  let tag = document.head.querySelector<HTMLMetaElement>(
    `meta[${attrName}="${attrValue}"]`
  );
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attrName, attrValue);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
};

const ensureCanonicalLink = (href: string) => {
  let link = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]'
  );
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
};

const SeoHead = ({ title, description, canonicalUrl, ogImage }: SeoHeadProps) => {
  useEffect(() => {
    document.title = title;
    ensureCanonicalLink(canonicalUrl);
    ensureMetaTag("name", "description", description);
    ensureMetaTag("name", "robots", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");

    ensureMetaTag("property", "og:type", "website");
    ensureMetaTag("property", "og:title", title);
    ensureMetaTag("property", "og:description", description);
    ensureMetaTag("property", "og:url", canonicalUrl);
    ensureMetaTag("property", "og:site_name", "Blindchess.org");
    ensureMetaTag("property", "og:locale", "en_US");
    ensureMetaTag("property", "og:image", ogImage);

    ensureMetaTag("name", "twitter:card", "summary_large_image");
    ensureMetaTag("name", "twitter:title", title);
    ensureMetaTag("name", "twitter:description", description);
    ensureMetaTag("name", "twitter:image", ogImage);
  }, [canonicalUrl, description, ogImage, title]);

  return null;
};

export default SeoHead;
