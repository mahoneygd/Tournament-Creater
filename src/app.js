let players = [];
let queue = [];
let activeMatches = [];
let standings = {};
let tables = 6;
let maxConsecutiveWins = 2; // New rule: max amount of games won in a row before being kicked off
let history = []; // For undo functionality
let availableTables = Array.from({ length: tables }, (_, i) => i + 1);

function startTournament() {
    const input = document.getElementById("playerNames").value.trim();
    if (!input) return alert("Please enter player names first!");

    players = input.split("\n").map((name) => name.trim()).filter(Boolean);
    tables = parseInt(document.getElementById("activeGames").value) || 1;
    maxConsecutiveWins = parseInt(document.getElementById("maxConsecutiveWins").value);

    if (players.length < 2) return alert("At least two players are required to start the tournament.");
    if (tables < 1) {
        tables = 1;
        document.getElementById("activeGames").value = "1";
    }
    if (tables > Math.floor(players.length / 2)) tables = Math.floor(players.length / 2);
    if (maxConsecutiveWins < 0) {
        maxConsecutiveWins = 0;
        document.getElementById("maxConsecutiveWins").value = "0";
    }

    queue = [...players];
    activeMatches = [];
    standings = {};
    availableTables = Array.from({ length: tables }, (_, i) => i + 1);

    // Initialize standings and consecutive wins
    players.forEach((p) => {
        standings[p] = { wins: 0, points: 0, games: 0, consecutive: 0, players_played: [] };
    });
    history.push(JSON.stringify({ players, queue, activeMatches, standings }))

    document.getElementById("playerEntry").hidden = true;

    startNextMatches();
    render();
    //   console.log("Max Consecutive Wins set to:", maxConsecutiveWins);

}

function addPlayer() {
    const playerName = document.getElementById("newPlayer").value;
    if (!playerName) return alert("Please enter a player name.");
    if (players.includes(playerName)) return alert("Player already exists.");
    players.push(playerName);
    queue.push(playerName);
    standings[playerName] = { wins: 0, points: 0, games: 0, consecutive: 0, players_played: [] };
    document.getElementById("newPlayer").value = "";
    renderQueue();
    renderStandings();
    saveTournament();
}

function startNextMatches() {
    while (activeMatches.length < tables && queue.length >= 2) {
        const player1 = queue.shift();
        const player2 = queue.shift();
        const tableNumber = availableTables.shift();
        activeMatches.push({ player1, player2, table: tableNumber });
    }
    render();
    saveTournament();
}

function reportResult(index, winnerName) {
    const match = activeMatches[index];
    if (!match) return;

    const loserName = match.player1 === winnerName ? match.player2 : match.player1;
    const winner = standings[winnerName];
    const loser = standings[loserName];

    // Update stats
    winner.wins++;
    winner.games++;
    winner.points++;
    loser.games++;
    winner.players_played.push(loserName.toUpperCase());
    loser.players_played.push(winnerName.toLowerCase());

    // Update consecutive wins
    winner.consecutive++;
    loser.consecutive = 0;

    // Free this table for reuse
    availableTables.push(match.table);
    availableTables.sort((a, b) => a - b);

    if (maxConsecutiveWins > 0 && winner.consecutive >= maxConsecutiveWins) {
        // Winner hit max streak — both go to queue
        // console.log(`${winnerName} reached max consecutive wins of ${maxConsecutiveWins}.`);
        winner.points++;
        queue.push(winnerName);
        queue.push(loserName);
        winner.consecutive = 0;
    } else {
        // Winner stays — assign a new table from the available list
        queue.push(loserName);
        const newTable = availableTables.shift(); // get the next free one
        if (newTable !== undefined) {
            activeMatches.push({
                player1: winnerName,
                player2: queue.shift(),
                table: newTable
            });
        }
    }

    // Remove finished match
    activeMatches.splice(index, 1);

    startNextMatches();
    render();
    saveTournament();
}

function undoLastAction() {
    if (history.length < 2) return alert("No actions to undo.");
    history.pop(); // Remove current state
    history.pop(); // Remove last action state
    const lastState = JSON.parse(history[history.length - 1]);
    players = lastState.players;
    queue = lastState.queue;
    activeMatches = lastState.activeMatches;
    standings = lastState.standings;
    render();
}

function saveTournament() {
    const data = {
        players,
        queue,
        activeMatches,
        standings,
        tables,
        maxConsecutiveWins
    };
    history.push(JSON.stringify(data));
    localStorage.setItem("tournamentData", JSON.stringify(data));
}

function render() {
    renderQueue();
    renderMatches();
    renderStandings();
}


function renderQueue() {
    const queueList = document.getElementById("queueList");
    queueList.innerHTML = "";
    queue.forEach((p, i) => {
        const button = document.createElement("button");
        button.className = "btn btn-sm btn-danger float-end";
        button.textContent = "Remove";
        button.onclick = () => {
            queue.splice(i, 1);
            renderQueue();
        };
        const li = document.createElement("li");
        li.className = "list-group-item";
        li.textContent = `${i + 1}. ${p}`;
        li.appendChild(button);
        queueList.appendChild(li);
    });
}

function renderMatches() {
    const matchArea = document.getElementById("matchArea");
    matchArea.innerHTML = "";

    activeMatches.forEach((m, index) => {
        const card = document.createElement("div");
        card.className = "card mb-3";
        card.innerHTML = `
      <div class="card-body">
        <h5 class="card-title">Match ${index + 1} — Table: ${m.table}</h5>
        <p class="card-text">${m.player1} vs ${m.player2}</p>
        <button class="btn btn-success me-2" onclick="reportResult(${index}, '${m.player1}')">${m.player1} Wins</button>
        <button class="btn btn-success" onclick="reportResult(${index}, '${m.player2}')">${m.player2} Wins</button>
      </div>
    `;
        matchArea.appendChild(card);
    });
}

function renderStandings() {
    const standingsBody = document.getElementById("standingsBody");
    const sorted = Object.entries(standings).sort(
        (a, b) => b[1].wins - a[1].wins
    );
    standingsBody.innerHTML = "";
    sorted.forEach(([player, stats], i) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${player}</td>
      <td>${stats.wins}</td>
      <td>${stats.points}</td>
      <td>${stats.games}</td>
    `;
        standingsBody.appendChild(tr);
    });
}

function resetTournament() {
    players = [];
    queue = [];
    activeMatches = [];
    standings = {};
    tables = 1;
    document.getElementById("playerNames").value = "";
    document.getElementById("matchArea").innerHTML = "";
    document.getElementById("queueList").innerHTML = "";
    document.getElementById("standingsBody").innerHTML = "";
    history = [];
    availableTables = Array.from({ length: tables }, (_, i) => i + 1);
    render();
    localStorage.removeItem("tournamentData");
    document.getElementById("playerEntry").hidden = false;
}

window.onload = function () {
    const saved = localStorage.getItem("tournamentData");
    if (saved) {
        const data = JSON.parse(saved);

        // Restore state variables
        players = data.players || [];
        queue = data.queue || [];
        activeMatches = data.activeMatches || [];
        standings = data.standings || {};
        tables = data.tables || 1;
        maxConsecutiveWins = data.maxConsecutiveWins || 2;

        availableTables = Array.from({ length: data.tables || 1 }, (_, i) => i + 1);


        render();
    }

    //   window.beforeunload = function () {
    //     localStorage.remove("tournamentData");
    //   }

};
