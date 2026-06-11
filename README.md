# Web Mundial

Sitio estático para comparar pronósticos de la Copa del Mundo con los resultados reales.

## Archivos principales

- `index.html` — página principal.
- `styles.css` — estilos.
- `script.js` — carga los JSON y calcula puntajes.
- `data/predictions.json` — pronósticos de cada jugador.
- `data/results.json` — resultados reales de cada partido.

## Cómo usar

1. Abre `data/predictions.json` y agrega los jugadores y sus pronósticos.
2. Abre `data/results.json` y actualiza los resultados reales después de cada partido.
3. Sirve el sitio con un servidor local:

```bash
python -m http.server
```

4. Abre `http://localhost:8000` en tu navegador.

## Formato de datos

### `matches`
Cada partido debe tener:

```json
{"id": 1, "homeTeam": "Equipo A", "awayTeam": "Equipo B", "date": "día", "stage": "Fase"}
```

### `predictions`
Cada jugador debe tener:

```json
{
  "name": "Nombre",
  "guesses": [
    {"matchId": 1, "home": 2, "away": 1}
  ]
}
```

### `results`
Cada resultado debe tener:

```json
{"matchId": 1, "home": 2, "away": 0}
```

## Sistema de puntuación

- Exacto: `3` puntos
- Diferencia correcta: `2` puntos
- Ganador/empate correcto: `1` punto
- Sin acierto: `0` puntos
