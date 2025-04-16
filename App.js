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
            extras: {
                wides: 0,
                noBalls: 0,
                byes: 0,
                legByes: 0
            },
            overHistory: [],
            currentOverBalls: []
        }
    ],
    matchSummary: {
        result: '',
        playerOfMatch: '',
        playerOfMatchStats: '',
        topPerformers: {
            team1: {
                batsman: '',
                bowler: ''
            },
            team2: {
                batsman: '',
                bowler: ''
            }
        }
    }
};

// ------------------------------
// UTILITY FUNCTIONS
// ------------------------------
function getBattingTeamKey() {
    const innings = matchData.innings[matchData.currentInnings - 1];
    return innings.battingTeam === matchData.team1 ? 'team1' : 'team2';
}

function getBowlingTeamKey() {
    const innings = matchData.innings[matchData.currentInnings - 1];
    return innings.bowlingTeam === matchData.team1 ? 'team1' : 'team2';
}

function getAvailableBatsmen() {
    const teamKey = getBattingTeamKey();
    const innings = matchData.innings[matchData.currentInnings - 1];
    const usedBatsmen = Object.keys(innings.batsmenStats);
    
    // Include current batsmen in the used list
    const allUsed = [...usedBatsmen];
    if (innings.currentBatsmen.striker && !allUsed.includes(innings.currentBatsmen.striker)) {
        allUsed.push(innings.currentBatsmen.striker);
    }
    if (innings.currentBatsmen.nonStriker && !allUsed.includes(innings.currentBatsmen.nonStriker)) {
        allUsed.push(innings.currentBatsmen.nonStriker);
    }
    
    return matchData.players[teamKey].filter(player => !allUsed.includes(player));
}

function getAvailableBowlers() {
    const teamKey = getBowlingTeamKey();
    const innings = matchData.innings[matchData.currentInnings - 1];
    const lastBowler = innings.currentBowler;
    
    // Remove last bowler from available list (can't bowl consecutive overs)
    return matchData.players[teamKey].filter(player => player !== lastBowler);
}

function calculateStrikeRate(runs, balls) {
    if (balls === 0) return 0;
    return (runs / balls) * 100;
}

function calculateEconomy(runs, overs) {
    if (overs === 0) return 0;
    return runs / overs;
}

function updateBatsmanStats(batsmanName, runs, isStrikeRotated = false) {
    const innings = matchData.innings[matchData.currentInnings - 1];
    
    if (!innings.batsmenStats[batsmanName]) {
        innings.batsmenStats[batsmanName] = {
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            dismissal: null
        };
    }
    
    innings.batsmenStats[batsmanName].runs += runs;
    innings.batsmenStats[batsmanName].balls += 1;
    
    if (runs === 4) innings.batsmenStats[batsmanName].fours += 1;
    if (runs === 6) innings.batsmenStats[batsmanName].sixes += 1;
    
    // Update UI
    updateBatsmenDisplay();
    updateBattingStatsTable();
    
    // Rotate strike if odd runs
    if (isStrikeRotated || runs % 2 === 1) {
        rotateStrike();
    }
}

function updateBowlerStats(bowlerName, runs, isWicket = false, isExtra = false) {
    const innings = matchData.innings[matchData.currentInnings - 1];
    
    if (!innings.bowlerStats[bowlerName]) {
        innings.bowlerStats[bowlerName] = {
            overs: 0,
            maidens: 0,
            runs: 0,
            wickets: 0,
            balls: 0,
            runsConcededInOver: 0
        };
    }
    
    innings.bowlerStats[bowlerName].runs += runs;
    if (!isExtra) innings.bowlerStats[bowlerName].balls += 1;
    if (isWicket) innings.bowlerStats[bowlerName].wickets += 1;
    
    // Calculate overs
    innings.bowlerStats[bowlerName].overs = Math.floor(innings.bowlerStats[bowlerName].balls / 6) + 
        (innings.bowlerStats[bowlerName].balls % 6) / 10;
    
    // Track runs in current over for maiden calculation
    innings.bowlerStats[bowlerName].runsConcededInOver += runs;
    
    // Update UI
    updateBowlerDisplay();
    updateBowlingStatsTable();
}

function rotateStrike() {
    const innings = matchData.innings[matchData.currentInnings - 1];
    const temp = innings.currentBatsmen.striker;
    innings.currentBatsmen.striker = innings.currentBatsmen.nonStriker;
    innings.currentBatsmen.nonStriker = temp;
    updateBatsmenDisplay();
}

function isOverComplete() {
    const innings = matchData.innings[matchData.currentInnings - 1];
    return innings.balls % 6 === 0 && innings.balls > 0;
}

function addBallToOver(ballType, runs) {
    const innings = matchData.innings[matchData.currentInnings - 1];
    const ballInfo = {
        type: ballType,
        runs: runs
    };
    innings.currentOverBalls.push(ballInfo);
    
    // Update over display
    updateOverDisplay();
}

function updateOverDisplay() {
    const innings = matchData.innings[matchData.currentInnings - 1];
    const overDisplay = document.getElementById('this-over-balls');
    
    if (innings.currentOverBalls.length === 0) {
        overDisplay.innerHTML = '<span class="text-gray-400">No balls bowled yet</span>';
        return;
    }
    
    overDisplay.innerHTML = '';
    
    innings.currentOverBalls.forEach(ball => {
        const ballElement = document.createElement('span');
        ballElement.className = getBallClass(ball.type, ball.runs);
        ballElement.textContent = getBallText(ball.type, ball.runs);
        overDisplay.appendChild(ballElement);
    });
}

function getBallClass(type, runs) {
    const baseClass = 'inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ';
    
    switch (type) {
        case 'wicket':
            return baseClass + 'bg-red-100 text-red-700';
        case 'wide':
        case 'no-ball':
            return baseClass + 'bg-yellow-100 text-yellow-700';
        case 'bye':
        case 'leg-bye':
            return baseClass + 'bg-purple-100 text-purple-700';
        case 'run':
            if (runs === 4) return baseClass + 'bg-blue-100 text-blue-700';
            if (runs === 6) return baseClass + 'bg-green-100 text-green-700';
            return baseClass + 'bg-gray-100 text-gray-700';
        default:
            return baseClass + 'bg-gray-100 text-gray-700';
    }
}

function getBallText(type, runs) {
    switch (type) {
        case 'wicket':
            return 'W';
        case 'wide':
            return 'WD';
        case 'no-ball':
            return 'NB';
        case 'bye':
            return 'B' + runs;
        case 'leg-bye':
            return 'LB' + runs;
        case 'run':
            return runs.toString();
        default:
            return runs.toString();
    }
}

// ------------------------------
// UI UPDATE FUNCTIONS
// ------------------------------
function updateScoreDisplay() {
    const innings = matchData.innings[matchData.currentInnings - 1];
    document.getElementById('score-display').innerText = `${innings.score}/${innings.wickets}`;
    document.getElementById('overs-display').innerText = innings.overs.toFixed(1);
    
    // Calculate run rate
    const runRate = innings.balls > 0 ? (innings.score / (innings.balls / 6)) : 0;
    document.getElementById('run-rate-display').innerText = runRate.toFixed(2);
    
    // Show target in 2nd innings
    if (matchData.currentInnings === 2) {
        const targetContainer = document.getElementById('target-container');
        const targetDisplay = document.getElementById('target-display');
        targetContainer.classList.remove('hidden');
        targetDisplay.innerText = matchData.innings[0].score + 1;
    }
}

function updateBatsmenDisplay() {
    const innings = matchData.innings[matchData.currentInnings - 1];
    
    // Update striker display
    if (innings.currentBatsmen.striker) {
        const strikerStats = innings.batsmenStats[innings.currentBatsmen.striker] || { runs: 0, balls: 0 };
        document.getElementById('striker-name').innerText = innings.currentBatsmen.striker;
        document.getElementById('striker-score').innerText = `${strikerStats.runs}(${strikerStats.balls})`;
        
        const strikerSR = calculateStrikeRate(strikerStats.runs, strikerStats.balls);
        document.getElementById('striker-sr').innerText = strikerSR.toFixed(2);
        document.getElementById('striker-sr-indicator').style.width = `${Math.min(strikerSR, 200) / 2}%`;
    }
    
    // Update non-striker display
    if (innings.currentBatsmen.nonStriker) {
        const nonStrikerStats = innings.batsmenStats[innings.currentBatsmen.nonStriker] || { runs: 0, balls: 0 };
        document.getElementById('non-striker-name').innerText = innings.currentBatsmen.nonStriker;
        document.getElementById('non-striker-score').innerText = `${nonStrikerStats.runs}(${nonStrikerStats.balls})`;
        
        const nonStrikerSR = calculateStrikeRate(nonStrikerStats.runs, nonStrikerStats.balls);
        document.getElementById('non-striker-sr').innerText = nonStrikerSR.toFixed(2);
        document.getElementById('non-striker-sr-indicator').style.width = `${Math.min(nonStrikerSR, 200) / 2}%`;
    }
}

function updateBowlerDisplay() {
    const innings = matchData.innings[matchData.currentInnings - 1];
    
    // Update bowler display
    if (innings.currentBowler) {
        const bowlerStats = innings.bowlerStats[innings.currentBowler];
        document.getElementById('bowler-name').innerText = innings.currentBowler;
        document.getElementById('bowler-figures').innerText = `${bowlerStats.wickets}-${bowlerStats.runs} (${bowlerStats.overs.toFixed(1)})`;
        
        const economy = calculateEconomy(bowlerStats.runs, parseFloat(bowlerStats.overs.toFixed(1)));
        document.getElementById('bowler-economy').innerText = economy.toFixed(2);
        
        // Adjust economy indicator based on T20 standards
        // < 6 is excellent, > 10 is poor
        const economyPercent = Math.max(0, Math.min(100, ((economy - 4) / 6) * 100));
        document.getElementById('bowler-economy-indicator').style.width = `${100 - economyPercent}%`;
    }
}

function updateBattingStatsTable() {
    const innings = matchData.innings[matchData.currentInnings - 1];
    const tableBody = document.getElementById('batting-stats');
    tableBody.innerHTML = '';
    
    const batsmen = Object.keys(innings.batsmenStats);
    batsmen.forEach(batsman => {
        const stats = innings.batsmenStats[batsman];
        const row = document.createElement('tr');
        
        // Check if batsman is current
        let nameDisplay = batsman;
        if (batsman === innings.currentBatsmen.striker) {
            nameDisplay += ' *';
        } else if (batsman === innings.currentBatsmen.nonStriker) {
            nameDisplay += ' ';
        }
        
        // Add dismissal info if out
        if (stats.dismissal) {
            nameDisplay += ` (${stats.dismissal})`;
        }
        
        row.innerHTML = `
            <td class="py-2 px-3 border-t border-gray-200">${nameDisplay}</td>
            <td class="py-2 px-3 border-t border-gray-200 text-right">${stats.runs}</td>
            <td class="py-2 px-3 border-t border-gray-200 text-right">${stats.balls}</td>
            <td class="py-2 px-3 border-t border-gray-200 text-right">${stats.fours}</td>
            <td class="py-2 px-3 border-t border-gray-200 text-right">${stats.sixes}</td>
            <td class="py-2 px-3 border-t border-gray-200 text-right">${calculateStrikeRate(stats.runs, stats.balls).toFixed(2)}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

function updateBowlingStatsTable() {
    const innings = matchData.innings[matchData.currentInnings - 1];
    const tableBody = document.getElementById('bowling-stats');
    tableBody.innerHTML = '';
    
    const bowlers = Object.keys(innings.bowlerStats);
    bowlers.forEach(bowler => {
        const stats = innings.bowlerStats[bowler];
        const row = document.createElement('tr');
        
        // Check if bowler is current
        let nameDisplay = bowler;
        if (bowler === innings.currentBowler) {
            nameDisplay += ' *';
        }
        
        row.innerHTML = `
            <td class="py-2 px-3 border-t border-gray-200">${nameDisplay}</td>
            <td class="py-2 px-3 border-t border-gray-200 text-right">${stats.overs.toFixed(1)}</td>
            <td class="py-2 px-3 border-t border-gray-200 text-right">${stats.maidens}</td>
            <td class="py-2 px-3 border-t border-gray-200 text-right">${stats.runs}</td>
            <td class="py-2 px-3 border-t border-gray-200 text-right">${stats.wickets}</td>
            <td class="py-2 px-3 border-t border-gray-200 text-right">${calculateEconomy(stats.runs, parseFloat(stats.overs.toFixed(1))).toFixed(2)}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

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
        input.className = 'w-full border border-gray-300 rounded-md px-3 py-2 mb-2';
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

    // Clear existing player data
    matchData.players.team1 = [];
    matchData.players.team2 = [];

    team1Inputs.forEach(input => {
        if (input.value.trim()) {
            matchData.players.team1.push(input.value.trim());
        }
    });
    
    team2Inputs.forEach(input => {
        if (input.value.trim()) {
            matchData.players.team2.push(input.value.trim());
        }
    });

    // Initialize with first two batsmen
    const innings = matchData.innings[matchData.currentInnings - 1];
    innings.currentBatsmen.striker = matchData.players[getBattingTeamKey()][0];
    innings.currentBatsmen.nonStriker = matchData.players[getBattingTeamKey()][1];
    
    // Initialize batsman stats
    innings.batsmenStats[innings.currentBatsmen.striker] = {
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        dismissal: null
    };
    
    innings.batsmenStats[innings.currentBatsmen.nonStriker] = {
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        dismissal: null
    };

    // Show selector for first bowler
    showBowlerModal();

    // Save to localStorage
    localStorage.setItem('currentMatch', JSON.stringify(matchData));

    // Update UI to go to scoring
    playerSection.classList.add('hidden');
    scoringSection.classList.remove('hidden');

    document.getElementById('match-teams-display').innerText = `${matchData.team1} vs ${matchData.team2}`;
    document.getElementById('match-info-display').innerText = `${matchData.overs} overs match at ${matchData.location}`;
    document.getElementById('current-innings-display').innerText = `1st Innings`;
    document.getElementById('batting-team-display').innerText = `${innings.battingTeam} batting`;
    
    // Update batsmen display
    updateBatsmenDisplay();
    updateBattingStatsTable();
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

    // Update batsman stats
    updateBatsmanStats(innings.currentBatsmen.striker, runs);
    
    // Update bowler stats
    updateBowlerStats(innings.currentBowler, runs);
    
    // Add to over history
    addBallToOver('run', runs);

    // Update UI
    updateScoreDisplay();
    
    // Check if over is complete
    if (isOverComplete()) {
        document.getElementById('end-over-btn').disabled = false;
    }
    
    // Check if innings is complete
    checkInningsCompletion();

    // Save match progress
    localStorage.setItem('currentMatch', JSON.stringify(matchData));
}

// ------------------------------
// EXTRAS HANDLING
// ------------------------------
document.getElementById('wide-btn').addEventListener('click', () => {
    addExtra('wide');
});

document.getElementById('no-ball-btn').addEventListener('click', () => {
    addExtra('no-ball');
});

document.getElementById('bye-btn').addEventListener('click', () => {
    showExtraRunsModal('bye');
});

document.getElementById('leg-bye-btn').addEventListener('click', () => {
    showExtraRunsModal('leg-bye');
});

function addExtra(extraType, runs = 1) {
    const innings = matchData.innings[matchData.currentInnings - 1];
    
    switch (extraType) {
        case 'wide':
            innings.score += runs;
            innings.extras.wides += runs;
            addBallToOver('wide', runs);
            updateBowlerStats(innings.currentBowler, runs, false, true);
            break;
        case 'no-ball':
            innings.score += runs;
            innings.extras.noBalls += runs;
            addBallToOver('no-ball', runs);
            updateBowlerStats(innings.currentBowler, runs, false, true);
            break;
        case 'bye':
            innings.score += runs;
            innings.balls++;
            innings.extras.byes += runs;
            addBallToOver('bye', runs);
            updateBatsmanStats(innings.currentBatsmen.striker, 0, runs % 2 === 1);
            updateBowlerStats(innings.currentBowler, 0);
            break;
        case 'leg-bye':
            innings.score += runs;
            innings.balls++;
            innings.extras.legByes += runs;
            addBallToOver('leg-bye', runs);
            updateBatsmanStats(innings.currentBatsmen.striker, 0, runs % 2 === 1);
            updateBowlerStats(innings.currentBowler, 0);
            break;
    }
    
    // Calculate over count
    const completedOvers = Math.floor(innings.balls / 6);
    const remainingBalls = innings.balls % 6;
    innings.overs = parseFloat(`${completedOvers}.${remainingBalls}`);
    
    // Update UI
    updateScoreDisplay();
    
    // Check if over is complete
    if (isOverComplete()) {
        document.getElementById('end-over-btn').disabled = false;
    }
    
    // Check if innings is complete
    checkInningsCompletion();
    
    // Save match progress
    localStorage.setItem('currentMatch', JSON.stringify(matchData));
}

function showExtraRunsModal(extraType) {
    // Create a simple modal for extra runs
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 class="text-xl font-bold mb-4">${extraType === 'bye' ? 'Byes' : 'Leg Byes'}</h3>
            <div class="grid grid-cols-4 gap-2 mb-4">
                <button class="extra-run-btn bg-white hover:bg-gray-50 text-gray-800 font-bold py-3 px-4 rounded shadow" data-runs="1">1</button>
                <button class="extra-run-btn bg-white hover:bg-gray-50 text-gray-800 font-bold py-3 px-4 rounded shadow" data-runs="2">2</button>
                <button class="extra-run-btn bg-white hover:bg-gray-50 text-gray-800 font-bold py-3 px-4 rounded shadow" data-runs="3">3</button>
                <button class="extra-run-btn bg-white hover:bg-gray-50 text-blue-700 font-bold py-3 px-4 rounded shadow" data-runs="4">4</button>
            </div>
            <div class="flex justify-end">
                <button class="cancel-extra bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md transition">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    modal.querySelectorAll('.extra-run-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const runs = parseInt(btn.dataset.runs);
            addExtra(extraType, runs);
            document.body.removeChild(modal);
        });
    });
    
    modal.querySelector('.cancel-extra').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
}

// ------------------------------
// WICKET HANDLING
// ------------------------------
const wicketModal = document.getElementById('wicket-modal');
const wicketForm = document.getElementById('wicket-form');
const dismissalType = document.getElementById('dismissal-type');
const fielderContainer = document.getElementById('fielder-container');
const runOutBatsmanContainer = document.getElementById('run-out-batsman-container');
const fielderSelect = document.getElementById('fielder');
const runOutBatsmanSelect = document.getElementById('run-out-batsman');
const newBatsmanSelect = document.getElementById('new-batsman');
const cancelWicket = document.getElementById('cancel-wicket');

document.getElementById('wicket-btn').addEventListener('click', () => {
    showWicketModal();
});

dismissalType.addEventListener('change', () => {
    const type = dismissalType.value;
    
    // Show/hide fielder select based on dismissal type
    if (type === 'caught' || type === 'stumped' || type === 'run-out') {
        fielderContainer.classList.remove('hidden');
        populateFielders();
    } else {
        fielderContainer.classList.add('hidden');
    }
    
    // Show/hide run out batsman select
    if (type === 'run-out') {
        runOutBatsmanContainer.classList.remove('hidden');
    } else {
        runOutBatsmanContainer.classList.add('hidden');
    }
});

cancelWicket.addEventListener('click', () => {
    hideWicketModal();
});

wicketForm.addEventListener('submit', (e) => {
    e.preventDefault();
    processWicket();
    hideWicketModal();
});

function showWicketModal() {
    // Populate new batsman options
    populateNewBatsmen();
    
    // Reset form
    dismissalType.value = 'bowled';
    fielderContainer.classList.add('hidden');
    runOutBatsmanContainer.classList.add('hidden');
    
    // Show modal
    wicketModal.classList.remove('hidden');
}

function hideWicketModal() {
    wicketModal.classList.add('hidden');
}

function populateFielders() {
    const teamKey = getBowlingTeamKey();
    fielderSelect.innerHTML = '';
    
    matchData.players[teamKey].forEach(player => {
        const option = document.createElement('option');
        option.value = player;
        option.textContent = player;
        fielderSelect.appendChild(option);
    });
}

function populateNewBatsmen() {
    const availableBatsmen = getAvailableBatsmen();
    newBatsmanSelect.innerHTML = '';
    
    availableBatsmen.forEach(player => {
        const option = document.createElement('option');
        option.value = player;
        option.textContent = player;
        newBatsmanSelect.appendChild(option);
    });
    
    // Disable the button if no more batsmen
    if (availableBatsmen.length === 0) {
        document.getElementById('wicket-btn').disabled = true;
    }
}

function processWicket() {
    const innings = matchData.innings[matchData.currentInnings - 1];
    const type = dismissalType.value;
    let outBatsman = innings.currentBatsmen.striker;
    
    // Determine which batsman is out for run-out
    if (type === 'run-out' && runOutBatsmanSelect.value === 'non-striker') {
        outBatsman = innings.currentBatsmen.nonStriker;
    }
    
    // Update dismissal information
    let dismissalText = '';
    switch (type) {
        case 'bowled':
            dismissalText = `b ${innings.currentBowler}`;
            break;
        case 'caught':
            dismissalText = `c ${fielderSelect.value} b ${innings.currentBowler}`;
            break;
        case 'lbw':
            dismissalText = `lbw b ${innings.currentBowler}`;
            break;
        case 'stumped':
            dismissalText = `st ${fielderSelect.value} b ${innings
