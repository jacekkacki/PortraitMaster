const Photo = require('../models/photo.model');
const Voter = require('../models/voter.model');

/****** SUBMIT PHOTO ********/

exports.add = async (req, res) => {

  try {
    const { title, author, email } = req.fields;
    const file = req.files.file;

    const patternTitle = new RegExp(/(([a-zA-Z]|\s|\.|\,|\')*)/, 'g');
    const patternAuthor = new RegExp(/(([a-zA-Z]|\s|\')*)/, 'g');
    const patternEmail = new RegExp(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/, 'g');

    const titleMatched = title.match(patternTitle).join('');
    const authorMatched = author.match(patternAuthor).join('');
    const emailMatched = email.match(patternEmail).join('');

    if(title && title.split('').length <= 25 && titleMatched.length >= title.length &&
     author && author.split('').length <= 50 && authorMatched.length >= author.length &&
     email && emailMatched.length >= email.length &&
     file) { // if fields are not empty...

      const fileName = file.path.split('/').slice(-1)[0]; // cut only filename from full path, e.g. C:/test/abc.jpg -> abc.jpg
      const fileExt = fileName.split('.').slice(-1)[0];
      if(fileExt === 'jpg' || fileExt === 'gif' || fileExt === 'png') {
        const newPhoto = new Photo({ title, author, email, src: fileName, votes: 0 });
        await newPhoto.save(); // ...save new photo in DB
        res.json(newPhoto);
      } else {
        throw new Error('Wrong file format!');
      }
    } else {
      throw new Error('Wrong input!');
    }

  } catch(err) {
    res.status(500).json(err);
  }

};

/****** LOAD ALL PHOTOS ********/

exports.loadAll = async (req, res) => {

  try {
    res.json(await Photo.find());
  } catch(err) {
    res.status(500).json(err);
  }

};

/****** VOTE FOR PHOTO ********/

exports.vote = async (req, res) => {
  try {
    const photoToUpdate = await Photo.findOne({ _id: req.params.id });
    if (!photoToUpdate) res.status(404).json({ message: 'Not found' });
    else {
      const votingUser = await Voter.findOne({ user: req.clientIp });
      if (!votingUser) {
        const newVoter = new Voter({ user: req.clientIp });
        newVoter.votes.push(photoToUpdate._id);
        await newVoter.save();
        res.json({ message: 'New IP user added' });
      } else {
        const userVotedPhotos = await Voter.findOne({ user: req.clientIp, votes: req.params.id });
        if (userVotedPhotos) res.status(500).json({ message: 'The photo voted !' });
        else {
          await Voter.updateOne({ user: req.clientIp }, { $push: { votes: req.params.id } });
          res.json({ message: 'Added photo to IP user' });
        }
      }
      photoToUpdate.votes++;
      photoToUpdate.save();
      res.send({ message: 'OK' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
