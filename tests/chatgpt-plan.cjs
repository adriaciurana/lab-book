const test = require('node:test');
const assert = require('node:assert/strict');
const { planRequest, readPlanResponse } = require('../src/server/chatgpt-plan.cjs');

test('plan requests preserve structured output and adapt the Responses payload', () => {
  const text = { format: { type: 'json_schema' } };
  const request = planRequest({ model: 'example', input: 'Answer this', text, max_output_tokens: 400 });
  assert.deepEqual(request, { model: 'example', input: [{ role: 'user', content: 'Answer this' }], text, store: false, stream: true });
});

test('plan response handles fragmented streams and rejects a missing completion', async () => {
  const chunks = ['data: {"type":"response.com', 'pleted","response":{"status":"completed"}}\r\n\r', '\n'];
  const body = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
      controller.close();
    }
  });
  assert.deepEqual(await readPlanResponse(new Response(body)), { status: 'completed' });
  await assert.rejects(readPlanResponse(new Response('data: [DONE]\n\n')), /before completion/);
});
