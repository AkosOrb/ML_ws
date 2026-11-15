# ML műhely

Interaktív, 3D-s magyarázó weboldal a gépi tanulásról, egyetemi hallgatóknak, magyarul és angolul.
An interactive 3D explainer of machine learning for university students, in Hungarian and English.

## Futtatás / Running

```bash
npm install
npm run dev      # fejlesztői szerver / dev server
npm test         # unit tesztek / unit tests
npm run build    # éles build a dist/ mappába / production build into dist/
```

## Felépítés / Structure

- `src/lessons/registry.ts` – a kategóriák és leckék listája. Egy lecke akkor jelenik meg kattinthatóként, ha van `component`-je.
- `src/components/LessonLayout.tsx` – közös leckesablon: 3D jelenet, paraméterpanel, magyarázó szakaszok.
- `src/ml/` – a modellek tiszta, tesztelt matematikája (React nélkül).
- `src/i18n/` – nyelvváltás; a felület szövegei a `strings.ts`-ben vannak.

Új lecke: hozz létre egy mappát a `src/lessons/` alatt, tedd a matekot a `src/ml/`-be, és add meg a `component` mezőt a registryben.

## Közzététel / Publishing

A `.github/workflows/deploy.yml` minden pull requestnél lefuttatja a teszteket és a buildet, a `main` ágra érkező
változásokat pedig kiteszi a GitHub Pagesre. Egyszeri beállítás: a repó **Settings → Pages** oldalán a
**Source** legyen **GitHub Actions**. Az oldal ezután itt érhető el: `https://<felhasználó>.github.io/ML_ws/`.

The workflow runs tests and the build on every pull request and deploys `main` to GitHub Pages. One-time setup:
in **Settings → Pages**, set **Source** to **GitHub Actions**.
