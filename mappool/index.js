// Import mappool
const roundNameEl = document.getElementById("roundName")
let roundName
let allBeatmaps
let numberOfBans = 2
let numberOfPicks = 12

const purpleTeamPickCardsEl = document.getElementById("purpleTeamPickCards")
const blueTeamPickCardsEl = document.getElementById("blueTeamPickCards")

async function getMappool() {
    const response = await fetch("http://127.0.0.1:24050/SRS/_data/beatmaps.json")
    const mappool = await response.json()
    allBeatmaps = mappool.beatmaps
    roundName = mappool.roundName.toLowerCase()
    roundNameEl.innerText = roundName

    // Set number of picks
    if (roundName === "quarterfinals" || roundName === "semifinals") numberOfPicks = 10

    // Generate number of cards
    for (let i = 0; i < numberOfPicks; i++) {
        const pickCard = document.createElement("div")
        pickCard.classList.add("pickCard")

        const pickCardBackgroundImage = document.createElement("img")
        pickCardBackgroundImage.setAttribute("src", `static/${(i % 2 === 0)? "purple" : "blue" }-pick-card.png` )

        const pickCardImageContainer = document.createElement("div")
        pickCardImageContainer.classList.add("pickCardImageContainer")
        const pickCardImage = document.createElement("div")
        pickCardImage.classList.add("pickCardImage")
        pickCardImageContainer.append(pickCardImage)

        const pickCardWinnerContainer = document.createElement("div")
        pickCardWinnerContainer.classList.add("pickCardWinnerContainer")
        const pickCardWinnerImage = document.createElement("div")
        pickCardWinnerImage.classList.add("pickCardWinnerImage")
        pickCardWinnerContainer.append(pickCardWinnerImage)

        const pickCardMod = document.createElement("div")
        pickCardMod.classList.add("pickCardMod")

        pickCard.append(pickCardBackgroundImage, pickCardImageContainer, pickCardWinnerContainer, pickCardMod)
        if (i % 2 === 0) purpleTeamPickCardsEl.append(pickCard)
        else blueTeamPickCardsEl.append(pickCard)
    }
}
getMappool()

// Find map in mappool
const findMapInMappool = beatmapId => allBeatmaps.find(beatmap => beatmap.beatmapID === beatmapId)

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

// Star visible
let starVisible

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
        function createStar(starImage) {
            const newStar = document.createElement("img")
            newStar.setAttribute("src", `../_shared/images/star-${starImage}.png`)
            return newStar
        }

        let i = 0
        for (i; i < currentPurpleTeamStars; i++) purpleTeamStarsEl.append(createStar("purple"))
        for (i; i < currentFirstTo; i++) purpleTeamStarsEl.append(createStar("none"))
        i = 0
        for (i; i < currentBlueTeamStars; i++) blueTeamStarsEl.append(createStar("blue"))
        for (i; i < currentFirstTo; i++) blueTeamStarsEl.append(createStar("none"))
    }

    // Star visible
    if (starVisible !== data.tourney.manager.bools.starVisible) {
        starVisible = data.tourney.manager.bools.starVisible

        if (starVisible) {
            purpleTeamStarsEl.style.opacity = 1
            blueTeamStarsEl.style.opacity = 1
        } else {
            purpleTeamStarsEl.style.opacity = 0
            blueTeamStarsEl.style.opacity = 0
        }
    }
}