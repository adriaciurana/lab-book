// Transport for eligible Responses requests authorized with a ChatGPT plan.
function planRequest(request) {
  const input = typeof request.input === 'string'
    ? [{ role: 'user', content: request.input }]
    : request.input;
  const { max_output_tokens, ...supported } = request;
  return { ...supported, input, store: false, stream: true };
}

async function readPlanResponse(response) {
  if (!response.ok) return response.json();
  const decoder = new TextDecoder();
  let buffer = '';
  let final;
  function collect(frame) {
    const data = frame.split(/\r?\n/)
      .filter(line => line.startsWith('data:'))
      .map(line => line.slice(5).trimStart()).join('\n');
    if (!data || data === '[DONE]') return;
    const event = JSON.parse(data);
    if (event.type === 'error') throw Error(event.message || 'ChatGPT plan request failed');
    if (event.type === 'response.failed') throw Error(event.response?.error?.message || 'ChatGPT plan request failed');
    if (event.type === 'response.completed' || event.type === 'response.incomplete') final = event.response;
  }
  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop();
    frames.forEach(collect);
  }
  buffer += decoder.decode();
  if (buffer.trim()) collect(buffer);
  if (!final) throw Error('ChatGPT plan response ended before completion');
  return final;
}

async function listPlanModels(token,fetchImpl=fetch){
  const response=await fetchImpl('https://api.openai.com/v1/models',{
    headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(12000),redirect:'error'
  });
  if(!response.ok)throw Error('Unable to load models from the connected ChatGPT plan ('+response.status+').');
  const data=await response.json();
  const models=(Array.isArray(data.models)?data.models:[]).filter(model=>model.visibility==='list'&&typeof model.slug==='string')
    .map(model=>({id:model.slug,label:typeof model.display_name==='string'?model.display_name:model.slug}));
  if(!models.length)throw Error('The connected ChatGPT plan returned no models.');
  return models;
}

module.exports = { planRequest, readPlanResponse, listPlanModels };
