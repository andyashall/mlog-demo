'use strict'

const path = require('path')
const express = require('express')

const isDeveloping = process.env.NODE_ENV !== 'production'
const port = isDeveloping ? 3000 : process.env.PORT
const app = express()

const randomID = require('random-id')
const MongoClient = require('mongodb').MongoClient
  , assert = require('assert')
const bodyParser = require('body-parser')

app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())

const url = process.env.MONGO_URL

app.post('/webhook', (req, res) => {

  if (!req.body.result.action) {
    res.send("Not Authorized")
    return
  }

  let action = req.body.result.action,
      sid = req.body.sessionId,
      params = req.body.result.parameters

  console.log("Request Time: " + req.body.timestamp)
  console.log("Session ID: " + sid)
  console.log("Request Type: " + action)
  console.log("Params: " + params)

  // Actions

// Login
  if (action === "login") {
    var name = params.username.toLowerCase()
      login(name, (data) => {
        if (!data) {
          let resData = {
            speech: "User " + name + " not found, please try again or create an mlog account if you haven't already.",
            displayText: "User " + name + " not found, please try again or create an mlog account if you haven't already.",
            data: {},
            contextOut: [],
            source: "",
            followupEvent: {}
          }
          res.send(resData);
          return
        }
        let uid = data
        console.log(uid)
          let resData = {
            speech: "Logged in as " + name + ".",
            displayText: "Logged in as " + name + ".",
            data: {},
            contextOut: [{name:"userId", lifespan:120, parameters: {userId: uid}}],
            source: "",
            followupEvent: {}
          }
        res.send(resData)
        return
      })
    return   
  }

// Open specified meeting
  if (action === "openMeeting") {
    let contexts = req.body.result.contexts
    let n = params.meetingNumber
    let uid =  contexts.find((d) => {
        return d.name == "userid"
      }).parameters.userId
    if (uid !== null) {
      getMeetingId(uid, n, (data, err) => {
        if (data == "error") {
          let resData = {
            speech: "Error creating meeting",
            displayText: "Error creating meeting",
            data: {},
            contextOut: [],
            source: "",
            followupEvent: {}
          }
          res.send(resData);
          return         
        } else {
        let mid = data[0]._id
        let mt = data[0].title
        console.log(data)
        var tasks = [];    
        let resData = {
          speech: "Meeting opened: " + mt,
          displayText: "Meeting opened: " + mt,
          data: {},
          contextOut: [{name:"meetingId", lifespan:120, parameters: {meetingId: mid}}],
          source: "",
          followupEvent: {}
        }
        res.send(resData)
        return
      }
      })
    } else {
      let resData = {
        speech: "Please login to see your meeting",
        displayText: "Please login to see your meeting",
        data: {},
        contextOut: [],
        source: "",
        followupEvent: {}
      }
      res.send(resData)
      return     
    }
  }

// Read
  if (action === "readMeetings") {
    let contexts = req.body.result.contexts
    let uid =  contexts.find((d) => {
        return d.name == "userid"
      }).parameters.userId
    if (uid !== null) {
      findMeetings(uid, (data, err) => {
        if (data == "error") {
          let resData = {
            speech: "Error creating meeting",
            displayText: "Error creating meeting",
            data: {},
            contextOut: [],
            source: "",
            followupEvent: {}
          }
          res.send(resData);
          return         
        } else {
        console.log(data)
        var tasks = [];
        for (var x in data) {
          tasks.push([parseInt(x) + 1]+": "+data[x].title + ".\n");
        }       
        let resData = {
          speech: "Your latest meetings are:\n " + tasks.toString().replace(/,/g, ""),
          displayText: "Your latest meetings are:" + tasks.toString().replace(/,/g, ""),
          data: {},
          source: "",
          followupEvent: {}
        }
        res.send(resData)
        return
      }
      })
    } else {
      let resData = {
        speech: "Please login to see your meeting",
        displayText: "Please login to see your meeting",
        data: {},
        contextOut: [],
        source: "",
        followupEvent: {}
      }
      res.send(resData)
      return     
    }
  }

  if (action === "readActions") {
    let contexts = req.body.result.contexts
    let mid = contexts.find((d) => {
        return d.name == "meetingid"
      }).parameters.meetingId
    console.log(mid)
    let uid = contexts.find((d) => {
        return d.name == "userid"
      }).parameters.userId
    if (uid !== null) {
      findActions(mid, (data, err) => {
        if (!data) {
          let resData = {
            speech: "No actions found",
            displayText: "No actions found",
            data: {},
            source: "",
            followupEvent: {}
          }
          res.send(resData);
          return         
        } else {
        console.log(data)
        var tasks = [];
        for (var x in data) {
          tasks.push([parseInt(x) + 1]+": "+data[x].actionText + ".\n");
        }   
        var message = ""
        if (tasks.length == 0) {
          message = "There are no open actions in this meeting."
        } else {
          message = "Your open actions in this meeting are:\n " + tasks.toString().replace(/,/g, "")
        }     
        let resData = {
          speech: message,
          displayText: message,
          data: {},
          contextOut: [],
          source: "",
          followupEvent: {}
        }
        res.send(resData)
        return
      }
      })
    } else {
      let resData = {
        speech: "Please login to see your meeting",
        displayText: "Please login to see your meeting",
        data: {},
        contextOut: [],
        source: "",
        followupEvent: {}
      }
      res.send(resData)
      return     
    }
  }

  if (action === "readDecisions") {
    let contexts = req.body.result.contexts
    let mid = contexts.find((d) => {
        return d.name == "meetingid"
      }).parameters.meetingId
    console.log(mid)
    let uid = contexts.find((d) => {
        return d.name == "userid"
      }).parameters.userId
    if (uid !== null) {
      findDecisions(mid, (data, err) => {
        if (!data) {
          let resData = {
            speech: "No decisions found",
            displayText: "No decisions found",
            data: {},
            source: "",
            followupEvent: {}
          }
          res.send(resData);
          return         
        } else {
        console.log(data)
        var tasks = [];
        for (var x in data) {
          tasks.push([parseInt(x) + 1]+": "+data[x].decisionText + ".\n");
        }        
        var message = ""
        if (tasks.length == 0) {
          message = "There are no decisions in this meeting."
        } else {
          message = "Your decisions in this meeting are:\n " + tasks.toString().replace(/,/g, "")
        }   
        let resData = {
          speech: message,
          displayText: message,
          data: {},
          contextOut: [],
          source: "",
          followupEvent: {}
        }
        res.send(resData)
        return
      }
      })
    } else {
      let resData = {
        speech: "Please login to see your meeting",
        displayText: "Please login to see your meeting",
        data: {},
        contextOut: [],
        source: "",
        followupEvent: {}
      }
      res.send(resData)
      return     
    }
  }

  if (action === "readRisks") {
    let contexts = req.body.result.contexts
    let mid = contexts.find((d) => {
        return d.name == "meetingid"
      }).parameters.meetingId
    console.log(mid)
    let uid = contexts.find((d) => {
        return d.name == "userid"
      }).parameters.userId
    if (uid !== null) {
      findRisks(mid, (data, err) => {
        if (!data) {
          let resData = {
            speech: "No risks found",
            displayText: "No risks found",
            data: {},
            source: "",
            followupEvent: {}
          }
          res.send(resData);
          return         
        } else {
        console.log(data)
        var tasks = [];
        for (var x in data) {
          tasks.push([parseInt(x) + 1]+": "+data[x].riskText + ".\n");
        }       
        var message = ""
        if (tasks.length == 0) {
          message = "There are no risks in this meeting."
        } else {
          message = "Your open risks in this meeting are:\n " + tasks.toString().replace(/,/g, "")
        }   
        let resData = {
          speech: message,
          displayText: message,
          data: {},
          contextOut: [],
          source: "",
          followupEvent: {}
        }
        res.send(resData)
        return
      }
      })
    } else {
      let resData = {
        speech: "Please login to see your meeting",
        displayText: "Please login to see your meeting",
        data: {},
        contextOut: [],
        source: "",
        followupEvent: {}
      }
      res.send(resData)
      return     
    }
  }

  if (action === "readInfo") {
    let contexts = req.body.result.contexts
    let mid = contexts.find((d) => {
        return d.name == "meetingid"
      }).parameters.meetingId
    console.log(mid)
    let uid = contexts.find((d) => {
        return d.name == "userid"
      }).parameters.userId
    if (uid !== null) {
      findDecisions(mid, (data, err) => {
        if (!data) {
          let resData = {
            speech: "No information found",
            displayText: "No information found",
            data: {},
            source: "",
            followupEvent: {}
          }
          res.send(resData);
          return         
        } else {
        console.log(data)
        var tasks = [];
        for (var x in data) {
          tasks.push([parseInt(x) + 1]+": "+data[x].infoText + ".\n");
        }       
        var message = ""
        if (tasks.length == 0) {
          message = "There is no information in this meeting."
        } else {
          message = "Your information in this meeting are:\n " + tasks.toString().replace(/,/g, "")
        }    
        let resData = {
          speech: message,
          displayText: message,
          data: {},
          contextOut: [],
          source: "",
          followupEvent: {}
        }
        res.send(resData)
        return
      }
      })
    } else {
      let resData = {
        speech: "Please login to see your meeting",
        displayText: "Please login to see your meeting",
        data: {},
        contextOut: [],
        source: "",
        followupEvent: {}
      }
      res.send(resData)
      return     
    }
  }

  //  if no user please login 

// Create
  if (action === "createMeeting") {
    var name = params.meetingName
    console.log("create a meting called " + params.meetingName)
    let contexts = req.body.result.contexts
    let uid =  contexts.find((d) => {
        return d.name == "userid"
      }).parameters.userId
    if (uid !== null) {
      createMeeting(name, uid, (data, err) => {
        if (data == "error") {
          let resData = {
            speech: "Error creating meeting",
            displayText: "Error creating meeting",
            data: {},
            contextOut: [],
            source: "",
            followupEvent: {}
          }
          res.send(resData);
          return         
        } else {
        let mid = data
        let resData = {
          speech: "Meeting created",
          displayText: "Meeting created",
          data: {},
          contextOut: [{name:"meetingId", lifespan:120, parameters: {meetingId: mid}}],
          source: "",
          followupEvent: {}
        }
        res.send(resData)
        return
      }
      })
    } else {
      let resData = {
        speech: "Please login to create a meeting",
        displayText: "Please login to create a meeting",
        data: {},
        contextOut: [],
        source: "",
        followupEvent: {}
      }
      res.send(resData)
      return     
    }
  }

  if (action === "createAction") {
    var name = params.actionName
    console.log("create a action called " + params.actionName)
    let contexts = req.body.result.contexts
    if (contexts.length !== 0) {
      let uid =  contexts.find((d) => {
          return d.name == "userid"
        }).parameters.userId
      let mid = contexts.find((d) => {
          return d.name == "meetingid"
        }).parameters.meetingId
      createAction(name, uid, mid, (data, err) => {
        if (data == "error") {
          let resData = {
            speech: "Error creating action",
            displayText: "Error creating action",
            data: {},
            contextOut: [],
            source: "",
            followupEvent: {}
          }
          res.send(resData);
          return         
        } else {
        let resData = {
          speech: "Action created",
          displayText: "Action created",
          data: {},
          contextOut: [],
          source: "",
          followupEvent: {}
        }
        res.send(resData)
        return
      }
      })
    }
  }

  if (action === "createDecision") {
    var name = params.decisionName
    console.log("create a decision called " + params.decisionName)
    let contexts = req.body.result.contexts
    if (contexts.length !== 0) {
      let uid =  contexts.find((d) => {
          return d.name == "userid"
        }).parameters.userId
      let mid = contexts.find((d) => {
          return d.name == "meetingid"
        }).parameters.meetingId
      createDecision(name, uid, mid, (data, err) => {
        if (data == "error") {
          let resData = {
            speech: "Error creating decision",
            displayText: "Error creating decision",
            data: {},
            contextOut: [],
            source: "",
            followupEvent: {}
          }
          res.send(resData);
          return         
        } else {
        let resData = {
          speech: "Decision created",
          displayText: "Decision created",
          data: {},
          contextOut: [],
          source: "",
          followupEvent: {}
        }
        res.send(resData)
        return
      }
      })
    }
  }

  if (action === "createRisk") {
    var name = params.riskName
    console.log("create an risk called " + params.riskName)
    let contexts = req.body.result.contexts
    if (contexts.length !== 0) {
      let uid =  contexts.find((d) => {
          return d.name == "userid"
        }).parameters.userId
      let mid = contexts.find((d) => {
          return d.name == "meetingid"
        }).parameters.meetingId
      createRisk(name, uid, mid, (data, err) => {
        if (data == "error") {
          let resData = {
            speech: "Error creating risk",
            displayText: "Error creating risk",
            data: {},
            contextOut: [],
            source: "",
            followupEvent: {}
          }
          res.send(resData);
          return         
        } else {
        let resData = {
          speech: "Risk created",
          displayText: "Risk created",
          data: {},
          contextOut: [],
          source: "",
          followupEvent: {}
        }
        res.send(resData)
        return
      }
      })
    }
  }

  if (action === "createInfo") {
    var name = params.infoName
    console.log("create an info called " + params.infoName)
    let contexts = req.body.result.contexts
    if (contexts.length !== 0) {
      let uid =  contexts.find((d) => {
          return d.name == "userid"
        }).parameters.userId
      let mid = contexts.find((d) => {
          return d.name == "meetingid"
        }).parameters.meetingId
      createInfo(name, uid, mid, (data, err) => {
        if (data == "error") {
          let resData = {
            speech: "Error creating info",
            displayText: "Error creating info",
            data: {},
            contextOut: [],
            source: "",
            followupEvent: {}
          }
          res.send(resData);
          return         
        } else {
        let resData = {
          speech: "Information created",
          displayText: "Information created",
          data: {},
          contextOut: [],
          source: "",
          followupEvent: {}
        }
        res.send(resData)
        return
      }
      })
    }
  }

})

// Funcs

const login = (name, callback) => {
  MongoClient.connect(url, (err, db) => {
    assert.equal(null, err)
    // Need to save session id and uid to sessions collection
    var user = db.collection('users').findOne({username: name}, (err, doc) => {
      if (doc) {
        callback(doc._id)
        db.close()
      } else {
        callback(err)
        db.close()
      }
    })
  })
}

const createMeeting = (name, userId, callback) => {

  MongoClient.connect(url, (err, db) => {
    assert.equal(null, err)
    var Meetings = db.collection('meetings')
    var meetingUrl = createUrl(name)
    Meetings.insertOne({
      _id: randomID(20),
      creator: userId,
      created: new Date(),
      book: "Google",
      title: name,
      url: meetingUrl,
      body: "",
      attendeesString: [userId],
      actions: 0,
      decisions: 0,
      risks: 0,
      info: 0
    },
    (err, result) => {
        assert.equal(err, null)
        console.log("Meeting Created")
        var meetingId = result.insertedId
        callback(meetingId)
        db.close()
      }
    )
  })  

} 

function createUrl(title) {
    var dirty = title.replace(/-/g, "").replace(/\//g, "-").replace(/\s+/g, '-').toLowerCase(),
        symToText = dirty.replace(/&/g, "and").replace(/@/g, "at"),
        meetingUrl = symToText.replace(/[|&;$%@"<>()+,]/g, "") + "-" + getRandom(5);
    return meetingUrl;  
};

function getRandom(length) {
return Math.floor(Math.pow(10, length-1) + Math.random() * 9 * Math.pow(10, length-1))
}  

const createAction = (actionText, userId, meetingId, callback) => {
  MongoClient.connect(url, (err, db) => {
    assert.equal(null, err)
    var Actions = db.collection('actions')
    Actions.insertOne({
      _id: randomID(20),
      creator: userId,
      created: new Date(),
      who: "Google",
      actionText: actionText,
      meetingId: meetingId,
      completeBy: new Date(),
      completed: ""
    },
    (err, result) => {
        // Meetings.update(meetingId, {$inc: {
        //   actions: 1
        // }})
        assert.equal(err, null)
        console.log("Action Created")
        callback(result)
        db.close()
      }
    )
  })  
}

const createDecision = (decisionText, userId, meetingId, callback) => {
  MongoClient.connect(url, (err, db) => {
    assert.equal(null, err)
    var Decisions = db.collection('decisions')
    Decisions.insertOne({
      _id: randomID(20),
      creator: userId,
      created: new Date(),
      who: "Google",
      decisionText: decisionText,
      meetingId: meetingId,
      completed: ""
    },
    (err, result) => {
        // Meetings.update(meetingId, {$inc: {
        //   decisions: 1
        // }})
        assert.equal(err, null)
        console.log("Decision Created")
        callback(result)
        db.close()
      }
    )
  })  
}

const findMeetings = (uid, callback) => {
    MongoClient.connect(url, (err, db) => {
      assert.equal(null, err)
      var Meetings = db.collection('meetings')
      Meetings.find({attendeesString: uid}, {sort: {created: -1}}).limit(5).toArray((err,data) => {
        callback(data)
      })
    })
}

const findActions = (mid, callback) => {
    MongoClient.connect(url, (err, db) => {
      assert.equal(null, err)
      var Actions = db.collection('actions')
      Actions.find({$and: [{meetingId: mid}, {completed: ""}]}, {sort: {completeBy: -1}}).toArray((err,data) => {
        callback(data)
      })
    })
}

const findDecisions = (mid, callback) => {
    MongoClient.connect(url, (err, db) => {
      assert.equal(null, err)
      var Decisions = db.collection('decisions')
      Decisions.find({meetingId: mid}, {sort: {completeBy: -1}}).toArray((err,data) => {
        callback(data)
      })
    })
}

const findRisks = (mid, callback) => {
    MongoClient.connect(url, (err, db) => {
      assert.equal(null, err)
      var Risks = db.collection('risks')
      Risks.find({$and: [{meetingId: mid}, {completed: ""}]}, {sort: {completeBy: -1}}).toArray((err,data) => {
        callback(data)
      })
    })
}

const findInfo = (mid, callback) => {
    MongoClient.connect(url, (err, db) => {
      assert.equal(null, err)
      var Info = db.collection('info')
      Info.find({meetingId: mid}, {sort: {completeBy: -1}}).toArray((err,data) => {
        callback(data)
      })
    })
}

const getMeetingId = (uid, n, callback) => {
    MongoClient.connect(url, (err, db) => {
      assert.equal(null, err)
      let Meetings = db.collection('meetings')
      let ski = parseInt(n) - 1
      Meetings.find({attendeesString: uid}, {sort: {created: -1}}).skip(ski).limit(1).toArray((err,data) => {
        callback(data)
      })
    })
}

const createRisk = (riskText, userId, meetingId, callback) => {
  MongoClient.connect(url, (err, db) => {
    assert.equal(null, err)
    var Risks = db.collection('risks')
    Risks.insertOne({
      _id: randomID(20),
      creator: userId,
      created: new Date(),
      who: "Google",
      riskText: riskText,
      meetingId: meetingId,
      weighting: "red",
      weightingNo: 1,
      completed: ""
    },
    (err, result) => {
        // Meetings.update(meetingId, {$inc: {
        //   risks: 1
        // }})
        assert.equal(err, null)
        console.log("Risk Created")
        callback(result)
        db.close()
      }
    )
  })  
}

const createInfo = (infoText, userId, meetingId, callback) => {
  MongoClient.connect(url, (err, db) => {
    assert.equal(null, err)
    var Info = db.collection('info')
    Info.insertOne({
      _id: randomID(20),
      creator: userId,
      created: new Date(),
      who: "Google",
      infoText: infoText,
      meetingId: meetingId,
      completed: ""
    },
    (err, result) => {
        // Meetings.update(meetingId, {$inc: {
        //   info: 1
        // }})
        assert.equal(err, null)
        console.log("Information Created")
        callback(result)
        db.close()
      }
    )
  })  
}

app.listen(port, '0.0.0.0', (err) => {
  if (err) {
    console.log(err)
  }
  console.info('==> 🌎 Listening on port %s.', port, port)
})