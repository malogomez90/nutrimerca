# WaveSpeed AI — Servidor MCP

Servidor **MCP (Model Context Protocol)** que expone la API de [WaveSpeed AI](https://wavespeed.ai) como herramientas para agentes de IA (Claude, Cursor, Windsurf, etc.).

## ✨ Herramientas disponibles

| Herramienta | Descripción |
|---|---|
| `generate_image` | Genera imagen con FLUX Dev (alta calidad) |
| `generate_image_fast` | Genera imagen con FLUX Schnell (ultra-rápido) |
| `generate_image_lora` | Genera imagen con estilo LoRA personalizado |
| `edit_image` | Edita una imagen con instrucciones de texto |
| `upscale_image` | Aumenta la resolución hasta 4x |
| `remove_background` | Elimina el fondo de una imagen |
| `generate_video_from_text` | Genera video desde texto (WAN 2.1 720p) |
| `generate_video_from_image` | Anima una imagen y genera video |
| `text_to_speech` | Convierte texto a voz de alta calidad |
| `check_balance` | Consulta el saldo de la cuenta |
| `list_models` | Lista los modelos disponibles |
| `run_custom_model` | Ejecuta cualquier modelo con parámetros propios |

---

## 🚀 Instalación

### 1. Requisitos

- Python 3.10+
- Cuenta en [wavespeed.ai](https://wavespeed.ai) con API Key

### 2. Instalar dependencias

```bash
pip install mcp httpx
```

### 3. Configurar la API Key

```bash
export WAVESPEED_API_KEY="tu_api_key_aquí"
```

---

## ⚙️ Configuración por cliente

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "wavespeed": {
      "command": "python",
      "args": ["/ruta/completa/a/wavespeed-mcp/server.py"],
      "env": {
        "WAVESPEED_API_KEY": "tu_api_key_aquí"
      }
    }
  }
}
```

**macOS/Linux:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

---

### Cursor / Windsurf (`.cursor/mcp.json` o `mcp.json`)

```json
{
  "mcpServers": {
    "wavespeed": {
      "command": "python",
      "args": ["./wavespeed-mcp/server.py"],
      "env": {
        "WAVESPEED_API_KEY": "tu_api_key_aquí"
      }
    }
  }
}
```

---

### Claude Code (CLI)

```bash
claude mcp add wavespeed \
  --command "python /ruta/a/server.py" \
  --env WAVESPEED_API_KEY=tu_api_key
```

---

## 💡 Ejemplos de uso (prompts para el agente)

```
"Genera una imagen de un dragón dorado volando sobre montañas nevadas, estilo fantástico"

"Crea un video corto de 5 segundos de un océano al atardecer con olas suaves"

"Elimina el fondo de esta imagen: https://ejemplo.com/foto.jpg"

"Mejora la resolución de esta imagen al 4x: https://ejemplo.com/imagen.jpg"

"Genera audio con voz en español diciendo: 'Bienvenido a nuestra aplicación'"

"¿Cuántos créditos me quedan en WaveSpeed?"
```

---

## 🔑 Obtener API Key

1. Regístrate en [wavespeed.ai](https://wavespeed.ai)
2. Ve a **Settings → API Keys**
3. Crea una nueva clave
4. Recarga créditos (las claves sin saldo no funcionan)

---

## 📝 Notas

- La **generación de video** puede tardar 2-5 minutos — el servidor espera automáticamente
- Los **modelos LoRA** más populares están en [Hugging Face](https://huggingface.co/models?search=lora+flux)
- Usa `run_custom_model` para acceder a los 700+ modelos disponibles en WaveSpeed
- Consulta el catálogo completo en [wavespeed.ai/docs/docs-api](https://wavespeed.ai/docs/docs-api)
