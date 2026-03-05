#!/usr/bin/env python3
"""
WaveSpeed AI - Servidor MCP
Expone las capacidades de la API de WaveSpeed AI como herramientas MCP
para agentes de desarrollo (Claude, Cursor, etc.)
"""

import asyncio
import json
import os
import time
import httpx
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp import types

# ── Configuración ────────────────────────────────────────────────────────────
WAVESPEED_BASE_URL = "https://api.wavespeed.ai/api/v3"
API_KEY = os.environ.get("WAVESPEED_API_KEY", "")
POLL_INTERVAL = 2   # segundos entre comprobaciones de estado
MAX_WAIT     = 300  # tiempo máximo de espera en segundos

app = Server("wavespeed-mcp")

# ── Cliente HTTP reutilizable ─────────────────────────────────────────────────
def get_headers() -> dict:
    key = os.environ.get("WAVESPEED_API_KEY", API_KEY)
    if not key:
        raise ValueError(
            "WAVESPEED_API_KEY no configurada. "
            "Establece la variable de entorno antes de iniciar el servidor."
        )
    return {
        "Authorization": f"Bearer {key}",
        "Content-Type":  "application/json",
    }


async def submit_task(model_id: str, payload: dict) -> dict:
    """Envía una tarea a WaveSpeed y devuelve la respuesta inicial."""
    url = f"{WAVESPEED_BASE_URL}/{model_id}"
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(url, headers=get_headers(), json=payload)
        r.raise_for_status()
        return r.json()


async def poll_result(task_id: str) -> dict:
    """Espera y devuelve el resultado cuando la tarea finaliza."""
    url = f"{WAVESPEED_BASE_URL}/predictions/{task_id}/result"
    deadline = time.time() + MAX_WAIT
    async with httpx.AsyncClient(timeout=30) as client:
        while time.time() < deadline:
            r = await client.get(url, headers=get_headers())
            r.raise_for_status()
            data = r.json()
            status = data.get("data", {}).get("status") or data.get("status")
            if status in ("completed", "succeeded", "failed", "error"):
                return data
            await asyncio.sleep(POLL_INTERVAL)
    raise TimeoutError(f"Tarea {task_id} no completada en {MAX_WAIT}s")


async def run_task(model_id: str, payload: dict) -> dict:
    """Envía tarea, espera resultado y lo devuelve."""
    init = await submit_task(model_id, payload)
    # Algunos modelos responden directamente con outputs
    data = init.get("data", {})
    if data.get("outputs") or data.get("status") in ("completed", "succeeded"):
        return init
    task_id = data.get("id") or init.get("id")
    if not task_id:
        return init
    return await poll_result(task_id)


def extract_outputs(result: dict) -> list[str]:
    """Extrae URLs de salida del resultado de la API."""
    data = result.get("data", result)
    outputs = data.get("outputs", [])
    if isinstance(outputs, list):
        return [str(o) for o in outputs if o]
    if isinstance(outputs, str):
        return [outputs]
    return []


def fmt_result(result: dict, label: str = "Resultado") -> str:
    """Formatea el resultado para mostrar al agente."""
    outputs = extract_outputs(result)
    status  = result.get("data", {}).get("status", "desconocido")
    if outputs:
        urls = "\n".join(f"  • {u}" for u in outputs)
        return f"✅ {label} completado\nEstado: {status}\nSalidas:\n{urls}"
    return f"⚠️  {label}\nEstado: {status}\nRespuesta completa:\n{json.dumps(result, indent=2, ensure_ascii=False)}"


# ── Definición de herramientas ───────────────────────────────────────────────
@app.list_tools()
async def list_tools() -> list[types.Tool]:
    return [
        # ── Imágenes ──────────────────────────────────────────────────────────
        types.Tool(
            name="generate_image",
            description=(
                "Genera una imagen a partir de un prompt de texto usando FLUX Dev (modelo de alta calidad). "
                "Devuelve la URL de la imagen generada."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "prompt":          {"type": "string",  "description": "Descripción detallada de la imagen a generar"},
                    "negative_prompt": {"type": "string",  "description": "Elementos a evitar en la imagen (opcional)"},
                    "width":           {"type": "integer", "description": "Ancho en píxeles (default: 1024)", "default": 1024},
                    "height":          {"type": "integer", "description": "Alto en píxeles (default: 1024)",  "default": 1024},
                    "num_outputs":     {"type": "integer", "description": "Número de imágenes (1-4, default: 1)", "default": 1},
                    "seed":            {"type": "integer", "description": "Semilla para reproducibilidad (opcional)"},
                    "output_format":   {"type": "string",  "description": "Formato: png, jpg, webp (default: png)", "default": "png"},
                },
                "required": ["prompt"],
            },
        ),
        types.Tool(
            name="generate_image_fast",
            description=(
                "Genera una imagen ultra-rápida con FLUX Schnell (optimizado para velocidad). "
                "Ideal para prototipos y pruebas rápidas."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "prompt":        {"type": "string",  "description": "Descripción de la imagen"},
                    "width":         {"type": "integer", "description": "Ancho en píxeles (default: 1024)", "default": 1024},
                    "height":        {"type": "integer", "description": "Alto en píxeles (default: 1024)",  "default": 1024},
                    "num_outputs":   {"type": "integer", "description": "Número de imágenes (1-4)",         "default": 1},
                    "seed":          {"type": "integer", "description": "Semilla (opcional)"},
                    "output_format": {"type": "string",  "description": "png / jpg / webp",                "default": "png"},
                },
                "required": ["prompt"],
            },
        ),
        types.Tool(
            name="generate_image_lora",
            description=(
                "Genera imágenes con FLUX Dev + LoRA personalizada para estilos específicos. "
                "Permite aplicar adaptadores de estilo (LoRA) sobre el modelo base."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "prompt":        {"type": "string",  "description": "Descripción de la imagen"},
                    "lora_path":     {"type": "string",  "description": "Ruta del LoRA (ej: nerijs/pixel-art-xl)"},
                    "lora_scale":    {"type": "number",  "description": "Intensidad del LoRA 0.0-1.0 (default: 0.8)", "default": 0.8},
                    "width":         {"type": "integer", "description": "Ancho en píxeles (default: 1024)",            "default": 1024},
                    "height":        {"type": "integer", "description": "Alto en píxeles (default: 1024)",             "default": 1024},
                    "num_outputs":   {"type": "integer", "description": "Número de imágenes",                         "default": 1},
                    "seed":          {"type": "integer", "description": "Semilla (opcional)"},
                    "output_format": {"type": "string",  "description": "png / jpg / webp",                           "default": "png"},
                },
                "required": ["prompt", "lora_path"],
            },
        ),
        types.Tool(
            name="edit_image",
            description=(
                "Edita una imagen existente usando instrucciones de texto (FLUX Kontext Dev). "
                "Permite modificar partes de la imagen sin regenerarla por completo."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "image_url": {"type": "string", "description": "URL de la imagen original a editar"},
                    "prompt":    {"type": "string", "description": "Instrucción de edición (ej: 'cambia el fondo a un bosque')"},
                    "seed":      {"type": "integer","description": "Semilla (opcional)"},
                },
                "required": ["image_url", "prompt"],
            },
        ),
        types.Tool(
            name="upscale_image",
            description="Aumenta la resolución de una imagen hasta 4x sin perder calidad.",
            inputSchema={
                "type": "object",
                "properties": {
                    "image_url": {"type": "string",  "description": "URL de la imagen a mejorar"},
                    "scale":     {"type": "number",  "description": "Factor de escala: 2 o 4 (default: 2)", "default": 2},
                },
                "required": ["image_url"],
            },
        ),
        types.Tool(
            name="remove_background",
            description="Elimina el fondo de una imagen y devuelve la imagen con fondo transparente (PNG).",
            inputSchema={
                "type": "object",
                "properties": {
                    "image_url": {"type": "string", "description": "URL de la imagen"},
                },
                "required": ["image_url"],
            },
        ),
        # ── Video ─────────────────────────────────────────────────────────────
        types.Tool(
            name="generate_video_from_text",
            description=(
                "Genera un video corto a partir de un prompt de texto (WAN 2.1 T2V 720p). "
                "La generación puede tardar varios minutos."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "prompt":          {"type": "string",  "description": "Descripción detallada del video a generar"},
                    "negative_prompt": {"type": "string",  "description": "Elementos a evitar"},
                    "duration":        {"type": "integer", "description": "Duración en segundos (3-10, default: 5)", "default": 5},
                    "seed":            {"type": "integer", "description": "Semilla (opcional)"},
                },
                "required": ["prompt"],
            },
        ),
        types.Tool(
            name="generate_video_from_image",
            description=(
                "Anima una imagen estática y genera un video (WAN 2.1 I2V 720p). "
                "La generación puede tardar varios minutos."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "image_url":       {"type": "string",  "description": "URL de la imagen base"},
                    "prompt":          {"type": "string",  "description": "Descripción de la animación"},
                    "negative_prompt": {"type": "string",  "description": "Elementos a evitar"},
                    "duration":        {"type": "integer", "description": "Duración en segundos (3-10, default: 5)", "default": 5},
                    "seed":            {"type": "integer", "description": "Semilla (opcional)"},
                },
                "required": ["image_url", "prompt"],
            },
        ),
        # ── Audio / Voz ───────────────────────────────────────────────────────
        types.Tool(
            name="text_to_speech",
            description="Convierte texto a audio hablado de alta calidad (Minimax Speech 2.6 HD).",
            inputSchema={
                "type": "object",
                "properties": {
                    "text":      {"type": "string", "description": "Texto a convertir en voz"},
                    "voice_id":  {"type": "string", "description": "ID de voz (opcional, ej: Wise_Woman, Friendly_Person)"},
                    "speed":     {"type": "number", "description": "Velocidad 0.5-2.0 (default: 1.0)", "default": 1.0},
                    "language":  {"type": "string", "description": "Código de idioma ej: es, en, fr (default: es)", "default": "es"},
                },
                "required": ["text"],
            },
        ),
        # ── Utilidades ────────────────────────────────────────────────────────
        types.Tool(
            name="check_balance",
            description="Consulta el saldo y créditos disponibles de la cuenta WaveSpeed AI.",
            inputSchema={
                "type": "object",
                "properties": {},
            },
        ),
        types.Tool(
            name="list_models",
            description=(
                "Lista los modelos disponibles en WaveSpeed AI, opcionalmente filtrados por categoría. "
                "Útil para descubrir qué modelos se pueden usar."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "description": "Filtro de categoría: image, video, audio, 3d, all (default: all)",
                        "default": "all",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Máximo de modelos a devolver (default: 20)",
                        "default": 20,
                    },
                },
            },
        ),
        types.Tool(
            name="run_custom_model",
            description=(
                "Ejecuta cualquier modelo de WaveSpeed AI con parámetros personalizados. "
                "Úsalo cuando necesites un modelo específico que no tiene herramienta dedicada."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "model_id": {
                        "type": "string",
                        "description": "ID del modelo (ej: wavespeed-ai/flux-dev, google/imagen4)",
                    },
                    "params": {
                        "type": "object",
                        "description": "Parámetros del modelo como objeto JSON",
                    },
                },
                "required": ["model_id", "params"],
            },
        ),
    ]


# ── Manejadores de herramientas ──────────────────────────────────────────────
@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:

    try:
        # ── generate_image ───────────────────────────────────────────────────
        if name == "generate_image":
            payload = {
                "prompt":          arguments["prompt"],
                "negative_prompt": arguments.get("negative_prompt", ""),
                "width":           arguments.get("width",  1024),
                "height":          arguments.get("height", 1024),
                "num_outputs":     arguments.get("num_outputs", 1),
                "output_format":   arguments.get("output_format", "png"),
            }
            if "seed" in arguments:
                payload["seed"] = arguments["seed"]
            result = await run_task("wavespeed-ai/flux-dev", payload)
            return [types.TextContent(type="text", text=fmt_result(result, "Imagen (FLUX Dev)"))]

        # ── generate_image_fast ──────────────────────────────────────────────
        elif name == "generate_image_fast":
            payload = {
                "prompt":        arguments["prompt"],
                "width":         arguments.get("width",  1024),
                "height":        arguments.get("height", 1024),
                "num_outputs":   arguments.get("num_outputs", 1),
                "output_format": arguments.get("output_format", "png"),
            }
            if "seed" in arguments:
                payload["seed"] = arguments["seed"]
            result = await run_task("wavespeed-ai/flux-schnell", payload)
            return [types.TextContent(type="text", text=fmt_result(result, "Imagen rápida (FLUX Schnell)"))]

        # ── generate_image_lora ──────────────────────────────────────────────
        elif name == "generate_image_lora":
            payload = {
                "prompt": arguments["prompt"],
                "loras":  [{"path": arguments["lora_path"], "scale": arguments.get("lora_scale", 0.8)}],
                "width":         arguments.get("width",  1024),
                "height":        arguments.get("height", 1024),
                "num_outputs":   arguments.get("num_outputs", 1),
                "output_format": arguments.get("output_format", "png"),
            }
            if "seed" in arguments:
                payload["seed"] = arguments["seed"]
            result = await run_task("wavespeed-ai/flux-dev-lora", payload)
            return [types.TextContent(type="text", text=fmt_result(result, "Imagen con LoRA"))]

        # ── edit_image ───────────────────────────────────────────────────────
        elif name == "edit_image":
            payload = {
                "image_url": arguments["image_url"],
                "prompt":    arguments["prompt"],
            }
            if "seed" in arguments:
                payload["seed"] = arguments["seed"]
            result = await run_task("wavespeed-ai/flux-kontext-dev", payload)
            return [types.TextContent(type="text", text=fmt_result(result, "Imagen editada"))]

        # ── upscale_image ────────────────────────────────────────────────────
        elif name == "upscale_image":
            payload = {
                "image":  arguments["image_url"],
                "scale":  arguments.get("scale", 2),
            }
            result = await run_task("wavespeed-ai/image-upscaler", payload)
            return [types.TextContent(type="text", text=fmt_result(result, "Imagen mejorada"))]

        # ── remove_background ────────────────────────────────────────────────
        elif name == "remove_background":
            payload = {"image": arguments["image_url"]}
            result  = await run_task("wavespeed-ai/image-background-remover", payload)
            return [types.TextContent(type="text", text=fmt_result(result, "Fondo eliminado"))]

        # ── generate_video_from_text ─────────────────────────────────────────
        elif name == "generate_video_from_text":
            payload = {
                "prompt":          arguments["prompt"],
                "negative_prompt": arguments.get("negative_prompt", ""),
                "duration":        arguments.get("duration", 5),
            }
            if "seed" in arguments:
                payload["seed"] = arguments["seed"]
            result = await run_task("wavespeed-ai/wan-2.1-t2v-720p", payload)
            return [types.TextContent(type="text", text=fmt_result(result, "Video generado desde texto"))]

        # ── generate_video_from_image ────────────────────────────────────────
        elif name == "generate_video_from_image":
            payload = {
                "image":           arguments["image_url"],
                "prompt":          arguments["prompt"],
                "negative_prompt": arguments.get("negative_prompt", ""),
                "duration":        arguments.get("duration", 5),
            }
            if "seed" in arguments:
                payload["seed"] = arguments["seed"]
            result = await run_task("wavespeed-ai/wan-2.1-i2v-720p", payload)
            return [types.TextContent(type="text", text=fmt_result(result, "Video generado desde imagen"))]

        # ── text_to_speech ───────────────────────────────────────────────────
        elif name == "text_to_speech":
            payload = {
                "text":      arguments["text"],
                "speed":     arguments.get("speed", 1.0),
                "language":  arguments.get("language", "es"),
            }
            if "voice_id" in arguments:
                payload["voice_id"] = arguments["voice_id"]
            result = await run_task("minimax/minimax-speech-02-hd", payload)
            return [types.TextContent(type="text", text=fmt_result(result, "Audio generado"))]

        # ── check_balance ────────────────────────────────────────────────────
        elif name == "check_balance":
            async with httpx.AsyncClient(timeout=30) as client:
                r = await client.get(
                    "https://api.wavespeed.ai/api/v3/balance",
                    headers=get_headers(),
                )
                r.raise_for_status()
                data = r.json()
            balance  = data.get("data", {}).get("balance", data.get("balance", "N/D"))
            currency = data.get("data", {}).get("currency", "USD")
            return [types.TextContent(
                type="text",
                text=f"💰 Saldo WaveSpeed AI\nBalance: {balance} {currency}\n\nRespuesta completa:\n{json.dumps(data, indent=2, ensure_ascii=False)}",
            )]

        # ── list_models ──────────────────────────────────────────────────────
        elif name == "list_models":
            category = arguments.get("category", "all")
            limit    = arguments.get("limit", 20)
            async with httpx.AsyncClient(timeout=30) as client:
                r = await client.get(
                    "https://api.wavespeed.ai/api/v3/models",
                    headers=get_headers(),
                    params={"category": category, "limit": limit},
                )
                r.raise_for_status()
                data = r.json()
            models = data.get("data", data.get("models", []))
            if isinstance(models, list):
                lines = [f"📋 Modelos disponibles ({category}) — mostrando {len(models)}:"]
                for m in models[:limit]:
                    mid  = m.get("id") or m.get("model_id") or str(m)
                    desc = m.get("description", "")
                    lines.append(f"  • {mid}" + (f" — {desc}" if desc else ""))
                return [types.TextContent(type="text", text="\n".join(lines))]
            return [types.TextContent(type="text", text=json.dumps(data, indent=2, ensure_ascii=False))]

        # ── run_custom_model ─────────────────────────────────────────────────
        elif name == "run_custom_model":
            model_id = arguments["model_id"]
            params   = arguments["params"]
            result   = await run_task(model_id, params)
            return [types.TextContent(type="text", text=fmt_result(result, f"Modelo personalizado: {model_id}"))]

        else:
            return [types.TextContent(type="text", text=f"❌ Herramienta desconocida: {name}")]

    except ValueError as e:
        return [types.TextContent(type="text", text=f"⚠️  Error de configuración: {e}")]
    except httpx.HTTPStatusError as e:
        body = e.response.text[:500]
        return [types.TextContent(type="text", text=f"❌ Error HTTP {e.response.status_code}: {body}")]
    except TimeoutError as e:
        return [types.TextContent(type="text", text=f"⏱️  Timeout: {e}")]
    except Exception as e:
        return [types.TextContent(type="text", text=f"❌ Error inesperado: {type(e).__name__}: {e}")]


# ── Punto de entrada ─────────────────────────────────────────────────────────
async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
