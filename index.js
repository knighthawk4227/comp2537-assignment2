const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const mongoSession = require('connect-mongodb-session')(session);
require('dotenv').config();
const users = require('./models/user.js');
const bcrypt = require('bcrypt');
const joi = require('joi');

//strength of password hash
const saltRounds = 10;
mongoose.connect(process.env.DATABASE_URI)

const app = express()
let store = new mongoSession({
    uri: process.env.DATABASE_URI,
    collection: 'sessions'
});
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
    secret: process.env.NODE_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 60000 * 60,
    },
    store: store,
}));

app.use(express.urlencoded({ extended: true }))
app.use(express.json());
app.use(express.static('public'));
// users.collection.insertOne({ "username": "mitchell", "password": "123456" });
// importing user routes/ making instance of
const userRoutes = require('./routes/userRoutes')
app.use(userRoutes);


app.get('/', async (req, res) => {
    res.render('home', {
        person: req.session.user ? 'here' : undefined,
        page: 'Home',
    });
});

app.get('/headerTest', (req, res) => {
    res.render('partials/header', {
        page: 'Header test',
    });
})

app.get('/members', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    const arr = ['dumbledore.jpg', 'harryPotter.jpg', 'catWizard.jpg'];
    const index = Math.floor(Math.random() * arr.length);
    let path = arr[index];
    res.set('Cache-Control', 'no-store');
    res.render('members',
        {
            user: req.session.user,
            path: path,
            page: 'harry potter & gandalf',
            person: req.session.user ? 'here' : undefined,
        });
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

app.get('/admin', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    if (req.session.user.role !== 'admin') {
        return res.status(403).send('NOT ADMIN ');
    }
    console.log(req.session.user.role);
    try {
        const people = await users.find();
        return res.render('admin', {
            user: req.session.user,
            page: 'Admin',
            people,
            person: req.session.user ? 'here' : undefined,
        });
    } catch (err) {
        return console.log('error', err);
    }
});

app.post('/login', async (req, res) => {
    const userSchema = joi.object({
        email: joi.string().email().required(),
        password: joi.string().pattern(new RegExp('^[a-zA-Z0-9]{3,30}$')).required(),
    });
    const { error, value } = userSchema.validate(req.body);
    if (error) {
        req.session.error = 'not valid input man';
        return res.redirect('/login');
    }
    const { email, password } = value;
    const user = await users.findOne({ email: email });
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
        role: user.role,
        //idk what I should save
        person: user._id,
    }
    console.log(req.session.user);
    res.redirect('/');
});

app.post('/signup', async (req, res) => {
    const userSchema = joi.object({
        email: joi.string().email().required(),
        username: joi.string().alphanum().min(3).max(30).required(),
        password: joi.string().pattern(new RegExp('^[a-zA-Z0-9]{3,30}$')).required(),
        //literally passes password and checks if it matches
        repass: joi.ref('password'),
    });
    const { error, value } = userSchema.validate(req.body);
    if (error) {
        req.session.error = 'not valid';
        return res.redirect('/signup');
    }
    const { email, username, password, repass } = value;
    console.log("signup stuff", value);
    const user = username;
    const cryptPass = await bcrypt.hash(password, saltRounds);
    const roles = 'user';
    console.log("The cryptword is ", cryptPass);
    if (password != repass) {
        req.session.error = 'Passwords do not match ';
        return res.redirect('/signup');
    }
    // if password is okay make them an account wiht that username and pass.
    const person = await users.collection.insertOne({ email: email, username: user, password: cryptPass, role: roles })
    req.session.user = {
        username: user,
        role: roles,
        //idk what I should save
        id: person.insertedId,
    }
    req.session.save();
    res.redirect('/members');
});

app.post('/logout', async (req, res) => {
    await req.session.destroy(err => {
        if (err) {
            return res.redirect('/');
        }
        return res.redirect('/')
    });
});

app.post('/promote', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await users.findOne({ email });
        if (!user) {
            return res.send("there was no user to promote");
        }
        if (user.role === 'admin') {
            return res.send("user is already admin");
        }
        await users.updateOne({ email }, { $set: { role: 'admin' } });
        console.log("admin privs given to ", user.username);
        res.redirect('/admin');
    } catch (err) {
        console.log("there was an error", err);
    }
});
app.post('/demote', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await users.findOne({ email });
        if (!user) {
            return res.send("there was no user to promote");
        }
        if (user.role === 'user') {
            return res.send("user is already admin");
        }
        await users.updateOne({ email }, { $set: { role: 'user' } });
        console.log(user.username, "was demoted");
        res.redirect('/admin');
    } catch (err) {
        console.log("there was an error", err);
    }
});

app.post('/giveRole', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await users.findOne({ email });
        if (!user) {
            return res.send("there was no user to promote");
        }
        if (user.role === 'user' || user.role === 'admin') {
            return res.send("They already have a role");
        }
        await users.updateOne({ email }, { $set: { role: 'user' } });
        console.log("Role given to", user.username);
        res.redirect('/admin');
    } catch (err) {
        console.log("there was an error", err);
    }
});

app.use((req, res) => {
    res.status(404).send('No page here man 404');
});

app.listen(PORT, () => {
    console.log(`app is listening on ${PORT}`)
});

