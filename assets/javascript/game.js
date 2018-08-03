// Initialize Firebase
var config = {
    apiKey: "AIzaSyDumiPfjpu-zo1g77ZE0aCeuqrvJg8-6QU",
    authDomain: "rpg-multiplayer-8bf05.firebaseapp.com",
    databaseURL: "https://rpg-multiplayer-8bf05.firebaseio.com",
    projectId: "rpg-multiplayer-8bf05",
    storageBucket: "",
    messagingSenderId: "994816668381"
};
firebase.initializeApp(config);
var database = firebase.database();
var currentData;
var playerRef = database.ref(".info/connected");
var myRoom;
var nextRoomNumber = null

var game = {
    roomName: null,
    round: 0,
    player1Score: 0,
    player2Score: 0,
    myPlayerNo: 0,
    player1Selection: null,
    player2Selection: null,
    winner: null,
    key: null,
    playerCount: null,
    turnComplete: false,
    endingRound: false,
    waitingForPlayer: false,
    oppNo:function(){
        if (game.myPlayerNo == 1) {
            var oppNo = 2
        } else {
            var oppNo = 1
        }
        return oppNo
    }
}

var initialRoomData = {
    id: 1,
    gameCount: '0',
    turnComplete: false,
    players: {
        player1: {
            id: 1,
            score: 0,
            selection: false,
            name:"PLAYER 1"
        },
        player2: {
            id: 2,
            score: 0,
            selection: false,
            name:"PLAYER 2"
        }
    }
}

$(function(){
    $(".startGame").on('click',function(){
        event.preventDefault()
        game.name = $('.username').val()
        $(".gameArea").removeClass("d-none")
        $('.usernameRow').addClass('d-none')
        database.ref().once("value", function (snap) {
            currentData = snap.val()
            //if there are no rooms in the database
            if (currentData == null) {
                game.myPlayerNo = 1
                $("#gameRoom").text("1")
                myRoom = database.ref("/room1")
                game.roomName = 'room1'
                myRoom.set(initialRoomData)
            } else {
                for (var i in snap.val()) {
                    //count each room and either join a room or create a new room
                    var thisRoom = snap.val()[i]
                    nextRoomNumber = Number(thisRoom.id) + Number(1)
                    for (var n in thisRoom.players) {
                        var counter = 0
                        for (var j in thisRoom.players[n]) {
                            counter++
                        }
                        if (counter > 4) {
                            continue
                        } else {
                            game.myPlayerNo = thisRoom.players[n].id
                            myRoom = database.ref("/room" + thisRoom.id)
                            $("#gameRoom").text(thisRoom.id)
                            game.roomName = "room" + thisRoom.id
                            break
                        }
                    }
                }
                //if all previously created rooms are full then after the loop myRoom will still be null and means we need to create a new room
                if (myRoom == null) {
                    $("#gameRoom").text(nextRoomNumber)
                    game.roomName = "room" + nextRoomNumber
                    game.myPlayerNo = 1
                    myRoom = database.ref("/room" + nextRoomNumber)
                    initialRoomData.id = nextRoomNumber
                    myRoom.set(initialRoomData)
                }
                //rooms aren't fully deleted so we can track the max amount of simultaneous players ever to play the game by checking how many rooms there are
            }
        }).then(function () {
            //once myRoom is set we can add the player to this selected room
            playerRef.on("value", function (snap) {
                if (snap.val()) {
                    var myPlayerRef = database.ref("/" + game.roomName + "/players/player" + game.myPlayerNo)
                    var con = myPlayerRef.push(true)
                    var key = con.key
                    game.key = key
                    con.onDisconnect().remove();
                }
            });
            //gameCount value change indicates a new round has begun.
            var gameCountFirebase = database.ref(game.roomName + "/gameCount")
            gameCountFirebase.on("value", function (snap) {
                newRound()
                game.round = Number(snap.val())
                $("#round").text(snap.val())
                setTimeout(actionButtons, 500)
                setActionListener()
            })
            //check for changes in player1 selection
            var player1SelectionFirebase = database.ref(game.roomName + "/players/player1/selection")
            player1SelectionFirebase.on("value", function (snap) {
                game.player1Selection = snap.val()
        
                if (game.player1Selection != false && !game.waitingForPlayer) { changeInfo(game.player1Name+" made their selection, waiting for "+game.player2Name) }
                if (isSelected()) {
                    selectionComplete()
                }
            })
            var player1ScoreFirebase = database.ref(game.roomName + "/players/player1/score")
            player1ScoreFirebase.on("value", function (snap) {
                $(".player1Score").text(snap.val())
        
            })
        
            //check for changes in player2 selection
            var player2SelectionFirebase = database.ref(game.roomName + "/players/player2/selection")
            player2SelectionFirebase.on("value", function (snap) {
                game.player2Selection = snap.val()
                if (game.player2Selection != false && !game.waitingForPlayer) { changeInfo(game.player2Name+" made their selection, waiting for "+game.player1Name) }
                if (isSelected()) {
                    selectionComplete()
                }
            })
            var player2ScoreFirebase = database.ref(game.roomName + "/players/player2/score")
            player2ScoreFirebase.on("value", function (snap) {
                $(".player2Score").text(snap.val())
            })

            //Naming Players
            var player1NameFirebase = database.ref(game.roomName+"/players/player1/name")
            player1NameFirebase.on("value",function(snap){
                game.player1Name = snap.val()
                $(".player1Name").text(snap.val())
            })
            var player2NameFirebase = database.ref(game.roomName+"/players/player2/name")
            player2NameFirebase.on("value",function(snap){
                game.player2Name = snap.val()
                $(".player2Name").text(snap.val())
            })
            var updates = {}
            updates["/players/player"+game.myPlayerNo+"/name"]=game.name
            myRoom.update(updates)

            //handling disconnects
            //on every action taken we want to check if both players are still in the room and act if this isn't the case
            myRoom.on("value", function (snap) {
                countPlayers(myRoom).then(function () {
                    if (game.playerCount < 2) {
                        resetGame()
                        changeInfo('Waiting for another player to join your room...')
                        $(".selectionImage"+game.oppNo()).remove()
                        removeActionListener()
                        $(".buttonsRow").remove()
                        setTimeout(function () {
                            $(".buttonsRow").remove()
                        }, 600)
                        var updates = {}
                        updates["/players/player"+game.oppNo()+"/name"]="PLAYER"+game.oppNo()
                        myRoom.update(updates)
                        game.waitingForPlayer = true
                    } else if (game.playerCount >= 2 && game.waitingForPlayer) {
                        resetGame()
                        game.waitingForPlayer = false
                        newRound()
                        setTimeout(actionButtons, 500)
                        setActionListener()
                    }
                })
            })

            
        });
    })
})
//find a room with 0 or 1 players and set it as myRoom. We only want this to be done once so we use the .once instead of .on to create a one time event listener

function createButton(selection) {
    var button = $("<img>").addClass("img-thumbnail selection " + selection)
    button.css({
        width: '50px',
        height: '50px'
    })
    button.attr('src', 'assets/images/' + selection.toLowerCase() + '.png')
    button.attr('data', selection)
    return button
}

function actionButtons() {
    $(".buttonsRow").remove()
    var row = $("<div>").addClass("row mx-0 buttonsRow")
    var col1 = $("<div>").addClass("col my-2 p-0 mx-0")
    row.append(col1)
    var col2 = $("<div>").addClass("col my-2 p-0 mx-0")
    row.append(col2)
    var col3 = $("<div>").addClass("col my-2 p-0 mx-0")
    row.append(col3)

    col1.append(createButton('ROCK'))
    col2.append(createButton('PAPER'))
    col3.append(createButton('SCISSORS'))

    $(".player" + game.myPlayerNo + "Area").append(row)
}
function changeInfo(targetText) {
    $(".infoArea").text(targetText)
}
function updateScreen() {
    $("#scores").text(game.player1Score + " - " + game.player2Score)
    $("#round").text(game.round)
}
function resetGame() {
    game.round = 0
    game.player1Score = 0
    game.player2Score = 0
    game.player1Selection = false
    game.player2Selection = false
    updateFirebase('selection')
    updateFirebase('score')
    updateFirebase('scoreOpp')
    updateFirebase('gameCount')
}
function countPlayers(room) {
    var count = room.once("value", function (snap) {
        var counter = 0
        for (var i in snap.val().players) {
            var playerInfo = snap.val().players[i];
            var infoCounter = 0
            for (var n in playerInfo) {
                infoCounter += 1
            }
            if (infoCounter > 4) {
                counter++
            }
        }
        game.playerCount = counter
        return counter
    })
    return count
}
function setActionListener() {
    $(".player" + game.myPlayerNo + "Area").on('click', ".selection", function () {
        game["player" + game.myPlayerNo + "Selection"] = $(this).attr('data')
        $(".buttonsRow").remove()
        //- send user selection to firebase
        updateFirebase('selection')
        removeActionListener()
    })
}
function removeActionListener() {
    $(".player" + game.myPlayerNo + "Area").off('click', ".selection")
}
function checkResult() {
    if (game.player1Selection == game.player2Selection) {
        game.winner = "tied"
    }
    else if ((game.player1Selection == 'ROCK' && game.player2Selection == "SCISSORS") || (game.player1Selection == "PAPER" && game.player2Selection == "ROCK") || (game.player1Selection == "SCISSORS" && game.player2Selection == "PAPER")) {
        game.winner = "1"
    } else {
        game.winner = "2"
    }
}
function displayResult() {
    addImage(game['player'+game.myPlayerNo+'Selection'],game.myPlayerNo)
    addImage(game['player'+game.oppNo()+'Selection'],game.oppNo())
    if (game.winner == game.myPlayerNo) {
        changeInfo("YOU WON!")
        game["player" + game.myPlayerNo + "Score"] += 1
    } else if (game.winner == "tied") {
        changeInfo("IT'S A TIE")
    } else {
        changeInfo("You Lost")
    }
}
function updateFirebase(target) {
    var updates = {}
    if (target == "selection") {
        updates["/players/player" + game.myPlayerNo + "/selection"] = game["player" + game.myPlayerNo + "Selection"]
    }
    if (target == "score") {
        updates["/players/player" + game.myPlayerNo + "/score"] = game["player" + game.myPlayerNo + "Score"]
    }
    if (target == "gameCount") {
        updates['gameCount'] = game.round
    }
    if (target == "scoreOpp") {
        var oppNo = game.oppNo()
        updates["/players/player" + oppNo + "/score"] = game["player" + oppNo + "Score"]
    }
    myRoom.update(updates)
}

function newRound() {
    console.log("____________________NEW ROUND _________________________")
    changeInfo('Make your selection!')
    game['player' + game.myPlayerNo + 'Selection'] = false
    updateFirebase('selection')
    addImage('ROCK',game.myPlayerNo)
    addImage('ROCK',game.oppNo())
}
function isSelected() {
    return (game.player1Selection != false && game.player2Selection != false)
}
function selectionComplete() {

    //check the result of the round
    changeInfo("Results are in, let's see who won...")

    checkResult()
    //display results
    setTimeout(function(){
        displayResult()
        updateFirebase('score')
        if (game.myPlayerNo == 1) { //we don't want multiple browsers updating the same info - otherwise our event listener attached to gameRound on firebase will fire multiple times
            setTimeout(function () {
                game.round += 1
                updateFirebase('gameCount')
            }, 3000)
        }
        clearInterval(randInterv)
        $(".middleText").text('VS')
    },3000)
    var randInterv = setInterval(function(){
        var mid = $(".middleText")
        var text = mid.text()
        if (text == 'VS'){
            mid.text('3')
            text='3'
        }else{
            mid.text(Number(text)-1)
        }
        if (mid.text()=='0'){
            mid.text('VS')
        }
    },800)

}
function addImage(selection, playerNo) {
    $(".selectionImage"+playerNo).remove()
    var area = $(".player" + playerNo + "Area")
    var img = $("<img>").addClass("mx-auto my-2 selectionImage"+playerNo)
    img.css({
        height: '200px',
        width: '200px'
    })
    img.attr('src', 'assets/images/' + selection.toLowerCase() + '.png')
    if (playerNo == 1) {
        img.css({
            'transform': 'rotate(90deg)'
        })
    } else {
        img.addClass('flipped')
    }
    area.append(img)
}