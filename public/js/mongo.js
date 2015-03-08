

'use strict';

var curr_email = null,
  bluemix = require('../../config/bluemix'),
  watson = require('watson-developer-cloud-alpha'),
  extend = require('util')._extend,
  https = require('https'),
  hippie = require('hippie');
if (process.env.VCAP_SERVICES) {
   var env = JSON.parse(process.env.VCAP_SERVICES);
   var mongo = env['mongodb-2.4'][0].credentials;
} else {
   var mongo = {
        "url": "mongodb://localhost/db"
      }
};

  /**
   * Returns a 'flattened' version of the traits tree, to display it as a list
   * @return array of {id:string, title:boolean, value:string} objects
   */
  function flatten( /*object*/ tree) {
    var arr = [],
      f = function(t, level) {
        if (!t) return;
        if (level > 0 && (!t.children || level !== 2)) {
          arr.push({
            'id': t.name,
            'title': t.children ? true : false,
            'value': (typeof (t.percentage) !== 'undefined') ? Math.floor(t.percentage * 100) + '%' : '',
          });
        }
        if (t.children && t.id !== 'sbh') {
          for (var i = 0; i < t.children.length; i++) {
            f(t.children[i], level + 1);
          }
        }
      };
    f(tree, 0);
    return arr;
  }

// if bluemix credentials exists, then override local
var pers_credentials = extend({
    version: 'v2',
    url: 'https://gateway.watsonplatform.net/personality-insights/api',
    username: '206b0a26-dcdd-4400-9b51-43550c6c1cdc',
    password: 'sNocS9xzpZlm'
}, bluemix.getServiceCreds('personality_insights')); // VCAP_SERVICES

// Create the service wrapper
var personalityInsights = new watson.personality_insights(pers_credentials);

// if bluemix credentials exists, then override local
var to_credentials = extend({
  version: 'v1',
  username: '<username>',
  password: '<password>'
}, bluemix.getServiceCreds('tradeoff_analytics')); // VCAP_SERVICES

// Create the service wrapper
var tradeoffAnalytics = watson.tradeoff_analytics(to_credentials);

module.exports.getEmail = function() {
  return curr_email;
}

module.exports.createTradeoff = function(req, res) {
  console.log('tradeoff_analytics');

  
  require('mongodb').connect(mongo.url, function(err, conn) {
        var collection = conn.collection('companyideals');
        collection.find({'_id': curr_email}, function(err, cursor) {
          if(err) throw err;
          cursor.toArray(function(err, items) {
            // Get company ideals
            var companyideals = items[0];
            console.log("Company Ideals: \n" + companyideals);

            require('mongodb').connect(mongo.url, function(err, conn) {
              collection = conn.collection('analysis');
              collection.find({}, function(err, cursor) {
                if(err) throw err;
                // Retrieve all analysis documents
                cursor.toArray(function(err, items) {
                  if(err) throw err;
                  var analysis_arr = items;
                  console.log("Analysis Array: \n" + analysis_arr);
                  
                  // Determine problems json file
                  // var problems = {"subject": "jobs", "columns": [
                  //   "key": 
                  // ]};

                  res.render('ideal.html');

                });
              });
          });
        });
  });
});
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
  var mongodb = require('mongodb');
  mongodb.connect(mongo.url, function(err, conn) {
    var collection = conn.collection('applicants');

    

    hippie()
    .header("user-agent", "derpbot")
    .json().get('https://api.github.com/users/' + req.body.github)
    .expectStatus(200)
    .end(function(err, resp, body) {
        if (err) throw err;
      // Data reception is done, do whatever with it!
      var github_data = body;
      console.log(github_data);
      var github_score = (github_data['public_repos'] + github_data['public_gists']) * .3 + 
                github_data['followers'] * .1 +
                github_data['following'] + .6;

      var answers_arr = [req.body.q1, req.body.q2, req.body.q3, req.body.q4, req.body.q5];
      var application = {'firstname': req.body.firstname, 'lastname': req.body.lastname, 'personal_website': req.body.personal_website, 'salary': req.body.salary, 'github': req.body.github, 'github_repos_and_gists': github_data["public_repos"] + github_data["public_gists"], 'github_followers' : github_data['followers'], 'github_following': github_data['following'], 'github_score': github_score, 'challengepost': req.body.challengepost, 'answers': answers_arr};

      collection.update({'_id': curr_email}, application, {'upsert': true}, function(err, resp) {
        if(err) throw err;

        // Analyze all of the answers
        // Concatenate the answers together and send to IBM.
        var answers = '';
        for(var index in answers_arr) {
          answers += answers_arr[index] + '\n';
        }

        personalityInsights.profile({text: answers}, function(err, profile) {
          if(err) console.log(JSON.stringify(err));
          var data = flatten(profile.tree);
          mongodb.connect(mongo.url, function(err, conn) {
            var coll = conn.collection('analysis');
            coll.update({'_id': curr_email}, {'_id': curr_email, 'data': data}, {'upsert': true}, function(err, resp) {
              if(err) throw err;

              res.redirect('applicant');
            });
          });
        });
      });
    });
  });
}

module.exports.inputideals = function(req, res) {
  console.log("logging ideals");
  require('mongodb').connect(mongo.url, function(err, conn) {
    var collection = conn.collection('companyideals');

    var ideals = {'Openness': req.body.Openness, 'Adventurousness': req.body.Adventurousness, 'Artistic_interests': req.body.Artistic_interests, 'Emotionality': req.body.Emotionality, 'Imagination': req.body.Imagination, 'Intellect': req.body.Intellect, 'Authority_challenging': req.body.Authority_challenging, 'Conscientiousness': req.body.Conscientiousness, 'Achievement_striving': req.body.Achievement_striving, 'Cautiousness': req.body.Cautiousness, 'Dutifulness': req.body.Dutifulness, 'Orderliness': req.body.Orderliness, 'Self_discipline': req.body.Self_discipline, 'Self_efficacy': req.body.Self_efficacy, 'Extraversion': req.body.Extraversion, 'Activity_level': req.body.Activity_level, 'Assertiveness': req.body.Assertiveness, 'Cheerfulness': req.body.Cheerfulness, 'Excitement_seeking': req.body.Excitement_seeking, 'Outgoing': req.body.Outgoing, 'Gregariousness': req.body.Gregariousness, 'Agreeableness': req.body.Agreeableness, 'Altruism': req.body.Altruism, 'Cooperation': req.body.Cooperation, 'Modesty': req.body.Modesty, 'Uncompromising': req.body.Uncompromising, 'Sympathy': req.body.Sympathy, 'Trust': req.body.Trust};

    collection.update({'_id': curr_email}, {'_id': curr_email, 'ideals': ideals}, {'upsert': true}, function(err, resp) {
      if (err) throw err;
      res.redirect('employer');
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

