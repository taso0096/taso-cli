import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const serviceAccount = require('./serviceAccountKey.json');

import * as puppeteer from 'puppeteer';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'taso-cli--ogp',
});

const generateCliHtml = (pwd: string): string => `
<div id="taso-cli" style="width: 400px; height: 209px; background: #000;">
  <div style="padding: 1rem;">
    <div style="white-space: nowrap; margin-bottom: 8px;">$ pwd</div>
    <div style="white-space: pre;">${pwd}</div>
  </div>
</div>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Courier+Prime&display=swap');
  @font-face {
    font-family: 'Courier Prime', monospace;
  }
  * {
    font-family: 'Courier Prime';
    font-size: 16px;
    color: #fff;
  }
</style>
`;

const generateOgpHtml = (pwd: string, imageUrl: string): string => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>taso-cli:$ ${pwd}</title>
    <meta name="description" content="This is taso0096's portfolio.\nEnjoy the CLI simulation!">
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://cli.taso.tech" />
    <meta property="og:title" content="taso-cli:$ ${pwd}" />
    <meta property="og:description" content="This is taso0096's portfolio.\nEnjoy the CLI simulation!" />
    <meta property="og:image" content="${imageUrl}" />

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@taso0096">
    <meta name="twitter:title" content="taso-cli:$ ${pwd}">
    <meta name="twitter:description" content="This is taso0096's portfolio.\nEnjoy the CLI simulation!">
    <meta name="twitter:image" content="${imageUrl}">
  </head>
  <body>
    <script>
      // location.href = 'https://cli.taso.tech';
    </script>
    <img src="${imageUrl}" />
  </body>
</html>
`;

export const generateOGP = functions
    .region('asia-northeast1')
    .runWith({
      timeoutSeconds: 10,
      memory: '512MB',
    })
    .https.onRequest(async(req, res) => {
      const filePath = `${req.path.slice(1).replace(/\//g, '__').replace(/\./g, '-')}.png`;
      const file = admin.storage().bucket().file(filePath);
      const isExist = (await file.exists())[0];
      if (isExist) {
        res.send(generateOgpHtml(req.path, `https://firebasestorage.googleapis.com/v0/b/taso-cli--ogp/o/${filePath}?alt=media`));
        return;
      }

      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.goto(`data:text/html,${encodeURIComponent(generateCliHtml(req.path).trim())}`, {
        waitUntil: 'networkidle0',
      });
      const tasoCli = await page.$('#taso-cli');
      const imageBuffer = await tasoCli?.screenshot();
      if (!imageBuffer || typeof imageBuffer === 'string') {
        res.send(generateOgpHtml(req.path, 'https://firebasestorage.googleapis.com/v0/b/taso-cli--ogp/o/DEFAULT__IMAGE.png?alt=media'));
        return;
      }

      const resImagePath = await file.save(imageBuffer)
          .then(() => filePath)
          .catch(() => 'DEFAULT__IMAGE.png');

      res.send(generateOgpHtml(req.path, `https://firebasestorage.googleapis.com/v0/b/taso-cli--ogp/o/${resImagePath}?alt=media`));
    });
