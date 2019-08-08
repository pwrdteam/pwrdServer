'use strict';
const functions = require('firebase-functions');
const { WebhookClient } = require('dialogflow-fulfillment');
const {Text, Card, Suggestion} = require('dialogflow-fulfillment');
const dialogflow = require('dialogflow');
const uuid = require('uuid');
const express = require('express');
const cors = require('cors');
const bodyParser  = require('body-parser');
const jsforce = require('jsforce');
const axios = require('axios');
const app = express();

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements
const sessionId = uuid.v4,
  //username ="pwrd-zg46@force.com",
  username ="pwrdsumit@powerweave.com",
  SecurityToken ="TszDHeS5nuvfDlli3I6RU7mY",
  ConsumerKey = "3MVG9G9pzCUSkzZthsJ3o.DCpCyp3y5Ylr0Z9vr7MM8d.OQ7KfRGn6OkC2Ikcmm4b2PmtdyxbjgQBFUdVuytN",
  ConsumerSecret = "ACE5D3C6427268B9FB8829F1E41CBECD70CB575E3BAC2CF7782D69B2F508F40A",
  CallbackURL = "https://ap15.salesforce.com//oauth2/callback",
  password = "power123TszDHeS5nuvfDlli3I6RU7mY";  
  

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));

var conn = new jsforce.Connection({
    // you can change loginUrl to connect to sandbox or prerelease env.
    //Salesforce.com Enterprise Web Services API Version 46.0
    oauth2 : {
      // you can change loginUrl to connect to sandbox or prerelease env.
      loginUrl : 'https://login.salesforce.com',
      clientId : ConsumerKey,
      clientSecret : ConsumerSecret,
      redirectUri : CallbackURL
    },
    instanceUrl: 'https://ap15.salesforce.com',
    accessToken: SecurityToken
});

const fnSalesforceLogin = (req, res) => {
  conn.login(username, password, function(err, userInfo) {
    if (err) { console.error(err);
      return res.json({msg: `salesforceLogin Unsuccessfully!`,
      username:username,password:password});
    }
    // Now you can get the access token and instance URL information.
    // Save them to establish connection next time.
    console.log('conn.accessToken',conn.accessToken);
    console.log('conn.instanceUrl',conn.instanceUrl);
    // logged in user property
    console.log("User ID: " + userInfo.id);
    console.log("Org ID: " + userInfo.organizationId);
    res.json({msg: 'salesforceLogin Successfully!',accessToken:conn.accessToken
    ,instanceUrl:conn.instanceUrl,User_ID:userInfo.id,Org_ID:userInfo.organizationId});
  });  
//res.json({msg: 'salesforce Login  Failed!',username:username,password:password});
}

const fnGetSFContacts = (req, res) => {
  var query1 = "SELECT Id,Name,Phone,Email,AccountId,OwnerId,CreatedDate from Contact where Name LIKE '%Singh%'";
  var records = [],res;  
    conn.query(query1, function(err, result) {
      if (err) { return console.error('err in query retrival: '+ err); }
      res = result;
      console.log("total : " + result.totalSize);
      console.log("fetched : " + result.records.length);
      console.log("done ? : " + result.done);
      if (!result.done) {
        // you can use the locator to fetch next records set.
        // Connection#queryMore()
        console.log("next records URL : " + result.nextRecordsUrl);
      }
    });
    res.json({msg: 'fnGetSFContacts called!',records:res.records
    ,totalSize:res.totalSize});
}

app.get('/salesforceLogin', fnSalesforceLogin);
app.get('/getSFContacts', fnGetSFContacts);

app.get('/', function (req, res) {
  res.json({Message: "Server is running successfully!"})
});

app.post('/send-msg',(req,res)=>{
  console.log('req.body',req.body.input);
  runSample(req.body.input).then(data =>{
      res.send({'Reply': data});
  })
})

app.post('/sendMsg',(req,res)=>{
    console.log('req.body',req.body.MSG);
    runSample(req.body.MSG).then(data =>{
        res.send({'Reply': data});
    })
})

app.post('/cors', function (req, res, next) {
  res.json({msg: 'This is CORS-enabled for all origins!',
  data: req.body
});
});

app.post('/dfLocally', function (req, res, next) {
  let resData = { msg: 'dfLocally called.',
      reqData: req.body
    }
    console.log('dfLocally resData ',resData);
    res.json(resData);
});

// app.post('/df', function (req, res, next) {
//   let resData = { msg: 'df endpoint',
//       reqData: req.body
//     }
//     console.log('resData ',JSON.stringify((resData)));
//     console.log('req headers: ' + JSON.stringify(req.headers));
//     console.log('req body: ' + JSON.stringify(req.body));    
//     // axios.post('http://172.20.3.205:5000/dfLocally', req.body)
//     // .then(res => {
//     //     console.log('axios.post fetch res',res.data);
//     // })
//     // .catch(error => console.error('Error in axios.post fetch:', error));          
//     res.json(resData);
// });

const dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));

  function welcome(agent) {
    agent.add(`Welcome to my agent!`);
  }

  function fallback(agent) {
    agent.add(`I didn't understand`);
    agent.add(`I'm sorry, can you try again?`);
  }
  
  function fnGetSFContacts(agent) {
    agent.add(`I'm from Salesforce.`);
    agent.add(`Happy to help you.`);
  }

  let intentMap = new Map();
  //intentMap.set('Default Welcome Intent', welcome);
  intentMap.set('getSFContacts', fnGetSFContacts);
  agent.handleRequest(intentMap);
});

app.post('/df', dialogflowFirebaseFulfillment);

/**
 * Send a query to the dialogflow agent, and return the query result.
 * @param {string} projectId The project to be used
 */
async function runSample(msg,projectId = 'demolt-uhyhbh') {
  // A unique identifier for the given session
  const sessionId = uuid.v4();
  debugger;

  // Create a new session
  const sessionClient = new dialogflow.SessionsClient({
      keyFilename: "C:/Users/sumit.singh/Documents/Work/PoC/PixelOfImage/Works/Javascript/Node/New folder/tcsdemo/Server/demolt-6eaffb522ebe.json"
  });
  const sessionPath = sessionClient.sessionPath(projectId, sessionId);
 
  // The text query request.
  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        // The query to send to the dialogflow agent
        text: (msg)?msg:'hello',
        // The language used by the client (en-US)
        languageCode: 'en-US',
      },
    },
  };
 
  // Send request and log result
  const responses = await sessionClient.detectIntent(request);
  //console.log('Detected intent');
  const result = responses[0].queryResult;
  let responseMsg = result.fulfillmentText;
  //console.log(`Query: ${result.queryText}`);
  console.log(`Response: ${result.fulfillmentText}`);
  if (result.intent.displayName === "Salesforce") {
    responseMsg = "It Works";
  }else if (result.intent) {
    //console.log(`Intent: ${result.intent.displayName}`);
  }  else {
    //console.log(`No intent matched.`);
  }
  return responseMsg;
}

const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server is running on port ${ port }`);
});
