// app.js

// ------------------------------
// GLOBAL VARIABLES
// ------------------------------
let matchData = {
    team1: '',
    team2: '',
    overs: 0,
    playersPerTeam: 0,
    location: '',
    players: {
        team1: [],
        team2: []
    },
    currentInnings: 1,
    innings: [
        {
            battingTeam: '',
            bowlingTeam: '',
            score: 0,
            wickets: 0,
            balls: 0,
            overs: 0,
            batsmenStats: {},
            bowlerStats: {},
            currentBatsmen: {
                striker: null,
                nonStriker: null
            },
            currentBowler: null,
            overHistory: []
        }
    ]
};

// ------------------------------
// MATCH SETUP FORM HANDLING
// ------------------------------
const matchForm = document.getElementById('new-match-form');
const playerSection = document.getElementById('player-registration');
const scoringSection = document.getElementById('match-scoring');

matchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const team1 = document.getElementById('team1').value.trim();
    const team2 = document.getElementById('team2').value.trim();
    const overs = parseInt(document.getElementById('overs').value);
    const players = parseInt(document.getElementById('players-per-team').value);
    const location = document.getElementById('match-location').value.trim();

    matchData.team1 = team1;
    matchData.team2 = team2;
    matchData.overs = overs;
    matchData.playersPerTeam = players;
    matchData.location = location;
    matchData.innings[0].battingTeam = team1;
    matchData.innings[0].bowlingTeam = team2;

    document.getElementById('team1-name-display').innerText = team1;
    document.getElementById('team2-name-display').innerText = team2;

    generatePlayerInputs('team1-player-inputs', players, 'team1');
    generatePlayerInputs('team2-player-inputs', players, 'team2');

    document.getElementById('match-setup').classList.add('hidden');
    playerSection.classList.remove('hidden');
});

function generatePlayerInputs(containerId, count, teamKey) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'w-full border border-gray-300 rounded-md px-3 py-2';
        input.placeholder = `Player ${i + 1}`;
        input.required = true;
        input.dataset.team = teamKey;
        container.appendChild(input);
    }
}

// ------------------------------
// PLAYER REGISTRATION TO MATCH DATA
// ------------------------------
document.getElementById('start-scoring').addEventListener('click', () => {
    const team1Inputs = document.querySelectorAll('#team1-player-inputs input');
    const team2Inputs = document.querySelectorAll('#team2-player-inputs input');

    team1Inputs.forEach(input => matchData.players.team1.push(input.value.trim()));
    team2Inputs.forEach(input => matchData.players.team2.push(input.value.trim()));

    // Save to localStorage
    localStorage.setItem('currentMatch', JSON.stringify(matchData));

    // Update UI to go to scoring
    playerSection.classList.add('hidden');
    scoringSection.classList.remove('hidden');

    document.getElementById('match-teams-display').innerText = `${matchData.team1} vs ${matchData.team2}`;
    document.getElementById('match-info-display').innerText = `${matchData.overs} overs match at ${matchData.location}`;
    document.getElementById('current-innings-display').innerText = `1st Innings`;
    document.getElementById('batting-team-display').innerText = `${matchData.innings[0].battingTeam} batting`;
});

// ------------------------------
// RUNS SCORING BUTTONS
// ------------------------------
document.querySelectorAll('.run-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const runs = parseInt(btn.dataset.runs);
        addRun(runs);
    });
});

function addRun(runs) {
    const innings = matchData.innings[matchData.currentInnings - 1];
    innings.score += runs;
    innings.balls++;

    // Calculate over count
    const completedOvers = Math.floor(innings.balls / 6);
    const remainingBalls = innings.balls % 6;
    innings.overs = parseFloat(`${completedOvers}.${remainingBalls}`);

    // Update UI
    document.getElementById('score-display').innerText = `${innings.score}/${innings.wickets}`;
    document.getElementById('overs-display').innerText = innings.overs.toFixed(1);
    document.getElementById('run-rate-display').innerText = (innings.score / (innings.balls / 6 || 1)).toFixed(2);

    // Save match progress
    localStorage.setItem('currentMatch', JSON.stringify(matchData));
}
