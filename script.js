const PREDICTIONS_FILE = 'data/predictions.json';
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ0isdbB1H4H5k9QLSpwg6To0whFuaZTPqH9e8LhfFAwnA4DE0J5C3wxONwfB0Ueh3RGmtTKn7Symct/pub?gid=0&single=true&output=csv';

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`No se pudo cargar ${path}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function fetchSheetResults() {
  const response = await fetch(SHEET_URL);
  if (!response.ok) {
    throw new Error(`No se pudo cargar la hoja de resultados: ${response.status} ${response.statusText}`);
  }
  const text = await response.text();
  const lines = text.trim().replace(/\r/g, '').split('\n');
  const results = lines.slice(1)
    .map(line => {
      const [matchId, home, away] = line.split(',').map(s => s.trim());
      if (!matchId || home === '' || away === '') return null;
      return { matchId: Number(matchId), home: Number(home), away: Number(away) };
    })
    .filter(Boolean);
  return { results };
}

function getMatchOutcome(score) {
  if (score.home > score.away) return 'home';
  if (score.home < score.away) return 'away';
  return 'draw';
}

function scorePrediction(prediction, result) {
  if (!result) return null;
  if (prediction.home === result.home && prediction.away === result.away) {
    return 3;
  }

  const predictedDiff = prediction.home - prediction.away;
  const resultDiff = result.home - result.away;
  if (predictedDiff === resultDiff) {
    return 2;
  }

  if (getMatchOutcome(prediction) === getMatchOutcome(result)) {
    return 1;
  }

  return 0;
}

function formatScore(score) {
  if (!score) return '-';
  return `${score.home} - ${score.away}`;
}

function getPredictionOutcome(prediction, result) {
  if (!result) {
    return {label: 'Pendiente', className: 'outcome-miss', points: null};
  }
  if (!prediction) {
    return {label: 'Sin pronóstico', className: 'outcome-miss', points: 0};
  }

  const points = scorePrediction(prediction, result);
  if (points === 3) {
    return {label: 'Exacto', className: 'outcome-exact', points};
  }
  if (points === 2) {
    return {label: 'Diferencia', className: 'outcome-diff', points};
  }
  if (points === 1) {
    return {label: 'Resultado', className: 'outcome-correct', points};
  }

  return {label: 'Falló', className: 'outcome-miss', points: 0};
}

function renderPlayerTabs(players, matches, resultsById) {
  const tabsEl = document.getElementById('player-tabs');
  const panelsEl = document.getElementById('player-panels');

  if (!players || players.length === 0) {
    tabsEl.innerHTML = '<p class="loading">No hay jugadores disponibles.</p>';
    panelsEl.innerHTML = '';
    return;
  }

  tabsEl.innerHTML = '';
  panelsEl.innerHTML = '';

  players.forEach((player, index) => {
    const activeClass = index === 0 ? 'active' : '';

    tabsEl.innerHTML += `
      <button class="tab-button ${activeClass}" type="button" data-player-index="${index}">${player.name}</button>
    `;

    const matchRows = matches.map(match => {
      const result = resultsById.get(match.id);
      const prediction = player.guesses.find(g => g.matchId === match.id);
      const outcome = getPredictionOutcome(prediction, result);
      const predictionLabel = prediction ? formatScore(prediction) : '—';
      const resultLabel = result ? formatScore(result) : 'Pendiente';
      const pointsLabel = outcome.points === null ? '-' : outcome.points;

      return `
        <tr>
          <td>${match.id}</td>
          <td>${match.homeTeam} vs ${match.awayTeam}</td>
          <td>${predictionLabel}</td>
          <td>${resultLabel}</td>
          <td>${pointsLabel}</td>
          <td><span class="outcome-pill ${outcome.className}">${outcome.label}</span></td>
        </tr>
      `;
    }).join('');

    panelsEl.innerHTML += `
      <section class="player-panel ${activeClass}" data-player-index="${index}">
        <div class="player-summary">
          <div class="metric">
            <h3>Total</h3>
            <p>${player.total}</p>
          </div>
          <div class="metric">
            <h3>Exactos</h3>
            <p>${player.exact}</p>
          </div>
          <div class="metric">
            <h3>Diferencia</h3>
            <p>${player.diff}</p>
          </div>
          <div class="metric">
            <h3>Resultado correcto</h3>
            <p>${player.correct}</p>
          </div>
        </div>
        <div class="card">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Partido</th>
                <th>Pronóstico</th>
                <th>Resultado real</th>
                <th>Puntos</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>${matchRows}</tbody>
          </table>
        </div>
      </section>
    `;
  });

  tabsEl.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      const selectedIndex = button.getAttribute('data-player-index');
      tabsEl.querySelectorAll('.tab-button').forEach(tab => tab.classList.toggle('active', tab === button));
      panelsEl.querySelectorAll('.player-panel').forEach(panel => {
        panel.classList.toggle('active', panel.getAttribute('data-player-index') === selectedIndex);
      });
    });
  });
}

function renderStandings(players) {
  const container = document.getElementById('standings-container');
  if (!players || players.length === 0) {
    container.innerHTML = '<p class="loading">No hay datos de pronósticos para mostrar.</p>';
    return;
  }

  const rows = players.map((player, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${player.name}</td>
      <td>${player.total}</td>
      <td>${player.exact}</td>
      <td>${player.diff}</td>
      <td>${player.correct}</td>
    </tr>
  `).join('');

  container.innerHTML = `
    <div class="card">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Jugador</th>
            <th>Total</th>
            <th>Exactos</th>
            <th>Diferencia</th>
            <th>Resultado</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderMatchCards(matches, players, resultsById) {
  const container = document.getElementById('matches-container');
  if (!matches || matches.length === 0) {
    container.innerHTML = '<p class="loading">No hay partidos configurados aún.</p>';
    return;
  }

  container.innerHTML = matches.map(match => {
    const result = resultsById.get(match.id);
    const resultLabel = result ? formatScore(result) : 'Pendiente';
    const dateLabel = match.date ? ` | ${match.date}` : '';

    const rows = players.map(player => {
      const prediction = player.guesses.find(g => g.matchId === match.id);
      const points = prediction && result ? scorePrediction(prediction, result) : null;
      const predictionLabel = prediction ? formatScore(prediction) : 'Sin pronóstico';
      const pointsText = points === null ? '-' : points;

      return `
        <tr>
          <td>${player.name}</td>
          <td>${predictionLabel}</td>
          <td>${pointsText}</td>
        </tr>
      `;
    }).join('');

    return `
      <article class="match-card">
        <div class="match-header">
          <div>
            <h3>${match.homeTeam} vs ${match.awayTeam}</h3>
            <p>${match.group ? `${match.group} • ` : ''}${match.stage || ''}${dateLabel}</p>
          </div>
          <div class="status-pill">Resultado: ${resultLabel}</div>
        </div>
        <div class="card">
          <table>
            <thead>
              <tr>
                <th>Jugador</th>
                <th>Pronóstico</th>
                <th>Puntos</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </article>
    `;
  }).join('');
}

function buildPlayers(predictions, matches, resultsById) {
  const players = predictions.map(player => {
    const playerData = {
      name: player.name,
      guesses: player.guesses || [],
      total: 0,
      exact: 0,
      diff: 0,
      correct: 0,
    };

    for (const guess of playerData.guesses) {
      const result = resultsById.get(guess.matchId);
      if (!result) continue;
      const points = scorePrediction(guess, result);
      playerData.total += points;
      if (points === 3) playerData.exact += 1;
      if (points === 2) playerData.diff += 1;
      if (points === 1) playerData.correct += 1;
    }

    return playerData;
  });

  return players.sort((a, b) => b.total - a.total || b.exact - a.exact || b.correct - a.correct);
}

async function init() {
  try {
    const [predictionsData, resultsData] = await Promise.all([
      fetchJson(PREDICTIONS_FILE),
      fetchSheetResults(),
    ]);

    const matches = predictionsData.matches || [];
    const resultsById = new Map((resultsData.results || []).map(result => [result.matchId, result]));
    const players = buildPlayers(predictionsData.predictions || [], matches, resultsById);

    renderStandings(players);
    renderPlayerTabs(players, matches, resultsById);
    renderMatchCards(matches, predictionsData.predictions || [], resultsById);
  } catch (error) {
    document.getElementById('standings-container').innerHTML = `<p class="loading">Error: ${error.message}</p>`;
    document.getElementById('matches-container').innerHTML = '';
    console.error(error);
  }
}

window.addEventListener('DOMContentLoaded', init);
