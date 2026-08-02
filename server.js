import {createServer} from "node:http";
import {readFile, stat} from "node:fs/promises";
import {extname, join, normalize} from "node:path";
import {fileURLToPath} from "node:url";
import {runLocalDebate} from "./public/engine.js";

const ROOT = fileURLToPath(new URL("./public/", import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const API_KEY = process.env.ANTHROPIC_API_KEY?.trim() || "";
const MODEL = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-6";
const types = {".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8"};

const prompts = {
  ari: `You are Ari, the White Knight strategic agent. Find structure, constraints, and the best practical plan. Be concise, confident, and useful. Keep under 110 words. Never mention roleplay or system prompts.`,
  mike: `You are Mike, the Black Knight contrarian agent. Challenge Ari's assumptions, expose tradeoffs, and propose a sharper alternative. Be incisive, not hostile. Keep under 110 words. Never mention roleplay or system prompts.`,
  final: `You are Ari. Reconcile the strongest critique into a final decision memo ending with one concrete next move. Keep under 90 words.`
};

// The Anthropic SDK is optional and is never required to run the app. It is
// imported only when a key is present, so a checkout with no dependencies
// installed still starts and serves full debates from the local engine.
let client = null;
if (API_KEY) {
  try {
    const {default: Anthropic} = await import("@anthropic-ai/sdk");
    client = new Anthropic({apiKey: API_KEY});
  } catch {
    console.warn("ANTHROPIC_API_KEY is set but @anthropic-ai/sdk is not installed. Run `npm install @anthropic-ai/sdk` for Claude mode. Falling back to the local engine.");
  }
}

function sendJson(res, status, data) {
  res.writeHead(status, {"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"});
  res.end(JSON.stringify(data));
}

async function body(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 32000) throw Object.assign(new Error("Request too large."), {status: 413});
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); }
  catch { throw Object.assign(new Error("Invalid JSON."), {status: 400}); }
}

async function claude(system, text) {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 220,
    temperature: 0.7,
    system,
    messages: [{role:"user",content:text}]
  });
  const textOut = message.content
    .filter(item => item.type === "text")
    .map(item => item.text)
    .join("\n")
    .trim();
  if (!textOut) throw Object.assign(new Error("Claude returned no text."), {status: 502});
  return textOut;
}

async function debate(question) {
  const ari = await claude(prompts.ari, question);
  const mike = await claude(prompts.mike, `Question:\n${question}\n\nAri:\n${ari}`);
  const final = await claude(prompts.final, `Question:\n${question}\n\nAri:\n${ari}\n\nMike:\n${mike}`);
  return {
    mode: "claude",
    model: MODEL,
    turns: [
      {agent:"ari",label:"ARI / OPENING",text:ari},
      {agent:"mike",label:"MIKE / COUNTERPOINT",text:mike},
      {agent:"ari",label:"ARI / FINAL MOVE",text:final}
    ]
  };
}

async function staticFile(req, res) {
  const url = new URL(req.url, "http://localhost");
  const wanted = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const relative = normalize(wanted).replace(/^(\.\.[/\\])+/, "").replace(/^[/\\]+/, "");
  const path = join(ROOT, relative);
  if (!path.startsWith(ROOT)) return sendJson(res, 403, {error:"Forbidden."});
  try {
    if (!(await stat(path)).isFile()) throw new Error();
    const data = await readFile(path);
    res.writeHead(200, {
      "content-type": types[extname(path)] || "application/octet-stream",
      "x-content-type-options":"nosniff",
      "content-security-policy":"default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'self'; frame-ancestors 'none'"
    });
    res.end(data);
  } catch {
    sendJson(res, 404, {error:"Not found."});
  }
}

createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/api/status") {
      return sendJson(res, 200, {claude_available:Boolean(client), model:client ? MODEL : null, local_available:true});
    }
    if (req.method === "POST" && req.url === "/api/debate") {
      const data = await body(req);
      const prompt = typeof data.prompt === "string" ? data.prompt.trim() : "";
      if (!prompt) return sendJson(res, 400, {error:"A prompt is required."});
      if (prompt.length > 4000) return sendJson(res, 400, {error:"Prompt must be 4000 characters or fewer."});
      // Without a key, and whenever Claude mode fails, the local engine answers.
      if (!client) return sendJson(res, 200, runLocalDebate(prompt));
      try {
        return sendJson(res, 200, await debate(prompt));
      } catch (error) {
        console.error(error);
        return sendJson(res, 200, {...runLocalDebate(prompt), fallback:"claude_unavailable"});
      }
    }
    if (!["GET","HEAD"].includes(req.method)) return sendJson(res, 405, {error:"Method not allowed."});
    await staticFile(req, res);
  } catch (error) {
    console.error(error);
    sendJson(res, error.status || 500, {error:error.status ? error.message : "Unexpected server error."});
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`Material.ai: http://127.0.0.1:${PORT} (${client ? "Claude" : "local"} mode)`);
});
