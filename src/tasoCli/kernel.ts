import { TasoShell, Result, FileType } from '@/tasoCli/shell';
import { getRootDir, getRepoDir, DirObject } from '@/tasoCli/makeDirTree';

import CliBoot from '@/components/CliBoot.vue';

import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';

interface ErrorMessages {
  [key: string]: (cmd: string, name?: string) => string
}

export const errorMessages: ErrorMessages = {
  Error: cmd => `${cmd}: An error has occurred`,
  NoCmd: cmd => `${cmd}: command not found`,
  MissingFile: cmd => `${cmd}: missing file operand`,
  TooManyArgs: cmd => `${cmd}: too many arguments`,
  FileFormat: cmd => `${cmd}: cannot use this file format`,
  InvalidOption: (cmd, name) => `${cmd}: ${name}: invalid option`,
  PermissionDenied: (cmd, name) => `${cmd}: ${name}: Permission denied`,
  NoFile: (cmd, name) => `${cmd}: ${name}: No such file or directory`,
  NotDir: (cmd, name) => `${cmd}: ${name}: Not a directory`,
  IsDir: (cmd, name) => `${cmd}: ${name}: Is a directory`
};

const getFileTypeError = (type: FileType, cmd: string, name: string): string => {
  switch (type) {
    case undefined:
      return errorMessages.NoFile(cmd, name);
    case null:
      return errorMessages.PermissionDenied(cmd, name);
    case true:
      return errorMessages.NotDir(cmd, name);
    case false:
      if (['cat', 'imgcat', 'open'].includes(cmd)) {
        return errorMessages.PermissionDenied(cmd, name);
      }
      return errorMessages.NotDir(cmd, name);
    default:
      return errorMessages.IsDir(cmd, name);
  }
};

export const isImage = (extension: string): boolean => ['png', 'jpg', 'gif', 'ico'].includes(extension);

const cmdList = ['cd', 'pwd', 'ls', 'date', 'cat', 'imgcat', 'history', 'clear', 'share', 'open'];

export class TasoKernel {
  tasoShell!: TasoShell;
  nullResult: Result;
  nowHistoryIndex: number;
  tmpHistoryCmd: string | null;
  tmpTabCmd: string | null;
  nextTabIndex: number;
  candidateList: string[];
  cliBootRef: InstanceType<typeof CliBoot>;

  constructor(cliBootRef: InstanceType<typeof CliBoot>) {
    this.nullResult = {
      type: null,
      data: null
    };
    this.nowHistoryIndex = 0;
    this.tmpHistoryCmd = null;
    this.tmpTabCmd = null;
    this.nextTabIndex = 0;
    this.candidateList = [];
    this.cliBootRef = cliBootRef;
  }

  async boot(tasoShell: TasoShell): Promise<void> {
    await this.confirmCookie();

    this.tasoShell = tasoShell;
    await this.cliBootRef.next();
    await this.tasoShell.boot(this);
  }

  private async confirmCookie(): Promise<void> {
    await this.cliBootRef.next(1000);
    return new Promise(resolve => {
      document.addEventListener('keydown', () => {
        resolve();
      }, { once: true });
      document.addEventListener('click', () => {
        resolve();
      }, { once: true });
    });
  }

  keyInput(key: string): void {
    switch (key) {
      case 'KEY_INPUT':
        this.tmpTabCmd = null;
        return;
      case 'Tab':
        this.tabCompletion(this.tasoShell.inputRef.innerText);
        return;
      case 'l':
        this.clear(['clear']);
        return;
    }
    if (key.startsWith('Arrow')) {
      const addIndex = key === 'ArrowUp' ? -1 : 1;
      const filteredHistory = this.tasoShell.history.map(history => history.cmd).filter(cmd => cmd);
      if (this.tmpHistoryCmd === null) {
        if (addIndex >= 0 || !filteredHistory.length) {
          return;
        }
        this.tmpHistoryCmd = this.tasoShell.inputRef.innerText;
        this.nowHistoryIndex = filteredHistory.length - 1;
      } else {
        const nextIndex = this.nowHistoryIndex + addIndex;
        if (nextIndex < 0) {
          return;
        } else if (nextIndex > filteredHistory.length - 1) {
          this.tasoShell.inputRef.innerText = this.tmpHistoryCmd;
          this.tmpHistoryCmd = null;
          return;
        }
        this.nowHistoryIndex += addIndex;
      }
      this.tasoShell.inputRef.innerText = filteredHistory[this.nowHistoryIndex];
    }
  }

  private tabCompletion(cmd: string): void {
    if (!this.tmpTabCmd) {
      this.tmpTabCmd = cmd.replace(/\u00a0/g, '\u0020');
      this.nextTabIndex = 0;
    }
    const argv = this.tmpTabCmd.split(/ +/);
    const spaceList = this.tmpTabCmd.split(/\S/).filter(v => v);
    const lastArg = argv.slice(-1)[0];
    if (argv.length === 1 && !lastArg) {
      return;
    }
    const fileType = this.tasoShell.getFile(lastArg && lastArg.split('/').length >= 2 ? lastArg.split('/').slice(0, -1).join('/') : '.').type;
    if (fileType === null) {
      return;
    }
    const searchList = argv.length === 1 ? cmdList : Object.keys(fileType as DirObject).filter(v => !v.startsWith('.'));
    this.candidateList = searchList.filter(v => v.startsWith(argv.length === 1 ? lastArg : lastArg.split('/').slice(-1)[0]));
    if (!this.candidateList.length) {
      return;
    } else if (this.nextTabIndex > this.candidateList.length - 1) {
      this.nextTabIndex = 0;
    }
    if (argv.length === 1 || lastArg.split('/').length === 1) {
      argv[argv.length - 1] = this.candidateList[this.nextTabIndex];
    } else {
      argv[argv.length - 1] = `${lastArg.split('/').slice(0, -1).join('/')}/${this.candidateList[this.nextTabIndex]}`;
    }
    this.tasoShell.inputRef.innerText = argv.map((v, i) => v + (spaceList[i] || '')).join('');
    this.nextTabIndex++;
  }

  cd(argv: string[]): Result {
    const result: Result = {
      type: 'text',
      data: ''
    };
    const cmdArgv = argv.slice(1);
    switch (cmdArgv.length) {
      case 0:
        this.tasoShell.cd = this.tasoShell.homeDirFullPath;
        return this.nullResult;
      case 1:
        break;
      default:
        result.data = errorMessages.TooManyArgs(argv[0]);
        return result;
    }

    const fileData = this.tasoShell.getFile(cmdArgv[0]);
    if (fileData.type && fileData.type !== true) {
      this.tasoShell.cd = fileData.fullPath;
      return this.nullResult;
    }
    result.data = getFileTypeError(fileData.type, argv[0], cmdArgv[0]);
    return result;
  }

  pwd(argv: string[]): Result {
    const cmdArgv = argv.slice(1);
    if (cmdArgv.length >= 1) {
      return {
        type: 'text',
        data: errorMessages.TooManyArgs(argv[0])
      };
    }
    return {
      type: 'text',
      data: this.tasoShell.cd
    };
  }

  ls(argv: string[]): Result {
    const errorResult: Result = {
      type: 'text',
      data: ''
    };
    const cmdArgv = argv.slice(1);
    if (cmdArgv.length >= 3) {
      errorResult.data = errorMessages.TooManyArgs(argv[0]);
      return errorResult;
    }

    const fileName = cmdArgv.filter(v => !v.match(/^-/))[0];
    const options = cmdArgv.filter(v => !!v.match(/^-/));
    const invalidOption = options.filter(v => v !== '-a');
    if (cmdArgv.length === 2 && !options.length) {
      errorResult.data = errorMessages.TooManyArgs(argv[0]);
      return errorResult;
    } else if (invalidOption.length) {
      errorResult.data = errorMessages.InvalidOption(argv[0], invalidOption[0]);
      return errorResult;
    }

    const fileData = this.tasoShell.getFile(fileName || this.tasoShell.cd);
    if (!fileData.type && fileData.type !== false) {
      errorResult.data = getFileTypeError(fileData.type, argv[0], fileName);
      return errorResult;
    } else if (typeof fileData.type === 'boolean') {
      errorResult.data = fileData.fullPath.split('/').slice(-1)[0];
      return errorResult;
    }
    const isDir = (type: FileType) => (type && type !== true) || type === null;
    const resultFiles = Object.entries(fileData.type).map(file => file[0] + (isDir(file[1]) ? '/' : ''));
    return {
      type: 'files',
      data: options.includes('-a') ? resultFiles : resultFiles.filter(name => !name.match(/^\./))
    };
  }

  date(argv: string[]): Result {
    const result: Result = {
      type: 'text',
      data: ''
    };
    const cmdArgv = argv.slice(1);
    if (cmdArgv.length >= 1) {
      result.data = errorMessages.TooManyArgs(argv[0]);
      return result;
    }
    result.data = String(new Date()).replace(/ \(.+\)$/, '');
    return result;
  }

  async cat(argv: string[]): Promise<Result> {
    const result: Result = {
      type: 'text',
      data: ''
    };
    const cmdArgv = argv.slice(1);
    switch (cmdArgv.length) {
      case 0:
        result.data = errorMessages.MissingFile(argv[0]);
        return result;
      case 1:
        break;
      default:
        result.data = errorMessages.TooManyArgs(argv[0]);
        return result;
    }

    const fileData = this.tasoShell.getFile(cmdArgv[0]);
    if (fileData.type !== true) {
      result.data = getFileTypeError(fileData.type, argv[0], cmdArgv[0]);
      return result;
    }

    const repoFilePath = fileData.fullPath.split(`${this.tasoShell.homeDirFullPath}/repositories/${this.tasoShell.repo}/`)[1];
    if (repoFilePath) {
      result.data = await fetch(`https://api.github.com/repos/${this.tasoShell.user}/${this.tasoShell.repo}/contents/${repoFilePath}`)
        .then(res => res.json())
        .then(json => atob(json.content))
        .catch(() => errorMessages.Error(argv[0]));
    } else {
      result.data = await fetch(`https://firebasestorage.googleapis.com/v0/b/taso-cli.appspot.com/o/${encodeURIComponent(fileData.fullPath.slice(1))}?alt=media`)
        .then(res => res.text())
        .catch(() => errorMessages.Error(argv[0]));
    }
    return result;
  }

  async imgcat(argv: string[]): Promise<Result> {
    const errorResult: Result = {
      type: 'text',
      data: ''
    };
    const cmdArgv = argv.slice(1);
    switch (cmdArgv.length) {
      case 0:
        errorResult.data = errorMessages.MissingFile(argv[0]);
        return errorResult;
      case 1:
        break;
      default:
        errorResult.data = errorMessages.TooManyArgs(argv[0]);
        return errorResult;
    }

    const fileData = this.tasoShell.getFile(cmdArgv[0]);
    if (fileData.type !== true) {
      errorResult.data = getFileTypeError(fileData.type, argv[0], cmdArgv[0]);
      return errorResult;
    } else if (!isImage(fileData.fullPath.split('/').slice(-1)[0].split('.').slice(-1)[0])) {
      errorResult.data = errorMessages.FileFormat(argv[0]);
      return errorResult;
    }

    const result: Result = {
      type: 'img',
      data: ''
    };
    const repoFilePath = fileData.fullPath.split(`${this.tasoShell.homeDirFullPath}/repositories/${this.tasoShell.repo}/`)[1];
    if (repoFilePath) {
      const imageBlob = await fetch(`https://raw.githubusercontent.com/${this.tasoShell.user}/${this.tasoShell.repo}/main/${repoFilePath}`)
        .then(res => res.blob())
        .catch(() => undefined);
      if (!imageBlob) {
        errorResult.data = errorMessages.Error(argv[0]);
        return errorResult;
      }
      result.data = URL.createObjectURL(imageBlob);
    } else {
      const imageBlob = await fetch(`https://firebasestorage.googleapis.com/v0/b/taso-cli.appspot.com/o/${encodeURIComponent(fileData.fullPath.slice(1))}?alt=media`)
        .then(res => res.blob())
        .catch(() => undefined);
      if (!imageBlob) {
        errorResult.data = errorMessages.Error(argv[0]);
        return errorResult;
      }
      result.data = URL.createObjectURL(imageBlob);
    }
    return result;
  }

  history(argv: string[]): Result {
    const cmdArgv = argv.slice(1);
    if (cmdArgv.length >= 1) {
      return {
        type: 'text',
        data: errorMessages.TooManyArgs(argv[0])
      };
    }

    const filteredHistory = this.tasoShell.history.filter(v => v.cmd);
    const startIndex = filteredHistory.length - (filteredHistory.length < 10 ? filteredHistory.length : 10);
    return {
      type: 'history',
      data: filteredHistory.slice(-11, -1).map((v, i) => [startIndex + i, v.cmd])
    };
  }

  clear(argv: string[]): Result {
    const result: Result = {
      type: 'text',
      data: ''
    };
    const cmdArgv = argv.slice(1);
    if (cmdArgv.length >= 1) {
      result.data = errorMessages.TooManyArgs(argv[0]);
      return result;
    }
    this.tasoShell.historyStartIndex = this.tasoShell.history.length;
    return this.nullResult;
  }

  async tasoCli(argv: string[]): Promise<Result> {
    const errorResult: Result = {
      type: 'text',
      data: ''
    };
    const cmdArgv = argv.slice(1);
    if (cmdArgv.length === 0) {
      errorResult.data = errorMessages.InvalidOption(argv[0]);
      return errorResult;
    } else if (cmdArgv.length >= 4) {
      errorResult.data = errorMessages.TooManyArgs(argv[0]);
      return errorResult;
    }

    switch (cmdArgv[0]) {
      case 'login':
        return {
          type: 'text',
          data: await this.loginTasoCli(argv[0], cmdArgv[1], cmdArgv[2])
        };
      case 'logout':
        return {
          type: 'text',
          data: await this.logoutTasoCli(argv[0])
        };
      case 'reset':
        return {
          type: 'text',
          data: await this.resetTasoCli(argv[0])
        };
    }
    errorResult.data = errorMessages.InvalidOption(argv[0], cmdArgv[0]);
    return errorResult;
  }

  private async loginTasoCli(cmd: string, option: string, email: string): Promise<string> {
    const currentUserEmail = await firebase.auth().currentUser?.email;
    if (currentUserEmail) {
      return `${cmd}: Already logged in as ${currentUserEmail}`;
    }
    switch (option) {
      case '--email': {
        if (!email) {
          return errorMessages.InvalidOption(cmd);
        }
        const token = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(64)))).substring(0, 64);
        return firebase.auth().sendSignInLinkToEmail(email, {
          url: `https://cli.taso.tech?path=${this.tasoShell.cd}&cmd=${encodeURIComponent('taso-cli login')}&token=${token}`,
          handleCodeInApp: true
        })
          .then(() => {
            localStorage.setItem('loginEmail', email);
            return `${cmd}: The login link was successfully sent.`;
          })
          .catch(() => errorMessages.Error(cmd));
      }
      case undefined: {
        if (!firebase.auth().isSignInWithEmailLink(window.location.href)) {
          return errorMessages.Error(cmd);
        }
        const loginEmail = localStorage.getItem('loginEmail');
        if (!loginEmail) {
          return errorMessages.Error(cmd);
        }
        return firebase.auth().signInWithEmailLink(loginEmail, window.location.href)
          .then(() => {
            window.localStorage.removeItem('loginEmail');
            return `${cmd}: Logged in as ${loginEmail}`;
          })
          .catch(() => errorMessages.Error(cmd));
      }
    }
    return errorMessages.InvalidOption(cmd);
  }

  private async logoutTasoCli(cmd: string): Promise<string> {
    const currentUserEmail = await firebase.auth().currentUser?.email;
    if (!currentUserEmail) {
      return `${cmd}: No need to logout, not logged in`;
    }
    return firebase.auth().signOut()
      .then(() => `${cmd}: Logged out from ${currentUserEmail}`)
      .catch(() => errorMessages.Error(cmd));
  }

  private async resetTasoCli(cmd: string): Promise<string> {
    const currentUser = await firebase.auth().currentUser;
    if (!currentUser) {
      return errorMessages.Error(cmd);
    }
    const storageRef = firebase.storage().ref();
    const rootRef = storageRef.child('/');
    this.tasoShell.rootDir = await getRootDir(rootRef);
    const userRepositories = this.tasoShell.getFile('~/repositories').type;
    if (userRepositories && userRepositories !== true) {
      const repoDir = await getRepoDir(this.tasoShell.user, this.tasoShell.repo);
      userRepositories[this.tasoShell.repo] = repoDir;
    }
    const settingsRef = firebase.firestore().collection('settings');
    return settingsRef.doc('rootDir').set({
      data: JSON.stringify(this.tasoShell.rootDir),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
      .then(() => {
        return `${cmd}: Directory tree has been updated. OGP image generation started.`;
      })
      .catch(() => errorMessages.Error(cmd));
  }

  share(argv: string[]): Result {
    const errorResult: Result = {
      type: 'text',
      data: ''
    };
    const cmdArgv = argv.slice(1);
    if (cmdArgv.length >= 2) {
      errorResult.data = errorMessages.TooManyArgs(argv[0]);
      return errorResult;
    }

    const fileData = cmdArgv[0] ? this.tasoShell.getFile(cmdArgv[0]) : null;
    if (fileData && fileData.type === undefined) {
      errorResult.data = errorMessages.NoFile(argv[0], fileData.fullPath);
      return errorResult;
    }
    const path = fileData?.fullPath || this.tasoShell.cd;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent('taso-cli')}&url=https://cli.taso.tech${path}`;
    window.open(shareUrl, '_blank');
    return this.nullResult;
  }

  async open(argv: string[]): Promise<Result> {
    const errorResult: Result = {
      type: 'text',
      data: ''
    };
    const cmdArgv = argv.slice(1);
    if (cmdArgv.length >= 2) {
      errorResult.data = errorMessages.TooManyArgs(argv[0]);
      return errorResult;
    }

    const fileData = this.tasoShell.getFile(cmdArgv[0]);
    if (fileData.type !== true) {
      errorResult.data = getFileTypeError(fileData.type, argv[0], fileData.fullPath);
      return errorResult;
    }
    if (fileData.fullPath.split('.').slice(-1)[0] !== 'link') {
      errorResult.data = errorMessages.FileFormat(argv[0], fileData.fullPath);
      return errorResult;
    }
    const url = await fetch(`https://firebasestorage.googleapis.com/v0/b/taso-cli.appspot.com/o/${encodeURIComponent(fileData.fullPath.slice(1))}?alt=media`)
      .then(res => res.text())
      .catch(() => undefined);
    if (!url) {
      errorResult.data = errorMessages.Error(argv[0]);
      return errorResult;
    }
    window.open(url, '_blank');
    return {
      type: 'url',
      data: url
    };
  }
}
