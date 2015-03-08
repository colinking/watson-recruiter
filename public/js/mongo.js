

'use strict';

if (process.env.VCAP_SERVICES) {
   var env = JSON.parse(process.env.VCAP_SERVICES);
   var mongo = env['mongodb-2.4'][0].credentials;
} else {
   var mongo = {
        "url": "mongodb://localhost/db"
      }
};

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
                    res.redirect(account_type);
                } else {
                    res.render('signin', {error: "Invalid login credentials."});
                }
            });
        });
      });
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
    collection.find({"email" : "colin"}, function(err, cursor) {
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

    var application = {'firstname': req.body.firstname, 'lastname': req.body.lastname, 'email': req.body.email, 'personal_website': req.body.personal_website, 'salary': req.body.salary, 'github': req.body.github, 'projecteuler': req.body.projecteuler, 'challengepost': req.body.challengepost, 'answers': [req.body.q1, req.body.q2, req.body.q3, req.body.q4, req.body.q5]};

    collection.update({'_id': email}, application, {'upsert': true}, function(err, resp) {
      if(err) throw err;
      console.log("returned and inserted");
      console.log(resp);
    });
  });
}
