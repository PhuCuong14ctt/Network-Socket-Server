var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var util = require('util');

var srvSockets = io.sockets.sockets;
var userConnected = [];

var currentUsername = null;
var numOfInput = 0;
var numOfQuestions = 2, numOfPlayers = 2;
var questions = [];
var questIndex = 0;

var userPoint = new Map();
var userQuestionIdx = new Map();
var userSocketId = new Map();
app.get('/', function (req, res) {
	res.sendFile(__dirname + '/index.html');
});

io.emit('some event', { for: 'everyone' });

io.on('connection', function (socket) {
	// console.log('A socket connected !',socket.id);
	var numOfConnectingSockets = Object.keys(srvSockets).length;
	console.log('Number of connecting sockets: ', numOfConnectingSockets);
	if (numOfConnectingSockets > (numOfPlayers*2) ){ // if more users login than allowed
		socket.emit('cannotPlay','The game has already begun!');
		socket.on('checkName', function (username) {
			if (!userConnected.includes(username)) {
				socket.emit('canLogin', 1);
			} else {
				socket.emit('canLogin', 0);
			}
		});
	}
	else {
		console.log ('userConnected.length: ',userConnected.length);
		console.log ('numOfPlayers : ',numOfPlayers);
		socket.on('checkName', function (username) {
			if (!userConnected.includes(username)) {
				userConnected.push(username);
				userPoint.set(username,0);
				userQuestionIdx.set(username,0);
				userSocketId.set(username,socket.id);
				currentUsername = username;
				socket.emit('canLogin', 1);
			} else {
				socket.emit('canLogin', 0);
			}
		});
		socket.emit ('username',currentUsername);
		if (questIndex === questions.length){
			questIndex = 0;
		}
		if (numOfConnectingSockets === (numOfPlayers*2) && userConnected.length === numOfPlayers){
			io.emit('showQuestion',true);
			io.emit('establishQuestion',questions[questIndex]);
			//questIndex += 1;
		}
	
		socket.on('establishAns',function(answerInfo){
			console.log ('Selected ans: ',answerInfo);
			if (answerInfo.answer.rightAnswer ==='true'){
				socket.emit('establishResult', true);
				var currentPoint = userPoint.get(answerInfo.username);
				userPoint.set (answerInfo.username,currentPoint+1);
				userPoint.forEach(function(value, key) {
					console.log("Point: ",key + ' = ' + value);
				});
			}
			else{
				socket.emit('establishResult',false);
				userPoint.forEach(function(value, key) {
					console.log("Point: ",key + ' = ' + value);
				});
			}
			//change to next question
			var currentQuestionIdx = userQuestionIdx.get(answerInfo.username);
			currentQuestionIdx += 1;
			var playerFinishQuest = 0;
			userQuestionIdx.set (answerInfo.username,currentQuestionIdx);
			userQuestionIdx.forEach(function(value, key) {
				console.log("QuestionIdx: ",key + ' = ' + value);
			});

			if (currentQuestionIdx === (numOfQuestions)){ // if the current player finish the quest
				console.log ('Player has finished the Quest');
				userQuestionIdx.forEach(function(value, key) {
					if (value === (numOfQuestions)){
						playerFinishQuest += 1;
					}
				});
				console.log ('Players have finshed quests: ',playerFinishQuest);
				if (playerFinishQuest === numOfPlayers){ // if all players finish
					console.log ('All players have finished!');
					//Show result
					var userList = [];
					var pointList = [];
					var winnerList = [];
					var maxPoint = 0;
					userPoint.forEach(function(value, key) {
						if (value >= maxPoint){
							maxPoint = value;
						}
					});
					userPoint.forEach(function(value, key) {
						if (value === maxPoint){
							winnerList.push(key);
						}
					});
					userPoint.forEach(function(value, key) {
						userList.push(key);
						pointList.push(value);
					});
					io.emit('publishResult',{userList,pointList,winnerList});
				}
				else { // waiting for other players to finish
					console.log ('Player is waiting for others...');
					socket.emit ('waitingForOther','Please wait for other Players...');
				}
			}
			else {
				socket.emit('establishQuestion',questions[currentQuestionIdx]);
			}
			
		});
		//io.emit('userConnect', userConnected.length);
		socket.on('disconnect', function () {
			console.log ('Disconnected socketId: ',socket.id);
			userSocketId.forEach(function(socketId, username) {//check if the disconnected socket is one of the player
				if (socket.id === socketId){
					userPoint.set(username,0);
					numOfPlayers -=1 ;
					userQuestionIdx.delete(username);
				}
			});
			var playerFinishQuest = 0;
			userQuestionIdx.forEach(function(value, key) {
				if (value === (numOfQuestions)){
					playerFinishQuest += 1;
				}
			});
			if (playerFinishQuest === numOfPlayers){ // if all players finish
				console.log ('A user has logged out, Other users have finished quest');
				//Show result
				var userList = [];
				var pointList = [];
				var winnerList = [];
				var maxPoint = 0;
				userPoint.forEach(function(value, key) {
					if (value >= maxPoint){
						maxPoint = value;
					}
				});
				userPoint.forEach(function(value, key) {
					if (value === maxPoint){
						winnerList.push(key);
					}
				});
				userPoint.forEach(function(value, key) {
					userList.push(key);
					pointList.push(value);
				});
				io.emit('publishResult',{userList,pointList,winnerList});
			}
			
			console.log('Number of connected user left: ',userConnected.length);
			console.log('Number of connected sockets left: ', Object.keys(srvSockets).length);
		});
	}
	
});

http.listen(3000, function () {
	console.log('Magic is happening on port *:3000');
    loadQuest();
});

function done() {
	console.log('Now that process.stdin is paused, there is nothing more to do.');
	process.exit();
}
function loadQuest() { // load question from .txt
	var lineReader = require('readline').createInterface({
		input: require('fs').createReadStream('questions.txt')
	});
	var lineIdx = 0, questionIdx = 1, answerIdx = 2;
	var currentNumOfQuestions = 0;
	var tempQuestionContent, tempAnswerContent = [];
	var splittedAns = [];
	lineReader.on('line', function (line) {
		lineIdx += 1;
		//console.log('Line '+lineIdx.toString()+ ' from file:', line);
		if (currentNumOfQuestions <= numOfQuestions){
			//Get questions
			if (lineIdx === questionIdx) {
				tempQuestionContent = line;
				questionIdx += 4;
				currentNumOfQuestions += 1;
			}

			//Get answers
			if (lineIdx === answerIdx || lineIdx === answerIdx + 1 || lineIdx === answerIdx + 2) {
				var answer = {
					content: null,
					rightAnswer: null
				}

				splittedAns = line.split(' ');
				answer.rightAnswer = splittedAns[splittedAns.length - 1];
				answer.content = line.replace(' ' + answer.rightAnswer, '');
				tempAnswerContent.push(answer);
				if (lineIdx === answerIdx + 2) {//the last answer
					answerIdx += 4;
					var question = {
						content: null,
						answers: []
					};
					question.content = tempQuestionContent;
					question.answers = tempAnswerContent;
					questions.push(question);//each instance pushed into the array must be new instance
					tempAnswerContent = [];//reset the array
				}
			}
			if (lineIdx === 48) {
				console.log('Questions: ', questions);
				console.log('Answers: ', questions[11].answers);
			}
		}
		
	});
}


