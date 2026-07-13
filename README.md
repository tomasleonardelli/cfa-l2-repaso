# CFA L2 — App de Repaso (MVP)

App para estudiar CFA Level II en el celular y la compu. Funciona **offline** una vez
instalada. Sin backend ni base de datos: son archivos estáticos + JSON.

## Qué incluye este MVP
- **Flashcards** con flip, filtros por volumen / LM / tipo / estado, y marcar "la sé / a repasar" con progreso que persiste.
- **Trampas** navegables (una por una, revelar respuesta), filtro por LM y por destacadas ★, y modo **Top 8 de última hora**.
- **Quiz de cálculo** con solución oculta/revelable por problema.
- **Progreso**: dominio por volumen y por Learning Module, con exportar/importar backup.
- **Referencia**: tabla maestra de spreads y hoja de signos, dentro de la app.

Hoy trae cargado el **Volumen 1 — Fixed Income** (108 flashcards · 76 trampas · 18 problemas).

## Cómo probarla en la compu (local)
La app necesita servirse por http (no sirve abrir `index.html` con doble clic, porque el
navegador bloquea el offline y la carga de los JSON). Desde esta carpeta:

    python -m http.server 8000

y abrí http://localhost:8000 en el navegador.

## Cómo tenerla offline en el celular (recomendado: GitHub Pages)
1. Creá un repositorio en GitHub y subí **todo el contenido de esta carpeta** a la raíz.
2. En el repo: **Settings → Pages → Source: Deploy from a branch → main / root → Save**.
3. Esperá ~1 min y entrá desde el celular a la URL que te da (`https://TUUSUARIO.github.io/REPO/`).
   En el navegador del celu: **compartir → "Agregar a pantalla de inicio"**. Listo: queda como app y funciona en el subte sin señal.

(Netlify: arrastrás la carpeta a app.netlify.com/drop y te da una URL. Mismo resultado.)

## Cómo agregar un volumen nuevo (sin tocar código)
1. Generá `volNN.json` con la misma estructura que `data/vol01.json`.
2. Copialo en `data/`.
3. Agregá una línea en `data/index.json`:

    { "id": "vol02", "order": 2, "title": "Equity", "file": "vol02.json",
      "counts": { "flashcards": 0, "traps": 0, "problems": 0 } }

4. Volvé a subir (o refrescá). El selector de volúmenes lo toma solo.

Para convertir los 6 HTML de un volumen nuevo al `volNN.json`, está el script
`extract-datos.py` como referencia del pipeline (ajustar rutas y nombre de volumen).

## Estructura del dato (por volumen)
`lms`, `cardTypes`, `flashcards[{id,lm,tipo,q,a}]`, `traps[{id,lm,star,title,body}]`,
`problems[{id,lm,title,given,ask,answer,solution}]`, `highlights[]`, `tables[{id,title,lms,html}]`.
Los IDs son únicos por volumen (`vol01-c001`, `vol01-t-lm1-01`, `vol01-p01`), lo que permite
que el progreso y el futuro repaso espaciado sean estables entre volúmenes.

## Próximo (Fase 2, no incluido todavía)
Repaso espaciado Leitner (cola diaria) sobre flashcards + trampas · modo examen cronometrado.
El modelo de datos y de progreso ya está preparado para sumarlos.
