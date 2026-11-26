(function () {
  "use strict";

  var STORAGE_KEY = "tasador.apiBaseUrl";
  var LOCAL_API = "http://localhost:8000";
  var VALID_VALUES = [70, 80, 90, 110, 120, 130, 140, 150];
  var TIMEOUT_MS = 10000;
  var CHART_MAX_AREA = 150;
  var CHART_MIN_AREA = 70;
  var CHART_MAX_PRICE = 4300000000;

  var form = document.getElementById("tasacion-form");
  var metrosInput = document.getElementById("metros-cuadrados");
  var metrosError = document.getElementById("metros-error");
  var submitButton = document.getElementById("submit-button");
  var submitLabel = document.getElementById("submit-label");
  var result = document.getElementById("result");
  var precio = document.getElementById("precio");
  var resultSuperficie = document.getElementById("result-superficie");
  var resultPorMetro = document.getElementById("result-por-metro");
  var resultMoneda = document.getElementById("result-moneda");
  var placeholder = document.getElementById("placeholder");
  var apiError = document.getElementById("api-error");
  var apiOrigin = document.getElementById("api-origin");
  var toggleSettings = document.getElementById("toggle-settings");
  var settings = document.getElementById("settings");
  var apiUrlInput = document.getElementById("api-url");
  var resetSettings = document.getElementById("reset-settings");
  var presets = Array.prototype.slice.call(document.querySelectorAll(".preset"));
  var chartGuide = document.getElementById("chart-guide");
  var chartMarker = document.getElementById("chart-marker");

  var currency = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
  var number = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var priceAnimation = null;

  function normalizeBase(value) {
    return String(value || "").trim().replace(/\/+$/, "");
  }

  function defaultBase() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) return normalizeBase(stored);
    } catch (error) {
      /* Almacenamiento no disponible: se usa el origen por defecto. */
    }
    return "https://backend-production-6fde794d.up.railway.app";
  }

  var apiBase = defaultBase();

  function endpoint() {
    return apiBase + "/calcular-precio";
  }

  function updateOrigin() {
    apiOrigin.textContent = apiBase || location.origin || "mismo origen";
  }

  function setLoading(loading) {
    submitButton.disabled = loading;
    submitButton.classList.toggle("is-loading", loading);
    submitLabel.textContent = loading ? "Calculando..." : "Calcular tasación";
  }

  function showInputError(message) {
    metrosError.textContent = message;
    metrosError.hidden = false;
    metrosInput.setAttribute("aria-invalid", "true");
  }

  function clearInputError() {
    metrosError.textContent = "";
    metrosError.hidden = true;
    metrosInput.removeAttribute("aria-invalid");
  }

  function clearApiError() {
    apiError.textContent = "";
    apiError.hidden = true;
  }

  function hideChartMarker() {
    chartGuide.setAttribute("hidden", "");
    chartMarker.setAttribute("hidden", "");
  }

  function hideResult() {
    if (priceAnimation) {
      cancelAnimationFrame(priceAnimation);
      priceAnimation = null;
    }
    result.hidden = true;
    placeholder.hidden = false;
    hideChartMarker();
  }

  function validateMetros() {
    var raw = metrosInput.value.trim().replace(",", ".");
    var value = Number(raw);

    if (!raw || !Number.isFinite(value)) return { error: "Selecciona una superficie de la lista." };
    if (VALID_VALUES.indexOf(value) === -1) {
      return {
        error: "Valor no disponible. Usa uno de: 70, 80, 90, 110, 120, 130, 140 o 150 m².",
      };
    }

    return { value: value };
  }

  function animatePrice(target) {
    if (priceAnimation) cancelAnimationFrame(priceAnimation);

    if (reducedMotion) {
      precio.textContent = currency.format(target);
      return;
    }

    var start = performance.now();
    var duration = 650;

    function frame(now) {
      var progress = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      precio.textContent = currency.format(target * eased);
      if (progress < 1) priceAnimation = requestAnimationFrame(frame);
      else priceAnimation = null;
    }

    priceAnimation = requestAnimationFrame(frame);
  }

  function updateChart(metros, precioEstimado) {
    var area = Math.min(Math.max(metros, CHART_MIN_AREA), CHART_MAX_AREA);
    var value = Math.min(Math.max(precioEstimado, 0), CHART_MAX_PRICE);
    var x = 24 + ((area - CHART_MIN_AREA) / (CHART_MAX_AREA - CHART_MIN_AREA)) * 276;
    var y = 92 - (value / CHART_MAX_PRICE) * 80;

    chartGuide.setAttribute("x1", x);
    chartGuide.setAttribute("x2", x);
    chartGuide.setAttribute("y1", y);
    chartGuide.setAttribute("y2", 92);
    chartMarker.setAttribute("cx", x);
    chartMarker.setAttribute("cy", y);
    chartGuide.removeAttribute("hidden");
    chartMarker.removeAttribute("hidden");
  }

  function renderResult(data) {
    var metros = Number(data.metros_cuadrados);
    var precioEstimado = Number(data.precio_estimado);
    var porMetro = metros > 0 ? precioEstimado / metros : 0;

    animatePrice(precioEstimado);
    resultSuperficie.textContent = number.format(metros) + " m²";
    resultPorMetro.textContent = currency.format(porMetro);
    resultMoneda.textContent = data.moneda || "COP";
    updateChart(metros, precioEstimado);

    placeholder.hidden = true;
    result.hidden = false;
  }

  function errorMessageFrom(response, body) {
    if (body && typeof body.detail === "string") return body.detail;
    if (body && Array.isArray(body.detail) && body.detail.length) {
      return body.detail.map(function (item) { return item.msg; }).join(". ");
    }
    if (response.status === 503) return "El modelo aún no está disponible en la API.";
    return "La API no pudo procesar la solicitud (código " + response.status + ").";
  }

  metrosInput.addEventListener("input", function () {
    if (!metrosError.hidden) clearInputError();
    presets.forEach(function (preset) { preset.classList.remove("is-active"); });
    hideResult();
    clearApiError();
  });

  presets.forEach(function (preset) {
    preset.addEventListener("click", function () {
      metrosInput.value = preset.dataset.value;
      metrosInput.dispatchEvent(new Event("input", { bubbles: true }));
      preset.classList.add("is-active");
      if (typeof form.requestSubmit === "function") form.requestSubmit();
      else form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    clearInputError();
    clearApiError();

    var validation = validateMetros();
    if (validation.error) {
      showInputError(validation.error);
      hideResult();
      metrosInput.focus();
      return;
    }

    var controller = new AbortController();
    var timeoutId = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);

    setLoading(true);
    hideResult();

    fetch(endpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metros_cuadrados: validation.value }),
      signal: controller.signal,
    })
      .then(function (response) {
        return response.json().catch(function () { return null; }).then(function (body) {
          return { response: response, body: body };
        });
      })
      .then(function (payload) {
        if (!payload.response.ok) {
          throw new Error(errorMessageFrom(payload.response, payload.body));
        }
        if (!payload.body || !Number.isFinite(Number(payload.body.precio_estimado))) {
          throw new Error("La respuesta de la API no contiene un precio válido.");
        }
        renderResult(payload.body);
      })
      .catch(function (error) {
        if (error.name === "AbortError") {
          apiError.textContent = "La API no respondió a tiempo. Inténtalo de nuevo.";
        } else if (error instanceof TypeError) {
          apiError.textContent =
            "No fue posible conectar con la API. Revisa la URL configurada y el acceso CORS del servidor.";
        } else {
          apiError.textContent = error.message;
        }
        apiError.hidden = false;
      })
      .finally(function () {
        clearTimeout(timeoutId);
        setLoading(false);
      });
  });

  toggleSettings.addEventListener("click", function () {
    var open = settings.hidden;
    settings.hidden = !open;
    toggleSettings.setAttribute("aria-expanded", String(open));
    toggleSettings.textContent = open ? "Ocultar configuración" : "Configurar endpoint";
    if (open) {
      apiUrlInput.value = apiBase || location.origin || "";
      apiUrlInput.focus();
    }
  });

  settings.addEventListener("submit", function (event) {
    event.preventDefault();
    var base = normalizeBase(apiUrlInput.value);

    try {
      if (base) localStorage.setItem(STORAGE_KEY, base);
      else localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      /* Sin almacenamiento, la configuración aplica solo a esta sesión. */
    }

    apiBase = defaultBase();
    updateOrigin();
    settings.hidden = true;
    toggleSettings.setAttribute("aria-expanded", "false");
    toggleSettings.textContent = "Configurar endpoint";
  });

  resetSettings.addEventListener("click", function () {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      /* Sin almacenamiento, no hay nada que restablecer. */
    }
    apiBase = defaultBase();
    apiUrlInput.value = apiBase || location.origin || "";
    updateOrigin();
  });

  updateOrigin();
})();
