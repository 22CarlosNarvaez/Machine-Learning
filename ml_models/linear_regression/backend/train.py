import joblib 
from pathlib import Path
import numpy as np
import matplotlib.pyplot as plt
from sklearn.linear_model import LinearRegression


# Predecir precios de vivienda segun la superficie en m2

# datos de entrenamiento X y Y

#metros cuadrados de superficie de la vivienda
x = np.array([[70], [80], [90], [110], [120], [130], [140], [150]])
y = np.array([420000000, 800000000, 1700000000, 1900000000, 2500000000, 3000000000, 3500000000, 4000000000])

# Entrenar el modelo de regresion lineal
model = LinearRegression()
model.fit(x,y)

#Predicciones de prueba

# y_pred = model.predict(x)

#imprimir coeficientes del modelo 

# print("Coeficiente de regresion lineal:", model.coef_)
# print("Termino Independiente:", model.intercept_)


# Graficar datos reales 

# plt.scatter(x, y, color='purple', label='Datos Reales')
# plt.plot(x, y_pred, color='orange', label='Linea de Regresion Lineal')

#agregar etiquetas y titulo
# plt.xlabel('Superficie (m2)')
# plt.ylabel('Precio (COP)')
# plt.title('Regresion Lineal: Precio de vivienda según la superficie (m2)')

# #graficar la linea de regresion lineal

# plt.show()

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "model" / "linear_model.joblib"

MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
joblib.dump(model, MODEL_PATH)
