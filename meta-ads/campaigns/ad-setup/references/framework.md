# Framework — Meta Ads Ad Setup (el router de creativo)

Elegir la estructura de creativo correcta para lo que el usuario tiene, y cuadrar copy/CTA/destino con el objetivo.

## 1. Router por tipo de creativo (en orden de frecuencia)
Detecta qué assets trae el usuario y arma la estructura:

1. **Una imagen** → `image_hash`. El 80% de los casos.
2. **Un video** → `video_id` (confirmar `ready`).
3. **Un set de tarjetas** (2–10, cada una con su imagen + link) → carrusel (`child_attachments`).
4. **Varias imágenes/videos para que Meta optimice** → DCA (`image_hashes` + `dca_*`). Requiere `is_dynamic_creative:true` en el ad set.
5. **Un mismo mensaje en varias relaciones (1:1/9:16/4:5/16:9) para distintos placements** → multi-formato (`dca_images` + `asset_customization_rules`). Requiere `is_dynamic_creative:true`.

⚠️ Los tipos 4 y 5 se deciden ANTES, al crear el ad set (`is_dynamic_creative` es fijo). Si el ad set no es dynamic, o cambias a imagen/video/carrusel, o recreas el ad set.

## 2. Copy (límites y tono)
- `message` (texto principal): ~125 caracteres antes de "ver más". El gancho va al inicio.
- `headline`: ~40. Claro, con el beneficio o la marca.
- `description`: ~30. Refuerzo o CTA secundario.
- Sin emojis como relleno; lenguaje concreto.

## 3. CTA (`cta_type`) por objetivo
- TRAFFIC / awareness: `LEARN_MORE`.
- LEADS: `SIGN_UP` · `GET_QUOTE` · `APPLY_NOW` · `SUBSCRIBE` · `BOOK_TRAVEL`/agenda.
- SALES / ecommerce: `SHOP_NOW` · `BUY_NOW` · `GET_OFFER`.
- Mensajería: `CONTACT_US`. Video: `WATCH_MORE`. App: `DOWNLOAD`.
(Lista completa en §3 de la referencia.)

## 4. Destino + tracking
- **TRAFFIC/SALES:** `link` = landing (con la conversión/píxel mapeada). `cta_link` = mismo destino.
- **LEADS:** `lead_gen_form_id` (NO `link`). El destino es el formulario nativo.
- **UTMs SIEMPRE en `url_tags`**, separado del `link`. Plantilla:
  `utm_source=facebook&utm_medium=paid_social&utm_campaign={campaña}&utm_content={ad}&utm_term={adset}`.

## 5. Gate de seguridad (antes de crear)
1. ¿Asset subido? (`image_hash`/`video_id` listo; video `ready`).
2. ¿Estructura de creativo compatible con `is_dynamic_creative` del ad set?
3. ¿LEADS → `lead_gen_form_id`? ¿TRAFFIC/SALES → `link` + `url_tags`?
4. ¿`cta_type` acorde al objetivo?
5. ¿`status:"PAUSED"` y cuenta = ref firmado?

## Fuera de scope
- Subir/generar el creativo → `asset-upload`. Targeting/placements → `adset-setup`. Activar → humano.
