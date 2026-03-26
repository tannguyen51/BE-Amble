const express = require("express");
const router = express.Router();

const OR_URL = "https://openrouter.ai/api/v1/chat/completions";
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

const MODEL_CANDIDATES = (
  process.env.AI_MODELS ||
  "google/gemini-2.5-flash,openai/gpt-4o-mini,anthropic/claude-3.5-haiku"
)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

function getAIKey() {
  return (
    process.env.OPENROUTER_API_KEY ||
    process.env.OPEN_ROUTER_API_KEY ||
    process.env.AI_API_KEY ||
    ""
  );
}

function getGeminiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
}

function looksLikeOpenRouterKey(key = "") {
  return key.startsWith("sk-or-");
}

function looksLikeGeminiKey(key = "") {
  return key.startsWith("AIza");
}

async function callAI(apiKey, messages, systemPrompt, retries = 2) {
  let lastError = {
    ok: false,
    status: 502,
    error: { message: "Unknown upstream error" },
  };

  for (const model of MODEL_CANDIDATES) {
    const body = {
      model,
      max_tokens: 1000,
      temperature: 0.7,
      messages: [
        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
        ...messages,
      ],
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
      let response;
      try {
        response = await fetch(OR_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://amble.app",
            "X-Title": "Amble",
          },
          body: JSON.stringify(body),
        });
      } catch (fetchErr) {
        console.error("[AI] network error:", fetchErr.message);
        lastError = {
          ok: false,
          status: 503,
          error: { message: "Network: " + fetchErr.message },
        };
        break;
      }

      const rawText = await response.text();
      console.log(
        `[AI] model=${model} attempt=${attempt} status=${response.status} body=${rawText.slice(0, 400)}`,
      );

      if (response.ok) {
        try {
          const data = JSON.parse(rawText);
          const text = data?.choices?.[0]?.message?.content ?? "";
          return { ok: true, text, model };
        } catch {
          lastError = {
            ok: false,
            status: 500,
            error: { message: "Invalid JSON from OpenRouter" },
          };
          break;
        }
      }

      let errData = {};
      try {
        errData = JSON.parse(rawText);
      } catch {
        errData = { message: rawText?.slice(0, 200) || "Unknown error" };
      }

      lastError = { ok: false, status: response.status, error: errData };

      if (
        (response.status === 429 || response.status >= 500) &&
        attempt < retries
      ) {
        const waitMs = attempt * 2000;
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      break;
    }
  }

  return lastError;
}

function toGeminiContents(messages) {
  return messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: String(m.content || "") }],
  }));
}

async function callGemini(geminiKey, messages, systemPrompt) {
  const modelCandidates = (
    process.env.GEMINI_MODELS || "gemini-2.0-flash,gemini-1.5-flash"
  )
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

  let lastError = {
    ok: false,
    status: 502,
    error: { message: "Unknown Gemini upstream error" },
  };

  const contents = toGeminiContents(messages);

  for (const model of modelCandidates) {
    const url = `${GEMINI_API_URL}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(geminiKey)}`;
    const body = {
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      },
    };

    if (systemPrompt) {
      body.systemInstruction = { parts: [{ text: systemPrompt }] };
    }

    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (fetchErr) {
      lastError = {
        ok: false,
        status: 503,
        error: { message: "Network: " + fetchErr.message },
      };
      continue;
    }

    const rawText = await response.text();
    console.log(
      `[AI][Gemini] model=${model} status=${response.status} body=${rawText.slice(0, 400)}`,
    );

    if (!response.ok) {
      let errData = {};
      try {
        errData = JSON.parse(rawText);
      } catch {
        errData = { message: rawText?.slice(0, 200) || "Unknown error" };
      }
      lastError = { ok: false, status: response.status, error: errData };
      continue;
    }

    try {
      const data = JSON.parse(rawText);
      const text =
        data?.candidates?.[0]?.content?.parts
          ?.map((p) => p?.text || "")
          .join("\n")
          .trim() || "";

      if (!text) {
        lastError = {
          ok: false,
          status: 500,
          error: { message: "Empty Gemini response" },
        };
        continue;
      }

      return { ok: true, text, model: `google/${model}` };
    } catch {
      lastError = {
        ok: false,
        status: 500,
        error: { message: "Invalid JSON from Gemini" },
      };
    }
  }

  return lastError;
}

async function callAIWithFallback(messages, systemPrompt) {
  const openRouterKey = getAIKey();
  const geminiKey = getGeminiKey();

  const canUseOpenRouter =
    !!openRouterKey && looksLikeOpenRouterKey(openRouterKey);
  const canUseGemini = !!geminiKey && looksLikeGeminiKey(geminiKey);

  if (canUseOpenRouter) {
    const orResult = await callAI(
      openRouterKey,
      messages,
      systemPrompt || null,
    );
    if (orResult.ok) return orResult;

    if (
      canUseGemini &&
      (orResult.status === 401 ||
        orResult.status === 403 ||
        orResult.status >= 500)
    ) {
      console.warn("[AI] OpenRouter failed, falling back to Gemini direct");
      const geminiResult = await callGemini(
        geminiKey,
        messages,
        systemPrompt || null,
      );
      if (geminiResult.ok) return geminiResult;
      return geminiResult;
    }

    return orResult;
  }

  if (canUseGemini) {
    return callGemini(geminiKey, messages, systemPrompt || null);
  }

  if (openRouterKey) {
    // Key exists nhưng format không khớp; vẫn thử OpenRouter lần cuối.
    return callAI(openRouterKey, messages, systemPrompt || null);
  }

  return {
    ok: false,
    status: 500,
    error: {
      message:
        "AI service not configured. Set OPENROUTER_API_KEY (sk-or-...) or GEMINI_API_KEY (AIza...).",
    },
  };
}

// ── GET /api/ai/test ──────────────────────────────────────
// Mở trình duyệt: http://localhost:5000/api/ai/test
// Xem log BE để biết OpenRouter trả về gì
router.get("/test", async (req, res) => {
  const openRouterKey = getAIKey();
  const geminiKey = getGeminiKey();
  console.log(
    "[AI/test] openrouter =",
    openRouterKey ? openRouterKey.slice(0, 15) + "..." : "MISSING",
  );
  console.log(
    "[AI/test] gemini =",
    geminiKey ? geminiKey.slice(0, 8) + "..." : "MISSING",
  );

  if (!openRouterKey && !geminiKey) {
    return res.json({
      ok: false,
      problem:
        "Thiếu key AI. Set OPENROUTER_API_KEY (sk-or-...) hoặc GEMINI_API_KEY (AIza...).",
    });
  }

  const result = await callAIWithFallback(
    [{ role: "user", content: "Say OK only" }],
    null,
  );

  if (result.ok) {
    return res.json({ ok: true, reply: result.text.trim() });
  }
  return res.json({ ok: false, status: result.status, detail: result.error });
});

// ── POST /api/ai/chat ─────────────────────────────────────
router.post("/chat", async (req, res) => {
  try {
    const { messages, system } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res
        .status(400)
        .json({ success: false, message: "messages required" });
    }

    const openRouterKey = getAIKey();
    const geminiKey = getGeminiKey();
    if (!openRouterKey && !geminiKey) {
      return res
        .status(500)
        .json({ success: false, message: "AI service not configured" });
    }

    const result = await callAIWithFallback(messages, system || null);

    if (!result.ok) {
      console.error(
        "[AI/chat] failed:",
        result.status,
        JSON.stringify(result.error),
      );
      if (result.status === 429) {
        return res.status(429).json({ success: false, message: "rate_limit" });
      }

      // Upstream auth/account có vấn đề: trả fallback mềm để chat không bị văng lỗi.
      if (result.status === 401 || result.status === 403) {
        return res.json({
          success: true,
          text: "Mình tạm thời không kết nối được AI nâng cao. Bạn vẫn có thể nhập nhanh nhu cầu như: hẹn hò, gia đình, công việc, khu vực Quận 1 để mình hỗ trợ đặt bàn.",
        });
      }

      const upstreamMessage =
        result.error?.error?.message ||
        result.error?.message ||
        "AI unavailable";
      return res.status(502).json({
        success: false,
        message: "AI unavailable",
        detail: upstreamMessage,
      });
    }

    return res.json({ success: true, text: result.text });
  } catch (err) {
    console.error("[AI/chat] exception:", err.message);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
});

module.exports = router;
