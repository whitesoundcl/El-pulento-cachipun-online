var configFile = require("fs").readFileSync("config.json");
var jconfig = JSON.parse(configFile);
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
connections = [];

server.listen(process.env.PORT || jconfig.port);
console.log("Server Running");

app.get("/", (req, res) => {
    res.sendFile(__dirname + jconfig.dir.index);
});
app.get("/index.js", (req, res) => {
    res.sendFile(__dirname + jconfig.dir.indexjs);
});

io.sockets.on('connection', (socket) => {
    connections.push(socket);
    console.log(`User connected. (Now there are: ${connections.length} users.) `);

    // Refresh user list for the user connected.
    updateUsernamesUser(socket);

    socket.on('disconnect', (data) => {
        // Remove from every challenged user 
        connections.forEach(e => {
            if (e.challengers != undefined) {
                var index = e.challengers.indexOf(socket.username);
                if (index != -1) {
                    e.challengers.splice(index, 1);
                    e.emit("challenging", e.challengers);
                }
            }
        });
        connections.splice(connections.indexOf(socket), 1);
        console.log(`User disconnected.  ${connections.length} users left.`);
        updateUsernames();
    });

    socket.on('new user', (data, callback) => {


        if (data != "") {
            var exist = false;
            connections.forEach(element => {
                if (element.username == data) {
                    exist = true;
                }
            });
            if (!exist) {
                socket.username = data;
                socket.challengers = [];
                socket.challenging = [];
                updateUsernames();
                callback(true);
                console.log(`New user registered, nick: "${data}".`);

            } else {
                console.log(`Client rejected. Nick already in use: "${data}"`);
                callback(false);
            }
        }

    });

    socket.on("accept challenge", (data, callback) => {
        var found = false;
        connections.forEach(e => {
            if (e.username == data) {
                found = true;
                if (e.playing == undefined) {
                    if (socket.playing == undefined) {
                        acceptDuelRequest(socket, e);
                        callback(undefined);
                    } else {
                        error = {
                            text: "You're already on a game!"
                        }
                        callback(error);
                    }

                } else {
                    error = {
                        text: "The player is already on a game."
                    }
                    callback(error);
                }
            }
        })
        if (!found) {
            error = {
                text: "The player does not exist."
            };
            callback(error);
        }
        socket.emit("challenging", socket.challengers);
    });

    socket.on("reject challenge", (data, callback)=>{
        var index = socket.challengers.indexOf(data);
        if(index != -1)
            socket.challengers.splice(index, 1);
        
        var find = false;
        connections.forEach(e=>{
            if(e.username == data){
                index = e.challenging.indexOf(socket.username);
                if(index != -1){
                    e.challenging.splice(index, 1); 
                    find = true;
                }

            }
        });
        if(!find)
            callback({texto:"That user does not exist."});
        socket.emit("challenging", socket.challengers);
    });

    socket.on('challenge', (data, callback) => {

        if (data != socket.username) {
            var exist = false;
            connections.forEach(element => {
                if (element.username == data) {
                    exist = true;
                    if (socket.challengers.indexOf(element.username) == -1) {
                        if (element.challengers.indexOf(socket.username) == -1) {
                            socket.challenging.push(element.username);
                            element.challengers.push(socket.username);
                            element.emit('challenging', element.challengers);
                            callback({});
                        } else {
                            error = {
                                code: 1,
                                text: "You have already invited this user to a game."
                            };
                            callback(error);
                        }
                    } else {
                        error = {
                            code: 2,
                            text: "The user has already invited you to a game."
                        };
                        callback(error);
                    }
                }
            });
            if (!exist) {
                error = {
                    code: 3,
                    text: "The user does not exist."
                };
                callback(error);
            }
        } else {
            error = {
                code: 0,
                text: "You can't challenge yourself."
            };
            callback(error);

        }
    });



    socket.on('choice', (data) => {
        console.log(socket.playing);

        if (socket.playing != undefined) {
            socket.choice = data;
            if (socket.opponent.choice != undefined) {
                if (socket.choice == socket.opponent.choice) {
                    socket.emit("Draw");
                    socket.opponent.emit("Draw");
                    resetPayers(socket, socket.opponent);
                } else if (socket.choice == "rock" &&
                    socket.opponent.choice == "scissors") {
                    socket.emit("Winner");
                    socket.opponent.emit("Loser");
                    resetPayers(socket, socket.opponent);
                } else if (socket.choice == "paper" &&
                    socket.opponent.choice == "rock") {
                    socket.emit("Winner");
                    socket.opponent.emit("Loser");
                    resetPayers(socket, socket.opponent);
                } else if (socket.choice == "scissors" &&
                    socket.opponent.choice == "paper") {
                    socket.emit("Winner");
                    socket.opponent.emit("Loser");
                    resetPayers(socket, socket.opponent);
                } else {
                    socket.emit("Loser");
                    socket.opponent.emit("Winner");
                    resetPayers(socket, socket.opponent);
                }
            } else {
                socket.emit("info", "Waiting for opponent choice");
            }
        } else {
            socket.emit("info", "You're not in a duel.");

        }
    });

    function acceptDuelRequest(s1, s2) {
        // challengers de la lista
        var r = s1.challengers.indexOf(s2.username);
        if (r != -1)
            s1.challengers.splice(r, 1);
        r = s2.challengers.indexOf(s1.username);
        if (r != -1)
            s2.challengers.splice(r, 1);
        // challenging en la lista
        r = s1.challenging.indexOf(s2.username);
        if (r != -1)
            s1.challenging.splice(r, 1);
        r = s2.challenging.indexOf(s1.username);
        if (r != -1)
            s2.challenging.splice(r, 1);
        s1.playing = true;
        s2.playing = true;
        s1.opponent = s2;
        s2.opponent = s1;

        s1.emit("challenge accepted", s2.username);
        s2.emit("challenge accepted", s1.username);
    }

    function resetPayers(s1, s2) {
        s1.playing = undefined;
        s2.playing = undefined;
        s1.opponent = undefined;
        s2.opponent = undefined;
        s1.choice = undefined;
        s2.choice = undefined;
    }

    function updateUsernames() {
        var nicks = [];
        connections.forEach(e => {
            if (e.username != undefined) {
                nicks.push(e.username);

            }
        });
        io.sockets.emit('get users', nicks);
    }

    function updateUsernamesUser(s) {
        var nicks = [];
        connections.forEach(e => {
            if (e.username != undefined) {
                nicks.push(e.username);

            }
        });
        s.emit('get users', nicks);
    }
});