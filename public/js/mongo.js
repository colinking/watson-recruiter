

'use strict';

var curr_email = null,
  bluemix = require('../../config/bluemix'),
  watson = require('watson-developer-cloud-alpha'),
  extend = require('util')._extend;

if (process.env.VCAP_SERVICES) {
   var env = JSON.parse(process.env.VCAP_SERVICES);
   var mongo = env['mongodb-2.4'][0].credentials;
} else {
   var mongo = {
        "url": "mongodb://localhost/db"
      }
};

// if bluemix credentials exists, then override local
var pers_credentials = extend({
    version: 'v2',
    url: 'https://gateway.watsonplatform.net/personality-insights/api',
    username: '206b0a26-dcdd-4400-9b51-43550c6c1cdc',
    password: 'sNocS9xzpZlm'
}, bluemix.getServiceCreds('personality_insights')); // VCAP_SERVICES

// Create the service wrapper
var personalityInsights = new watson.personality_insights(pers_credentials);

module.exports.getEmail = function() {
  return curr_email;
}

module.exports.login = function(req, res) {
    console.log("Logging in user");
    var email = req.body.email;
    var password = req.body.password;
    var account_type = req.body.account_type;

    require('mongodb').connect(mongo.url, function(err, conn) {
        var collection = conn.collection('logins');

       //Look for a user with matching 
        collection.find({'email': email, 'password': password, 'account_type': account_type}, function(err, cursor) {
            if(err) throw err;
            cursor.toArray(function(err, items) {
                if(items.length > 0) {
                    // Successfully logged in
                    curr_email = email;
                    res.redirect(account_type);
                } else {
                    res.render('signin', {error: "Invalid login credentials."});
                }
            });
        });
      });
}

module.exports.logout = function(req, res) {
  console.log("logging out");
  curr_email = null;
}

module.exports.register= function(req, res) {
    console.log("Registering user");
    var email = req.body.email;
    var password = req.body.password;
    var account_type = req.body.account_type;
    //console.log(email + " " + password + " " + account_type);

    require('mongodb').connect(mongo.url, function(err, conn) {
        var collection = conn.collection('logins');

       // Look for a user with matching 
        collection.find({'email': email, 'account_type': account_type}, function(err, cursor) {
            if(err) throw err;
            cursor.toArray(function(err, items) {
                if(items.length > 0) {
                    res.render('register', {error: "A user already exists with this email and account type."});
                } else {
                    collection.insert({'email': email, 'password': password, 'account_type': account_type}, function(err, resp) {
                        if(err) throw err;
                        curr_email = email;
                        res.redirect(account_type);
                    });
                }
            });
        });
      });
}

module.exports.list_logins = function(req, res) {
    console.log("listing");
  require('mongodb').connect(mongo.url, function(err, conn) {
    var collection = conn.collection('logins');
   
    // list messages
    collection.find({"email" : curr_email}, function(err, cursor) {
      if(err) throw err;
      cursor.toArray(function(err, items) {
        res.writeHead(200, {'Content-Type': 'text/plain'});
        for (var i=0; i < items.length; i++) {
          res.write(JSON.stringify(items[i]) + "\n");
        }
        res.end();
      });
    });
  });
}

module.exports.submit_application = function(req, res) {
  console.log('submitting app');
  require('mongodb').connect(mongo.url, function(err, conn) {
    var collection = conn.collection('applicants');

    var application = {'firstname': req.body.firstname, 'lastname': req.body.lastname, 'personal_website': req.body.personal_website, 'salary': req.body.salary, 'github': req.body.github, 'challengepost': req.body.challengepost, 'answers': [req.body.q1, req.body.q2, req.body.q3, req.body.q4, req.body.q5]};

    collection.update({'_id': curr_email}, application, {'upsert': true}, function(err, resp) {
      if(err) throw err;

      // Analyze all of the answers
      console.log("About to search for personality insights on: ");
      //var content_list_container = {body: [{content: req.body.q1}]}
      //console.log(content_list_container);
      personalityInsights.profile({text: req.body.q1}, function(err, profile) {
        if(err) throw err;
        console.log("The profile is: ");
        console.log(profile);
      });

      res.redirect('applicant');
    });
  });
}

module.exports.load_application = function(req, res) {
  console.log("loading application");
  require('mongodb').connect(mongo.url, function(err, conn) {
    var collection = conn.collection('applicants');

    collection.find({'_id': curr_email}, function(err, resp) {
      console.log("returned application");
      if(err) throw err;
      resp.toArray(function(err, items) {
        if(err) throw err;
        console.log(items);
        if(items.length > 0) {
          //Application found
          console.log("set");
          items[0]["email"] = curr_email;
          res.render('applicant', items[0]);
        } else {
          res.render('applicant', {firstname: "", lastname: "", email: curr_email, personal_website: "", salary: "", github: "", challengepost: "", answers: ["", "", "", "", ""]});
        }
      });
    });
  });
}

