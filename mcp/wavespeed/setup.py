#!/usr/bin/env python3
"""
setup.py — Instalador del servidor MCP de WaveSpeed AI
Detecta el sistema operativo, instala dependencias y configura Claude Desktop automáticamente.
"""

import json
import os
import platform
import subprocess
import sys
from pathlib import Path

API_KEY  = "94328adf6194d16d19e5c564143888095bbcf4742d941a90f1f400a9bbdf6cba"
MCP_NAME = "wavespeed"

# ── Ruta del servidor ────────────────────────────────────────────────────────
SERVER_PATH = Path(__file__).resolve().parent / "server.py"

# ── Ruta del config de Claude Desktop según SO ──────────────────────────────
def get_claude_config_path() -> Path:
    system = platform.system()
    if system == "Darwin":   # macOS
        return Path.home() / "Library" / "Application Support" / "Claude" / "claude_desktop_config.json"
    elif system == "Windows":
        return Path(os.environ["APPDATA"]) / "Claude" / "claude_desktop_config.json"
    else:                    # Linux
        return Path.home() / ".config" / "Claude" / "claude_desktop_config.json"

# ── Detectar ejecutable de Python ───────────────────────────────────────────
def get_python_executable() -> str:
    return sys.executable  # el mismo Python que está corriendo este script

# ── Instalar dependencias ────────────────────────────────────────────────────
def install_deps():
    print("📦 Instalando dependencias (mcp, httpx)...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "mcp", "httpx", "-q"])
    print("   ✅ Dependencias instaladas")

# ── Configurar Claude Desktop ────────────────────────────────────────────────
def configure_claude_desktop():
    config_path = get_claude_config_path()
    python_exe  = get_python_executable()

    # Cargar config existente o crear nueva
    config_path.parent.mkdir(parents=True, exist_ok=True)
    if config_path.exists():
        with open(config_path) as f:
            config = json.load(f)
        print(f"📄 Config existente encontrada: {config_path}")
    else:
        config = {}
        print(f"📄 Creando nueva config en: {config_path}")

    # Agregar / actualizar entrada wavespeed
    config.setdefault("mcpServers", {})[MCP_NAME] = {
        "command": python_exe,
        "args":    [str(SERVER_PATH)],
        "env":     {"WAVESPEED_API_KEY": API_KEY},
    }

    with open(config_path, "w") as f:
        json.dump(config, f, indent=2)

    print(f"   ✅ '{MCP_NAME}' registrado en Claude Desktop")
    return config_path

# ── Generar .mcp.json para proyectos ────────────────────────────────────────
def generate_project_mcp(target_dir: Path = None):
    target_dir  = target_dir or Path.cwd()
    python_exe  = get_python_executable()
    output_file = target_dir / ".mcp.json"

    mcp_json = {
        "mcpServers": {
            MCP_NAME: {
                "command": python_exe,
                "args":    [str(SERVER_PATH)],
                "env":     {"WAVESPEED_API_KEY": API_KEY},
            }
        }
    }

    with open(output_file, "w") as f:
        json.dump(mcp_json, f, indent=2)

    print(f"   ✅ .mcp.json generado en: {output_file}")
    return output_file

# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    print("=" * 55)
    print("  WaveSpeed AI — Instalador MCP")
    print("=" * 55)
    print(f"  Sistema:  {platform.system()} {platform.machine()}")
    print(f"  Python:   {sys.executable}")
    print(f"  Servidor: {SERVER_PATH}")
    print("=" * 55)

    # 1. Instalar deps
    install_deps()

    # 2. Claude Desktop
    print("\n🖥️  Configurando Claude Desktop...")
    config_path = configure_claude_desktop()

    # 3. .mcp.json en directorio actual (útil para Claude Code / Cursor)
    print("\n📁 Generando .mcp.json para proyectos...")
    generate_project_mcp()

    print("\n" + "=" * 55)
    print("  ✅ Instalación completada")
    print("=" * 55)
    print(f"\n  Config Claude Desktop: {config_path}")
    print(f"  Servidor MCP:          {SERVER_PATH}")
    print("\n  ➡️  Reinicia Claude Desktop para aplicar los cambios.")
    print("\n  Para añadir el MCP a un proyecto específico,")
    print("  copia el archivo .mcp.json a la raíz del proyecto.")
    print("  O ejecuta desde ese directorio:")
    print(f"\n    python {SERVER_PATH.parent / 'setup.py'} --project\n")

if __name__ == "__main__":
    # Argumento opcional --project para generar solo .mcp.json en CWD
    if "--project" in sys.argv:
        generate_project_mcp()
    else:
        main()
