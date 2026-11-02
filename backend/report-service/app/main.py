from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from .latex_generator import generate_simplex_latex
from .schemas import SimplexHistoryEntryPayload


app = FastAPI(
    title="Orizone Report Service",
    description="Génération de rapports scientifiques LaTeX et PDF pour Orizone.",
    version="0.1.0",
)

origins = [
    origin.strip()
    for origin in os.getenv(
        "ORIZONE_CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class LatexCompilationError(RuntimeError):
    pass


def compile_latex_to_pdf(source: str) -> bytes:
    engine = shutil.which("xelatex")
    if not engine:
        raise LatexCompilationError("XeLaTeX est introuvable dans le service de rapports.")

    timeout_seconds = max(10, int(os.getenv("LATEX_COMPILE_TIMEOUT_SECONDS", "60")))
    with tempfile.TemporaryDirectory(prefix="orizone-latex-") as temporary_directory:
        workdir = Path(temporary_directory)
        tex_path = workdir / "report.tex"
        pdf_path = workdir / "report.pdf"
        tex_path.write_text(source, encoding="utf-8")
        environment = os.environ.copy()
        environment.update(
            {
                "HOME": str(workdir),
                "TEXMFVAR": str(workdir / "texmf-var"),
                "TEXMFCONFIG": str(workdir / "texmf-config"),
                "TEXMFOUTPUT": str(workdir),
                "openin_any": "p",
                "openout_any": "p",
            }
        )

        command = [
            engine,
            "-no-shell-escape",
            "-interaction=nonstopmode",
            "-halt-on-error",
            "-file-line-error",
            "-output-directory",
            str(workdir),
            str(tex_path),
        ]

        for pass_number in (1, 2):
            try:
                completed = subprocess.run(
                    command,
                    cwd=workdir,
                    env=environment,
                    capture_output=True,
                    text=True,
                    timeout=timeout_seconds,
                    check=False,
                )
            except subprocess.TimeoutExpired as error:
                raise LatexCompilationError(
                    f"La compilation LaTeX a dépassé la limite de {timeout_seconds} secondes."
                ) from error

            if completed.returncode != 0:
                log_path = workdir / "report.log"
                log_excerpt = ""
                if log_path.exists():
                    log_excerpt = "\n".join(log_path.read_text(encoding="utf-8", errors="replace").splitlines()[-24:])
                if not log_excerpt:
                    log_excerpt = completed.stderr[-4000:] or completed.stdout[-4000:]
                raise LatexCompilationError(
                    "XeLaTeX n’a pas pu compiler le rapport. Extrait du journal :\n" + log_excerpt[-6000:]
                )

        if not pdf_path.is_file() or pdf_path.stat().st_size < 500:
            raise LatexCompilationError("XeLaTeX s’est terminé sans produire un PDF valide.")
        return pdf_path.read_bytes()


@app.get("/health")
def health_check():
    engine_path = shutil.which("xelatex")
    return {
        "status": "ok" if engine_path else "degraded",
        "service": "orizone-report-service",
        "latex_engine": "XeLaTeX",
        "engine_available": engine_path is not None,
        "engine_path": engine_path,
    }


@app.post("/api/reports/simplex/latex")
def export_simplex_latex(entry: SimplexHistoryEntryPayload):
    source = generate_simplex_latex(entry)
    filename = "Orizone-Simplexe.tex"
    return Response(
        content=source,
        media_type="application/x-tex; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.post("/api/reports/simplex/pdf")
def export_simplex_pdf(entry: SimplexHistoryEntryPayload):
    source = generate_simplex_latex(entry)
    try:
        pdf = compile_latex_to_pdf(source)
    except LatexCompilationError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    filename = "Orizone-Simplexe.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )
