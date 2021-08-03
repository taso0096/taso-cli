interface Result {
  type: null | 'text';
  data: null | string;
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

export class TasoCli {
  user: string;
  rootDir: DirObject;
  cd: string;
  history: string[];
  result: Result[];

  repo: string;
  allowGetRepo: boolean;

  constructor() {
    this.user = 'taso0096';
    this.rootDir = {};
    this.cd = `/home/${this.user}`;
    this.history = [];
    this.result = [];

    this.repo = 'taso-cli';
    this.allowGetRepo = false;
  }

  async boot(): Promise<void> {
    this.rootDir.home = {};
    this.rootDir.home[this.user] = {
      repositories: {}
    };

    if (this.allowGetRepo) {
      const repoDir = await this._getRepoDir();
      this.rootDir.home[this.user].repositories[this.repo] = repoDir;
    }
  }

  getFullPath(path: string) {
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
      file,
      fullPath: file ? ['', ...trimPath].join('/') : null
    };
  }

  execCmd(cmd: string): void {
    const result = {
      type: null,
      data: null
    };
    this.history.push(cmd);
    this.result.push(result);
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
