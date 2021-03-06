'use strict';
const functions = require('firebase-functions');
const { WebhookClient } = require('dialogflow-fulfillment');
const {Text, Card, Suggestion} = require('dialogflow-fulfillment');
const { dialogflow } = require('actions-on-google');
//const dialogflow = require('dialogflow');
const uuid = require('uuid');
const express = require('express');
const cors = require('cors');
const bodyParser  = require('body-parser');
const jsforce = require('jsforce');
const axios = require('axios');
const app = express();
app.locals={
  dfBanner:{
    isSecondFound: 'No',
    preReqJson: ''
  }
};
app.locals.title = 'dfBanner App';

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

//const fuSFLogin = () => {  }
  const  fnSFLogin = conn.login(username, password, function(err, userInfo) {
    if (err) { console.error('salesforce Login Failed:'+ err);
      return JSON.stringify({msg: `salesforce Login Failed!`,
      username:username, password:password});
    }
    // Now you can get the access token and instance URL information.
    // Save them to establish connection next time.
    console.log('conn.accessToken',conn.accessToken);
    console.log('conn.instanceUrl',conn.instanceUrl);
    // logged in user property
    console.log("User ID: " + userInfo.id);
    console.log("Org ID: " + userInfo.organizationId);
    return JSON.stringify({msg: 'salesforceLogin Successfully!',accessToken:conn.accessToken
    ,instanceUrl:conn.instanceUrl,User_ID:userInfo.id,Org_ID:userInfo.organizationId});
  });

const fnSalesforceLogin = (req, res) => {
  let LoginResult = fnSFLogin;
  console.log('LoginResult: ' +JSON.stringify(LoginResult));
  res.json(LoginResult);
}

app.post('/getSFDetails', (req, res) => {
  //var query = "SELECT Id,Name,Phone,Email,AccountId,OwnerId,CreatedDate from Contact where Name LIKE '%Singh%'";
  //var query = "select Count(Id) from Contact where Title LIKE '%SVP%'";
  //var query = "Select NumberofLocations__c from Account where Name LIKE '%Gas%'";
  let query = req.body.query;
  conn.query(query, function(err, result) {
      if (err) {  console.error('err in query retrival: '+ err);      
      return res.json({msg: 'fnGetSFContacts called!',err:err });
     }
      console.log("total : " + result.totalSize);
      console.log("fetched : " + result.records.length);
      // if (!result.done) {
      //   // you can use the locator to fetch next records set.
      //   // Connection#queryMore()
      //   console.log("next records URL : " + result.nextRecordsUrl);
      // }
      res.json({msg: 'fnGetSFContacts called!',totalSize:result.totalSize,
        records:result.records
      });
    });
});

app.get('/salesforceLogin', fnSalesforceLogin);
//app.get('/getSFContacts', fnGetSFContacts);

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

const dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
  
  let BaseUrl = "https://blooming-oasis-83185.herokuapp.com";
  //let BaseUrl = "http://127.0.0.1:5000";
  let Url = `${BaseUrl}/getSFDetails`;
  let queryText = '', allColumns='', reqData;

  function welcome(agent) {
    agent.add(`Welcome to my agent!`);
  }

  function fallback(agent) {
    agent.add(`I didn't understand`);
    agent.add(`I'm sorry, can you try again?`);
  }
  
  async function fnGetSFContacts(agent) {
    const [Name,Column] = [agent.parameters['SFContactsNames'],agent.parameters['SFContactsColumn']];        
    let conv = agent.conv();
    if (!!Name && !!Column) {      
      Column.forEach((value, index, array)=>{
        allColumns += value + ', ';
      });
      allColumns = allColumns.substr(0,allColumns.length-2);      
      queryText = `SELECT ${allColumns} from Contact Where Name LIKE '%${Name==='All'?'':Name}%'`;
    }
    reqData = { query: queryText};

    await axios.post(Url, reqData)
      .then((res) => {
          //console.log('axios.post res',res.data);
          let responseText='';
          //agent.add(`I'm from Salesforce.`);
          responseText = (res.data.hasOwnProperty("records") && res.data.records.length > 0) 
            ? new Text(JSON.stringify(res.data.records)): (res.data.hasOwnProperty("err"))
            ?"Something went wrong, Try Later!":"Records are not available.";
          agent.add(responseText);
          agent.add(`Happy to help you.`);
      })
      .catch((err) => {
          console.log('axios.post err',err);
          agent.add("Internal Server Error");
      });
  }

  async function fnGetSFAccounts(agent) {
    const [Name,Column] = [agent.parameters['SFAccountName'],agent.parameters['SFAccountColumn']];
    if (!!Name && !!Column) {      
      Column.forEach((value, index, array)=>{
        allColumns += value + ', ';
      });
      allColumns = allColumns.substr(0,allColumns.length-2);      
      queryText = `SELECT ${allColumns} from Account Where Name LIKE '%${Name==='All'?'':Name}%'`;
    }
    reqData = { query: queryText};

    await axios.post(Url, reqData)
      .then((res) => {
          //console.log('axios.post res',res.data);
          let responseText='';
          //agent.add(`I'm from Salesforce.`);
          responseText = (res.data.hasOwnProperty("records") && res.data.records.length > 0) 
            ? new Text(JSON.stringify(res.data.records)): (res.data.hasOwnProperty("err"))
            ?"Something went wrong, Try Later!":"Records are not available.";
          agent.add(responseText);
          agent.add(`Happy to help you.`);
      })
      .catch((err) => {
          console.log('axios.post err',err);
          agent.add("Internal Server Error");
      });
  }
  
  async function fnGetSFOpportunity(agent) {
    const [Name,Column] = [agent.parameters['SFOpportunityName'],agent.parameters['SFOpportunityColumn']];
    if (!!Name && !!Column) {      
      Column.forEach((value, index, array)=>{
        allColumns += value + ', ';
      });
      allColumns = allColumns.substr(0,allColumns.length-2);      
      queryText = `SELECT ${allColumns} from Opportunity Where Name LIKE '%${Name==='All'?'':Name}%'`;
    }
    reqData = { query: queryText};

    await axios.post(Url, reqData)
      .then((res) => {
          //console.log('axios.post res',res.data);
          let responseText='';
          //agent.add(`I'm from Salesforce.`);
          responseText = (res.data.hasOwnProperty("records") && res.data.records.length > 0) 
            ? new Text(JSON.stringify(res.data.records)): (res.data.hasOwnProperty("err"))
            ?"Something went wrong, Try Later!":"Records are not available.";
          agent.add(responseText);
          agent.add(`Happy to help you.`);
      })
      .catch((err) => {
          console.log('axios.post err',err);
          agent.add("Internal Server Error");
      });
  }

  async function fnGetSFContactTitleCount(agent) {
    const [Title] = [agent.parameters['SFContactsTitle']];
    if (!!Title) {    
      queryText = `SELECT Count(Id) Total_Count from Contact Where Title LIKE '%${Title}%'`;
    }
    reqData = { query: queryText};

    await axios.post(Url, reqData)
      .then((res) => {
          //console.log('axios.post res',res.data);
          let responseText='';
          //agent.add(`I'm from Salesforce.`);
          responseText = (res.data.hasOwnProperty("records") && res.data.records.length > 0) 
            ? new Text(JSON.stringify(res.data.records)): (res.data.hasOwnProperty("err"))
            ?"Something went wrong, Try Later!":"Records are not available.";
          agent.add(responseText);
          agent.add(`Happy to help you.`);
      })
      .catch((err) => {
          console.log('axios.post err',err);
          agent.add("Internal Server Error");
      });
  }

  let intentMap = new Map();
  //intentMap.set('Default Welcome Intent', welcome);
  intentMap.set('getSFContacts', fnGetSFContacts);
  intentMap.set('getSFAccount', fnGetSFAccounts);
  intentMap.set('getSFOpportunity', fnGetSFOpportunity);
  intentMap.set('getSFContactTitleCount', fnGetSFContactTitleCount);
  agent.handleRequest(intentMap);  
});

app.post('/df', dialogflowFirebaseFulfillment);



const dialogflowAutoImarery = functions.https.onRequest((request, response) => {
  try {    
      // // console.log('dialogflowAutoImarery Request headers: ' + JSON.stringify(request.headers));
      // // console.log('dialogflowAutoImarery Request body: ' + JSON.stringify(request.body));
      
      // if ((!app.locals.dfBanner.isSecondFound) && request.body.hasOwnProperty('queryResult') && request.body.queryResult.hasOwnProperty('parameters') && request.body.queryResult.parameters.hasOwnProperty('products') && request.body.queryResult.parameters.products.length !=0) {
      //   app.locals.dfBanner.preReqJson.queryResult.parameters.products.push(request.body.queryResult.parameters.products[0]);
      //   request.body = app.locals.dfBanner.preReqJson;
      //   app.locals.dfBanner.isSecondFound = true;
      // }
      // if(request.body.hasOwnProperty('queryResult') && request.body.queryResult.hasOwnProperty('allRequiredParamsPresent') && request.body.queryResult.allRequiredParamsPresent){        
      //   if (request.body.queryResult.parameters.type.toLowerCase() === "web" && request.body.queryResult.parameters.products.length === 1) {          
      //     //request.body.queryResult.allRequiredParamsPresent = false;
      //     //request.body.queryResult.diagnosticInfo.end_conversation = false;
      //     //request.body.queryResult.intent.endInteraction = false;
      //     app.locals.dfBanner.preReqJson = request.body;
      //     app.locals.dfBanner.isSecondFound = false;
      //   }
      // }
      const agent = new WebhookClient({ request, response });
      function welcome(agent) {
        agent.add(`Welcome to my agent!`);
      }

      function fallback(agent) {
        agent.add(`I didn't understand`);
        agent.add(`I'm sorry, can you try again?`);
      }
      
      async function fnCreateBanner(agent) {
        // if (!app.locals.dfBanner.isSecondFound) {
        //   return agent.add(`Please provide second product for your web banner.`);
        // }
        const [type,background,products] = [agent.parameters['type'],agent.parameters['background'],agent.parameters['products']];
        let missingSlots = [];
        if (!type) { missingSlots.push('type'); }
        if (!background) { missingSlots.push('background'); }
        if (products.length === 0) { missingSlots.push('products'); }

        if (missingSlots.length === 1){
          agent.add(`Looks like you didn't provide the banner ${missingSlots[0]}, What is the banner ${missingSlots[0]}?`);
        }
        else if (missingSlots.length === 2){
            agent.add(`Ok, I need two more things, the banner ${missingSlots[0]} and ${missingSlots[1]} .`);
        }
        else if (missingSlots.length === 3){
            agent.add(`Ok, I need all 3 things still: the banner ${missingSlots[0]}, ${missingSlots[1]} and ${missingSlots[2]}`);
        } else {
          //let cntxt1 = agent.context.get('projects/saveuserdetails-f5541/agent/sessions/d7749a82-28b5-7ad1-ab24-c83494bd3d10/contexts/createbanner-followup');
          if(type.toLowerCase() == "web"){
            if(products.length >= 2){
                  agent.add(`It works.`);
                  agent.add(`You have added the data correctly.`); 
                  agent.add(`Your ${type} banner with ${background} background color having ${products[0]} and ${products[1]} as the products is ready.`);
              }
              else {
                agent.add(`Please specify two products for your web banner.`);
                // var context1 = {
                //   "name": "context2",
                //   "lifespanCount": 10,
                //   "parameters": {
                //     "products": [
                //       "ac"
                //     ],
                //     "type": "web",
                //     "background": "green"
                //   }
                // };
                // context1['parameters'] = {products,type,background};
                // agent.context.set(context1);
                // let cxt1 = agent.context.get('context1');
            }
          }
          else{
            agent.add(`It works.`);
            agent.add(`You have added the data correctly.`);
            agent.add(`Your ${type} banner with ${background} background color having ${products[0]} as the product is ready.`);
          }

        }
        
      }

      let intentMap = new Map();
      //intentMap.set('Default Welcome Intent', welcome);
      intentMap.set('createBanner', fnCreateBanner);
      agent.handleRequest(intentMap);
  } catch (error) {
    console.error('error in dialogflowAutoImarery: '+error);    
    response.json({'error in dialogflowAutoImarery': error});
  } 
});

app.post('/dfAutoImarery', dialogflowAutoImarery);


/*https://developers.google.com/actions/dialogflow/fulfillment#initialize_the_dialogflowapp_object
  // const app = dialogflow();
  // app.intent('getSFAccount', (conv) => {
  // conv.ask('Welcome to number echo! Say a number.');
  // });
  // app.intent('Input Number', (conv, {num}) => {
  // // extract the num parameter as a local string variable
  // conv.close(`You said ${num}`);
  // });
*/

/**
 * Send a query to the dialogflow agent, and return the query result.
 * @param {string} projectId The project to be used
 */


// async function runSample(msg,projectId = 'demolt-uhyhbh') {
//   // A unique identifier for the given session
//   const sessionId = uuid.v4();
//   debugger;

//   // Create a new session
//   /*Uncomment this 
//   const dialogflow = require('dialogflow');*/
//   const sessionClient = new dialogflow.SessionsClient({
//       keyFilename: "C:/Users/sumit.singh/Documents/Work/PoC/PixelOfImage/Works/Javascript/Node/New folder/tcsdemo/Server/demolt-6eaffb522ebe.json"
//   });
//   const sessionPath = sessionClient.sessionPath(projectId, sessionId);
 
//   // The text query request.
//   const request = {
//     session: sessionPath,
//     queryInput: {
//       text: {
//         // The query to send to the dialogflow agent
//         text: (msg)?msg:'hello',
//         // The language used by the client (en-US)
//         languageCode: 'en-US',
//       },
//     },
//   };
 
//   // Send request and log result
//   const responses = await sessionClient.detectIntent(request);
//   //console.log('Detected intent');
//   const result = responses[0].queryResult;
//   let responseMsg = result.fulfillmentText;
//   //console.log(`Query: ${result.queryText}`);
//   console.log(`Response: ${result.fulfillmentText}`);
//   if (result.intent.displayName === "Salesforce") {
//     responseMsg = "It Works";
//   }else if (result.intent) {
//     //console.log(`Intent: ${result.intent.displayName}`);
//   }  else {
//     //console.log(`No intent matched.`);
//   }
//   return responseMsg;
// }

const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server is running on port ${ port }`);
});
