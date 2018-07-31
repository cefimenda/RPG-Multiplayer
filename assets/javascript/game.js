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

var game = {
    roomName:null,
    round: 0,
    player1Score: 0,
    player2Score: 0,
    myPlayerNo: 0
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
        myRoom.set({
            id: '1',
            gameCount: '0',
            players: {
                player1: {
                    id: 1,
                    key: null,
                    score: 0,
                },
                player2: {
                    id: 2,
                    key: null,
                    score: 0,
                }
            }
        })
    } else {
        for (var i in snap.val()) {
            //count each room and either join a room or create a new room
            var thisRoom = snap.val()[i]
            nextRoomNumber = Number(thisRoom.id) + Number(1)
            for (var n in thisRoom.players) {
                var counter=0
                for (var j in thisRoom.players[n]){
                    counter++
                }
                if(counter>2){
                    continue
                }else{
                    game.myPlayerNo=thisRoom.players[n].id
                    myRoom = database.ref("/room" + thisRoom.id)
                    $("#gameRoom").text(thisRoom.id)
                    game.roomName = "room"+thisRoom.id
                    break
                }
            }
        }
        //if all previously created rooms are full then after the loop myRoom will still be null and means we need to create a new room
        if (myRoom == null) {
            $("#gameRoom").text(nextRoomNumber)
            game.roomName = "room"+nextRoomNumber
            game.myPlayerNo = 1
            myRoom = database.ref("/room" + nextRoomNumber)
            myRoom.set({
                id: nextRoomNumber,
                gameCount: '0',
                players: {
                    player1: {
                        id: 1,
                        key: null,
                        score: 0,
                    },
                    player2: {
                        id: 2,
                        key: null,
                        score: 0,
                    }
                }
            })
        }
        //rooms aren't fully deleted so we can track the max amount of simultaneous players ever to play the game by checking how many rooms there are
    }
}).then(function () {
    //once myRoom is set we can add the player to this selected room
    playerRef.on("value", function (snap) {

        if (snap.val()) {
            var myPlayerRef = database.ref("/"+game.roomName+"/players/player"+game.myPlayerNo)
            var con = myPlayerRef.push(true)
            var key =con.key
            game.key = key
            con.onDisconnect().remove();
        }
    });
    myRoom.on('value', function (snap) {
        game.player1Score = snap.val().players.player1.score
        game.player2Score = snap.val().players.player2.score
        game.round = snap.val().gameCount
        $("#scores").text(game.player1Score + " - " + game.player2Score)
        $("#round").text(game.round)
    });
    console.log(game.myPlayerNo)
})

