require('dotenv').config();

const multer = require('multer');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const File = require('./models/File');

const express = require('express');
const app = express();
app.use(express.urlencoded({ extended: true }));

const upload = multer({ dest: 'uploads' }); //initialize upload function to send all files to uploads folder

mongoose.connect(process.env.DATABASE_URL);

app.set('view engine', 'ejs');

// load homepage
app.get('/', (req, res) => {
  res.render('index.ejs');
});

// file upload
app.post('/upload', upload.single('file'), async (req, res) => {
  // create a fileData object to be sent to the server
  const fileData = {
    path: req.file.path, //The Request object will be populated with a file object containing information about the processed file.
    originalName: req.file.originalname,
  };
  if (req.body.password != null && req.body.password != '') {
    // if the user added a password to the file, then add it top the fileData object
    fileData.password = await bcrypt.hash(req.body.password, 10);
  }

  const file = await File.create(fileData); // create a new file using our File Model
  res.render('index', { fileLink: `${req.headers.origin}/file/${file.id}` });
});

// file download
app.route('/file/:id').get(handleDownload).post(handleDownload);

async function handleDownload(req, res) {
  const file = await File.findById(req.params.id); // find the file in the database
  // check the password
  if (file.password != null) {
    if (req.body.password == null) {
      // render the password page if the file has a password
      res.render('password');
      return;
    }
    // if the file has a password, check it against the user input
    if (!(await bcrypt.compare(req.body.password, file.password))) {
      // return the user to the page if the password is incorrect
      res.render('password', { error: true });
      return;
    }
  }
  file.downloadCount++; // increment the download count
  await file.save(); //
  console.log(file.downloadCount);

  res.download(file.path, file.originalName); // download the file at this path with this name
}

app.listen(3000);
