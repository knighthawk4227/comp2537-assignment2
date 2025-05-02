const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
require('dotenv').config();
const users = require('./models/user.js');


mongoose.connect(process.env.DATABASE_URI)

const app = express()
const PORT = process.env.PORT || 3000;

//makes ejs the template engine???
app.set('view engine', 'ejs');
app.set('views', './views');

app.use(express.urlencoded({ extended: true }))
app.use(express.json());
app.use(express.static('public'));

// users.collection.insertOne({ "username": "mitchell", "password": "123456" });
// importing user routes/ making instance of
const userRoutes = require('./routes/userRoutes')
app.use(userRoutes);

//express session 
app.use(session({
    secret: 'dog',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        maxAge: 60000 * 60,
    },
}));

app.get('/', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('home');
});
app.get('/login', (req, res) => {
    res.render('index')
})

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    console.log(username);
    console.log(password);

    const user = await users.findOne({ username: username });
    console.log(user);
    if (!user) {
        return res.send("no uesr by that");
    } else if (user.password != password) {
        return res.send("password is not correct dawg");
    }
    //if there is a user save it to the session.user
    req.session.user = {
        username: user.username,
        //idk what I should save
        _id: user._id,
    }
    console.log(user._id);
    res.redirect('/');

});


app.listen(PORT, () => {
    console.log(`app is listening on ${PORT}`)
});

