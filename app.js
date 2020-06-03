const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const ejs = require('ejs');
const multer = require('multer');
const nodemailer = require("nodemailer");

var path = require('path');
const fs = require('fs')

const app = express();
let fileName = '';

app.set('view engine', 'ejs');
app.use(express.static(path.resolve(__dirname, 'public')));

dotenv.config({
    path: './config.env'
});

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

// Set The Storage Engine
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: function (req, file, cb) {
        let mail = req.body.email
        let mailName= mail.substring(0, mail.indexOf('@'));
        fileName = mailName + path.extname(file.originalname)
        cb(null, fileName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10000000 },
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
}).single('verifydocument');

// Check File Type
function checkFileType(file, cb) {
    // Allowed ext
    const filetypes = /jpeg|jpg|png|gif/;
    // Check ext
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}

mongoose.connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false
}).then((con) => {
    console.log('connection successful')
}).catch(err => {
    console.log(err)
});

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        unique: true,
        required: [true, 'A user must have an email']
    },
    fullname: {
        type: String,
        required: [true, 'A user must have a name']
    },
    birthdate: {
        type: Date
    },
    phonenumber: {
        type: String,
        unique: true,
        required: [true, 'A user must have a phone number']
    },
    gender: {
        type: String,
        required: [true, 'A user must have a gender']
    },
    password: {
        type: String,
        required: [true, 'A user must have a password']
    }
});
const User = mongoose.model('User', userSchema);

const insertUser = (req, res) => {
    return new Promise((resolve, reject) => {
        const { email, fullname, birthdate, phonenumber, gender, password } = req.body;

        const formData = { email, fullname, birthdate, phonenumber, gender, password };

        const testUser = new User(formData);

        testUser.save().then((doc) => {
            resolve(doc.email)
        }).catch(err => {
            let errorMsg = err.errmsg;
            let errorCode = err.code;
            switch (errorCode) {
                case 11000:
                    let startIndex = errorMsg.indexOf('{') + 1;
                    let stopIndex = errorMsg.indexOf(':', startIndex);
                    let errorField = errorMsg.slice(startIndex, stopIndex).trim();
                    if (errorField == 'email') {
                        reject('A user already exist with this email');
                    }
                    else if (errorField == 'phonenumber') {
                        reject('A user already exist with this phone number');
                    }
                    break;
                default:
                    reject('An error occoured');
            }
        })

    })

}

//routes
app.get('/', (req, res) => {
    res.render('index')
})

app.get('/register', (req, res) => res.render('index'));

app.post('/register', (req, res, next) => {
    upload(req, res, (err) => {
        if (err) {
            res.render('index', {
                msg: err,
                color: 'red'
            });
        } else {
            if (req.file == undefined) {
                res.render('index', {
                    msg: 'Error: No File Selected!',
                    color: 'red'
                });
            } else {
                insertUser(req, res).then((response) => {
                    res.render('index', {
                        msg: 'User registered sucessfully!',
                        color: 'green'
                    });
                }).catch(error => {
                    let filePath = `./public/uploads/${fileName}`;
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                    res.render('index', {
                        msg: error,
                        color: 'red'
                    });
                })

            }
        }
    })
});

app.listen(process.env.PORT || 3000);