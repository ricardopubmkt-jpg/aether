# Aether v0.6.1 — THE ORGANISM

Um campo coletivo vivo. Presença, respiração, eco e pulso.

Nenhuma funcionalidade nova em relação à v0.6. Só o corpo passando a obedecer ao cérebro.

## Rodar

```bash
npm install
npx convex dev
```

Em outro terminal:

```bash
npm run dev
```

Copie `.env.example` para `.env.local` e use a URL do Convex.

Para o primeiro teste, mantenha:

```
AETHER_DEMO_MODE=true
```

## Fisiologia

- A respiração pertence ao World State (`physiology.bornAt`). Não vive no `localStorage`.
- Dois visitantes com o mesmo relógio observam a mesma respiração.
- O centro não é desenhado. O vazio aparece porque as partículas recusam aquele espaço.
- Uma contribuição não desenha um anel. Comprime o campo, aplica um impulso, e o organismo se recupera.
- Quando a era muda, o corpo muda primeiro. O nome chega depois.

## Ritual de entrada (intocado)

1. ~0–1.4s — só o campo
2. ~1.4s — era + presenças
3. ~2.8s — narrativa
4. ~4.6s — convite: “O que você traz?”

`prefers-reduced-motion` ignora o ritual temporizado.

## Teste

Abra. Não toque em nada por 30 segundos. O número da respiração sobe mesmo assim — e seria o mesmo em outro aparelho. Depois escreva: o campo comprime, depois se reconstitui. Não deve aparecer um círculo desenhado.
