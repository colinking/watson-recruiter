/**
 * Copyright 2014 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var express = require('express'),
  app = express(),
  mongo_handler = require('./public/js/mongo'),
  wit = require('node-wit');

// Bootstrap application settings
require('./config/express')(app);


app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);

//
// GET REQUESTS
//

var ACCESS_TOKEN = "OPSLW2EC22FR5Z2ABTPIAWL7P7MPJFDM";

function witProcess(phrase) {
  console.log("Sending phrase to Wit.AI");
  wit.captureTextIntent(ACCESS_TOKEN, phrase, function (err, res) {
    if (err) {
      console.log("wit.ai error");
    } else {
      if (res['outcomes'].length == 0) {
        console.log("invalid response");
        return;
      }
      // var intent = res['outcomes']['intent'];
      // var number = res['outcomes']['entities']['number'][0];
      // var contact = res['outcomes']['entities']['contact'][0];

      // console.log("%s %d %s", intent, number, contact);
    }
  });
}


// render index page
app.get('/', function(req, res) {
  res.render('index.html');
});

app.get('/signin', function(req, res) {
	res.render('signin');
});

app.get('/register', function(req, res) {
	res.render('register');
});

app.get('/applicant/', function(req, res) {
  if(mongo_handler.getEmail() == null) {
    res.redirect('/');
  }
  // Check  mongo to see if the user has submitted an app already
  mongo_handler.load_application(req, res);
});

app.get('/employer/', function(req, res) {
  if(mongo_handler.getEmail() == null) {
    res.redirect('/');
  }
  res.render('employer');
});

app.get('/ideal', function(req, res) {
  if(mongo_handler.getEmail() == null) {
    res.redirect('/');
  }
  res.render('ideal');
});

app.get('/list_logins', function(req, res) {
  if(mongo_handler.getEmail() == null) {
    res.redirect('/');
  }
  sessionHandler.list_logins(req, res);
});

//
// POST REQUESTS
//

app.post('/submit_application', function(req, res) {
  if(mongo_handler.getEmail() == null) {
    res.redirect('/');
  }
  mongo_handler.submit_application(req, res);
});

app.post('/listen', function(req, res) {
  'use strict';

  console.log("req.body %j", req.body);
  var phrase = req.body['phrase'];
  if (phrase == undefined) {
    console.log("undefined query");
  } else {
    console.log("Phrase: " + phrase);
    witProcess(phrase);
  }
});

app.post('/login', function(req, res) {
	mongo_handler.login(req, res);
});

app.post('/register', function(req, res) {
	mongo_handler.register(req, res);
});

var port = process.env.VCAP_APP_PORT || 3000;
app.listen(port);
console.log('listening at:', port);

