interface Result {
  type: null | 'text';
  data: null | string;
}

export class TasoCli {
  user: string;
  rootDir: any;
  cd: string;
  history: string[];
  result: Result[];

  constructor() {
    this.user = 'taso0096';
    this.rootDir = {};
    this.cd = `/home/${this.user}`;
    this.history = [];
    this.result = [];
  }

  boot(): void {
    this.rootDir = {
      home: {}
    };
    this.rootDir.home[this.user] = {
      repositories: {}
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
}
