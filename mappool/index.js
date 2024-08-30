// Import mappool
const roundNameEl = document.getElementById("roundName")
let roundName
let allBeatmaps
let numberOfBans = 2
let numberOfPicks = 12

const purpleTeamPickCardsEl = document.getElementById("purpleTeamPickCards")
const blueTeamPickCardsEl = document.getElementById("blueTeamPickCards")
const allMapsButtonContainerEl = document.getElementById("allMapsButtonContainer")

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
        const pickCardWinnerImage = document.createElement("img")
        pickCardWinnerImage.classList.add("pickCardWinnerImage")
        pickCardWinnerContainer.append(pickCardWinnerImage)

        const pickCardMod = document.createElement("div")
        pickCardMod.classList.add("pickCardMod")
        if (i % 2 === 0) pickCardMod.classList.add("pickCardModPurple")
        else pickCardMod.classList.add("pickCardModBlue")

        pickCard.append(pickCardBackgroundImage, pickCardImageContainer, pickCardWinnerContainer, pickCardMod)
        if (i % 2 === 0) purpleTeamPickCardsEl.append(pickCard)
        else blueTeamPickCardsEl.append(pickCard)
    }

    // Generate buttons
    for (let i = 0 ; i < allBeatmaps.length - 1; i++) {
        const mapsButton = document.createElement("button")
        mapsButton.classList.add("mapsButton")
        mapsButton.innerText = `${allBeatmaps[i].mod.toUpperCase()}${allBeatmaps[i].order}`
        mapsButton.dataset.id = allBeatmaps[i].beatmapID
        mapsButton.setAttribute("id", allBeatmaps[i].beatmapID)
        mapsButton.addEventListener("click", mapClickEvent)
        allMapsButtonContainerEl.append(mapsButton)
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

// Chat Display
const chatDisplayEl = document.getElementById("chatDisplay")
let chatLength = 0

// Beatmap information
let currentMapId, currentMapMd5

// Set winner
let ipcState
let setWinnerAlready = false

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

    // Chat Stuff
    // This is also mostly taken from Victim Crasher: https://github.com/VictimCrasher/static/tree/master/WaveTournament
    if (chatLength !== data.tourney.manager.chat.length) {
        (chatLength === 0 || chatLength > data.tourney.manager.chat.length) ? (chatDisplayEl.innerHTML = "", chatLength = 0) : null;
        const fragment = document.createDocumentFragment();

        for (let i = chatLength; i < data.tourney.manager.chat.length; i++) {
            const chatColour = data.tourney.manager.chat[i].team;

            // Chat message container
            const chatMessageContainer = document.createElement("div")
            chatMessageContainer.classList.add("chatMessageContainer")

            // Time
            const chatDisplayTime = document.createElement("div")
            chatDisplayTime.classList.add("chatDisplayTime")
            chatDisplayTime.innerText = data.tourney.manager.chat[i].time

            // Whole Message
            const chatDisplayWholeMessage = document.createElement("div")
            chatDisplayWholeMessage.classList.add("chatDisplayWholeMessage")  
            
            // Name
            const chatDisplayName = document.createElement("span")
            chatDisplayName.classList.add("chatDisplayName")
            chatDisplayName.classList.add(chatColour)
            chatDisplayName.innerText = data.tourney.manager.chat[i].name + ": ";

            // Message
            const chatDisplayMessage = document.createElement("span")
            chatDisplayMessage.classList.add("chatDisplayMessage")
            chatDisplayMessage.innerText = data.tourney.manager.chat[i].messageBody

            chatDisplayWholeMessage.append(chatDisplayName, chatDisplayMessage)
            chatMessageContainer.append(chatDisplayTime, chatDisplayWholeMessage)
            fragment.append(chatMessageContainer)
        }

        chatDisplayEl.append(fragment)
        chatLen = data.tourney.manager.chat.length;
        chatDisplayEl.scrollTop = chatDisplayEl.scrollHeight;
    }

    // Beatmap stuff
    if (currentMapId !== data.menu.bm.id || currentMapMd5 !== data.menu.bm.md5) {
        currentMapId = data.menu.bm.id
        currentMapMd5 = data.menu.bm.md5

        const currentMap = findMapInMappool(currentMapId)
        if (currentMap && currentAutopick && currentAction === "pick") {
            document.getElementById(currentMapId).click()
        }
    }

    // IPC State
    if (ipcState !== data.tourney.manager.ipcState) {
        ipcState = data.tourney.manager.ipcState
        if (ipcState !== 4) setWinnerAlready = false
    }

    // Setting winner
    if (ipcState === 4 && !setWinnerAlready) {
        setWinnerAlready = true
        let currentRedScore = 0
        let currentBlueScore = 0
        for (let i = 0; i < data.tourney.ipcClients.length; i++) {
            let currentScore = 0
            currentScore = data.tourney.ipcClients[i].gameplay.score * (data.tourney.ipcClients[i].gameplay.mods.str.includes("EZ")? 1.75 : 1)
            if (data.tourney.ipcClients[i].team === "left") currentRedScore += currentScore
            else currentBlueScore += currentScore
        }
        if (currentRedScore > currentBlueScore) {
            currentPickTile.children[2].classList.add("pickCardWinnerPurple")
            currentPickTile.children[2].children[0].setAttribute("src", "static/popsicle-purple.png")
            currentPickTile.children[2].style.opacity = 1
        } else if (currentRedScore < currentBlueScore) {
            currentPickTile.children[2].classList.add("pickCardWinnerBlue")
            currentPickTile.children[2].children[0].setAttribute("src", "static/popsicle-blue.png")
            currentPickTile.children[2].style.opacity = 1
        }
    }
}

// Set next picker
let currentActionTeam = 'red'
let currentAction = 'pick'
const nextPickerTextEl = document.getElementById("nextPickerText")
function setNextAction(colour, action) {
    currentActionTeam = colour
    currentAction = action
    nextPickerTextEl.innerText = `${colour} ${action}`
}

// Toggle autopick
let currentAutopick = false
const toggleAutopickTextEl = document.getElementById("toggleAutopickText")
function toggleAutopick() {
    currentAutopick = !currentAutopick
    if (currentAutopick) toggleAutopickTextEl.innerText = "ON"
    else toggleAutopickTextEl.innerText = "OFF"
}

// Map click event
// ban cards
const purpleTeamBanCardsEl = document.getElementById("purpleTeamBanCards")
const blueTeamBanCardsEl = document.getElementById("blueTeamBanCards")
let currentPickTile
function mapClickEvent() {
    // Get current map
    let currentMapId = this.dataset.id
    let currentMap = findMapInMappool(parseInt(currentMapId))

    // Check if map has been banned or picked before
    const allIdElements = document.querySelectorAll("[data-id]")
    let mapFound = false
    allIdElements.forEach(element => {
        if (element.dataset.id == currentMapId && (element.dataset.action === "ban" || element.dataset.action === "pick")) {
            mapFound = true
            return
        }   
    })
    if (mapFound) return

    // Set a ban
    if (currentAction === "ban") {
        // Set current tile that we will be banning
        let currentCardContainer
        currentCardContainer = (currentActionTeam === "red")? purpleTeamBanCardsEl : blueTeamBanCardsEl

        // Check if first tile has something
        let currentTile
        if (currentCardContainer.children[0].hasAttribute("data-id")) currentTile = currentCardContainer.children[1]
        else currentTile = currentCardContainer.children[0]

        // Set details for the ban
        currentTile.children[1].style.backgroundImage = `url(${currentMap.imgURL})`
        currentTile.dataset.id = this.dataset.id
        currentTile.dataset.action = "ban"
    }

    // Set a pick
    if (currentAction === "pick") {
        // set current tiel that we will be piking
        let currentCardContainer
        currentCardContainer = (currentActionTeam === "red")? purpleTeamPickCardsEl : blueTeamPickCardsEl

        // Check which tile has something
        let currentTile
        for (let i = 0; i < currentCardContainer.childElementCount; i++) {
            if (currentCardContainer.children[i].hasAttribute("data-id")) continue
            currentTile = currentCardContainer.children[i]
            break
        }
        if (!currentTile) return

        // Set details for the pick
        currentTile.children[1].children[0].style.backgroundImage = `url(${currentMap.imgURL})`
        currentTile.children[3].innerText = `${currentMap.mod.toUpperCase()}${currentMap.order}`
        currentTile.children[3].style.opacity = 1
        currentTile.dataset.id = this.dataset.id
        currentTile.dataset.action = "pick"
        currentPickTile = currentTile

        setNextAction
    }

    if (currentActionTeam === "red") setNextAction("blue", currentAction)
    else setNextAction("red", currentAction)
}

// Pick Ban Management
const pickBanManagementEl = document.getElementById("pickBanManagement")
const pickBanManagementSelectEl = document.getElementById("pickBanManagementSelect")
let currentPickBanManagementAction
pickBanManagementSelectEl.addEventListener("change", () => {
    currentPickBanManagementAction = pickBanManagementSelectEl.value

    // Reset to default
    while (pickBanManagementEl.childElementCount > 2) pickBanManagementEl.lastChild.remove()
    pickBanSelectedMap = undefined
    pickBanManagementSelectedPick = undefined

    if (currentPickBanManagementAction === "setBan" || currentPickBanManagementAction === "removeBan") {
        // Create header
        const header = document.createElement("h1")
        header.innerText = "Whose ban?"
        
        // Create Select
        const setBanSelect = document.createElement("select")
        setBanSelect.classList.add("pickBanManagementSelect")
        setBanSelect.setAttribute("id", "setBanSelect")
        for (let i = 0; i < numberOfBans * 2; i++) {
            const setBanOption = document.createElement("option")
            setBanOption.value = `${(i % 2 === 0)? "red" : "blue"}_${Math.ceil((i + 1) / 2)}`
            setBanOption.innerText = `${(i % 2 === 0)? "Red" : "Blue"} Ban ${Math.ceil((i + 1) / 2)}`
            setBanSelect.append(setBanOption)
        }
        setBanSelect.setAttribute("size", setBanSelect.childElementCount)

        if (currentPickBanManagementAction === "setBan") {
            // Which map header
            const whichMapHeader = document.createElement("h1")
            whichMapHeader.innerText = "Which map?"

            // Create buttons
            const whichMapButtonContainer = document.createElement("div")
            whichMapButtonContainer.classList.add("whichMapButtonContainer")
            for (let i = 0; i < allBeatmaps.length; i++) {
                const whichMapButton = document.createElement("button")
                whichMapButton.classList.add("whichMapButton")
                whichMapButton.innerText = `${allBeatmaps[i].mod}${allBeatmaps[i].order}`
                whichMapButton.dataset.id = allBeatmaps[i].beatmapID
                whichMapButton.dataset.action = "pickBanManagementBan"
                whichMapButton.addEventListener("click", changePickBanSelectedMap)
                whichMapButtonContainer.append(whichMapButton)
            }

            pickBanManagementEl.append(header, setBanSelect, whichMapHeader, whichMapButtonContainer)
        } else pickBanManagementEl.append(header, setBanSelect)
    }

    // 
    if (currentPickBanManagementAction === "setPick" || currentPickBanManagementAction === "removePick") {
        // Create header
        const header = document.createElement("h1")
        header.innerText = "Whose pick?"

        // Create Select
        const whosePickButtonContainer = document.createElement("div")
        whosePickButtonContainer.classList.add("whosePickButtonContainer")
        for (let i = 0; i < numberOfPicks; i++) {
            const whosePickButton = document.createElement("button")
            whosePickButton.classList.add("whosePickButton")
            whosePickButton.innerText = `${(i % 2 === 0)? "Red" : "Blue"} Pick ${Math.floor(i / 2) + 1}`
            whosePickButton.setAttribute("id", `${(i % 2 === 0)? "red": "blue"}_${Math.floor(i / 2) + 1}`)
            whosePickButton.addEventListener("click", changePickBanSelectedPick)
            whosePickButtonContainer.append(whosePickButton)
        }


        if (currentPickBanManagementAction === "setPick") {
            // Which map
            // Which map header
            const whichMapHeader = document.createElement("h1")
            whichMapHeader.innerText = "Which map?"

            // Create buttons
            const whichMapButtonContainer = document.createElement("div")
            whichMapButtonContainer.classList.add("whichMapButtonContainer")
            for (let i = 0; i < allBeatmaps.length; i++) {
                const whichMapButton = document.createElement("button")
                whichMapButton.classList.add("whichMapButton")
                whichMapButton.innerText = `${allBeatmaps[i].mod}${allBeatmaps[i].order}`
                whichMapButton.dataset.id = allBeatmaps[i].beatmapID
                whichMapButton.dataset.action = "pickBanManagementBan"
                whichMapButton.addEventListener("click", changePickBanSelectedMap)
                whichMapButtonContainer.append(whichMapButton)
            }

            pickBanManagementEl.append(header, whosePickButtonContainer, whichMapHeader, whichMapButtonContainer)
        }
    }

    if (currentPickBanManagementAction === "setWinner" || currentPickBanManagementAction === "removeWinner") {
        // Create header
        const header = document.createElement("h1")
        header.innerText = "Whose pick?"

        // Create Select
        const whosePickButtonContainer = document.createElement("div")
        whosePickButtonContainer.classList.add("whosePickButtonContainer")
        for (let i = 0; i < numberOfPicks; i++) {
            const whosePickButton = document.createElement("button")
            whosePickButton.classList.add("whosePickButton")
            whosePickButton.innerText = `${(i % 2 === 0)? "Red" : "Blue"} Pick ${Math.floor(i / 2) + 1}`
            whosePickButton.setAttribute("id", `${(i % 2 === 0)? "red": "blue"}_${Math.floor(i / 2) + 1}`)
            whosePickButton.addEventListener("click", changePickBanSelectedPick)
            whosePickButtonContainer.append(whosePickButton)
        }

        if (currentPickBanManagementAction === "setWinner") {
            // Create header 2
            const header2 = document.createElement("h1")
            header2.innerText = "Who who?"

            // Create Select 2
            const setBanSelect = document.createElement("select")
            setBanSelect.classList.add("pickBanManagementSelect")
            setBanSelect.setAttribute("id", "setBanSelect")
            for (let i = 0; i < 2; i++) {
                const setBanOption = document.createElement("option")
                setBanOption.value = `${(i % 2 === 0)? "red" : "blue"}`
                setBanOption.innerText = `${(i % 2 === 0)? "Red" : "Blue"}`
                setBanSelect.append(setBanOption)
            }
            setBanSelect.setAttribute("size", setBanSelect.childElementCount)
            pickBanManagementEl.append(header, whosePickButtonContainer, header2, setBanSelect)
        } else {
            pickBanManagementEl.append(header, whosePickButtonContainer)
        }
    } 

    // Apply changes button
    const applyChangesButton = document.createElement("button")
    applyChangesButton.classList.add("navbarFullSizeButtons")
    applyChangesButton.setAttribute("id", "applyChangesButton")
    applyChangesButton.innerText = "Apply Changes"

    // Add correct function onto the apply changes button
    switch (currentPickBanManagementAction) {
        case "setBan": applyChangesButton.addEventListener("click", applyChangesSetBan); break;
        case "removeBan": applyChangesButton.addEventListener("click", applyChangesRemoveBan); break;
        case "setPick": applyChangesButton.addEventListener("click", applyChangesSetPick); break;
        case "removePick": applyChangesButton.addEventListener("click", applyChangesRemovePick); break;
        case "setWinner": applyChangesButton.addEventListener("click", applyChangesSetWinner); break;
        case "removeWinner": applyChangesButton.addEventListener("click", applyChangesRemoveWinner); break;
    }

    pickBanManagementEl.append(applyChangesButton)
})

// Change Pick Ban Selected Map
const whichMapButtonEls = document.getElementsByClassName("whichMapButton")
let pickBanSelectedMap
function changePickBanSelectedMap() {
    for (let i = 0; i < whichMapButtonEls.length; i++) {
        whichMapButtonEls[i].style.backgroundColor = "transparent"
    }
    pickBanSelectedMap = findMapInMappool(parseInt(this.dataset.id))
    this.style.backgroundColor = "rgb(206,206,206)"
}

// Apply Changes Set Ban
function applyChangesSetBan() {
    // Do checks to see if ban is possible
    if (!pickBanSelectedMap) return
    const setBanSelectElValue = document.getElementById("setBanSelect").value
    if (!setBanSelectElValue) return

    // Split between number and team
    const setBanSelectElValueSplit = setBanSelectElValue.split("_")
 
    // Get container
    const currentContainer = (setBanSelectElValueSplit[0] === "red")?  purpleTeamBanCardsEl : blueTeamBanCardsEl
    const currentTile = currentContainer.children[parseInt(setBanSelectElValueSplit[1] - 1)]

    // Apply information to current tile
    currentTile.dataset.id = pickBanSelectedMap.beatmapID
    currentTile.dataset.action = "ban"
    currentTile.children[1].style.backgroundImage = `url("${pickBanSelectedMap.imgURL}")`
}

// Apply changes remove ban
function applyChangesRemoveBan() {
    // Do checks to see if ban is possible
    const setBanSelectElValue = document.getElementById("setBanSelect").value
    if (!setBanSelectElValue) return

    // Split between number and team
    const setBanSelectElValueSplit = setBanSelectElValue.split("_")

    // Get container
    const currentContainer = (setBanSelectElValueSplit[0] === "red")? purpleTeamBanCardsEl : blueTeamBanCardsEl
    const currentTile = currentContainer.children[parseInt(setBanSelectElValueSplit[1] - 1)]
    
    // Applyi information to current tile
    currentTile.removeAttribute("data-id")
    currentTile.removeAttribute("data-action")
    currentTile.children[1].style.backgroundImage = "none"
}

// Change whose pick
const whosePickButtonEls = document.getElementsByClassName("whosePickButton")
let pickBanManagementSelectedPick
function changePickBanSelectedPick() {
    pickBanManagementSelectedPick = this.id
    for (let i = 0; i < whosePickButtonEls.length; i++) {
        whosePickButtonEls[i].style.backgroundColor = "transparent"
    }
    this.style.backgroundColor = "rgb(206,206,206)"
}

// Apply Changes Set Pick
function applyChangesSetPick() {
    if (!pickBanManagementSelectedPick || !pickBanSelectedMap) return
    const pickBanManagementSelectedPickSplit = pickBanManagementSelectedPick.split("_")

    // Get container
    const currentContainer = (pickBanManagementSelectedPickSplit[0] === "red")? purpleTeamPickCardsEl : blueTeamPickCardsEl
    const currentTile = currentContainer.children[parseInt(pickBanManagementSelectedPickSplit[1] - 1)]

    // Apply information to current tile
    currentTile.dataset.id = pickBanSelectedMap.beatmapID
    currentTile.dataset.action = "pick"
    currentTile.children[1].children[0].style.backgroundImage = `url("${pickBanSelectedMap.imgURL}")`
    currentTile.children[3].innerText = `${pickBanSelectedMap.mod}${pickBanSelectedMap.order}`
    currentTile.children[3].style.opacity =1
}

// Apply changes remove pick
function applyChangesRemovePick() {
    if (!pickBanManagementSelectedPick) return
    const pickBanManagementSelectedPickSplit = pickBanManagementSelectedPick.split("_")

    // Get container
    const currentContainer = (pickBanManagementSelectedPickSplit[0] === "red")? purpleTeamPickCardsEl : blueTeamPickCardsEl
    const currentTile = currentContainer.children[parseInt(pickBanManagementSelectedPickSplit[1] - 1)]

    // Apply information to current tile
    currentTile.removeAttribute("data-id")
    currentTile.removeAttribute("data-action")
    currentTile.children[1].children[0].style.backgroundImage = "none"
    currentTile.children[2].classList.remove("pickCardWinnerPurple", "pickCardWinnerBlue")
    currentTile.children[2].children[0].setAttribute("src", "")
    currentTile.children[2].style.opacity = 0
    currentTile.children[3].innerText = ""
    currentTile.children[3].style.opacity = 0
}

// Apply changes set winner
function applyChangesSetWinner() {
    if (!pickBanManagementSelectedPick) return
    const pickBanManagementSelectedPickSplit = pickBanManagementSelectedPick.split("_")

    // Get container
    const currentContainer = (pickBanManagementSelectedPickSplit[0] === "red")? purpleTeamPickCardsEl : blueTeamPickCardsEl
    const currentTile = currentContainer.children[parseInt(pickBanManagementSelectedPickSplit[1] - 1)]

    // Get winner
    const setBanSelectEl = document.getElementById("setBanSelect")
    if (!setBanSelectEl.value) return

    // Set winner
    currentTile.children[2].classList.add((setBanSelectEl.value === "red")? "pickCardWinnerPurple" : "pickCardWinnerBlue")
    currentTile.children[2].children[0].setAttribute("src", `static/popsicle-${(setBanSelectEl.value === "red")? "purple" : "blue"}.png`)
    currentTile.children[2].style.opacity = 1
}

// Apply changes remove winner
function applyChangesRemoveWinner() {
    if (!pickBanManagementSelectedPick) return
    const pickBanManagementSelectedPickSplit = pickBanManagementSelectedPick.split("_")

    // Get container
    const currentContainer = (pickBanManagementSelectedPickSplit[0] === "red")? purpleTeamPickCardsEl : blueTeamPickCardsEl
    const currentTile = currentContainer.children[parseInt(pickBanManagementSelectedPickSplit[1] - 1)]

    currentTile.children[2].classList.remove("pickCardWinnerPurple", "pickCardWinnerBlue")
    currentTile.children[2].style.opacity = 0
    currentTile.children[2].children[0].removeAttribute("src")
}