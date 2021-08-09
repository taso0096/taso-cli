import { TasoKernel, errorMessages } from '@/models/tasoKernel';

interface CmdData {
  cd: string;
  cmd: string;
}

export interface Result {
  type: 'text' | 'files' | null;
  data: string | string[] | null;
}

interface DirObject {
  [key: string]: any;
}
type FileType = undefined // 存在しない
  | null // 権限なし（ディレクトリ）
  | true // 権限あり（ファイル）
  | false // 権限なし（ファイル）
  | DirObject;

interface GitHubFile {
  path: string;
  type: string;
  sha: string;
}
type GitHubDir = GitHubFile[];

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
      const repoDir = await this._getRepoDir();
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
        default:
          return {
            type: 'text',
            data: errorMessages.NoCmd(argv[0])
          };
      }
    })(cmd);
    this.results.push(result);
  }

  async _getRepoDir(): Promise<DirObject> {
    const repoDir = {};
    const commitSha: null | string = await fetch(`https://api.github.com/repos/${this.user}/${this.repo}/commits`)
      .then(res => {
        if (res.status !== 200) {
          throw new Error();
        }
        return res.json();
      })
      .then(json => json[0].sha)
      .catch(() => null);

    if (commitSha) {
      await this._getDir(repoDir, commitSha);
    }
    return repoDir;
  }

  async _getDir(parentDir: DirObject, sha: string): Promise<void> {
    const dir: GitHubDir = await this._getTree(sha);
    for (const file of dir) {
      const { path, type, sha } = file;
      parentDir[path] = type === 'tree' ? {} : true;
      if (type === 'tree') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this._getDir(parentDir[path], sha);
      }
    }
  }

  async _getTree(sha: string): Promise<GitHubDir> {
    return fetch(`https://api.github.com/repos/${this.user}/${this.repo}/git/trees/${sha}`)
      .then(res => res.json())
      .then(json => json.tree);
  }
}
