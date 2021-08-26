import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const serviceAccount = require('./serviceAccountKey.json');

import * as puppeteer from 'puppeteer';
import * as sharp from 'sharp';
import fetch from 'node-fetch';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const generateCliHtml = (cmd: string, el: string): string => `
<div id="taso-cli" style="width: 400px; height: 209px; background: #000;">
  <div style="padding: 0.8rem;">
    <div style="white-space: nowrap;"><span class="green--text">taso-cli</span><span class="purple--text">:</span>$ ${cmd}</div>
    ${el}
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
    line-height: 1.5;
    color: #fff;
  }
  .green--text {
    color: hsl(108, 100%, 50%) !important;
  }
  .purple--text {
    color: hsl(288, 100%, 50%) !important;
  }
  .ls > div {
    display: inline-block;
    margin-right: 3rem;
  }
  img {
    margin-top: 5px;
    max-width: 374.4px;
    max-height: 154.41px;
  }
</style>
`;

const generateOgpHtml = (path: string, cmd: string, imageUrl: string): string => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>taso-cli:${path}</title>
    <meta name="description" content="This is taso0096's portfolio.\nEnjoy the CLI simulation!">
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://cli.taso.tech" />
    <meta property="og:title" content="taso-cli:${path}" />
    <meta property="og:description" content="This is taso0096's portfolio.\nEnjoy the CLI simulation!" />
    <meta property="og:image" content="${imageUrl}" />

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@taso0096">
    <meta name="twitter:title" content="taso-cli:${path}">
    <meta name="twitter:description" content="This is taso0096's portfolio.\nEnjoy the CLI simulation!">
    <meta name="twitter:image" content="${imageUrl}">
  </head>
  <body>
    <script>
      location.href = 'https://cli.taso.tech/?path=${path}&cmd=${cmd}';
    </script>
    <img src="${imageUrl}" />
  </body>
</html>
`;

export const getOgpHtml = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 10,
    memory: '128MB',
  })
  .https.onRequest(async(req, res) => {
    const rootDirRef = admin.firestore().collection('settings').doc('rootDir');
    const rootDirText = await rootDirRef.get()
      .then((doc) => doc.data()?.data)
      .catch(() => undefined);
    if (!rootDirText) { // Firestoreにデータがない場合
      res.send(generateOgpHtml(req.path, '', getOgpImageUrl('home__taso0096:ls.png')));
      return;
    }
    const rootDir = JSON.parse(rootDirText);
    const pathStack = req.path.slice(1).replace(/\/$/, '').split('/');
    const fileType = getFileType(rootDir, pathStack);
    if (!fileType) { // 指定されたパスがない場合
      res.send(generateOgpHtml(req.path, '', getOgpImageUrl('home__taso0096:ls.png')));
      return;
    }

    const queryCmd = req.query.cmd as string;
    const cmd = queryCmd || (typeof fileType !== 'boolean' ? 'ls' : isImage(pathStack.slice(-1)[0].split('.').slice(-1)[0]) ? 'imgcat' : 'cat');
    const filePath = getOgpImageName(req.path, cmd);
    const file = admin.storage().bucket('taso-cli--ogp').file(filePath);
    const isExist = (await file.exists())[0];
    if (!isExist) { // OGP画像が存在しない場合
      res.send(generateOgpHtml(req.path, '', getOgpImageUrl('home__taso0096:ls.png')));
      return;
    }
    res.send(generateOgpHtml(req.path, !queryCmd && cmd === 'ls' ? '' : cmd, getOgpImageUrl(filePath)));
  });

export const addAdminClaim = functions
  .region('asia-northeast1')
  .runWith({
    memory: '128MB',
  })
  .firestore.document('admin_users/{docID}').onCreate((snap) => {
    const user = snap.data();
    if (!user.uid) {
      return;
    }
    modifyAdmin(user.uid, true);
  });

export const removeAdminClaim = functions
  .region('asia-northeast1')
  .runWith({
    memory: '128MB',
  })
  .firestore.document('admin_users/{docID}').onDelete((snap) => {
    const user = snap.data();
    if (!user.uid) {
      return;
    }
    modifyAdmin(user.uid, false);
  });

const modifyAdmin = (uid: string, isAdmin: boolean) => {
  admin.auth().setCustomUserClaims(uid, {admin: isAdmin});
};

export const onUpdateRootDir = functions
  .region('asia-northeast1')
  .runWith({
    timeoutSeconds: 540,
    memory: '512MB',
  })
  .firestore.document('/settings/rootDir').onWrite(async(change) => {
    const rootDirText = change.after.data()?.data;
    if (!rootDirText) {
      return;
    }
    const rootDir = JSON.parse(rootDirText);
    const files = await admin.storage().bucket('taso-cli.appspot.com').getFiles({
      prefix: '',
      autoPaginate: false,
    });
    const pathList = files[0].map((file) => file.name);
    // 全てのパスでOGP用のHTML生成
    const ogpList = [];
    for (const path of pathList) {
      const pathStack = path.replace(/:|\/$/g, '').split('/');
      const fileType = getFileType(rootDir, pathStack);
      if (typeof fileType === 'boolean') {
        if (isImage(pathStack.slice(-1)[0].split('.').slice(-1)[0])) {
          const el = `
          <img
            src="https://firebasestorage.googleapis.com/v0/b/taso-cli.appspot.com/o/${encodeURIComponent(path)}?alt=media"
            alt="img"
          />
          `;
          ogpList.push({
            cmd: 'imgcat',
            path: '/' + pathStack.join('/'),
            html: generateCliHtml(`imgcat ${pathStack.slice(-1)[0]}`, el),
          });
        } else {
          const fileData = await fetch(`https://firebasestorage.googleapis.com/v0/b/taso-cli.appspot.com/o/${encodeURIComponent(path)}?alt=media`)
            .then((res) => res.text())
            .catch(() => undefined);
          const el = `<div style="white-space: pre;">${fileData}</div>`;
          ogpList.push({
            cmd: 'cat',
            path: '/' + pathStack.join('/'),
            html: generateCliHtml(`cat ${pathStack.slice(-1)[0]}`, el),
          });
        }
      } else {
        const resultFiles = Object.entries(fileType).map((file) => file[0] + (file[1] && file[1] !== true ? '/' : '')).filter((name) => name !== ':');
        const dirDiv = (name: string) => `<div class="purple--text">${name}</div>`;
        const fileDiv = (name: string) => `<div>${name}</div>`;
        const allEl = `
        <div class="ls">
          ${resultFiles.map((name) => name.match(/\/$/) ? dirDiv(name) : fileDiv(name)).join('')}
        </div>
        `;
        const el = `
        <div class="ls">
          ${resultFiles.filter((name) => !name.match(/^\./)).map((name) => name.match(/\/$/) ? dirDiv(name) : fileDiv(name)).join('')}
        </div>
        `;
        ogpList.push({
          cmd: 'la -a',
          path: '/' + pathStack.join('/'),
          html: generateCliHtml('ls -a', allEl),
        });
        ogpList.push({
          cmd: 'ls',
          path: '/' + pathStack.join('/'),
          html: generateCliHtml('ls', el),
        });
      }
    }

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    for (const ogp of ogpList) {
      await page.goto(`data:text/html,${encodeURIComponent(ogp.html)}`, {
        waitUntil: 'networkidle0',
      });
      const tasoCli = await page.$('#taso-cli');
      const pngBuffer = await tasoCli?.screenshot();
      if (pngBuffer && typeof pngBuffer !== 'string') {
        const webpBuffer = await sharp(pngBuffer).webp().toBuffer().catch();
        if (webpBuffer) {
          const fileRef = admin.storage().bucket('taso-cli--ogp').file(getOgpImageName(ogp.path, ogp.cmd));
          await fileRef.save(webpBuffer).catch();
        }
      }
    }
  });

const getOgpImageName = (path: string, cmd: string) => `${path.slice(1).replace(/\//g, '__').replace(/\./g, '-')}:${cmd.replace(/ /g, '_')}.webp`;

const getFileType = (rootDir: any, pathStack: string[]) => {
  return pathStack.reduce((dir, key) => {
    if (dir && dir[key] !== undefined) {
      return dir[key];
    }
    return undefined;
  }, rootDir);
};

const isImage = (extension: string) => ['png', 'jpg', 'gif', 'ico'].includes(extension);

const getOgpImageUrl = (path: string) => `https://firebasestorage.googleapis.com/v0/b/taso-cli--ogp/o/${path}?alt=media`;
