# LLM/VLM — from sequence models to grounded multimodality

## English

### The thread

The useful mental model is: **predict tokens → route computation → improve attention/context → connect non-text inputs → align outputs**.

1. **Transformer foundation.** Self-attention replaces recurrence with content-addressed mixing. Scaling helps, but quadratic attention and a fixed context budget become the first systems constraints.
2. **Long context and new attention patterns.** Sparse/local attention, grouped or multi-query attention, sliding/rolling windows, positional interpolation and recurrent state ideas reduce memory or extend context. The trade-off is always information access versus bandwidth and latency.
3. **Mixture-of-Experts.** MoE layers route each token to a small number of experts. They increase parameter capacity without activating every parameter, but introduce routing load balance, communication and expert-collapse concerns. Switch Transformer is the clean starting point; modern sparse MoE reports should be read with routing and active-parameter counts.
4. **Patchification in VLMs.** Images become a sequence of visual tokens by splitting them into patches, encoding them with a ViT-like tower, then projecting them into the language model token space. Video adds time: frame sampling, tubelets, temporal pooling or a video encoder. The central engineering question is token budget: more patches preserve detail but consume context and compute.
5. **Bridging modalities.** Early systems use a frozen vision encoder plus a learned projector; later systems add resamplers, query tokens, interleaved image/text training and native multimodal attention. Compare where cross-attention happens, which modules are frozen, and whether the model can reason over multiple images or video segments.
6. **Alignment and evaluation.** SFT, preference data and tool/grounding evaluations shape useful behavior. VLM scores can hide OCR, hallucination, spatial reasoning and temporal failures; inspect the benchmark composition and the evidence shown to the model.

### Reading sequence

- [Attention Is All You Need](https://arxiv.org/abs/1706.03762) — the attention baseline.
- [Switch Transformers](https://arxiv.org/abs/2101.03961) — sparse expert routing.
- [FlashAttention](https://arxiv.org/abs/2205.14135) — IO-aware exact attention.
- [Flamingo](https://arxiv.org/abs/2204.14198) — frozen vision encoder plus gated cross-attention.
- [BLIP-2](https://arxiv.org/abs/2301.12597) — lightweight Q-Former bridge.
- [LLaVA](https://arxiv.org/abs/2304.08485) — simple projector and visual instruction tuning.
- [SigLIP 2](https://arxiv.org/abs/2502.14786) — stronger image-text representation learning.
- [InternVL 3.5](https://arxiv.org/abs/2508.18265) — recent open multimodal model design.
- [V-JEPA](https://arxiv.org/abs/2404.08471) and [V-JEPA 2](https://arxiv.org/abs/2506.09985) — predictive visual representations, useful context for video-capable VLMs.

### Questions to ask in a paper

What is the active parameter count? Which tokens are discarded? Is the visual encoder frozen? Where are temporal interactions introduced? Does the reported gain survive equal data, context and inference budgets?

## Español

### La línea de evolución

La intuición útil es: **predecir tokens → enrutar capacidad → mejorar atención/contexto → conectar entradas no textuales → alinear salidas**.

1. **Base Transformer.** La autoatención mezcla información por contenido en vez de recurrencia. El escalado mejora la capacidad, pero aparecen el coste cuadrático y el límite de contexto.
2. **Contexto largo y nuevas atenciones.** Atención dispersa/local, grouped o multi-query attention, ventanas deslizantes/rolling, interpolación posicional y estados recurrentes reducen memoria o amplían contexto. Siempre existe un intercambio entre acceso a información, ancho de banda y latencia.
3. **Mixture-of-Experts.** Cada token se enruta a pocos expertos. Aumenta la capacidad total sin activar todos los parámetros, pero introduce balanceo, comunicación y colapso de expertos.
4. **Patchification en VLM.** La imagen se divide en parches y se convierte en tokens visuales; después un proyector los lleva al espacio del modelo de lenguaje. En vídeo se añade el tiempo mediante muestreo de frames, tubelets, pooling temporal o un encoder de vídeo. La pregunta práctica es el presupuesto de tokens.
5. **Puente multimodal.** Se parte de un encoder visual congelado y un proyector aprendido; después aparecen resamplers, query tokens, entrenamiento intercalado y atención multimodal nativa. Compara dónde ocurre el cross-attention y qué módulos se congelan.
6. **Alineamiento y evaluación.** SFT, preferencias y evaluaciones de grounding producen comportamiento útil. Un score global puede ocultar fallos de OCR, alucinación, espacio o tiempo.

### Preguntas para revisar un paper

¿Cuántos parámetros están activos? ¿Qué tokens se descartan? ¿Está congelado el encoder visual? ¿Dónde se introducen las interacciones temporales? ¿La mejora se mantiene con los mismos datos, contexto y presupuesto de inferencia?
