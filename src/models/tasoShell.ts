import { TasoKernel, errorMessages } from '@/models/tasoKernel';
import { DirObject, getRepoDir } from '@/models/makeDirTree';

interface CmdData {
  cd: string;
  cmd: string;
}

export interface Result {
  type: 'text' | 'files' | null;
  data: string | string[] | null;
}

type FileType = undefined // 存在しない
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
  history: CmdData[];
  results: Result[];

  repo: string;
  allowGetRepo: boolean;

  constructor() {
    this.tasoKernel = null;

    this.user = 'taso0096';
    this.rootDir = {};
    this.homeDirFullPath = `/home/${this.user}`;
    this.cd = this.homeDirFullPath;
    this.history = [];
    this.results = [];

    this.repo = 'taso-cli';
    this.allowGetRepo = false;
  }

  async boot(tasoKernel: TasoKernel): Promise<void> {
    this.tasoKernel = tasoKernel;

    this.rootDir.home = {};
    this.rootDir.home[this.user] = {
      repositories: {},
      'README.md': true,
      'root.txt': false
    };

    if (this.allowGetRepo) {
      const repoDir = await getRepoDir(this.user, this.repo);
      this.rootDir.home[this.user].repositories[this.repo] = repoDir;
    }
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

  execCmd(cmd: string): void {
    if (!this.tasoKernel) {
      return;
    }
    this.history.push({
      cd: this.getCdName(),
      cmd
    });
    if (!cmd) {
      this.results.push(this.tasoKernel.nullResult);
      return;
    }
    const result = ((cmd: string): Result => {
      const argv = cmd.split(' ');
      switch (argv[0]) {
        case 'cd':
          return this.tasoKernel.cd(cmd);
        case 'pwd':
          return this.tasoKernel.pwd(cmd);
        case 'ls':
          return this.tasoKernel.ls(cmd);
        case 'date':
          return this.tasoKernel.date(cmd);
        default:
          return {
            type: 'text',
            data: errorMessages.NoCmd(argv[0])
          };
      }
    })(cmd);
    this.results.push(result);
  }
}
