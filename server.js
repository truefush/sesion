const express = require('express');
const { Server: HttpServer } = require('http');
const { Server: IOServer } = require('socket.io');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const mongoose = require('mongoose');
const { engine } = require('express-handlebars');
const passport = require('passport');

const router = require('./routes/router');
const Container = require('./container.js');
require('./middlewares/auth');
const { optionsMariaDB, optionsSQLite3 } = require('./options/config.js');

const PORT = process.env.port || 8080;
const app = express();

const httpserver = new HttpServer(app);
const io = new IOServer(httpserver);

const products = new Container(optionsSQLite3, 'products');
const messages = new Container(optionsMariaDB, 'messages');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(cookieParser());
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
        httpOnly: false,
        secure: false,
        maxAge: 100000
    }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(router);
app.use(express.static('views'));
app.engine('handlebars', engine());
app.set('views', './views');
app.set('view engine', 'handlebars');

io.on('connection', async socket => {
    console.log('Conexión establecida');
    const dbProducts = await products.getAll();
    io.sockets.emit('products', dbProducts);
    const dbMessages = await messages.getAll();
    io.sockets.emit('messages', dbMessages);
    socket.on('product', async product => {
        products.save(product);
        const dbProducts = await products.getAll();
        io.sockets.emit('products', dbProducts);
    })
    socket.on('message', async message => {
        messages.save(message);
        const dbMessages = await messages.getAll();
        io.sockets.emit('messages', dbMessages);
    })
});

const server = httpserver.listen(PORT, async () => {
    await mongoose.connect('mongodb+srv://estebanzarate:nERlfPKfZtCRTu0K@cluster0.hggfd.mongodb.net/?retryWrites=true&w=majority');
    console.log(`Server running on port ${PORT}`);
});
server.on('error', err => console.log(`Error: ${err}`));