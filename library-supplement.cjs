module.exports=function(state){
 const id='research-wan-2-2-official';
 if(!state.papers.some(p=>p.id===id))state.papers.push({
  id,kind:'repository',title:'Wan2.2 — official model release and architecture notes',authors:'Wan-Video team',
  url:'https://github.com/Wan-Video/Wan2.2',collections:['Video generation'],tags:['Wan','Wan-2.2','MoE','official-release'],readingOrder:23.5,
  curatorNote:'Read alongside the Wan technical report. The release explains changes specific to Wan2.2; it is not a separate peer-reviewed paper.',
  abstract:'Official release notes for Wan2.2, describing noise-specialized mixture-of-experts diffusion, data upgrades, and high-compression video generation.',
  highlights:[],guide:{overview:'Wan2.2 extends Wan2.1 with noise-specialized experts and other video-generation improvements. This entry summarizes release documentation, not a separate paper.',
   problem:'Improve video quality without activating every expert at every denoising step.',
   intuition:'Use different specialists for early noisy structure and later visual detail.',
   methodSteps:['Read the Wan paper first.','Compare the high-noise and low-noise expert roles.','Check the exact checkpoint and inference configuration.'],
   contributions:['Noise-specialized mixture-of-experts design.','Training-data and video-compression updates.'],
   results:['Consult the repository evaluation and checkpoint details; results depend on configuration.'],
   limitations:['Release documentation is not independent evaluation.','Do not assume checkpoint sizes or requirements transfer between variants.'],
   prerequisites:['Diffusion transformers','Video VAEs'],
   readingTips:['Compare the architecture section with Wan2.1 before running a checkpoint.'],
   whoShouldRead:'Readers choosing a practical open video-generation baseline.',relatedTopics:['Wan2.1','Mixture of experts'],
   sourceScope:'Official Wan2.2 repository release notes',model:'curated editorial guide',generatedAt:new Date().toISOString()}
 });
 const noteId='alignment-method-map';
 if(!state.notes.some(n=>n.id===noteId)){
  const title='Alignment map — PPO, GRPO, DPO, and NFT';
  const content='<h1>'+title+'</h1><p>These terms belong to related but different training setups. This is a reading map, not a claim that one method is universally best.</p><h2>PPO</h2><p>An online policy-gradient algorithm using clipped policy updates; common actor-critic implementations learn a value estimate. Start with <a href="/papers/research-1707.06347">the PPO paper</a> and then <a href="/papers/research-2203.02155">InstructGPT / RLHF</a>.</p><h2>GRPO</h2><p>Uses groups of responses to estimate relative advantage. The original DeepSeekMath formulation avoids a separate critic. Read <a href="/papers/research-2402.03300">DeepSeekMath</a>, then <a href="/papers/research-2501.12948">DeepSeek-R1</a>, DAPO, and Dr-GRPO. Rewards, sampling, normalization, and length bias matter.</p><h2>DPO</h2><p>Optimizes a preference objective directly using preferred and rejected examples. It is not the same as an online PPO or GRPO rollout loop. Start with <a href="/papers/research-2305.18290">DPO</a>; compare <a href="/papers/research-2311.12908">Diffusion-DPO</a> for image models.</p><h2>Diffusion RL</h2><p>Read <a href="/papers/research-2305.13301">DDPO</a> before <a href="/papers/research-2505.05470">Flow-GRPO</a>. A diffusion/flow model needs a suitable treatment of sampling trajectories and stochasticity.</p><h2>NFT / DiffusionNFT</h2><p>Here NFT means Negative-aware FineTuning. <a href="/papers/research-2509.16117">DiffusionNFT</a> uses reward-weighted positive/negative training through the forward process. Do not interpret it as a standard LLM optimizer or as non-fungible tokens.</p><h2>What to compare in an experiment</h2><ul><li>Reward quality and reward hacking.</li><li>GPU memory, sampling cost, and wall-clock time.</li><li>Diversity versus measured reward.</li><li>Evaluation on held-out prompts.</li><li>Whether the code reproduces the exact algorithmic variant.</li></ul>';
  state.notes.push({id:noteId,title,folder:'research-reading-paths',type:'↗',tag:'reading-path',content,desc:'A plain-English map of preference learning and online RL for language and diffusion models.',draft:false,versions:[{title,content,savedAt:new Date().toISOString()}]});
 }
 return state;
};
if(require.main===module){
 const fs=require('node:fs'),path=require('node:path'),runtime=require('./runtime.cjs');
 const file=path.join(runtime.dataRoot,'production','state.json');
 const state=module.exports(JSON.parse(fs.readFileSync(file,'utf8')));
 runtime.atomicWrite(file,JSON.stringify(state));
 console.log('Added official Wan2.2 release guide and alignment-method reading map.');
}
