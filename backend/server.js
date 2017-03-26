var express =require('express');
var path =require('path'); //path module in node
var aws = require('aws-sdk')
var bodyParser = require('body-parser')
var PythonShell = require('python-shell');
var fileUpload = require('express-fileupload');
var http = require('http');
var mongoose = require('mongoose')
var models = require('../models/models.js')
var Game = models.Game;

var Clarifai = require('clarifai');
var clari = new Clarifai.App(
  //credentials
);
clari.getToken();

aws.config.loadFromPath('./backend/config.json')
var s3 = new aws.S3()

var app = express();


app.use(express.static('build'));

//middleware configured to use folder 'build' for static? script tags
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload());
app.get('/', function(req,res){
  res.sendFile(path.join(__dirname, '../index.html'))
  //path is node built in we use  to join these names (like + I think)
});


//Steps 17,18, 19
app.get('/gameinfo', function(req, res){
  Game.find(function(err, data){
    if(err){
      console.log('Error', err);
    } else{
      res.json(data[data.length-1]);
    }
  })
})

//Steps 9-15
app.post('/predict', function(req, res){
  console.log('req.body.source', req.body.source)
  var allKeys = req.body.source;
  var predictions = [];
  var idx = 0

  // var input = setInterval(function(){
  //   if(idx === allKeys.length - 1){
  //     clearInterval(input)
  //   }
  //   clari.models.predict(Clarifai.GENERAL_MODEL, allKeys[idx]).then(
  //     function(response) {
  //       predictions.push(response.outputs[0].data.concepts[0]);
  //     },
  //     function(err) {
  //       console.error(err);
  //     }
  //   );
  //   idx++;
  // }, 100)

  var counter = 0;
  allKeys.forEach(function(item){
    clari.models.predict(Clarifai.GENERAL_MODEL, item).then(
        function(response) {
          counter++;
          console.log(counter, allKeys.length);
          predictions.push(response.outputs[0].data.concepts[0]);
          if (counter === allKeys.length){
            console.log('predictions', predictions);
            var probability = 0;
            predictions.forEach(function(item){
              probability += item.value;
            })
            probability /= predictions.length;
            console.log(probability);
            var character = 'an unidentifiable character';
            if(probability > .95){
              character = 'Blitzcrank';
            }
            var gamedata = Game({
              character: character,
              probability: probability
            })
            gamedata.save(function(err){
              if(err){
                console.log('Error', err);
              } else{
                console.log(gamedata)
                console.log('Data was saved')
              }
            });
          }
        },
        function(err) {
          console.error('eeeeeeeeeeerrrrrrrrrrrrr', err);
        }
      );
  })
})

app.post('/uploadurl', function(req, res){
  // var source = req.body.url //this doesn't work yet
  var source = req.body.url
  console.log('source',source)
  var options = {
    // host: 'whatever the fuck heroku is called',
    port: 8080,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(source)
    }
  };
  var httpreq = http.request(options, function (response) {
    response.setEncoding('utf8');
    response.on('data', function (chunk) {
      console.log("body: " + chunk);
    }).on('error', function(err) {
      res.send('error');
    }).on('end', function() {
      res.send('ok');
    })
  }).on('error', function(e){
    console.log(e)
  });
  httpreq.write(source);
  httpreq.end();
  console.log('here')
  res.redirect('/')
})

app.use('/s3', require('react-s3-uploader/s3router')({
    bucket: "",
    region: '', //optional
    signatureVersion: '', //optional (use for some amazon regions: frankfurt and others)
    headers: {'Access-Control-Allow-Origin': '*'}, // optional
    ACL: 'private'
  })
//
);

app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})
