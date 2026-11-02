FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ca-certificates \
       fontconfig \
       fonts-lmodern \
       fonts-noto-core \
       texlive-xetex \
       texlive-latex-extra \
       texlive-lang-french \
       texlive-fonts-recommended \
    && fc-cache -f \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

RUN useradd --create-home --uid 10001 --shell /usr/sbin/nologin orizone
COPY app ./app
RUN mkdir -p /tmp/orizone-reports \
    && chown -R orizone:orizone /app /tmp/orizone-reports

USER 10001:10001
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
