$(function () {
    var nick = undefined;
    var socket = io.connect();
    var $users = $('#users');
    var $challengers = $('#challengers');
    var $blockNick =$('#blockNick');
    var $formNick = $('#formNick');
    var $btnNick = $('#btnNick');
    var $txtNick = $('#txtNick');
    //var $challengersBlock = $('#challengersBlock'); // Not in use
    var $gameBlock = $('#gameBlock');
    var $btnRock = $('#btnRock');
    var $btnPaper = $('#btnPaper');
    var $btnScissors = $('#btnScissors');
    var $btnAccept = $('#btnAccept');
    var $btnReject= $('#btnReject');
    var $formRequest = $('#formRequest');
    var $txtRequest = $('#txtRequest');
    var $info = $('#info');
    var $warning = $('#warning');

    $btnRock.on("click", ()=>{
        $gameBlock.hide();
        socket.emit("choice", "rock");
    })
    $btnPaper.on("click", ()=>{
        $gameBlock.hide();
        socket.emit("choice", "paper");
        
    })
    
    $btnScissors.on("click", ()=>{
        $gameBlock.hide();
        socket.emit("choice", "scissors");
    })
   
    $("body").on("click", "#btnAccept", function(e){
        socket.emit("accept challenge", e.currentTarget.value, (response)=>{
            if(response != undefined){
                showInfo(response.text);
            }
        });
    });

    $("body").on("click", "#btnReject", function(e){
        socket.emit("reject challenge", e.currentTarget.value, (response)=>{
            if(response != undefined){
                showInfo(response.text);
            }
        });
    });
   

    $formNick.submit((e) => {
        e.preventDefault();
        nick = $txtNick.val();
        socket.emit('new user', $txtNick.val(), function (data) {
            if (data) {
                $blockNick.hide();
                showInfo(`Your nick now is:<b>${$txtNick.val()}</b>`);
            } else {
                nick = undefined;
                showInfo(`The nickname <b>${$txtNick.val()}</b> is already on use.`);
            }
        });
    });

    $formRequest.submit((e) => {
        e.preventDefault();
        if ($txtRequest.val() != "") {
            socket.emit("challenge", $txtRequest.val(), function (error) {
                if (error.code == undefined) {
                    showInfo("Challenge sent");
                } else {
                    showInfo(error.text);
                }
            });
        } else {
            showInfo("Write a username to challenge!.");
        }
    });

    socket.on('challenge accepted', (data) =>{
        showInfo(` Your opponent is: <b>${data}</b>`);
        $gameBlock.show();
    }); 

    socket.on('Winner', () => {
        $info.html("You win!");
    });
    socket.on('Loser', () => {
        $info.html("You lose!");
    });
    socket.on('Draw', () => {
        $info.html("Draw!");
    });

    socket.on("challenging", (users) => {
        
        $challengers.empty();
        var html = "";
        for (i = 0; i < users.length; i++) {
            var li = document.createElement("li");
            li.setAttribute("class", "list-group-item");
            var $text = $("<b>"+users[i]+"</b>");
            
            li.appendChild($text.get(0));
            li.appendChild(document.createTextNode(" is challenging you: "));

            var button = document.createElement('button');
            button.innerHTML = "Accept";
            button.setAttribute("class", "btn btn-outline-success btn-sm");
            button.id ="btnAccept";
            button.value = users[i];
            li.appendChild(button);
            
            button = document.createElement('button');
            button.innerHTML = "Reject";
            button.setAttribute("class", "btn btn-outline-danger btn-sm");
            button.id ="btnReject";
            button.value = users[i];
            li.appendChild(button);
            $challengers.append(li);
        }
    });

    socket.on("info", (info) => {
        showInfo(info);
    });

    socket.on('get users', (data) => {
        var html = '';
        if(nick != undefined) {
            
            for (i = 0; i < data.length; i++) {
                
                if (nick == data[i])
                    html += '<b><li class="list-group-item">'+ data[i] + '</li></b>';
                else
                    html += '<li class="list-group-item">'+ data[i] + '</li>';
    
            }
        } else {
            for (i = 0; i < data.length; i++) {
            
                html += '<li class="list-group-item">' + data[i] + '</li>';
    
            }
        }
        $users.html(html);
    });


    socket.on('disconnect', () => {
        showWarning("Connection lost.");
    });
    socket.on('reconnect', () => {
        showWarning("Reconnected");
        if ($txtNick.val() != "") {
            socket.emit('new user', $txtNick.val(), function (data) {
                if (data) {
                    $formNick.hide();
                    showInfo(`Your nick now is:<b>${$txtNick.val()}</b>`);
                } else {
                    showInfo(`the nickname <b>${$txtNick.val()} is already taken</b>.`);
                    $formNick.show();
                }
            });

        }
    });

    function showWarning(a) {
        $warning.html(a);
    }

    function showInfo(i) {
        $info.html(i);
    }


});