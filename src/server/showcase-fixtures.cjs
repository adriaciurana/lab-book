// Fictional studies with internally consistent configurations and results.
const studies = [
  {
    key: 'diffusion', title: 'Latent diffusion for image generation', repo: 'latent-diffusion-lab',
    method: 'Compare noise schedules and prediction targets with the same 256 px training split and frozen text encoder. Evaluate all completed runs with 10,000 samples and 30 denoising steps.',
    finding: 'Velocity prediction has the lowest FID in this comparison. Repeat it with a second seed before increasing resolution.',
    config: { resolution: 256, train_steps: 120000, sampling_steps: 30, guidance_scale: 5 },
    runs: [
      ['Linear schedule baseline', 'baseline/linear', 'trained', { schedule: 'linear', prediction: 'epsilon' }, { fid_10k: 28.4, clip_score: 0.282 }],
      ['Cosine noise schedule', 'ablation/cosine', 'trained', { schedule: 'cosine', prediction: 'epsilon' }, { fid_10k: 25.7, clip_score: 0.291 }],
      ['Velocity prediction', 'ablation/v-prediction', 'trained', { schedule: 'cosine', prediction: 'velocity' }, { fid_10k: 23.9, clip_score: 0.297 }],
      ['Velocity prediction · seed 43', 'repro/v-prediction', 'queued', { schedule: 'cosine', prediction: 'velocity', seed: 43 }, {}],
    ],
  },
  {
    key: 'vae', title: 'Variational autoencoder for image compression', repo: 'image-vae-lab',
    method: 'Keep the encoder and decoder fixed while varying KL regularization. Report reconstruction metrics on the same held-out set and monitor latent usage.',
    finding: 'KL warmup recovers active latent dimensions while keeping reconstruction quality close to the weak-KL run.',
    config: { resolution: 256, latent_channels: 4, compression_factor: 8, train_steps: 80000 },
    runs: [
      ['Fixed KL baseline', 'baseline/fixed-kl', 'trained', { beta: 0.001, kl_warmup_steps: 0 }, { psnr_db: 25.8, lpips: 0.156, active_latent_pct: 68 }],
      ['Weak KL penalty', 'ablation/weak-kl', 'trained', { beta: 0.0001, kl_warmup_steps: 0 }, { psnr_db: 27.1, lpips: 0.133, active_latent_pct: 91 }],
      ['KL warmup', 'ablation/kl-warmup', 'trained', { beta: 0.001, kl_warmup_steps: 10000 }, { psnr_db: 26.9, lpips: 0.137, active_latent_pct: 89 }],
      ['High KL pressure', 'diagnose/posterior-collapse', 'failed', { beta: 0.1, kl_warmup_steps: 0 }, { active_latent_pct: 3 }],
    ],
  },
  {
    key: 'llm', title: 'LoRA instruction tuning for a 3B LLM', repo: 'instruction-tuning-lab',
    method: 'Fine-tune one frozen 3B checkpoint on the same instruction mixture. Compare adapter ranks at a fixed token budget and measure validation perplexity and exact match on a held-out evaluation set.',
    finding: 'Rank 32 leads on both validation metrics. Rank 16 remains a candidate when memory is the binding constraint.',
    config: { model_parameters: '3B', max_sequence_length: 2048, train_tokens: 24000000, learning_rate: 0.0002 },
    runs: [
      ['LoRA rank 8 baseline', 'baseline/lora-r8', 'trained', { lora_rank: 8 }, { validation_perplexity: 8.42, exact_match_pct: 53.1, peak_vram_gb: 14.2 }],
      ['LoRA rank 16', 'ablation/lora-r16', 'trained', { lora_rank: 16 }, { validation_perplexity: 8.11, exact_match_pct: 55.4, peak_vram_gb: 15.1 }],
      ['LoRA rank 32', 'ablation/lora-r32', 'trained', { lora_rank: 32 }, { validation_perplexity: 7.98, exact_match_pct: 56.3, peak_vram_gb: 16.8 }],
      ['LoRA rank 64', 'ablation/lora-r64', 'training', { lora_rank: 64 }, {}],
    ],
  },
];

function addShowcase(data, now, mock) {
  const folder = 'showcase-lab';
  const home = 'showcase-start';
  const columns = ['Planned', 'Running', 'Review', 'Done'];
  const disclaimer = '<p><em>Fictional research demo. All metrics, runs and repositories are illustrative.</em></p>';
  function page(id, title, body, parentNoteId, boardIds = []) {
    const content = disclaimer + body;
    data.notes.push({ ...mock, id, title, folder, parentNoteId, boardIds, type: 'file',
      content, published: { title, content }, draft: false, versions: [], updatedAt: now });
  }
  data.folders.push({ ...mock, id: folder, name: 'Research Lab Demo', icon: 'flask', parentId: null });
  page(home, 'Research Lab · Demo overview',
    '<h2>Three research tracks</h2><ul>' + studies.map(study =>
      '<li><a href="/notes/showcase-' + study.key + '">' + study.title + '</a></li>').join('') +
    '</ul><p><a href="/views/showcase-pipeline">Research pipeline</a> · <a href="/experiments">Experiment registry</a> · <a href="/repositories">Branch maps</a></p>', null);
  const boardIds = [];
  for (const study of studies) {
    const noteId = 'showcase-' + study.key;
    const repoId = noteId + '-repo';
    const board = noteId + '-board';
    const main = repoId + '-main';
    boardIds.push(board);
    page(noteId, study.title,
      '<h2>Evaluation protocol</h2><p>' + study.method + '</p><h2>Results and next steps</h2><p>' + study.finding +
      '</p><div contenteditable="false" class="hub-embed" data-research-block="experiments" data-source-id="' + noteId + '"></div>' +
      '<div contenteditable="false" class="hub-embed" data-research-block="branches" data-source-id="' + repoId + '"></div>', home, [board]);
    data.boards.push({ ...mock, id: board, name: study.title, columns, noteId });
    data.repositories.push({ ...mock, id: repoId, name: study.repo, url: 'https://example.invalid/demo/' + study.repo, defaultBranch: 'main', noteId });
    data.branches.push({ ...mock, id: main, name: 'main', repoId, parentId: null, noteId, prStatus: 'none' });
    study.runs.forEach(([name, branch, status, config, metrics], index) => {
      const branchId = repoId + '-' + index;
      const taskId = noteId + '-task-' + index;
      const prStatus = index === 0 ? 'merged' : status === 'failed' ? 'closed' : status === 'queued' ? 'none' : 'open';
      data.branches.push({ ...mock, id: branchId, name: branch, repoId, parentId: index === 0 ? main : repoId + (study.key === 'diffusion' && index === 3 ? '-2' : '-0'),
        noteId, prStatus, prNumber: prStatus === 'none' ? null : 21 + index, merged: prStatus === 'merged' });
      data.tasks.push({ ...mock, id: taskId, type: 'task', board, noteId, text: name,
        col: status === 'queued' ? 'Planned' : status === 'training' ? 'Running' : index === 0 ? 'Done' : 'Review', tags: [study.key, 'demo'] });
      data.experiments.push({ ...mock, id: noteId + '-run-' + index, name, status, noteId, repoId, branchId, taskId,
        metrics, config: { fictional: true, seed: 42, ...study.config, ...config },
        machine: status === 'queued' ? '' : 'demo-gpu-0' + (index % 2 + 1), cluster: 'demo-research' });
    });
  }
  data.boardViews.push({ ...mock, id: 'showcase-pipeline', name: 'Research pipeline · Demo', boardIds });
}

module.exports = { addShowcase };
