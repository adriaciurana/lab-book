# RL and preference optimization — from RLHF to GRPO, DPO and lower-cost variants

## English

### The thread

**SFT → reward model + PPO RLHF → offline preference objectives → group-relative/on-policy optimization → cheaper preference learning.**

1. RLHF with a reward model and PPO makes the policy optimize a learned proxy while staying near a reference policy. It is expressive, but expensive and sensitive to reward misspecification, KL control and rollout quality.
2. **DPO** reparameterizes the same preference problem into a classification-like loss. It removes the separate reward-model/PPO loop and is often simpler, but remains offline and can overfit preference data.
3. **IPO, KTO, ORPO and related objectives** change the regularization or data assumptions. They are not interchangeable: compare preference format, reference model use, beta/temperature and whether rejected samples are required.
4. **GRPO** in the reasoning-model line samples groups of responses and uses relative rewards/advantages, reducing dependence on a learned value model. It is still online: rollout cost and reward design dominate.
5. “NFT” is ambiguous across papers. Treat it as a family label until the paper defines the objective. In practice, the cheaper frontier combines SFT, rejection sampling, offline preference losses, LoRA/QLoRA, verifiable rewards and small rollout budgets.

### Reading sequence

- [InstructGPT / RLHF](https://arxiv.org/abs/2203.02155)
- [PPO](https://arxiv.org/abs/1707.06347)
- [DPO](https://arxiv.org/abs/2305.18290)
- [IPO](https://arxiv.org/abs/2310.12036)
- [ORPO](https://arxiv.org/abs/2403.07691)
- [KTO](https://arxiv.org/abs/2402.01306)
- [DeepSeekMath / GRPO](https://arxiv.org/abs/2402.03300)
- [DeepSeek-R1](https://arxiv.org/abs/2501.12948)
- [GRPO survey/context](https://arxiv.org/abs/2405.20304)

### Comparison table to fill while reading

Record: online/offline, reward model yes/no, value model yes/no, number of generations per prompt, reference policy, KL/regularizer, preference format, verifier availability, rollout tokens, and evaluation leakage risk.

## Español

### La línea de evolución

**SFT → reward model + PPO/RLHF → objetivos offline de preferencias → optimización relativa por grupos/on-policy → variantes más baratas.**

1. RLHF con reward model y PPO optimiza una aproximación aprendida manteniendo la política cerca de una referencia. Es expresivo, pero caro y sensible al reward, al control KL y a la calidad de los rollouts.
2. **DPO** reparametriza el problema como una pérdida parecida a clasificación. Elimina el bucle separado de reward model y PPO; es más simple, pero sigue siendo offline y puede sobreajustar.
3. **IPO, KTO, ORPO y similares** cambian la regularización o las hipótesis sobre los datos. No son equivalentes: compara formato de preferencias, uso del modelo de referencia, beta y necesidad de respuestas rechazadas.
4. **GRPO** muestrea grupos de respuestas y usa rewards/ventajas relativas, reduciendo la dependencia de un value model. Sigue siendo online: el coste de rollouts y el diseño del reward mandan.
5. “NFT” es ambiguo entre papers. Hay que tratarlo como etiqueta hasta comprobar la definición exacta. La frontera barata suele combinar SFT, rejection sampling, pérdidas offline, LoRA/QLoRA, rewards verificables y pocos rollouts.

### Qué registrar

Anota si es online/offline, si usa reward model y value model, generaciones por prompt, política de referencia, regularizador, formato de preferencias, existencia de verificador, tokens de rollout y riesgo de leakage en evaluación.
