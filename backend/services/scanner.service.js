const reconScan = require("./recon.service");
const xssScan = require("./xss.service");
const sqliScan = require("./sqli.service");
const crawl = require("./crawler.service");

const runScanner = async (url) => {
  const allFindings = [];
  const scannedUrls = new Set();

  // 🔹 1. Recon on base URL
  try {
    const recon = await reconScan(url);
    if (Array.isArray(recon)) {
      allFindings.push(...recon);
    }
  } catch (e) {
    console.error("[Recon Error]", e.message);
  }

  // 🔹 2. Crawl surfaces (Depth = 1)
  let surfaces = [];
  try {
    surfaces = await crawl(url);
  } catch (e) {
    console.error("[Crawler Error]", e.message);
  }

  // Always include base URL
  surfaces.push({
    url,
    method: "GET",
    params: []
  });

  // 🔹 3. Scan each surface
  for (const surface of surfaces) {

    const uniqueKey = `${surface.method}:${surface.url}`;
    if (scannedUrls.has(uniqueKey)) continue;
    scannedUrls.add(uniqueKey);

    // 🔹 XSS & SQLi only for GET surfaces
    if (surface.method === "GET") {
      try {
        const xss = await xssScan(surface.url, surface.params);
        if (Array.isArray(xss)) {
          allFindings.push(...xss);
        }
      } catch (e) {
        console.error("[XSS Error]", e.message);
      }

      try {
        const sqli = await sqliScan(surface.url, surface.params);
        if (Array.isArray(sqli)) {
          allFindings.push(...sqli);
        }
      } catch (e) {
        console.error("[SQLi Error]", e.message);
      }
    }
  }

  return {
    target: url,
    time: new Date().toISOString(),
    findings: allFindings
  };
};

module.exports = runScanner;