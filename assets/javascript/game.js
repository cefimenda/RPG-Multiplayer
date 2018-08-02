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
    endingRound: false



}

var initialRoomData = {
    id: 1,
    gameCount: '0',
    turnComplete: false,
    players: {
        player1: {
            id: 1,
            score: 0,
            selection: false
        },
        player2: {
            id: 2,
            score: 0,
            selection: false
        }
    }
}

//find a room with 0 or 1 players and set it as myRoom. We only want this to be done once so we use the .once instead of .on to create a one time event listener
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
                if (counter > 3) {
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
        setTimeout(actionButtons,1000)
        setActionListener()
    })

    var player1SelectionFirebase = database.ref(game.roomName + "/players/player1/selection")
    player1SelectionFirebase.on("value", function (snap) {
        game.player1Selection = snap.val()
        console.log('player1 selection from firebase: '+snap.val())

        if (game.player1Selection != false) { changeInfo("player1 made their selection") }
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
        console.log('player2 selection from firebase: '+snap.val())
        if (game.player2Selection != false) { changeInfo("player2 made their selection") }
        if (isSelected()) {
            selectionComplete()
        }
    })
    var player2ScoreFirebase = database.ref(game.roomName + "/players/player2/score")
    player2ScoreFirebase.on("value", function (snap) {
        $(".player2Score").text(snap.val())
    })


});

function actionButtons() {
    $(".buttonsRow").remove()
    var row = $("<div>").addClass("row buttonsRow")
    var col1 = $("<div>").addClass("col")
    row.append(col1)
    var col2 = $("<div>").addClass("col")
    row.append(col2)
    var col3 = $("<div>").addClass("col")
    row.append(col3)

    var rockButton = $("<button>").addClass("btn selection")
    rockButton.text("ROCK")
    col1.append(rockButton)

    var paperButton = $("<button>").addClass("btn selection")
    paperButton.text("PAPER")
    col2.append(paperButton)

    var scissorsButton = $("<button>").addClass("btn selection")
    scissorsButton.text("SCISSORS")
    col3.append(scissorsButton)

    $(".player" + game.myPlayerNo + "Area").append(row)
}
function changeInfo(targetText) {
    $(".infoArea").text(targetText)
}
function updateScreen() {
    $("#scores").text(game.player1Score + " - " + game.player2Score)
    $("#round").text(game.round)
}
function updateGame() {
    myRoom.once('value', function (snap) {
        game.turnComplete = snap.val().turnComplete
        game.player1Score = snap.val().players.player1.score
        game.player2Score = snap.val().players.player2.score
        game.player1Selection = snap.val().players.player1.selection
        game.player2Selection = snap.val().players.player2.selection
    });

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
            if (infoCounter > 3) {
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
        game["player" + game.myPlayerNo + "Selection"] = $(this).text()
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
    if (game.winner == game.myPlayerNo) {
        changeInfo("YOU WON!")
        game["player" + game.myPlayerNo + "Score"] += 1
    } else if (game.winner == "tied") {
        changeInfo("IT'S A TIE")
    } else {
        changeInfo("You Lost :( ")
    }
}
function updateFirebase(target) {
    var updates = {}
    if (target == "selection") {
        console.log('my selection is:'+game["player" + game.myPlayerNo + "Selection"])
        updates["/players/player" + game.myPlayerNo + "/selection"] = game["player" + game.myPlayerNo + "Selection"]
    }
    if (target == "score") {
        updates["/players/player" + game.myPlayerNo + "/score"] = game["player" + game.myPlayerNo + "Score"]
    }
    if (target == "gameCount") {
        updates['gameCount'] = game.round
    }
    myRoom.update(updates)
}
function updateFirebaseGameCount() {
    var updates = {
        gameCount: game.round,
    }
    myRoom.update(updates)

}
function newRound() {
    console.log("____________________NEW ROUND _________________________")
    changeInfo('Make your selection!')
    game['player'+game.myPlayerNo+'Selection']=false
    updateFirebase('selection')
}
function isSelected() {
    return (game.player1Selection != false && game.player2Selection != false)
}
function selectionComplete() {

    //check the result of the round
    changeInfo("Results are in, let's see who won...")

    checkResult()
    //display results
    displayResult()
    updateFirebase('score')
    if(game.myPlayerNo == 1){ //we don't want multiple browsers updating the same info - otherwise our event listener attached to gameRound on firebase will fire multiple times
        game.round+=1
        updateFirebase('gameCount')
    }


}


/*
  var gameCountFirebase = database.ref(game.roomName + "/gameCount")
    gameCountFirebase.on("value", function (snap) {
        console.log('new Round')
        $("#round").text(snap.val())
        newRound()
        //Each Round:
        // - update game data from firebase
        updateGame()
        //- display game data
        setTimeout(updateScreen, 200)
        //- get user selection
        actionButtons()
        $(".player" + game.myPlayerNo + "Area").on('click', ".selection", function () {
            game["player" + game.myPlayerNo + "Selection"] = $(this).text()
            $(".buttonsRow").remove()
            //- send user selection to firebase
            updateFirebase('selection')
        })
    })
    //check for changes in player1 selection
    var player1SelectionFirebase = database.ref(game.roomName + "/players/player1/selection")
    player1SelectionFirebase.on("value", function (snap) {
        console.log("firebase player1 selection changed")
        updateGame()
        //must set timeout to make sure that game is updated before moving forward - bc firebase functions are async
        setTimeout(function () {
            if (game.player1Selection != false) { changeInfo("player1 made their selection") }
            if (isSelected()) {
                selectionComplete()
            }
        }, 500)

    })

    //check for changes in player2 selection
    var player2SelectionFirebase = database.ref(game.roomName + "/players/player2/selection")
    player2SelectionFirebase.on("value", function (snap) {
        console.log("firebase player2 selection changed")
        updateGame()
        //must set timeout to make sure that game is updated before moving forward - bc firebase functions are async
        setTimeout(function () {
            if (game.player2Selection != false) { changeInfo("player2 made their selection") }
            if (isSelected()) {
                selectionComplete()
            }
        }, 500)

    })
*/

//__________________________________________________


/*
Before Round:
    -check that there are 2 players in the room. If yes, then start round.

*/


/*
 countPlayers(myRoom).then(function () {
        if (game.playerCount == 2 && game["player" + game.myPlayerNo + "Selection"] === false) {
            changeInfo("All players are in the room! Make your selection")
            actionButtons()
            setActionListener()
        } else if (game.playerCount == 1) {
            changeInfo("You are the only one here, waiting for another player")
            $(".buttonsRow").remove()
        }
    })
    if (game.player1Selection != false && game.player2Selection != false && game.endingRound == false) {
        changeInfo("Selections Made!")
        removeActionListener()
        game.endingRound = true
        checkResult()
        if (game.winner == game.myPlayerNo) {
            changeInfo("YOU WON!")
            game["player" + game.myPlayerNo + "Score"] += 1
            setTimeout(updateFirebase, 3000)
        } else if (game.winner === "tied") {
            changeInfo("IT'S A TIE")
        } else {
            changeInfo("You Lost :(")
            if (game.myPLayerNo == 1) {
                game["player" + 2 + "Score"] += 1
            } else {
                game["player" + 1 + "Score"] += 1
            }
        }
        console.log(game.player1Score)
        console.log(game.player2Score)
        game.round += 1
        game.player1Selection = false
        game.player2Selection = false
        setTimeout(updateFirebase, 3000)
        game.endingRound = false
    }
    console.log(game.myPlayerNo)
*/
