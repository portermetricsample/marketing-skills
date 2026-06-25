# Hierarchical Segmentation — drill-down sub-skill

Sub-skill de `performance_decay`. Convierte una lista plana de cientos de páginas
"subiendo/bajando" en un **árbol de priorización** que se lee de arriba hacia abajo y
explica *por qué* cambia el rendimiento.

## El problema que resuelve
Un análisis plano de 400 páginas no te dice la historia: ves ruido. La segmentación
jerárquica te deja **empezar global y bajar nivel por nivel hasta el contenido exacto**
que mueve la palanca.

## El árbol por defecto (configurable)
```
Nivel 1  Idioma            EN estable · ES subiendo · PT cayendo   → dónde mirar
Nivel 2  Tipo de contenido dentro de ese idioma, qué categorías mueven
Nivel 3  Tema / plataforma exactamente qué contenido lo explica (Instagram vs Google Ads…)
```
La misma clasificación validada (Winning/Losing/Crashing/…) se aplica a **cada nodo**
del árbol (idioma, categoría, tema), no solo a páginas — así "Dashboard templates =
Losing" significa lo mismo que para una página.

## Protocolo de lectura (priorización)
1. **Nivel 1 (idioma):** ¿qué idioma mueve el total? Mira slope y etiqueta de cada uno.
2. **Drill al que se mueve:** entra al idioma que sube/cae más y mira sus **categorías**.
3. **Drill a la categoría que se mueve:** entra a la categoría con la etiqueta accionable
   (Losing/Winning/Crashing/New) y mira sus **temas/plataformas**.
4. **Llegaste al lever:** el tema que explica la tendencia (ej. "EN → Dashboard templates
   Losing → Instagram −82%"). Ahí actúas.

Regla de oro: **no analices todo**. Sigue la señal hacia abajo solo donde hay movimiento.
El motor ya solo abre el Nivel 3 de las categorías que de verdad se mueven.

## Cómo correrlo
```bash
# 1) genera el análisis base (cualquier fuente)
CD_RULES=porter CD_SOURCE=gsc python3 analyze.py
# 2) construye el árbol de drill-down
python3 segment.py                 # árbol completo (todos los idiomas)
CD_FOCUS=ES python3 segment.py     # expande solo un idioma (foco)
```
Salida en consola y en `data/segmentation.txt`.

## Lectura de cada fila
```
▼ Dashboard templates   42,685   slope -3.3%/sem   -67% vs inicio   -> Losing
│ │                      │        │                 │                  │
│ categoría/tema         total    tendencia/semana  nivel hoy vs       etiqueta
arrow (dirección)                                   inicio de ventana
```

## Personalizar la jerarquía (cualquier sitio)
Los niveles son funciones sobre la URL, enchufables en `categories_<sitio>.py`:
- **Nivel 1 `LANG_RULES`** — detección de idioma por prefijo/markers (`/en/`, `/es/`, `/pt/`…).
- **Nivel 2** — usa la categoría ya calculada por `CATEGORY_RULES` (tipo de contenido).
- **Nivel 3 `TOPIC_RULES`** — tema/plataforma (`google-ads`, `instagram`, `looker-studio`…).
Cambia el orden o las dimensiones del árbol editando `LEVELS` en `segment.py`
(ej. Topic → Category, o agregar País si tienes esa dimensión). Sin reglas de sitio,
cae a una jerarquía genérica por segmentos de URL.

## Capa de impacto absoluto (top.py) — léela JUNTO con la jerarquía
El % engaña: una página de 20 clics que cae a 10 es −50% pero no mueve nada; una de
1.000 que cae a 900 son −100 clics reales. Por eso `top.py` rankea por **volumen** y por
**cambio absoluto** (Δ/sem = avg últimas 3 sem − avg primeras 3 sem):
```bash
python3 top.py            # top por volumen + top ganadoras/perdedoras en absoluto
CD_TOPN=30 python3 top.py
```
Regla práctica: **% dice la forma, absoluto dice el tamaño de la apuesta.** Las páginas
que concentran el 80% del tráfico son donde un cambio importa de verdad. Empieza por los
top movers absolutos; usa la jerarquía para explicar *por qué* se mueven.

## La dimensión de segmentación depende de la fuente
Los niveles del árbol son funciones sobre la **entidad** (el string que identifica cada
fila). Cambia la entidad y la función según la fuente:
- **Search Console / GA4** → URL y slug (lo que hace `segment.py` por defecto).
- **Ads (Meta/Google/TikTok)** → **convención de nombres de campaña** y **parámetros UTM**.
  La entidad pasa a ser el nombre de campaña / `utm_campaign` / `utm_content`, y los
  niveles parsean esos tokens (ej. `BR_|PROSPECTING_|VIDEO_` → país | etapa | formato).
  No cambia el motor: solo apuntas las reglas de nivel a esos tokens en tu
  `categories_<sitio>.py` y editas `LEVELS` en `segment.py`.

## Por qué es más robusto
- **Prioriza:** te lleva del total al lever en 3 saltos, no en 400 filas.
- **Explica la tendencia:** responde "¿qué hace que esto suba/baje?", no solo "¿subió?".
- **Mismo criterio en todos los niveles:** la clasificación es la misma del ojo humano.
- **Disparador de agentes:** un agente puede recorrer el árbol, detenerse en el nodo
  accionable y alertar/actuar solo ahí.
