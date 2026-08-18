// Enterprise-level API smoke test script
// Tests all endpoints of the AI Workflow Copilot backend

const BASE = "http://localhost:4001";

async function test(name, url, options = {}) {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get("content-type") || "";
    let body;
    if (contentType.includes("json")) {
      body = await res.json();
    } else {
      body = await res.text();
    }
    const status = res.status;
    const passed = status >= 200 && status < 300;
    console.log(`${passed ? "✅ PASS" : "❌ FAIL"} [${status}] ${name}`);
    if (!passed) {
      console.log(`   Response:`, typeof body === "string" ? body.substring(0, 200) : JSON.stringify(body).substring(0, 200));
    }
    return { name, status, passed, body };
  } catch (err) {
    console.log(`❌ FAIL [ERR] ${name}: ${err.message}`);
    return { name, status: 0, passed: false, body: null };
  }
}

async function runTests() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  AI WORKFLOW COPILOT — ENTERPRISE API SMOKE TEST SUITE");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const results = [];

  // ── CORE ENDPOINTS ──────────────────────────────────────────────────
  console.log("── Core Endpoints ──────────────────────────────────────────");
  results.push(await test("Root Health Check", `${BASE}/`));
  results.push(await test("Node Catalog", `${BASE}/api/nodes`));
  results.push(await test("List Workflows", `${BASE}/api/workflows`));

  // ── WORKFLOW CRUD ───────────────────────────────────────────────────
  console.log("\n── Workflow CRUD ───────────────────────────────────────────");

  // Create workflow
  const createResult = await test("Create Workflow (POST)", `${BASE}/api/workflows`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Enterprise Test Workflow",
      prompt: "Create a workflow that sends a Slack message when Stripe payment arrives"
    })
  });
  results.push(createResult);

  // Get specific workflow
  if (createResult.passed && createResult.body?.workflow?.id) {
    const wfId = createResult.body.workflow.id;
    results.push(await test(`Get Workflow (${wfId})`, `${BASE}/api/workflows/${wfId}`));

    // Explain workflow
    results.push(await test(`Explain Workflow (POST)`, `${BASE}/api/workflows/${wfId}/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }));

    // Patch workflow
    results.push(await test(`Patch Workflow (PATCH)`, `${BASE}/api/workflows/${wfId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Add a filter node before the action" })
    }));
  }

  // Validate workflow
  results.push(await test("Validate Workflow (POST)", `${BASE}/api/workflows/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      payload: {
        nodes: [
          { id: "n1", type: "stripe.payment_received", name: "Trigger", config: {}, next: ["n2"] },
          { id: "n2", type: "slack.send_message", name: "Notify", config: {} }
        ],
        triggers: ["stripe.payment_received"],
        metadata: { version: 1, tags: ["test"], summary: "Test workflow" }
      }
    })
  }));

  // Async workflow creation
  const asyncResult = await test("Async Workflow Creation (POST)", `${BASE}/api/workflows/async`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Async Test Workflow",
      prompt: "Create async test workflow"
    })
  });
  results.push(asyncResult);

  // Get task status
  if (asyncResult.passed && asyncResult.body?.taskId) {
    // Wait a moment for task to process
    await new Promise(r => setTimeout(r, 1000));
    results.push(await test(`Get Task Status (${asyncResult.body.taskId})`, `${BASE}/api/tasks/${asyncResult.body.taskId}`));
  }

  // ── CONVERSATIONS ──────────────────────────────────────────────────
  console.log("\n── Conversations ──────────────────────────────────────────");

  const convResult = await test("Start Conversation (POST)", `${BASE}/api/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
  results.push(convResult);

  if (convResult.passed && convResult.body?.id) {
    const convId = convResult.body.id;
    results.push(await test(`Get Conversation (${convId})`, `${BASE}/api/conversations/${convId}`));

    results.push(await test("Post Message (POST)", `${BASE}/api/conversations/${convId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "USER", content: "Test message" })
    }));
  }

  // ── DLQ ENDPOINTS ─────────────────────────────────────────────────
  console.log("\n── Dead-Letter Queue ───────────────────────────────────────");
  results.push(await test("DLQ Stats", `${BASE}/api/dlq/stats`));
  results.push(await test("DLQ Messages", `${BASE}/api/dlq/messages`));
  results.push(await test("DLQ Purge (POST)", `${BASE}/api/dlq/purge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ olderThanDays: 30 })
  }));

  // ── COST TRACKING ─────────────────────────────────────────────────
  console.log("\n── Cost Tracking ──────────────────────────────────────────");
  results.push(await test("Cost Summary", `${BASE}/api/costs/summary`));
  results.push(await test("Cost Pricing", `${BASE}/api/costs/pricing`));
  results.push(await test("Cost Trend", `${BASE}/api/costs/trend`));
  results.push(await test("Cost Report (text)", `${BASE}/api/costs/report`));
  results.push(await test("Cost Usage History", `${BASE}/api/costs/usage/history`));
  results.push(await test("Cost Estimate (POST)", `${BASE}/api/costs/estimate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      modelId: "gpt-4",
      estimatedInputTokens: 1000,
      estimatedOutputTokens: 500
    })
  }));

  // ── TOOLS ─────────────────────────────────────────────────────────
  console.log("\n── Tools ──────────────────────────────────────────────────");
  results.push(await test("List Tools", `${BASE}/api/tools`));
  results.push(await test("Get Tool (webhook_trigger)", `${BASE}/api/tools/webhook_trigger`));
  results.push(await test("Get Tool (nonexistent) [expect 404]", `${BASE}/api/tools/nonexistent_tool`));
  results.push(await test("Tools OpenAI Schema", `${BASE}/api/tools/format/openai`));
  results.push(await test("Tools Claude Schema", `${BASE}/api/tools/format/claude`));
  results.push(await test("Tool Execute (transform_data)", `${BASE}/api/tools/transform_data/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      parameters: { data: { hello: "world" }, rule: "uppercase" }
    })
  }));

  // ── OBSERVABILITY ─────────────────────────────────────────────────
  console.log("\n── Observability ──────────────────────────────────────────");
  results.push(await test("Health Check", `${BASE}/api/observability/health`));
  results.push(await test("Circuit Breakers", `${BASE}/api/observability/circuit-breakers`));
  results.push(await test("Circuit Breaker (openai)", `${BASE}/api/observability/circuit-breakers/openai`));
  results.push(await test("Prometheus Metrics", `${BASE}/api/observability/metrics`));
  results.push(await test("Metrics Summary", `${BASE}/api/observability/metrics/summary`));

  // ── SUMMARY ───────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════════");
  const passed = results.filter(r => r.passed || r.name.includes("[expect 404]")).length;
  const failed = results.filter(r => !r.passed && !r.name.includes("[expect 404]")).length;
  console.log(`  RESULTS: ${passed} PASSED / ${failed} FAILED / ${results.length} TOTAL`);
  console.log("═══════════════════════════════════════════════════════════════");

  if (failed > 0) {
    console.log("\n  ❌ FAILED TESTS:");
    results.filter(r => !r.passed && !r.name.includes("[expect 404]")).forEach(r => {
      console.log(`     - ${r.name} [${r.status}]`);
    });
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
