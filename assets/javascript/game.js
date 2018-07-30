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


//find a room with 0 or 1 players and set it as myRoom. We only want this to be done once so we use the .once instead of .on to create a one time event listener
database.ref().once("value", function (snap) {
    currentData = snap.val()
    //if there are no rooms in the database
    if (currentData == null) {
        $("#gameRoom").text("1")

        myRoom = database.ref("/room1")
        myRoom.set({
            id: '1',
            gameCount:'0',
            player1Score:'0',
            player2Score:'0'
        })
    } else {
        var lastRoomNumber;
        for (var i in snap.val()) {
            //count each room and either join a room or create a new room
            var thisRoom = snap.val()[i]
            nextRoomNumber = Number(thisRoom.id) + Number(1)
            var counter = 0
            //each Room should have format {player1,player2,id,gameCount,player1Score,player2Score}
            for (var n in thisRoom) {
                counter++
            }
            //if counter >5 that means room is full so we pass to the next room
            if (counter > 5) {
                continue
            }
            //if a room isn't full then we set that room as myRoom
            myRoom = database.ref("/room" + thisRoom.id)
            $("#gameRoom").text(thisRoom.id)
            break
        }
        //if all previously created rooms are full then after the loop myRoom will still be null and means we need to create a new room
        if (myRoom == null) {
            $("#gameRoom").text(nextRoomNumber)
            myRoom = database.ref("/room" + nextRoomNumber)
            myRoom.set({
                id: nextRoomNumber,
                gameCount:'0',
                player1Score:'0',
                player2Score:'0'
            })
        }
        //rooms aren't fully deleted so we can track the max amount of simultaneous players ever to play the game by checking how many rooms there are
    }
}).then(function () {
    //once myRoom is set we can add the player to this selected room
    playerRef.on("value", function (snap) {
        if (snap.val()) {
            var con = myRoom.push(true)
            con.onDisconnect().remove();
        }
    })
})

