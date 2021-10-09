const express = require("express");
const app = express();
const bodyparser = require("body-parser");

// Firebase configurations
const admin = require("firebase-admin");
const secretKeys = require("./permissions.json");
const firebase = require("firebase");
const { IdTokenClient } = require("google-auth-library");
const { response } = require("express");
var cors = require('cors')


admin.initializeApp({
  credential: admin.credential.cert(secretKeys),
});

// Firestore and Authentication
const firestore = admin.firestore();
const auth = admin.auth();

app.set("port", process.env.port || 3000);
app.use(bodyparser.json());
app.use(cors())


/** validation starts */
const { body, validationResult } = require("express-validator");
// const validation = {body, validationResult} 

/** validation starts */


/** 1. Create a function that register a user using firebase authentication,
and make sure that the user that is being created is linked to firestore users collection.
start */

// creating a user on authentication and firestore database
app.post(
  "/register",
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 6 }),
  body("name").isString(),
  body("surname").isString(),
  body("username").isString(),
  body("age").isInt({ max: 80, min: 18 }),
  body("admin").isBoolean(),
  (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
        age: "age must be between 18 and 80",
      });
    }
    const user = req.body;
    auth.createUser(user).then((userdata) => {
      firestore
        .collection("newUsers")
        .doc(""+userdata.uid)
        .set({
          name: user.name,
          displayName: user.username,
          email: user.email,
          surname: user.surname,
          age: user.age,
          admin: user.admin,
        })
        .then(() => {
          //user custom claims starts
          if (user.admin) {
            auth
              .createCustomToken(userdata.uid, { admin: true })
              .then(() => {
                res.status(200).json({
                  success: true,
                  message: "Registered successful as Admin",
                  userCreated: user,
                });
              })
              .catch((error) => {
                return res.status(5000).send(error.message);
              });
          } else if (user.admin === undefined || !user.admin) {
            auth
              .createCustomToken(userdata.uid, { admin: false })
              .then(() => {
                res.status(200).json({
                  success: true,
                  message: "Registered successful as a normal user",
                  userCreated: user,
                })
                .catch((error) => res.status(500).send(error.message)); //user custom claims ends
              });
          }
        })
    })
    .catch((error) => res.status(500).send(error.message)); //user custom claims ends
  });


/** 1. Create a function that register a user using firebase authentication,
and make sure that the user that is being created is linked to firestore users collection.
ends */

/**3.1 Get user by ID starts */
app.get("/user/:id", (req, res, next) =>{
  const id = req.params.id;
    firestore.collection("newUsers").doc(id).get().then( user=>{
      res.status(200).send({
        id : user.id,
        ...user.data()
      })
    }).catch(error => {
      res.status(500).json({success: false, message: "There is no user record corresponding to the provided identifier"})
      })
  
  
})
/**3.1 Get user by ID ends */


/**3.2 Update a user details starts*/
app.put('/users/:id', body('email').isEmail().normalizeEmail(),body('password').isLength({min: 6}), (req, res, next)=>{
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
      return res.status(400).json({
          success: false,
          errors: errors.array()
      });
  }
    
  const id = req.params.id;
  const user = req.body
      firestore.collection('newUsers').doc(id).update(user).then(response=>{
        res.status(200).json({success: true,
          message: id+' User has been updated successful',userCreated: user});
      }).catch(error => {
        res.status(500).json({success: false, message: "There is no user record corresponding to the provided identifier"})
        })
  
 
})
/**3.2 Update a user details ends*/


/** 3..4 Create requests that performs CRUD operations on skills start */

// create a skills doc where each id will be the same as the user's id
app.post("/skills/:id",body('name').isString(),body('lastUsed').isDate("dd/MM/yyyy"), body('developing').isBoolean(),body('rating').isNumeric({min: 1}), (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
      return res.status(400).json({
          success: false,
          errors: errors.array(),
          message: "Date Format: dd/MM/yyyy"

      });
  }

    let id = req.params.id;
    const skill = req.body;
        firestore.collection('skills').doc().set({
        id : req.params.id,
        developing : req.body.developing,
        duration: req.body.duration,
        lastUsed: req.body.lastUsed,
        name: req.body.name,
        rating: req.body.rating
        }).then(()=>{
         res.status(200).json({success: true,
          message: req.body.name+' has been added successful',skill});
     }).catch(error => {
        res.status(500).json({success: false, message: "There is no skill record corresponding to the provided identifier"})
        })
})

// get all skills for a certain user 
app.get('/user/:id', (req, res, next) =>{
    const id = req.params.id;
    const allSkills = [];
    firestore.collection('skills').get().then((skills) =>{
      skills.forEach(skill => {
        allSkills.push({
          id: skill.id,
          ...skill.data()
        })
      })
     const userSkills = allSkills.filter(skill => skill.id === id);

      res.status(200).send(userSkills);
    }).catch(error => {
      res.status(500).send(error.message);
    })
  })

  // get all users

  app.get('/users', (req, res, next) =>{
    const id = req.params.id;
    const allUsers = [];
    firestore.collection('newUsers').get().then((users) =>{
      users.forEach(user => {
        allUsers.push({
          id: user.id,
          ...user.data()
        })
      })
    //  const userSkills = allSkills.filter(skill => skill.id === id);

      res.status(200).send(allUsers);
    }).catch(error => {
      res.status(500).send(error.message);
    })
  })

// update one skill at a time for a user
  app.put('/skills/:id',body('name').isString(),body('lastUsed').isDate("dd/MM/yyyy"), body('developing').isBoolean(),body('rating').isNumeric({min: 1}), (req, res, next) =>{
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array(),
            message: "Date Format: dd/MM/yyyy"
  
        });
    }
    const id = req.params.id;
    const name = req.params.name;
    const newSkill = req.body;
      firestore.collection('skills').doc(id).update(newSkill).then(response =>{
        res.status(200).json({success: true,
          message: req.body.name+' has been updated successful',newSkill});
      }).catch(error => {
      res.status(500).json({success: false, message: "There is no skill record corresponding to the provided identifier"})
      })
  })

  // delete one user skill
app.delete('/skills/:id', (req, res, next) =>{
    const id = req.params.id;
      firestore.collection('skills').doc(id).delete().then(response =>{
        res.status(200).json({success: true,
          message: req.body.name+' has been deleted successful'});
      }).catch(error => {
      res.status(500).json({success: false, message: "There is no skill record corresponding to the provided identifier"})
      })
      
  })

/** 3..4 Create requests that performs CRUD operations on skills ends */

app.delete('/delete/:id', (req,res, next) =>{
  id = req.params.id;
  auth.deleteUser(id).then((userdata) => {
    firestore.collection("newUsers").doc(id).delete().then(response =>{
      res.status(200).json({success: true,
        message:'User has been deleted successful'});
    }).catch(error => {
        res.status(500).json({success: false, message: "There is no user record corresponding to the provided identifier"})
      })
  })
})

app.listen(process.env.PORT || app.get("port"), (server) => {
  console.info(`Server listen on port ${app.get("port")}`);
});
