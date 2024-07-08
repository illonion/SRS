// Import mappool
const roundNameEl = document.getElementById("roundName")
let allBeatmaps
async function getMappool() {
    const response = await fetch("http://127.0.0.1:24050/SRS/_data/beatmaps.json")
    const mappool = await response.json()
    allBeatmaps = mappool.beatmaps
    roundNameEl.innerText = mappool.roundName.toLowerCase()
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

// Scores
const purpleMovingScoreBarEl = document.getElementById("purpleMovingScoreBar")
const blueMovingScoreBarEl = document.getElementById("blueMovingScoreBar")
let numberOfClients, currentPurpleTeamScore, currentBlueTeamScore, currentScoreDelta
const scoreAnimations = {
    purpleTeamScore: new CountUp("purpleTeamScore", 0, 0, 0, 0.2, { useEasing: true, useGrouping: true, separator: ", ", decimal: "." }),
    blueTeamScore: new CountUp("blueTeamScore", 0, 0, 0, 0.2, { useEasing: true, useGrouping: true, separator: ", ", decimal: "." }),
}

// Now Playing Information
const nowPlayingBannerEl = document.getElementById("nowPlayingBanner")
const statsFrameBannerEl = document.getElementById("statsFrameBanner")
const titleSongArtistEl = document.getElementById("titleSongArtist")
let currentMapId, currentMd5, foundMapInMappool = false
// Stats
const songStatsSRNumberEl = document.getElementById("songStatsSRNumber")
const songStatsCSNumberEl = document.getElementById("songStatsCSNumber")
const songStatsBPMNumberEl = document.getElementById("songStatsBPMNumber")
const songStatsARNumberEl = document.getElementById("songStatsARNumber")
const songStatsHPNumberEl = document.getElementById("songStatsHPNumber")
const songStatsLENGTHNumberEl = document.getElementById("songStatsLENGTHNumber")
let currentSongStatsSR, currentSongStatsCS, currentSongStatsAR, currentSongStatsHP, currentSongStatsLENGTH
let currentSongStatsBPMCommon, currentSongStatsBPMMin, currentSongStatsBPMMax

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

    // Number of clients
    if (numberOfClients !== data.tourney.ipcClients.length) numberOfClients = data.tourney.ipcClients.length

    // Set scores
    currentPurpleTeamScore = 0
    currentBlueTeamScore = 0
    currentScoreDelta = 0
    for (let i = 0; i < numberOfClients; i++) {
        let currentGameplay = data.tourney.ipcClients[i].gameplay
        let currentTeamScore = currentGameplay.score * (currentGameplay.mods.str.includes("EZ")? 1.75 : 1)
        if (data.tourney.ipcClients[i].team === "left") currentPurpleTeamScore += currentTeamScore
        else currentBlueTeamScore += currentTeamScore
    }
    scoreAnimations.purpleTeamScore.update(currentPurpleTeamScore)
    scoreAnimations.blueTeamScore.update(currentBlueTeamScore)
    currentScoreDelta = Math.abs(currentPurpleTeamScore - currentBlueTeamScore)

    // Set widths of bar
    const movingScoreBarDifferencePercent = Math.min(currentScoreDelta / 1500000, 1)
    let movingScoreBarRectangleWidth = Math.min(Math.pow(movingScoreBarDifferencePercent, 0.5) * 0.8 * 400, 400)
    let currentScoreBar = (currentPurpleTeamName > currentBlueTeamScore)? purpleMovingScoreBarEl : blueMovingScoreBarEl
    let otherScoreBar = (currentPurpleTeamName > currentBlueTeamScore)? blueMovingScoreBarEl : purpleMovingScoreBarEl
    currentScoreBar.style.width = movingScoreBarRectangleWidth
    otherScoreBar.style.width = "0px"

    // Now Playing
    if ((currentMapId !== data.menu.bm.id || currentMd5 !== data.menu.bm.md5) && allBeatmaps) {
        currentMapId = data.menu.bm.id
        currentMd5 = data.menu.bm.md5
        foundMapInMappool = false

        nowPlayingBannerEl.style.backgroundImage = `url("https://assets.ppy.sh/beatmaps/${data.menu.bm.set}/covers/cover.jpg")`
        statsFrameBannerEl.style.backgroundImage = `url("https://assets.ppy.sh/beatmaps/${data.menu.bm.set}/covers/cover.jpg")`
        titleSongArtistEl.innerText = `${data.menu.bm.metadata.artist} - ${data.menu.bm.metadata.title} [${data.menu.bm.metadata.difficulty}]`.toUpperCase()
        if (titleSongArtistEl.getBoundingClientRect().width > 500) titleSongArtistEl.classList.add("titleSongArtistWrap")
        else titleSongArtistEl.classList.remove("titleSongArtistWrap")

        const currentMap = findMapInMappool(currentMapId)
        if (currentMap) {
            foundMapInMappool = true

            currentSongStatsSR = Math.round(parseFloat(currentMap.difficultyrating * 100)) / 100
            currentSongStatsCS = Math.round(parseFloat(currentMap.cs * 10)) / 10
            currentSongStatsBPMCommon = Math.round(parseFloat(currentMap.bpm * 10 )) / 10
            currentSongStatsAR = Math.round(parseFloat(currentMap.ar * 10)) / 10
            currentSongStatsHP = Math.round(parseFloat(currentMap.hp * 10)) / 10
            currentSongStatsLENGTH = parseInt(currentMap.songLength)

            songStatsSRNumberEl.innerText = currentSongStatsSR
            songStatsCSNumberEl.innerText = currentSongStatsCS
            songStatsBPMNumberEl.innerText = currentSongStatsBPMCommon
            songStatsARNumberEl.innerText = currentSongStatsAR
            songStatsHPNumberEl.innerText = currentSongStatsHP
            songStatsLENGTHNumberEl.innerText = displayTime(currentSongStatsLENGTH)
        }
    }

    // If map found in mappool
    if (!foundMapInMappool) {
        if (currentSongStatsSR !== data.menu.bm.stats.fullSR) {
            currentSongStatsSR = data.menu.bm.stats.fullSR
            songStatsSRNumberEl.innerText = currentSongStatsSR
        }
        if (currentSongStatsCS !== data.menu.bm.stats.CS) {
            currentSongStatsCS = data.menu.bm.stats.CS
            songStatsCSNumberEl.innerText = currentSongStatsCS
        } 
        if (currentSongStatsBPMCommon !== data.menu.bm.stats.BPM.common ||
            currentSongStatsBPMMin !== data.menu.bm.stats.BPM.min ||
            currentSongStatsBPMMax !== data.menu.bm.stats.BPM.max
        ) {
            currentSongStatsBPMCommon = data.menu.bm.stats.BPM.common
            currentSongStatsBPMMin = data.menu.bm.stats.BPM.min
            currentSongStatsBPMMax = data.menu.bm.stats.BPM.max

            if (currentSongStatsBPMMin === currentSongStatsBPMMax) {
                songStatsBPMNumberEl.innerText = currentSongStatsBPMCommon
            } else {
                songStatsBPMNumberEl.innerText = `${currentSongStatsBPMMin} - ${currentSongStatsBPMMax} (${currentSongStatsBPMCommon})`
            }
        }
        if (currentSongStatsAR !== data.menu.bm.stats.AR) {
            currentSongStatsAR = data.menu.bm.stats.AR
            songStatsARNumberEl.innerText = currentSongStatsAR
        } 
        if (currentSongStatsHP !== data.menu.bm.stats.HP) {
            currentSongStatsHP = data.menu.bm.stats.HP
            songStatsHPNumberEl.innerText = currentSongStatsHP
        } 
        if (currentSongStatsLENGTH !== data.menu.bm.time.full / 1000) {
            currentSongStatsLENGTH = data.menu.bm.time.full / 1000
            songStatsLENGTHNumberEl.innerText = displayTime(Math.round(currentSongStatsLENGTH))
        }
    } 
}

function displayTime(seconds) {
    let minutes = Math.floor(seconds / 60)
    let secondsCounter = (seconds % 60).toString().padStart(2, '0')
    return `${minutes}:${secondsCounter}`
}