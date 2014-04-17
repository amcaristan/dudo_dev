var ipaddress = process.env.ip || "127.0.0.1";
var port      = process.env.port || 8080;

var WebSocketServer = require('ws').Server;
var http = require('http');
var Pusher = require('pusher');
var player_id = 1;
//var players = new Array();
var tables = new Array();
var con_player;
var current_dice = new Current_Bet();
var current_turn = 0;
var temp;
var chat_log;
var fs = require('fs'),



respcont = fs.readFileSync('index.html');

var pusher = new Pusher({
  appId: '69800',
  key: '62a588e65a78f775a138',
  secret: '442300d257f98014c3fb'
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
	this.max_players = 5;
	this.current_dice = new Current_Bet();
	this.current_turn = 0;
	
	this.find_Player = find_Player;
	this.players_Ready = players_Ready;
	this.dudo = dudo;
	this.calzo = calzo;
	
	function find_Player(name){
	  temp = 0;
	  while(true){
		  if(this.players[temp].name == name){
			  return temp;
		  }
		  else if(temp != this.players.length - 1)
			  temp++;
		  else
			  return -1;
	  }
	}
	function players_Ready(){
		if(this.players.length < 2)
			return false;
		for(temp = 0; temp < this.players.length; temp = temp + 1){
			if(this.players[temp].ready == false){
				return false;
			}
		}
		return true;
	}
	function dudo(name){
    pusher.trigger("table" + this.id.toString(), 'show_hands', {players: this.players});
		var temp_count = 0;
		for(temp = 0; temp < this.players.length; temp = temp + 1){
			for(var temp1 = 0; temp1 < this.players[temp].dice.length; temp1 = temp1 + 1){
				if(this.players[temp].dice[temp1] == 1 || this.players[temp].dice[temp1] == this.current_dice.dice_type){
					temp_count = temp_count + 1;
				}
			}
		}
		if(temp_count < this.current_dice.dice_count){
			this.current_turn = this.find_Player(this.current_dice.name);
			this.players[this.current_turn].remove_Die();
	  }
		else{
			this.current_turn = this.find_Player(name);
			this.players[this.current_turn].remove_Die();
		}
	  while(this.players[this.current_turn].dice.length == 0){
			  this.current_turn = this.current_turn + 1;
			  if(this.current_turn > this.players.length - 1){
				this.current_turn = 0;
			  }
	  }
	  pusher.trigger("table" + this.id.toString(), "new_hand", {start_seat: + this.current_turn});
	  pusher.trigger('table'+ this.id.toString(), 'alert', {"message": name + " called dudo!",
										 "message2": "There were " + temp_count + " " + this.current_dice.dice_type + "'s",
										 "message3": "Last bet was " + this.current_dice.dice_count + " " + this.current_dice.dice_type + "'s"});
	}
	function calzo(name){
    pusher.trigger("table" + this.id.toString(), 'show_hands', {players: this.players});
		var temp_count = 0;
		for(temp = 0; temp < this.players.length; temp = temp + 1){
			for(var temp1 = 0; temp1 < this.players[temp].dice.length; temp1 = temp1 + 1){
				if(this.players[temp].dice[temp1] == 1 || this.players[temp].dice[temp1] == this.current_dice.dice_type){
					temp_count = temp_count + 1;
				}
			}
		}
		if(temp_count == this.current_dice.dice_count){
			this.current_turn = this.find_Player(name);
			this.players[this.current_turn].add_Die();
		}
		else{
			this.current_turn = this.find_Player(name);
			this.players[this.current_turn].remove_Die();
		while(this.players[this.current_turn].dice.length == 0){
			  this.current_turn = this.current_turn + 1;
			  if(this.current_turn > this.players.length - 1){
				this.current_turn = 0;
			  }
		}
	  }
	   
	  pusher.trigger("table" + this.id.toString(), "new_hand", {start_seat: this.current_turn});
	  pusher.trigger("table" + this.id.toString(), 'alert', {"message": name + " called calzo!", 
										 "message2": "There were " + temp_count + " " + this.current_dice.dice_type + "'s",
										 "message3": "Last bet was " + this.current_dice.dice_count + " " + this.current_dice.dice_type + "'s"});
	}
}

function Player(n, s, t){
  this.name = n;
  this.dice = [0,0,0,0,0];
  this.seat = s;
  this.has_obliged = false;
  this.is_ready = false;
  this.table = t;
  
  this.remove_Die = remove_Die;
  this.add_Die = add_Die;
  this.roll_Dice = roll_Dice;
  
  function remove_Die(){
	  this.dice.splice(0,1);
    
    var winner = -1;
    var living_count = 0;
    for(var windex = 0; windex < tables[this.table].players.length && living_count < 2; windex = windex + 1){
        if(tables[this.table].players[windex].dice.length > 0){
          winner = windex;
          living_count = living_count + 1;
        }
    } 
    if(living_count < 2){
      winner = winner + 1;
      pusher.trigger("table" + this.table.toString(), "win", {player: winner});
    }
    
    if(this.dice.length == 1 && !this.has_obliged){
      this.has_obliged = true;
      pusher.trigger("table" + this.table.toString(), "obligo", {});
    }
    else{
       pusher.trigger("table"+this.table.toString(), "not_obligo", {});
    }
    
  }
  function add_Die(){
    pusher.trigger("table"+this.table.toString(), "not_obligo", {});
	  this.dice.push(0);
  }
  function roll_Dice(){
	  for(var dice_loop = 0; dice_loop < this.dice.length; dice_loop = dice_loop + 1){
		  this.dice[dice_loop] = Math.floor(Math.random()*6) + 1;//
	  }
	  pusher.trigger(this.name, "update_player", {player: this, curr_turn: tables[this.table].current_turn});
  }
}

for(temp = 0; temp < 1; temp = temp + 1){
  tables.push(new Table(temp));
}

var wss = new WebSocketServer({
  server: server,
  autoAcceptConnections: true
});
wss.on('connection', function(ws) {
  
  
  console.log("New connection");
  ws.on("message", function(message){
	  var omessage = JSON.parse(message);
	  if(omessage.type == "something"){
		  var player = "player" + (tables[0].players.length + 1);
		  con_player = new Player(player, tables[0].players.length, 0);
		  tables[0].players.push(con_player);
		  ws.send(JSON.stringify({player : con_player}));
	  }
    switch(omessage.type){
      case "sub_success":
	  	  tables[omessage.table].players[tables[omessage.table].find_Player(omessage.name)].roll_Dice();
        //pusher.trigger('table' + omessage.table, 'new_player', {num_players: tables[omessage.table].players.length});
	  	  break;
      case "join_table":
        tables[omessage.player.table].players.push(omessage.player);
        pusher.trigger('table' + omessage.player.table, 'new_player', {num_players: tables[omessage.player.table].players.length});
      case "ready":
    	  tables[omessage.table].players[tables[omessage.table].find_Player(omessage.name)].ready = true;
    	  if(tables[omessage.table].players_Ready()){
    		  tables[omessage.table].current_turn = 0;
    		  pusher.trigger('table' + omessage.table, 'start_game', {});
    	  }
    	  break;
      case "bet":
    	  tables[omessage.table].current_dice.name = omessage.name;
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
    	  tables[omessage.table].dudo(omessage.name);
    	  for(temp = 0; temp < tables[omessage.table].players.length; temp = temp + 1){
    		  tables[omessage.table].players[temp].roll_Dice();
    	  }
    	  break;
      case "calzo":
    	  tables[omessage.table].calzo(omessage.name);
    	  for(temp = 0; temp < tables[omessage.table].players.length; temp = temp + 1){
    		  tables[omessage.table].players[temp].roll_Dice();
    	  }
    	  break;
      case "reset":
    	  player_id = 1;
        tables[omessage.table].players = new Array();
        tables[omessage.table].current_turn = 0;
        pusher.trigger('table' + omessage.table, 'alert', {"message": "Server Restarted! Please Refresh The Browser."});
    	  break;
      case "chat":
        chat_log = omessage.name.toString();
        chat_log = chat_log + ": " + omessage.c_log + "<br>";
        pusher.trigger('table' + omessage.table, 'chat', {"message": chat_log});
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
