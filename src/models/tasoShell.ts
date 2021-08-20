import { TasoKernel, errorMessages } from '@/models/tasoKernel';
import { DirObject, getRootDir, getRepoDir } from '@/models/makeDirTree';

import firebase from 'firebase/app';
import 'firebase/storage';

interface HistoryData {
  cd: string;
  cmd: string;
}

export interface CmdData {
  type: 'text' | 'key',
  data: string
}

export interface Result {
  type: 'text' | 'files' | 'img' | 'history' | null;
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
  tasoKernel: TasoKernel | null;

  user: string;
  rootDir: DirObject;
  homeDirFullPath: string;
  cd: string;
  history: HistoryData[];
  results: Result[];
  historyStartIndex: number;

  repo: string;
  allowGetRepo: boolean;

  inputRef!: HTMLSpanElement;

  constructor() {
    this.tasoKernel = null;

    this.user = 'taso0096';
    this.rootDir = {};
    this.homeDirFullPath = `/home/${this.user}`;
    this.cd = this.homeDirFullPath;
    this.history = [];
    this.results = [];
    this.historyStartIndex = 0;

    this.repo = 'taso-cli';
    this.allowGetRepo = false;
  }

  async boot(tasoKernel: TasoKernel): Promise<void> {
    this.tasoKernel = tasoKernel;

    const storageRef = firebase.storage().ref();
    const rootRef = storageRef.child('/');
    this.rootDir = await getRootDir(rootRef);
    const userRepositories = this.getFullPath('~/repositories').type;
    if (this.allowGetRepo && userRepositories && userRepositories !== true) {
      const repoDir = await getRepoDir(this.user, this.repo);
      userRepositories[this.repo] = repoDir;
    }
  }

  registerInputRef(inputRef: HTMLSpanElement): void {
    this.inputRef = inputRef;
  }

  getFullPath(path: string): FileData {
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
      if (dir && dir[key] !== undefined) {
        return dir[key];
      }
      return undefined;
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
    this.tasoKernel.tmpCmd = null;
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
