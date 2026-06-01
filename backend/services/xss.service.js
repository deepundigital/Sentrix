const axios = require("axios");
const { URL } = require("url");

const generateToken = () => {
  return "SENTRIX_" + Math.random().toString(36).substring(2, 10);
};

const xssScan = async (targetUrl, surfaceParams = []) => {
  const findings = [];
  let parsed;

  try {
    parsed = new URL(targetUrl);
  } catch {
    return findings;
  }

  // Only use crawler-detected params
  const params = surfaceParams.length
    ? surfaceParams
    : [...parsed.searchParams.keys()];

  // 🚨 No params → skip reflected testing
  if (!params.length) return findings;

  for (const key of params) {

    const token = generateToken();
    const payload = `<script>${token}</script>`;

    const testUrl = new URL(parsed.toString());
    testUrl.searchParams.set(key, payload);

    try {
      const res = await axios.get(testUrl.toString(), {
        timeout: 8000,
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "text/html"
        },
        validateStatus: () => true
      });

      if (typeof res.data !== "string") continue;

      const contentType = (res.headers["content-type"] || "").toLowerCase();
      if (!contentType.includes("html")) continue;

      const body = res.data;

      // Strict reflection check
      const reflected = body.includes(token);
      const encoded = body.includes("&lt;script&gt;");

      if (reflected && !encoded) {
        findings.push({
          type: "XSS",
          title: "Reflected XSS",
          severity: "High",
          confidence: "High",
          detail: `Reflected injection detected in parameter "${key}".`,
          impact:
            "User input is reflected without proper output encoding, allowing potential script execution.",
          fix:
            "Apply proper output encoding and validate all user-controlled input.",
          url: testUrl.toString()
        });
      }

    } catch {
      continue;
    }
  }

  return findings;
};

module.exports = xssScan;