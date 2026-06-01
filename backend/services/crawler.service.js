const axios = require("axios");
const cheerio = require("cheerio");
const { URL } = require("url");

const MAX_SURFACES = 30;

const crawl = async (startUrl) => {
  const surfaces = [];
  const root = new URL(startUrl);

  try {
    const res = await axios.get(startUrl, {
      timeout: 8000,
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "text/html"
      },
      validateStatus: () => true
    });

    const contentType = (res.headers["content-type"] || "").toLowerCase();
    if (!contentType.includes("html")) return surfaces;

    const html = res.data;
    const $ = cheerio.load(html);

    // 🔹 1. Add root URL surface (GET)
    const rootParams = [...root.searchParams.keys()];
    surfaces.push({
      url: root.toString(),
      method: "GET",
      params: rootParams
    });

    // 🔹 2. Extract Links (GET)
    $("a[href]").each((_, el) => {
      if (surfaces.length >= MAX_SURFACES) return;

      const href = $(el).attr("href");
      if (!href) return;

      if (
        href.startsWith("javascript:") ||
        href.startsWith("mailto:") ||
        href.startsWith("#")
      ) return;

      try {
        const absolute = new URL(href, root.origin);
        if (absolute.hostname !== root.hostname) return;

        surfaces.push({
          url: absolute.toString(),
          method: "GET",
          params: [...absolute.searchParams.keys()]
        });
      } catch {
        return;
      }
    });

    // 🔹 3. Extract Forms
    $("form").each((_, form) => {
      if (surfaces.length >= MAX_SURFACES) return;

      const action = $(form).attr("action") || startUrl;
      const method = ($(form).attr("method") || "GET").toUpperCase();

      try {
        const absolute = new URL(action, root.origin);
        if (absolute.hostname !== root.hostname) return;

        const params = [];

        $(form)
          .find("input[name], textarea[name], select[name]")
          .each((_, input) => {
            const name = $(input).attr("name");
            if (name) params.push(name);
          });

        surfaces.push({
          url: absolute.toString(),
          method: method,
          params
        });
      } catch {
        return;
      }
    });

  } catch {
    return surfaces;
  }

  // Remove duplicates
  const unique = [];
  const seen = new Set();

  for (const s of surfaces) {
    const key = `${s.method}:${s.url}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(s);
    }
  }

  return unique;
};

module.exports = crawl;