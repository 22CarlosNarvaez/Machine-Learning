"""API para estimar el precio de un inmueble segun su superficie en metros cuadrados.

El calculo se realiza con el modelo de regresion lineal entrenado en ``train.py``.
"""

from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "model" / "linear_model.joblib"

app = FastAPI(
    title="API de tasacion de inmuebles",
    description=(
        "Estima el precio de un inmueble en COP a partir de sus metros cuadrados "
        "usando un modelo de regresion lineal."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class InmuebleRequest(BaseModel):
    metros_cuadrados: float = Field(
        ...,
        gt=0,
        le=100_000,
        description="Superficie del inmueble en metros cuadrados",
        examples=[100],
    )


class PrecioResponse(BaseModel):
    metros_cuadrados: float
    precio_estimado: float
    moneda: str = "COP"


@lru_cache(maxsize=1)
def obtener_modelo():
    """Carga el modelo una sola vez; avisa si aun no se ha entrenado."""
    if not MODEL_PATH.exists():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "El modelo aun no existe. Ejecuta `python train.py` en la carpeta "
                "backend para generar model/linear_model.joblib."
            ),
        )
    return joblib.load(MODEL_PATH)


@app.get("/", tags=["Informacion"])
def raiz():
    return {
        "mensaje": "API de tasacion de inmuebles",
        "endpoint": "POST /calcular-precio",
        "ejemplo_body": {"metros_cuadrados": 100},
        "modelo_disponible": MODEL_PATH.exists(),
    }


@app.post("/calcular-precio", response_model=PrecioResponse, tags=["Prediccion"])
def calcular_precio(inmueble: InmuebleRequest):
    """Devuelve el precio estimado para la superficie indicada."""
    modelo = obtener_modelo()
    metros = np.array([[inmueble.metros_cuadrados]])
    precio = modelo.predict(metros)[0]

    return PrecioResponse(
        metros_cuadrados=inmueble.metros_cuadrados,
        precio_estimado=round(float(precio), 2),
    )
