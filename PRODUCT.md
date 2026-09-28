# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Primary: the presenter** at the LAMIA booth. They drive the demo from a notebook (mostly keyboard, some mouse) while talking to visitors.
- **Audience: teenagers aged 14 to 18** at a career fair who have never studied AI. They watch on a TV about 3 m away and do not touch the demo.

## Product Purpose
The demo shows neuroevolution in action. 150 cars with randomly drawn neural networks learn to drive a track, generation after generation. Success means a visitor leaves understanding "nobody programmed the turn: the best became parents, with small mutations, and it got better."

## Positioning
A live demo from LAMIA (Machine Learning for Industry), the lab's machine learning and AI laboratory. It is the same idea as the "AI learns Trackmania" videos, but it runs live and reproducibly (seeded) in front of the visitor, on real F1 2026 circuits.

## Operating Context
- Runs offline on a notebook connected to a TV. No internet.
- Delivered as a single-file build (`dist/index.html`) or with `npm run dev`.
- The presenter follows a 2-minute script. It is in the README.

## Capabilities and Constraints
- The engine is pure TypeScript, tested in Node. Its calibrated parameters are protected by a learning test.
- Canvas rendering. A three.js 3D view is planned as the final phase, with a tilted overhead camera that shows the whole track and every car.
- Tracks: F1 2026 calendar circuits by default. Only the circuits the cars can actually learn are included. A procedurally generated track stays available as an option.
- Implemented features: presentation mode, generation transition story, ghost comparison, car selection, narration, champion save/load, custom drawn track, "Experimente mudar" panel.

## Brand Commitments
- LAMIA identity. The icon is at `src/assets/lamia-icon.webp` (source: `~/Downloads/lamia-icon.webp`).
- Brand colors sampled from the icon: navy `#04497D`, teal `#0E85A8`, orange `#F97A25`, red accent `#C8262C`.
- User directive: white with blue, light theme only.
- All interface copy is in Brazilian Portuguese: short sentences, active voice, no jargon without a quick explanation.

## Evidence on Hand
- The LAMIA icon.
- The headless learning curves from `npm test`.
- No testimonials or metrics about the lab exist. Do not fabricate any.

## Product Principles
1. Readable at 3 m. If a number or phrase matters, it is big.
2. Show the evolution, don't explain it. Prefer visuals to text.
3. The presenter is in control. Keyboard shortcuts come first, and the screen stays clean for the audience.
4. Reproducible on fair day: the seed, the saved champion and the offline build all work without internet.

## Accessibility & Inclusion
Viewed from a distance on a TV. Use high contrast and never rely on color alone to identify car roles (the legend and labels back it up).
