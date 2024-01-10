import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose, { Schema } from "mongoose";
import multer from "multer";
import { MongoDB_Url, Port, PrivateKey } from "./PrivateKey.js";
const app = express();
const port = Port;
const mult = multer();

dotenv.config();

app.use(cors());

app.use(bodyParser.json());
app.use(mult.array());

mongoose.connect(MongoDB_Url);

const EventSchema = new Schema({
  img: String,
  heading: String,
  description: String,
  place: String,
  startDate: String,
  startTime: String,
  endTime: String,
  user: String,
});

const UserSchema = new Schema({
  username: String,
  password: String,
  name: String,
  email: String,
  accessip: String,
  token: String,
});

const Event = mongoose.model("Events", EventSchema);
const Users = mongoose.model("Users", UserSchema);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/signup", async (req, res) => {
  let uname = req.body.username,
    password = req.body.password,
    email = req.body.email,
    name = req.body.name,
    ip = req.ip;

  if (!(uname && password && email && name)) {
    res.json({ message: "Please Give all the details" }).status(400);
    return;
  }

  if (
    typeof uname !== "string" ||
    typeof password !== "string" ||
    typeof email !== "string" ||
    typeof name !== "string"
  ) {
    res.json({ message: "Please Give Details as String" });
    return;
  }

  const UserAlrd = await Users.findOne({ username: uname });
  if (UserAlrd) {
    res
      .json({
        message: "Username already chosen. Please Give another Username",
      })
      .status(403);
    return;
  }

  let token = jwt.sign({ username: uname }, PrivateKey, { expiresIn: "24h" });

  const user = new Users({
    username: uname,
    password: password,
    email: email,
    name: name,
    accessip: ip,
    token: token,
  });

  try {
    user.save().then(() => {
      res.json({ message: "Successfully Registered User", token: token });
    });
  } catch (e) {
    res.send("Some Error : " + e);
    return;
  }
});

app.post("/login", async (req, res) => {
  let uname = req.body.username,
    password = req.body.password;

  if (!(uname && password)) {
    res.json({ message: "Please Give required Information" });
    return;
  }

  if (typeof uname !== "string" || typeof password !== "string") {
    res.json({
      message: "Please Send Username and Password as String",
    });
  }

  const User = await Users.findOne({ username: uname });
  if (!User) {
    res.json({ message: "No User Found with Username" });
    return;
  }
  if (User.password === password) {
    let token = jwt.sign({ username: uname }, PrivateKey, { expiresIn: "24h" });

    res.json({ message: "Successfully Registered", token: token });
    return;
  } else {
    res.json({ message: "Sorry Wrong Password" });
  }
});

app.get("/auth", async (req, res) => {
  let token = req.headers.authorization;
  if (!token) {
    res.json({
      msg: "No auth token Found Please make sure you're logged in, try logging out and again loggin in, if still not fixed contact dev",
    });
    return;
  }

  try {
    const decoded = await jwt.verify(token, PrivateKey);
    const u = await Users.findOne({ username: decoded.username });

    if (!u) {
      res.json({ message: "Cannot Find that Username in db" });
      return;
    }

    let email = u.email,
      name = u.name,
      username = u.username;

    res.json({ message: "ok", email: email, name: name, username: username });
  } catch (err) {
    console.log(err);
    res.json({
      message:
        "Sorry Your Token is Invalid, please try logging out and in again",
    });
  }
});

const userauth = async (req, res, next) => {
  let token = req.headers.authorization;
  if (!token) {
    res.json({
      msg: "No auth token Found Please make sure you're logged in, try logging out and again loggin in, if still not fixed contact dev",
    });
    return;
  }

  try {
    const decoded = await jwt.verify(token, PrivateKey);
    const u = await Users.findOne({ username: decoded.username });

    if (!u) {
      res.json({ message: "Cannot Find that Username in db" });
      return;
    }

    req.usernameFromAuth = u.username;

    next();
  } catch (err) {
    console.log(err);
    res.json({
      message:
        "Sorry Your Token is Invalid, please try logging out and in again",
    });
  }
};

// Check For Event validation
const eventcheck = (req, res, next) => {
  let img = req.body.img,
    heading = req.body.heading,
    description = req.body.description,
    place = req.body.place,
    startDate = req.body.startDate,
    startTime = req.body.startTime,
    endTime = req.body.endTime;

  console.log(req.body);

  if (
    !(
      img &&
      heading &&
      description &&
      place &&
      startDate &&
      startTime &&
      endTime
    )
  ) {
    res.json({
      message: "Please Fill in all the details",
    });
    return;
  }

  if (startTime >= endTime) {
    res.json({
      message:
        "End Time should be after Start time! Are you sure you entered right time?",
    });
    return;
  }

  next();
};

//                       ADD Event
app.post("/add-event", userauth, eventcheck, (req, res) => {
  let img = req.body.img,
    heading = req.body.heading,
    description = req.body.description,
    place = req.body.place,
    startDate = req.body.startDate,
    startTime = req.body.startTime,
    endTime = req.body.endTime,
    username = req.usernameFromAuth;

  if (
    typeof img !== "string" ||
    typeof heading !== "string" ||
    typeof description !== "string" ||
    typeof place !== "string" ||
    typeof startDate !== "string" ||
    typeof startTime !== "string" ||
    typeof endTime !== "string"
  ) {
    res.json({
      message: "Please Only send desired things as text",
    });
    return;
  }

  const event = new Event({
    img: img,
    heading: heading,
    description: description,
    place: place,
    startDate: startDate,
    startTime: startTime,
    endTime: endTime,
    user: username,
  });

  try {
    event.save().then(() => {
      res.json({
        message: "Successfully Saved Event",
      });
    });
  } catch (e) {
    res.send("Some Error : " + e);
    return;
  }
});

//                      UPDATE EVENT DETAILS ( ID , USER )

app.post("/update-event", userauth, async (req, res) => {
  let id = req.headers.id;
  let username = req.usernameFromAuth;
  let updatedDetails = JSON.parse(req.headers.updateddetails);

  if (!id || typeof id !== "string") {
    res.json({
      message: "Please Give ID of Event You want to edit",
    });
    return;
  }
  if (!updatedDetails || typeof updatedDetails !== "object") {
    res.json({
      message: "Please Give Updated Details as an Object",
    });
    return;
  }

  console.log(updatedDetails);

  if (updatedDetails.startTime >= updatedDetails.endTime) {
    res.json({
      message: "End Time Cant be earlier than start Time Check Your Time!",
    });
    return;
  }

  const userEvents = await Event.findOne({ _id: id });

  if (userEvents.user == username) {
    try {
      const updatedEvent = await Event.findByIdAndUpdate(id, updatedDetails, {
        new: true,
      });
      if (!updatedEvent) {
        throw new Error("Sorry Couldnt find Event By that ID");
      } else {
        console.log(updatedEvent);
        res.json({
          message: "Updated The Event Successfully",
        });
      }
    } catch (error) {
      res.json({
        message: "Sorry We Got Some Error" + error.message,
      });
      return;
    }
  } else {
    res.json({
      message: "Please Only try to edit Your Own Events",
    });
    return;
  }
});

//      GETTING ALL EVENTS

app.get("/get-events", async (req, res) => {
  const Events = await Event.find();
  res.send(Events);
});

app.get("/get-event-user", userauth, async (req, res) => {
  const username = req.usernameFromAuth;

  const Events = await Event.find({ user: username });

  if (Events.length == 0) {
    res.json({ message: "No Events Made By You" });
    return;
  }

  res.send(Events);
});

app.delete("/delete", userauth, async (req, res) => {
  let id = req.headers.id;
  let username = req.usernameFromAuth;

  if (!id) {
    res.json({
      message: "Please Give ID of Event You want to Delete",
    });
    return;
  }

  if (typeof id !== "string") {
    res.json({
      message: "Please Only Send ID as string",
    });
    return;
  }

  const userEvents = await Event.findOne({ _id: id });

  if (userEvents.user == username) {
    try {
      const result = await Event.deleteOne({ _id: id });

      if (result.deletedCount === 1) {
        res.json({
          message: "Event deleted successfully",
        });
        return;
      } else {
        res.json({
          message: "Event Not Found",
        });
        return;
      }
    } catch (error) {
      res.json({
        message: "We Got Some Error",
      });
      console.log(error.message);
      return;
    }
  } else {
    res.json({
      message: "Please Only Delete Your Own Event! -_- !",
    });
    return;
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Example app listening on port ${port}`);
});
