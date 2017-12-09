var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.emit('some event', { for: 'everyone' });

var srvSockets = io.sockets.sockets;
var userConnected = [];

io.on('connection', function(socket){
		socket.on('checkName', function(username){
			if(!userConnected.includes(username)){		
				userConnected.push(username);
				io.emit('userConnect', userConnected.length);
				io.emit('canLogin', 1);
			}else{
				io.emit('canLogin', 0);
			}
		});

	  	socket.on('disconnect', function(){
			console.log(Object.keys(srvSockets).length);
 		});
});

http.listen(3000, function(){
  console.log('Magic is happening on port *:3000');
});