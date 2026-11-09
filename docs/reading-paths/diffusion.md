# Diffusion — from denoising to flow and representation-aligned generation

## English

### The thread

**Score matching and denoising → latent diffusion → diffusion/flow transformers → representation alignment → controllable image and video generation.**

- DDPMs frame generation as reversing a noise process. Latent diffusion moves the process into a compressed autoencoder space.
- DiT replaces much of the convolutional U-Net with a Transformer over latent patches. Scaling then depends on tokenization, conditioning and training stability.
- Flow matching and rectified-flow-style objectives learn a velocity field along a chosen path. They can make sampling and distillation easier, but path choice and solver quality matter.
- **REPA** aligns noisy hidden states with clean representations from a pretrained visual encoder. It is a training signal, not a replacement for the generative objective; isolate the encoder, layer and alignment weight in ablations.
- **REPA-E** and later representation-autoencoder work push the idea toward better latent representations and high-dimensional decoders. Read these alongside V-JEPA, DINOv3 and SigLIP 2 rather than as isolated tricks.
- Video adds temporal consistency, motion priors and a much larger token/compute budget. Read image results and video results separately; a good frame FID does not establish good motion.

### Reading sequence

- [DDPM](https://arxiv.org/abs/2006.11239)
- [Latent Diffusion](https://arxiv.org/abs/2112.10752)
- [DiT](https://arxiv.org/abs/2212.09748)
- [Flow Matching](https://arxiv.org/abs/2210.02747)
- [SiT](https://arxiv.org/abs/2401.08740)
- [REPA](https://arxiv.org/abs/2410.06940)
- [REPA-E](https://arxiv.org/abs/2504.10483)
- [Mean Flows](https://arxiv.org/abs/2505.13447)
- [V-JEPA 2](https://arxiv.org/abs/2506.09985)
- [Qwen-Image](https://arxiv.org/abs/2508.02324)
- [SANA](https://arxiv.org/abs/2410.10629)

### Ablation checklist

Keep the data, resolution, sampler and compute budget fixed. Report training steps and wall-clock, not only final FID. Separate representation quality, reconstruction quality, denoising loss and perceptual quality. For video, add motion consistency, temporal prompt adherence and long-horizon degradation.

## Español

### La línea de evolución

**Score matching y denoising → difusión latente → Transformers de difusión/flujo → alineamiento de representaciones → generación controlable de imagen y vídeo.**

- DDPM formula la generación como invertir un proceso de ruido. La difusión latente lo mueve al espacio comprimido de un autoencoder.
- DiT sustituye gran parte de la U-Net convolucional por un Transformer sobre parches latentes. El escalado depende de la tokenización, el conditioning y la estabilidad.
- Flow matching aprende un campo de velocidades. Puede simplificar muestreo y destilación, pero importan la trayectoria y el solver.
- **REPA** alinea estados ocultos ruidosos con representaciones limpias de un encoder visual preentrenado. Es una señal adicional: hay que aislar encoder, capa y peso en las ablaciones.
- **REPA-E** y los autoencoders de representación desarrollan la idea hacia latentes y decodificadores mejores. Conviene leerlos junto a V-JEPA, DINOv3 y SigLIP 2.
- En vídeo aparecen consistencia temporal, movimiento y un presupuesto mucho mayor. Un buen FID de imagen no demuestra buen movimiento.

### Lista de comprobación

Mantén constantes datos, resolución, sampler y cómputo. Reporta pasos y tiempo de entrenamiento. Separa calidad de representación, reconstrucción, pérdida de denoising y calidad perceptual; en vídeo añade consistencia temporal y degradación a largo plazo.
