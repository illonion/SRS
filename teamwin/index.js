
// Team Information
let allTeams
async function getTeams() {
    const response = await fetch("http://127.0.0.1:24050/SRS/_data/teams.json")
    const teamData = await response.json()
    allTeams = teamData
}
getTeams()

// Get cookie function
function getCookie(name) {
    let nameEQ = name + "="
    let cookies = document.cookie.split(';')
    
    for(let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i].trim()
        if (cookie.indexOf(nameEQ) === 0) {
            return cookie.substring(nameEQ.length, cookie.length)
        }
    }
    return null
}

// Current team
const teamWinColourEl = document.getElementById("teamWinColour")
const teamNameEl = document.getElementById("teamName")
const teamDetailsEl = document.getElementById("teamDetails")
let currentTeamName

setInterval(() => {
    // Only after teams load
    if (!allTeams) return

    // Check team and colour
    let tempTeamName = getCookie("winnerTeamName")
    let teamColour = getCookie("winnerTeamColour")

    if (tempTeamName !== currentTeamName) {
        currentTeamName = tempTeamName
        teamNameEl.innerText = currentTeamName
        teamWinColourEl.setAttribute("src", `static/${teamColour} win.png`)

        for (let i = 0; i < allTeams.length; i++) {
            if (currentTeamName !== allTeams[i].teamName) continue
            teamDetailsEl.innerHTML = ""

            for (let j = 0; j < allTeams[i].players.length; j++) {
                const teamPlayer = document.createElement("div")
                teamPlayer.classList.add("teamPlayer")
                teamPlayer.innerText = allTeams[i].players[j]
                teamDetailsEl.append(teamPlayer)
            }
            break
        }
    }
}, 500)