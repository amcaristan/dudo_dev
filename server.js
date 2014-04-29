var ipaddress = process.env.ip || "127.0.0.1";
var port      = process.env.port || 8080;

var WebSocketServer = require('ws').Server;
var http = require('http');
var Pusher = require('pusher');
var player_id = 1;
var tables = new Array();
var tables_info = new Array();
var tables_in_game = new Array();
var tables_start;
var con_player;
var current_dice = new Current_Bet();
var current_turn = 0;
var chat_log;
var temp;
var max_players = 4;
var fs = require('fs'),



respcont = fs.readFileSync('index.html');

var pusher = new Pusher({
  appId: '69801',
  key: 'aa926f9721e05e56f3f0',
  secret: '4ba83c082b33ff4507e7'
});

var server = http.createServer(function(req, res){
  res.writeHead(200, {'Content-Type': 'text/html'}); 
  res.end(respcont);
});

server.listen( port, ipaddress, function() {
  console.log((new Date()) + ' Server is listening on port 8080');
  
});

function Current_Bet(){
  this.name = "player1";
  this.dice_type = 2;
  this.dice_count = 0;
}

function Table(n){
	this.id = n;
	this.players = new Array();
	this.in_game = false;
	this.current_dice = new Current_Bet();
	this.current_turn = 0;
	
  this.reset_Ready = reset_Ready;
	this.players_Ready = players_Ready;
	this.dudo = dudo;
	this.calzo = calzo;
	
  function reset_Ready(){
    for(temp = 0; temp < this.players.length; temp = temp + 1){
      this.players[temp].is_ready = false;
      this.players[temp].has_obliged = false;
    }
  }
	function players_Ready(){
		if(this.players.length < 2)
			return false;
		for(temp = 0; temp < this.players.length; temp = temp + 1){
			if(this.players[temp].is_ready == false){
				return false;
			}
		}
		return true;
	}
	function dudo(seat){
    pusher.trigger("table" + this.id, 'show_hands', {players: this.players});
		var temp_count = 0;
		for(temp = 0; temp < this.players.length; temp = temp + 1){
			for(var temp1 = 0; temp1 < this.players[temp].dice.length; temp1 = temp1 + 1){
				if(this.players[temp].dice[temp1] == 1 || this.players[temp].dice[temp1] == this.current_dice.dice_type){
					temp_count = temp_count + 1;
				}
			}
		}
		if(temp_count < this.current_dice.dice_count){
			this.current_turn = this.current_dice.name;
			this.players[this.current_turn].remove_Die();
	  }
		else{
			this.current_turn = seat;
			this.players[this.current_turn].remove_Die();
		}
    pusher.trigger("table" + this.id, 'chat', {"message": this.players[seat].nickname + " called dudo!<br>" 
    								 + "There were " + temp_count + " " + this.current_dice.dice_type + "'s<br>"
    								 + "Last bet was " + this.current_dice.dice_count + " " + this.current_dice.dice_type + "'s<br>"
                     + this.players[this.current_turn].nickname + " lost a die!<br>"});
    if(this.in_game){
  	  while(this.players[this.current_turn].dice.length == 0){
  			  this.current_turn = this.current_turn + 1;
  			  if(this.current_turn > this.players.length - 1){
  				  this.current_turn = 0;
  			  }
  	  }
      var players_dice_count = new Array();
      for(temp = 0; temp < this.players.length; temp = temp + 1){
        players_dice_count.push(this.players[temp].dice.length);
      }
      pusher.trigger("table" + this.id, "new_hand", {start_seat: + this.current_turn, players_dice_count: players_dice_count});
    }
	}
	function calzo(seat){
    pusher.trigger("table" + this.id, 'show_hands', {players: this.players});
		var temp_count = 0;
    var lost;
		for(temp = 0; temp < this.players.length; temp = temp + 1){
			for(var temp1 = 0; temp1 < this.players[temp].dice.length; temp1 = temp1 + 1){
				if(this.players[temp].dice[temp1] == 1 || this.players[temp].dice[temp1] == this.current_dice.dice_type){
					temp_count = temp_count + 1;
				}
			}
		}
		if(temp_count == this.current_dice.dice_count){
			this.current_turn = seat;
			this.players[this.current_turn].add_Die();
      lost = false;
		}
		else{
			this.current_turn = seat;
			this.players[this.current_turn].remove_Die();
      lost = true;
		while(this.players[this.current_turn].dice.length == 0){
			  this.current_turn = this.current_turn + 1;
			  if(this.current_turn > this.players.length - 1){
				  this.current_turn = 0;
			  }
		 }
	  }
    if(lost){
        pusher.trigger("table" + this.id, 'chat', {"message": this.players[this.seat].nickname + " called calzo!<br>" 
    										 + "There were " + temp_count + " " + this.current_dice.dice_type + "'s<br>"
    										 + "Last bet was " + this.current_dice.dice_count + " " + this.current_dice.dice_type + "'s<br>"
                         + this.players[this.seat].nickname + " lost a die!<br>"});
    }
    else{
      pusher.trigger("table" + this.id, 'chat', {"message": this.players[this.seat].nickname + " called calzo!<br>" 
    										 + "There were " + temp_count + " " + this.current_dice.dice_type + "'s<br>"
    										 + "Last bet was " + this.current_dice.dice_count + " " + this.current_dice.dice_type + "'s<br>"
                         + this.players[this.seat].nickname + " gained a die!<br>"});
    }
    var players_dice_count = new Array();
    for(temp = 0; temp < this.players.length; temp = temp + 1){
      players_dice_count.push(this.players[temp].dice.length);
    }
    pusher.trigger("table" + this.id, "new_hand", {start_seat: + this.current_turn, players_dice_count: players_dice_count});                   
	}
}

function Player(n, s, t, a){
  this.name = n;
  this.dice = [0,0,0,0,0];
  this.seat = s;
  this.has_obliged = false;
  this.is_ready = false;
  this.table = t;
  this.nickname = a;
  
  this.remove_Die = remove_Die;
  this.add_Die = add_Die;
  this.roll_Dice = roll_Dice;
  this.reset_Dice = reset_Dice;
  
  function remove_Die(){
	  this.dice.splice(0,1);
    
    var windex;
    var winner;
    var living_count = 0;
    for(windex = 0; windex < tables[this.table].players.length && living_count < 2; windex = windex + 1){
        if(tables[this.table].players[windex].dice.length > 0){
          winner = windex;
          living_count = living_count + 1;
        }
    } 
    if(living_count < 2){
      tables[this.table].reset_Ready();
      tables[this.table].in_game = false;
      pusher.trigger("table" + this.table, "win", {player: tables[this.table].players[winner].nickname});
    }
    if(this.dice.length == 1 && !this.has_obliged){
      this.has_obliged = true;
      pusher.trigger("table" + this.table, "obligo", {});
    }
    else{
       pusher.trigger("table"+this.table, "not_obligo", {});
    }
    
  }
  function add_Die(){
    pusher.trigger("table"+this.table, "not_obligo", {});
	  this.dice.push(0);
  }
  function roll_Dice(){
	  for(var dice_loop = 0; dice_loop < this.dice.length; dice_loop = dice_loop + 1){
		  this.dice[dice_loop] = Math.floor(Math.random()*6) + 1;//
	  }
	  pusher.trigger(this.name, "update_player", {player: this, curr_turn: tables[this.table].current_turn});
  }
  function reset_Dice(){
    this.dice = [0, 0, 0, 0, 0];
  }
}

for(temp = 0; temp < 4; temp = temp + 1){
  tables.push(new Table(temp));
  tables_info.push(0);
  tables_in_game.push(false);
}

function send_Table_Info(){
  for(temp = 0; temp < 4; temp = temp + 1){
    tables_info[temp] = tables[temp].players.length;
    tables_in_game[temp] = tables[temp].in_game;
  }
  pusher.trigger('lobby', 'update_tables_info', {tables_info: tables_info, tables_in_game: tables_in_game});
}

setInterval(send_Table_Info, 5000);

var wss = new WebSocketServer({
  server: server,
  autoAcceptConnections: true
});
wss.on('connection', function(ws) {
  console.log("New connection");
  ws.on("message", function(message){
	  var omessage = JSON.parse(message);
	  if(omessage.type == "something"){
		  var player = "player" + (player_id);
      player_id = player_id + 1;
		  con_player = new Player(player, -1, -1, player);
		  ws.send(JSON.stringify({player : con_player}));
	  }
    switch(omessage.type){
      case "sub_success":
        if(tables[omessage.player.table].players.length >= max_players || tables[omessage.player.table].in_game){
          pusher.trigger(omessage.player.name, 'reject_table_join', {});
        }
        else{
          omessage.player.seat = tables[omessage.player.table].players.length;
          con_player = new Player(omessage.player.name, omessage.player.seat, omessage.player.table, omessage.player.nickname);
          tables[omessage.player.table].players.push(con_player);
          pusher.trigger(omessage.player.name, "update_player", {player: omessage.player, curr_turn: tables[omessage.player.table].current_turn});
          var nicknames = new Array();
          for(temp = 0; temp < tables[omessage.player.table].players.length; temp = temp + 1){
            nicknames.push(tables[omessage.player.table].players[temp].nickname);
          }
          pusher.trigger('table' + omessage.player.table, 'new_player', {num_players: tables[omessage.player.table].players.length, player_names: nicknames});
          var alert_msg = omessage.player.nickname + " has joined table " + (omessage.player.table + 1) + ".<br>"
          pusher.trigger('table' + omessage.player.table, 'chat', {"message": alert_msg});
          send_Table_Info();
        }
	  	  break;
      case "leave_table":
        if(omessage.player.seat != -1){
          if(tables[omessage.player.table].in_game == false){
            tables[omessage.player.table].players.splice(omessage.player.seat, 1);
            for(temp = omessage.player.seat; temp < tables[omessage.player.table].players.length; temp = temp + 1){
              tables[omessage.player.table].players[temp].seat = temp - 1;
            }
            var nicknames = new Array();
            for(temp = 0; temp < tables[omessage.player.table].players.length; temp = temp + 1){
              nicknames.push(tables[omessage.player.table].players[temp].nickname);
            }
            pusher.trigger('table' + omessage.player.table, 'new_player', {num_players: tables[omessage.player.table].players.length, player_names: nicknames});
            var alert_msg = omessage.player.nickname + " has left table " + (omessage.player.table + 1) + ".<br>"
            pusher.trigger('table' + omessage.player.table, 'chat', {"message": alert_msg});
            send_Table_Info();
          }
          else{
            tables[omessage.player.table].players[omessage.player.seat].dice = [0];
            tables[omessage.player.table].players[omessage.player.seat].remove_Die();
            if(tables[omessage.player.table].in_game){
              do{
                tables[omessage.player.table].current_turn = (tables[omessage.player.table].current_turn + 1) % tables[omessage.player.table].players.length;
              } while(tables[omessage.player.table].players[tables[omessage.player.table].current_turn].dice.length == 0);
              var alert_msg = omessage.player.nickname + " has left table " + (omessage.player.table + 1) + ". Starting new hand.<br>"
              pusher.trigger('table' + omessage.player.table, 'chat', {"message": alert_msg});
            }
          }
        }
        break;
      case "ready":
        if(tables[omessage.player.table].in_game == false){
      	  tables[omessage.player.table].players[omessage.player.seat].is_ready = true;
          var alert_msg = omessage.player.nickname + " is ready!<br>"
          pusher.trigger('table' + omessage.player.table, 'chat', {"message": alert_msg});
          if(tables[omessage.player.table].players_Ready()){
            tables[omessage.player.table].current_turn = 0;
            tables[omessage.player.table].in_game = true;
            pusher.trigger('table' + omessage.player.table, 'chat', {"message": "All Players Are Ready. Game Will Start In 5 Seconds.<br>"});
            var players_dice_count = new Array();
            for(temp = 0; temp < tables[omessage.player.table].players.length; temp = temp + 1){
              players_dice_count.push(tables[omessage.player.table].players[temp].dice.length);
            }
            pusher.trigger('table' + omessage.player.table, 'start_game', {players_dice_count: players_dice_count});
            for(temp = 0; temp < tables[omessage.player.table].players.length; temp = temp + 1){
              tables[omessage.player.table].players[temp].reset_Dice();
              tables[omessage.player.table].players[temp].roll_Dice();
            }
          }
        }
    	  break;
      case "bet":
    	  tables[omessage.table].current_dice.name = omessage.seat;
    	  tables[omessage.table].current_dice.dice_type = omessage.d_type;
    	  tables[omessage.table].current_dice.dice_count = omessage.d_count;
        do{
      	  tables[omessage.table].current_turn = (tables[omessage.table].current_turn + 1) % tables[omessage.table].players.length;
        }while(tables[omessage.table].players[tables[omessage.table].current_turn].dice.length == 0);
    	  pusher.trigger('table' + omessage.table, 'bet', {name: tables[omessage.table].current_dice.name, 
    		  							   dice_type: tables[omessage.table].current_dice.dice_type, 
    		  							   dice_count: tables[omessage.table].current_dice.dice_count,
    		  							   curr_turn: tables[omessage.table].current_turn});
    	  break;
      case "dudo":
    	  tables[omessage.table].dudo(omessage.seat);
        if(tables[omessage.table].in_game){
      	  for(temp = 0; temp < tables[omessage.table].players.length; temp = temp + 1){
      		  tables[omessage.table].players[temp].roll_Dice();
      	  }
        }
    	  break;
      case "calzo":
    	  tables[omessage.table].calzo(omessage.seat);
    	  for(temp = 0; temp < tables[omessage.table].players.length; temp = temp + 1){
    		  tables[omessage.table].players[temp].roll_Dice();
    	  }
    	  break;
      case "reset":
        tables[omessage.table].players = new Array();
        tables[omessage.table].current_turn = 0;
        pusher.trigger('table' + omessage.table, 'alert', {"message": "Server Restarted! Please Refresh The Browser."});
    	  break;
      case "chat":
        chat_log = omessage.name + " (" + (omessage.seat + 1) + ")" + ": " + omessage.c_log + "<br>";
        pusher.trigger('table' + omessage.table, 'chat', {"message": chat_log});
        break;
      case "set_nickname":
        if(omessage.player.table >= 0){
          chat_log = tables[omessage.player.table].players[omessage.player.seat].nickname + " changed their name to " + omessage.player.nickname + "<br>";
          tables[omessage.player.table].players[omessage.player.seat].nickname = omessage.player.nickname;
          pusher.trigger('table' + omessage.player.table, 'changed_nickname', {name: omessage.player.nickname, seat: omessage.player.seat});
          pusher.trigger('table' + omessage.player.table, 'chat', {"message": chat_log});
        }
        else{
          chat_log = "You changed your name to " + omessage.player.nickname + "<br>";
          pusher.trigger(omessage.player.name, 'chat', {"message": chat_log});
        }
        break;
      case "update_lobby":
        send_Table_Info();
        break;
	}
  });
});
/*wss.on('disconnect', function(ws) {
  console.log("Disconnecting");
  pusher.trigger("player1", "my_event", {"message": "Someone Disconnected"});
  ws.on('message', function(p_id) {
    var dpid = JSON.parse(p_id.data).id;
    dpid = dpid.substring(6,10);
    var index = players.indexOf(dpid);
    if(index > -1){
  	  players.splice(index,1);
    }
    pusher.trigger("player1", "my_event", {"message": players.size().toString()});
  });
  
});*/
/*function find_Player(name){
  temp = 0;
  while(true){
	  if(players[temp].name == name){
		  return temp;
	  }
	  else if(temp != players.length - 1)
		  temp++;
	  else
		  return -1;
  }
}
function players_Ready(){
	if(players.length < 2)
		return false;
	for(temp = 0; temp < players.length; temp = temp + 1){
		if(players[temp].ready == false){
			return false;
		}
	}
	return true;
}
function dudo(name){
  pusher.trigger('table1', 'show_hands', {players: players});
	var temp_count = 0;
	for(temp = 0; temp < players.length; temp = temp + 1){
		for(var temp1 = 0; temp1 < players[temp].dice.length; temp1 = temp1 + 1){
			if(players[temp].dice[temp1] == 1 || players[temp].dice[temp1] == current_dice.dice_type){
				temp_count = temp_count + 1;
			}
		}
	}
	if(temp_count < current_dice.dice_count){
		current_turn = find_Player(current_dice.name);
		players[current_turn].remove_Die();
  }
	else{
		current_turn = find_Player(name);
		players[current_turn].remove_Die();
	}
  while(players[current_turn].dice.length == 0){
    	  current_turn = current_turn + 1;
    	  if(current_turn > players.length - 1){
    	    current_turn = 0;
    	  }
  }
  pusher.trigger("table1", "new_hand", {start_seat: current_turn});
  pusher.trigger('table1', 'alert', {"message": name + " called dudo!",
                                     "message2": "There were " + temp_count + " " + current_dice.dice_type + "'s",
                                     "message3": "Last bet was " + current_dice.dice_count + " " + current_dice.dice_type + "'s"});
  pusher.trigger('table1', 'show_hands', {players: players});
}
function calzo(name){
  pusher.trigger('table1', 'show_hands', {players: players});
	var temp_count = 0;
	for(temp = 0; temp < players.length; temp = temp + 1){
		for(var temp1 = 0; temp1 < players[temp].dice.length; temp1 = temp1 + 1){
			if(players[temp].dice[temp1] == 1 || players[temp].dice[temp1] == current_dice.dice_type){
				temp_count = temp_count + 1;
			}
		}
	}
	if(temp_count == current_dice.dice_count){
		current_turn = find_Player(name);
		players[current_turn].add_Die();
	}
	else{
		current_turn = find_Player(name);
		players[current_turn].remove_Die();
    while(players[current_turn].dice.length == 0){
    	  current_turn = current_turn + 1;
    	  if(current_turn > players.length - 1){
    	    current_turn = 0;
    	  }
    }
  }
   
  pusher.trigger("table1", "new_hand", {start_seat: current_turn});
  pusher.trigger('table1', 'alert', {"message": name + " called calzo!", 
                                     "message2": "There were " + temp_count + " " + current_dice.dice_type + "'s",
                                     "message3": "Last bet was " + current_dice.dice_count + " " + current_dice.dice_type + "'s"});
}*/

console.log("Listening to " + ipaddress + ":" + port + "...");
