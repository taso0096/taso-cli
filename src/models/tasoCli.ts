interface Result {
  type: null | 'text';
  data: null | string;
}

export class TasoCli {
  history: string[];
  result: Result[];

  constructor() {
    this.history = [];
    this.result = [];
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
