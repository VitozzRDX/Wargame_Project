var express = require('express');
var app = express();
var server = require('http').Server(app);

var cookieParser = require('cookie-parser');        // with it we can use req.cookies.cookieName
var cookie = require('cookie');                     // with it we can ues cookie.parse
var cookieUserNameIsHere;
var io = require('socket.io')(server);

var Room = require('./notpublic/room');
var Game = require('./notpublic/game');
var User = require('./notpublic/user');
// let tableCounter = require('./notpublic/counters');

// console.log(tableCounter)
var rooms = [];
var roomsListtoSend = [];
var allsockets = {};
var allUsers = {};
var allsockets2 = {};
var allGames = {};

//------------------------------------------------------------------------------------------------------------
let scenariosList = {
    'Last Ally, Last Victory': ['Nazi', 'Axis'],
    'undefined1': [],
    'undefined2': []
};
//------------------------------------------------------------------------------------------------------------
app.use(cookieParser());

app.use(function (req, res, next) {
    console.log('we are inside app.use . we got req with :')
    var cookieUserName = req.cookies.userName;
    console.log(cookieUserName)
    console.log('')
    if (cookieUserName === undefined) {                // On this site we are for the first time ! (or it was long ago.)
        cookieUserNameIsHere = false
    }
    else {
        cookieUserNameIsHere = true
    }
    next();
});

app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/public/assets'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/something.html', function (req, res) {
    res.sendFile(__dirname + '/public/something.html');
});

io.on('connection', function (socket) {
    // io.sockets.connected is a Socket.io internal array of the sockets currently connected to the server. use it !
    console.log('we got connection !')

    if (socket.handshake.headers.cookie) {
        console.log('socket.handshake.headers.cookie is here :')

        var cookies = cookie.parse(socket.handshake.headers.cookie)

        console.log(cookies.userName)

        allsockets2[cookies.userName] = socket;
    };

    allsockets[socket.id] = socket;

    if (cookieUserNameIsHere) {
        console.log('cookieUserNameIsHere so allsockets2 is:')
        allsockets2[cookies.userName] = socket;
        console.log(Object.keys(allsockets2));
        socket.username = cookies.userName;
    }

    socket.emit('connected!', roomsListtoSend);    // new connection should get all existing rooms

    socket.on('loginMePlease', function (username) {
        // chek Username . we can even check from Database
        console.log("User :")
        console.log(username)
        console.log("are inside 'loginMePlease'");

        socket.username = username;

        allsockets2[username] = socket;

        if (!allUsers[username]) {                           // it could be situation when cookie with UserName was destroyed but user still here ,to avoid it let's check
            var user = new User(username);
            allUsers[socket.username] = user;
        } else {
            var user = allUsers[socket.username];
        }

        if (user.startedGameArray) {
            socket.emit("showYourGames", user.startedGameArray)
        }
        if (user.inGame) {
            console.log("our User is .inGame");

            var game = allGames[user.gameID];
            if (game.gamesession.length < 2) {
                game.gamesession.push(socket);
            }
            if (game.gamesession.length === 2) {

                // (() => {  // consoles
                //     console.log("we are still inside 'loginMePlease' and our User is :");
                //     console.log(user);
                //     console.log("... and we checked if this User is .inGame and game.gamesession.length = 2 , so below is game.players :")
                //     console.log(game.players);
                //     console.log("we are sending message with game.state :");
                //     console.log(game.state);
                // })();

                game.gamesession.forEach(item => item.emit("startGame", game.state))   //game.players// {players:game.players,whoseTurnIsItNow:game.players.host,phase:"moving"};

            }
            user.inGame = false;
        }

        socket.emit('loginConfirmed');

        //+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

        socket.on("continueGame", function (data) {       //data =  [roomID,oppUsername]
            user.inGame = true;
            socket.emit("WeAreSendingYouToOtherPage");
        });

        socket.on('joinroom', function (data) {       //(data=[roomID,username,])

            console.log("we got 'joinroom' event data below (data=[roomID,username,]) :",data);
            console.log("our username is :",socket.username);

            var roomtojoin = rooms.find(item => item.roomID === data[0]);   // find room with given ID //

            console.log("we found our room bY its ID and its host is :",roomtojoin.hostusername)

            var oppsocket = allsockets2[data[1]];

            console.log("let us find oppuser. It is :",oppsocket.username)

            if (socket.username !== roomtojoin.hostusername) {        // not Host ?
                console.log("we checked if socket.username was not the same as  roomtojoin.host and emitted changeyourbutton event")
                oppsocket.emit("changeyourbutton", [data[0], socket.username])
            };

            roomtojoin.listofplayers.push(socket.username);

            console.log("we pushed socket.username to roomtojoin.listofplayers and now it is :",roomtojoin.listofplayers);

            if (roomtojoin.listofplayers.length == 2) {

                console.log("we checked room's length and it is full")
                var game = new Game();
                console.log("created new Game");
//------------------------------------------------------------------------------------------------------------
                // let scenario = roomtojoin.scenarioName ;
                // let arrSides = scenariosList[scenario] ;
                // for (let side of arrSides) {
                //     for (let name in roomtojoin.playersSides) {

                //     }
                //    if (roomtojoin.sidesPlayers[i] === socket.username ) {

                //    }
                // }

                // //game.setFirstPlayer()
                game.setScenario(roomtojoin.scenarioName)
//------------------------------------------------------------------------------------------------------------
                allGames[game.ID] = game
                var oppUser = allUsers[oppsocket.username];

                console.log("found oppUser . It is :",oppUser)
                console.log("... when our User still :",user)

                oppUser.inGame = true;
                oppUser.gameID = game.ID
                oppUser.startedGameArray = [data[0], socket.username]

                user.inGame = true;
                user.gameID = game.ID
                user.startedGameArray = [data[0], oppsocket.username]

                // (() => {// consoles
                // console.log("let us check a hoster of room. It still should be same : ")
                // console.log(data[1]);
                // console.log(roomtojoin.hostusername);
                // console.log("");
                // console.log("let us check if connected right now socket is equal to room's hoster")
                // console.log(socket.username);
                // console.log(data[1])
                // })();

                if (socket.username !== roomtojoin.hostusername) { //data[1]) {        // not Host ?
                    console.log("no, socket is not equal to room's hoster nae");
                    console.log("...")
                    var guestusername = socket.username
                } else {
                    console.log("yes, socket is equal to room's hoster nae");
                    console.log("...")
                    var guestusername = oppsocket.username
                }

                let hostusername = roomtojoin.hostusername

                game.players = { guest: guestusername, host: roomtojoin.hostusername }
                game.sides[guestusername] = roomtojoin.freeSide;
                game.sides[hostusername] = roomtojoin.chosenSide ;

                console.log("server creating counters :")
                game._createCounters(game.scenario.setOfOptionsforCounters)

                game.state = {
                    players: game.players, 
                    whoseTurnIsItNow: game.scenario.startingSide,
                    phase: 'RallyPhase', 
                    setOfOptionsforCounters : game.classesTable.parametersForClient,
                    //setOfOptionsforCounters: game.scenario.setOfOptionsforCounters,
                    sides : game.sides,
                    scenario : game.scenario,
                }; 

                var arr = [socket, oppsocket]
                arr.forEach(item => item.emit("WeAreSendingYouToOtherPage"))
            }
        });

        socket.on('choosedScenarioAndSide', function (data) {   //  [ "Last Ally, Last Victory", "Nazi" ]
            let choosenScenario = data[0];
            let chosenSide = data[1]
            let username = socket.username;

            var room = new Room(socket);
            room.chosenSide = chosenSide
            
//-----------------------------------------------------------------------------------------------------------
            let sidesArr = scenariosList[choosenScenario] ; // ['Nazi', 'Axis']

            for (let i of sidesArr) {
                if (i !== chosenSide) {
                    room.freeSide = i ;
                }
            }
//-----------------------------------------------------------------------------------------------------------

            room.sidesPlayers[chosenSide] = username      //

            room.playersSides[username] =  chosenSide; // room.setPlayersSides(username, data[1])

            room.scenarioName = choosenScenario;

//-----------------------------------------------------------------------------------------------------------
            rooms.push(room);

            console.log('room')
            console.log(room)

            for (var i in rooms) {                                                                          // refactor , cause itis a bug
                roomsListtoSend.push({
                    hostusername: rooms[i].hostusername,
                    roomID: rooms[i].roomID,
                })
            };

            socket.broadcast.emit('roomCreated', [socket.username, room.roomID])
            socket.emit("iCreatedRoom", room.roomID)
        });

        //------------------------------------------------------------------------------------------
        socket.on('getScenariosList', () => {
            socket.emit('catchScenariosList', scenariosList)
        });
        //------------------------------------------------------------------------------------------

        //+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

        socket.on('endPhase', function () {
            console.log("​'endPhase'", 'endPhase')
            game.switchPhase()
            let oppusersocket = allsockets2[user.startedGameArray[1]];
            oppusersocket.emit('endPhase')
        });

        socket.on('endTurn', function () {
            console.log('')
            console.log('got End Turn Message')
            game.endTurn()

            let oppusersocket = allsockets2[user.startedGameArray[1]];
            oppusersocket.emit('endTurn')
        });

        socket.on('endRally', function () {
            console.log('got endRally message')

            if (game.rallyPhaseStatus === 'ended') {
                game.switchPhase()
                game.rallyPhaseStatus = undefined;

            } else {
                game.rallyPhaseStatus = 'ended'
            }

            let oppusersocket = allsockets2[user.startedGameArray[1]];
            oppusersocket.emit('endRally') // if ended - > endPhase
        });

        socket.on("moveTo", function (data) {       // [this.mySel.parentCounterObj.ID,this.hexClicked]

            console.log(" from socket ... ");
            console.log(socket.username);
            console.log("... got moveTo message . Launching game.processOppsClick ");
            var oppusersocket = allsockets2[user.startedGameArray[1]];
            console.log("allsockets2 is :");
            console.log(Object.keys(allsockets2))

            game.processOppsClick(data, oppusersocket)
        });

        socket.on("turnTo", function (data) {    //[this.mySel.parentCounterObj.ID,'-=60',newSector]
            console.log(" socket ");
            console.log(socket.username);
            console.log("... emitted turnTo message");
            var oppusersocket = allsockets2[user.startedGameArray[1]];
            game.processTurnClicks(data, oppusersocket)
        });

        socket.on("pressedKey32", function () {     //pausedforFiring
            console.log(" socket ... ");
            console.log(socket.username);
            console.log("... send us pressedKey32 event!")
            var oppusersocket = allsockets2[user.startedGameArray[1]];      // strange oppuser is always user.startedGameArray[1] ?
            game.processKeys(oppusersocket)
        });

        //+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
        socket.on('disconnect', function () {
            delete allsockets2[socket.username];
            var a = allGames[user.gameID].gamesession.indexOf(socket);

            if (a > 0) {
                allGames[user.gameID].gamesession.splice(a, 1);
            }
            console.log("Disconected : " + socket.id);


        });
    })
});


server.listen(process.env.PORT || 2000, function () {
    console.log('Listening on ' + server.address().port);
});