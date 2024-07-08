// Import mappool
const roundNameEl = document.getElementById("roundName")
async function getMappool() {
    const response = await fetch("http://127.0.0.1:24050/SRS/_data/beatmaps.json")
    const mappool = await response.json()
    roundNameEl.innerText = mappool.roundName.toLowerCase()
}

getMappool()

// Socket Events
// Credits: VictimCrasher - https://github.com/VictimCrasher/static/tree/master/WaveTournament
let socket = new ReconnectingWebSocket("ws://" + location.host + "/ws")
socket.onopen = () => { console.log("Successfully Connected"); }
socket.onclose = event => { console.log("Socket Closed Connection: ", event); socket.send("Client Closed!"); }
socket.onerror = error => { console.log("Socket Error: ", error); }

// Team Names
const purpleTeamNameEl = document.getElementById("purpleTeamName")
const blueTeamNameEl = document.getElementById("blueTeamName")
let currentPurpleTeamName, currentBlueTeamName

// Stars
const purpleTeamStarsEl = document.getElementById("purpleTeamStars")
const blueTeamStarsEl = document.getElementById("blueTeamStars")
let currentBestOf, currentFirstTo, currentPurpleTeamStars, currentBlueTeamStars

socket.onmessage = event => {
    const data = JSON.parse(event.data)
    console.log(data)

    // Team Names
    if (currentPurpleTeamName !== data.tourney.manager.teamName.left) {
        currentPurpleTeamName = data.tourney.manager.teamName.left
        purpleTeamNameEl.innerText = currentPurpleTeamName
    }
    if (currentBlueTeamName !== data.tourney.manager.teamName.right) {
        currentBlueTeamName = data.tourney.manager.teamName.right
        blueTeamNameEl.innerText = currentBlueTeamName
    }

    // Stars
    if (currentBestOf !== data.tourney.manager.bestOF ||
        currentPurpleTeamStars !== data.tourney.manager.stars.left ||
        currentBlueTeamStars !== data.tourney.manager.stars.right
    ) {
        // Set current information
        currentBestOf = data.tourney.manager.bestOF
        currentFirstTo = Math.ceil(currentBestOf / 2)
        currentPurpleTeamStars = data.tourney.manager.stars.left
        currentBlueTeamStars = data.tourney.manager.stars.right

        // Reset stars
        purpleTeamStarsEl.innerHTML = ""
        blueTeamStarsEl.innerHTML = ""

        // Create star
        function createStar(starFill) {
            const newStar = document.createElement("div")
            newStar.classList.add("teamStar")
            if (starFill) newStar.classList.add("teamStarFill")
            return newStar
        }

        let i = 0
        for (i; i < currentPurpleTeamStars; i++) purpleTeamStarsEl.append(createStar(true))
        for (i; i < currentFirstTo; i++) purpleTeamStarsEl.append(createStar(false))
        i = 0
        for (i; i < currentBlueTeamStars; i++) blueTeamStarsEl.append(createStar(true))
        for (i; i < currentFirstTo; i++) blueTeamStarsEl.append(createStar(false))
    }
}