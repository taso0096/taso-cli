import { TasoKernel, errorMessages, isImage } from '@/tasoCli/kernel';
import { DirObject } from '@/tasoCli/makeDirTree';
import appPackage from '../../package.json';

import firebase from 'firebase/app';
import 'firebase/storage';
import 'firebase/firestore';

interface HistoryData {
  cd: string;
  cmd: string;
}

export interface CmdData {
  type: 'text' | 'key',
  data: string
}

export interface Result {
  type: 'text' | 'files' | 'img' | 'history' | 'url' | null;
  data: string | string[] | (number | string)[][] | null;
}

export type FileType = undefined // 存在しない
  | null // 権限なし（ディレクトリ）
  | true // 権限あり（ファイル）
  | false // 権限なし（ファイル）
  | DirObject;

interface FileData {
  type: FileType;
  fullPath: string;
}

export class TasoShell {
  version: string;
  tasoKernel!: TasoKernel;

  user: string;
  rootDir: DirObject;
  homeDirFullPath: string;
  cd: string;
  history: HistoryData[];
  results: Result[];
  historyStartIndex: number;
  repo: string;

  inputRef!: HTMLSpanElement;

  constructor(path: string) {
    this.version = appPackage.version;
    this.user = 'taso0096';
    this.rootDir = {};
    this.homeDirFullPath = `/home/${this.user}`;
    this.cd = path || this.homeDirFullPath;
    this.history = [];
    this.results = [];
    this.historyStartIndex = 0;

    this.repo = 'taso-cli';
  }

  async boot(tasoKernel: TasoKernel): Promise<void> {
    const rootDirRef = firebase.firestore().collection('settings').doc('rootDir');
    const rootDirText = await rootDirRef.get()
      .then(doc => doc.data()?.data)
      .catch(() => undefined);
    const defaultRootDir: DirObject = { home: {} };
    defaultRootDir.home[this.user] = {};
    this.rootDir = rootDirText ? JSON.parse(rootDirText) : defaultRootDir;
    this.tasoKernel = tasoKernel;

    this.history.push({
      cd: '',
      cmd: ''
    });
    this.results.push({
      type: 'text',
      data: `Welcome to taso-cli v${this.version}\n * privacy-policy: ~/privacy-policy.md`
    });

    const cdData = this.getFile(this.cd);
    const fileName = this.cd.split('/').slice(-1)[0];
    if (!cdData.type) {
      this.cd = this.homeDirFullPath;
      if (cdData.type !== false) {
        await this.execCmd({
          type: 'text',
          data: `cd ${cdData.fullPath}`
        });
        return;
      }
    } else {
      this.cd = cdData.fullPath;
      if (cdData.type !== true) {
        return;
      } else if (cdData.type) {
        this.cd = this.getFile('..').fullPath;
      }
    }
    await this.execCmd({
      type: 'text',
      data: `${isImage(fileName.split('.').slice(-1)[0]) ? 'imgcat' : 'cat'} ${cdData.type ? fileName : cdData.fullPath}`
    });
  }

  registerInputRef(inputRef: HTMLSpanElement): void {
    this.inputRef = inputRef;
  }

  getFile(path: string): FileData {
    const argPath = path.split(/\/+/);
    if (argPath[0] === '') {
      argPath.shift();
    } else if (argPath[0] === '~') {
      argPath.shift();
      argPath.unshift(...['home', this.user]);
    } else {
      argPath.unshift(...this.cd.split(/\/+/));
    }

    const trimPath = argPath.reduce((newPath: string[], key: string) => {
      if (key === '..') {
        newPath.pop();
      } else if (!['', '.'].includes(key)) {
        newPath.push(key);
      }
      return newPath;
    }, []);

    const file: FileType = trimPath.reduce((dir, key) => {
      if (!dir) {
        return dir;
      }
      if (dir[key] !== undefined) {
        if (dir[key][':']) {
          return null;
        }
        return dir[key];
      }
    }, this.rootDir);

    return {
      type: file,
      fullPath: ['', ...trimPath].join('/') || '/'
    };
  }

  getCdName(): string {
    const regexp = new RegExp(`^\\/home\\/${this.user}\\/`);
    return this.cd === this.homeDirFullPath ? '~' : this.cd.replace(regexp, '~/');
  }

  async execCmd(cmd: CmdData): Promise<void> {
    if (!this.tasoKernel) {
      return;
    }
    if (cmd.type === 'key') {
      this.tasoKernel.keyInput(cmd.data);
      return;
    }
    this.history.push({
      cd: this.getCdName(),
      cmd: cmd.data
    });
    if (!cmd.data) {
      this.results.push(this.tasoKernel.nullResult);
      return;
    }
    this.tasoKernel.tmpHistoryCmd = null;
    this.tasoKernel.tmpTabCmd = null;
    const result = await ((cmdText: string): Promise<Result> | Result => {
      const argv = cmdText.split(/ +/).filter(v => v !== '');
      switch (argv[0]) {
        case 'cd':
          return this.tasoKernel.cd(argv);
        case 'pwd':
          return this.tasoKernel.pwd(argv);
        case 'ls':
          return this.tasoKernel.ls(argv);
        case 'date':
          return this.tasoKernel.date(argv);
        case 'cat':
          return this.tasoKernel.cat(argv);
        case 'imgcat':
          return this.tasoKernel.imgcat(argv);
        case 'history':
          return this.tasoKernel.history(argv);
        case 'clear':
          return this.tasoKernel.clear(argv);
        case 'taso-cli':
          return this.tasoKernel.tasoCli(argv);
        case 'share':
          return this.tasoKernel.share(argv);
        case 'open':
          return this.tasoKernel.open(argv);
        default:
          return {
            type: 'text',
            data: errorMessages.NoCmd(argv[0])
          };
      }
    })(cmd.data.replace(/\u00a0/g, '\u0020')); // nbspを通常スペースに変換
    this.results.push(result);
  }
}
