var http = require('http'),
	express = require('express'),
	app = express(),
	port = 5000 || process.env.PORT;

var STATIC_DIR = __dirname + '/..';

app.use(express.static(STATIC_DIR));

var server = http.createServer(app);
server.listen(port);

console.log('http://localhost:5000/');