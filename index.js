const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
require('dotenv').config();
const users = require('./models/user.js');
const bcrypt = require('bcrypt');

//strength of password hash
const saltRounds = 10;
mongoose.connect(process.env.DATABASE_URI)

const app = express()
const PORT = process.env.PORT || 3000;

bcrypt.genSalt(saltRounds, (err, salt) => {
    if (err) {
        console.log("SAD ERROR CRY SAD");
    }

});

//makes ejs the template engine???
app.set('view engine', 'ejs');
app.set('views', './views');


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

app.use(express.urlencoded({ extended: true }))
app.use(express.json());
app.use(express.static('public'));
app.use(express.static('photos'));
// users.collection.insertOne({ "username": "mitchell", "password": "123456" });
// importing user routes/ making instance of
const userRoutes = require('./routes/userRoutes')
app.use(userRoutes);


app.get('/', (req, res) => {
    if (req.session.user) {

    }
    res.render('home');
});

app.get('/members', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.set('Cache-Control', 'no-store');
    res.render('members', { user: req.session.user });
});
app.get('/login', (req, res) => {
    //save error in variable then wipe it so that we can refresh 
    //and error isn't constantly passed to ejs
    const error = req.session.error;
    delete req.session.error;
    res.render('index', { error });
});

app.get('/signup', (req, res) => {
    const error = req.session.error;
    delete req.session.error;
    res.render('signup', { error });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await users.findOne({ username: username });
    if (!user) {
        req.session.error = 'No user by that'
        return res.redirect('/login');
    }
    const passCheck = await bcrypt.compare(password, user.password);
    if (!passCheck) {
        req.session.error = 'Password wrong dawg';
        return res.redirect('/login');
    }
    //if there is a user and the password matches save it to the session.user
    req.session.user = {
        username: user.username,
        //idk what I should save
        _id: user._id,
    }
    res.redirect('/members');

});

app.post('/signup', async (req, res) => {
    const { username, password, repass } = req.body;

    console.log("signup stuff", { username, password, repass });
    const user = username;
    const cryptPass = await bcrypt.hash(password, saltRounds);
    console.log("The cryptword is ", cryptPass);
    if (password != repass) {
        req.session.error = 'Passwords do not match ';
        return res.redirect('/signup');
    }
    // if password is okay make them an account wiht that username and pass.
    users.collection.insertOne({ username: user, password: cryptPass })
    res.redirect('/');

});

app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/');
        }
        return res.redirect('/login')
    });
});


app.listen(PORT, () => {
    console.log(`app is listening on ${PORT}`)
});

