const dotenv = require("dotenv");
const Twit = require("twit");
const fs = require("fs");
const path = require("path");
const os = require("os");
const request = require("request");
const express = require("express");
const app = express();

const envFound = dotenv.config();

if (!envFound) {
  throw new Error(`⚠️  Couldn't find .env file. Create one.  ⚠️`);
}

const bot = new Twit({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token: process.env.TWITTER_ACCESS_TOKEN,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
  strictSSL: true
});

app.get("/", (req, res) => {
  res.status(200).send("Everything is going to be OK ✅");
});

/**
 * Fetches the daily image from the NASA API
 *
 */
const getPicture = async () => {
  const parameters = {
    url: "https://api.nasa.gov/planetary/apod",
    qs: {
      api_key: process.env.NASA_KEY
    },
    encoding: "binary"
  };

  request.get(parameters, (_err, _res, body) => {
    body = JSON.parse(body);
    saveFile(body);
  });
};

const saveFile = data => {
  const fileName = data.media_type === "image" ? "nasa.jpg" : "nasa.mp4";

  // Tweet the link if it's a video.
  if (fileName === "nasa.mp4") {
    const params = {
      status: "Here's a new video from NASA! " + data.title + ": " + data.url
    };

    postStatus(params);

    return;
  }

  const tmpDir = os.tmpdir();

  const filePath = path.join(tmpDir + `/${fileName}`);

  console.log(`saveFile: file PATH ${filePath}`);

  const file = fs.createWriteStream(filePath);

  request(data)
    .pipe(file)
    .on("close", err => {
      if (err) {
        console.error(err);
        return;
      }

      console.log("Media saved!");

      const descriptionText = data.title;

      uploadPicture(descriptionText, filePath);
    });
};

const postStatus = params => {
  bot.post("statuses/update", params, (err, _data, res) => {
    if (err) {
      console.error(err);
      return;
    }

    console.log("Status posted on Twitter sucessfully.");
  });
};

const uploadPicture = (descriptionText, fileName) => {
  bot.postMediaChunked(
    {
      file_path: fileName
    },
    (err, data, _res) => {
      if (err) {
        console.error(err);
        return;
      }

      const params = {
        status: descriptionText,
        media_ids: data.media_id_string
      };

      postStatus(params);
    }
  );
};

app.get("/bot", (_req, res) => {
  getPicture()
    .then(() => {
      res.status(204).send();
    })
    .catch(err => {
      console.error(err);
      res.status(500).send();
    });
});

app.listen(process.env.PORT, () => {
  console.log(`
    ################################################
    The Everyday-NASA-Bot is listening on port: ${process.env.PORT}
    ################################################
  `);
});
