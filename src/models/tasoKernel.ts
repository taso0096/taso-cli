import { TasoShell, Result } from '@/models/tasoShell';

interface ErrorMessages {
  [key: string]: (cmd: string, name?: string) => string
}

export const errorMessages: ErrorMessages = {
  NoCmd: cmd => `'${cmd}': command not found`,
  TooManyArgs: cmd => `${cmd}: too many arguments`,
  PermissionDenied: (cmd, name) => `${cmd}: ${name}: Permission denied`,
  NoFile: (cmd, name) => `${cmd}: ${name}: No such file or directory`,
  NotDir: (cmd, name) => `${cmd}: ${name}: Not a directory`
};

export class TasoKernel {
  tasoShell: TasoShell;
  nullResult: Result;

  constructor(tasoShell: TasoShell) {
    this.tasoShell = tasoShell;
    this.nullResult = {
      type: null,
      data: null
    };
  }

  async boot(): Promise<void> {
    await this.tasoShell.boot(this);
  }

  cd(argv: string[]): Result {
    const result: Result = {
      type: 'text',
      data: ''
    };
    switch (argv.length) {
      case 1:
        this.tasoShell.cd = this.tasoShell.homeDirFullPath;
        return this.nullResult;
      case 2:
        break;
      default:
        result.data = errorMessages.TooManyArgs(argv[0]);
        return result;
    }

    const fileData = this.tasoShell.getFullPath(argv[1]);
    if (typeof fileData.type === 'object') {
      this.tasoShell.cd = fileData.fullPath;
      return this.nullResult;
    }
    const resultMap: Map<undefined | null | boolean, string> = new Map([
      [undefined, errorMessages.NoFile(argv[0], argv[1])],
      [null, errorMessages.PermissionDenied(argv[0], argv[1])],
      [true, errorMessages.NotDir(argv[0], argv[1])],
      [false, errorMessages.NotDir(argv[0], argv[1])]
    ]);
    result.data = resultMap.get(fileData.type) || '';
    return result;
  }

  pwd(argv: string[]): Result {
    if (argv.length > 1) {
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
    if (argv.length > 2) {
      errorResult.data = errorMessages.TooManyArgs(argv[0]);
      return errorResult;
    }

    const fileData = this.tasoShell.getFullPath(argv[1] || this.tasoShell.cd);
    switch (typeof fileData.type) {
      case 'object':
        if (fileData.type === null) {
          break;
        }
        return {
          type: 'files',
          data: Object.entries(fileData.type).map(file => file[0] + (file[1] && file[1] !== true ? '/' : ''))
        };
      case 'boolean':
        errorResult.data = fileData.fullPath.split('/').slice(-1)[0];
        return errorResult;
    }
    const resultMap: Map<undefined | null, string> = new Map([
      [undefined, errorMessages.NoFile(argv[0], argv[1])],
      [null, errorMessages.PermissionDenied(argv[0], argv[1])]
    ]);
    errorResult.data = resultMap.get(fileData.type) || '';
    return errorResult;
  }

  date(argv: string[]): Result {
    const result: Result = {
      type: 'text',
      data: ''
    };
    if (argv.length > 1) {
      result.data = errorMessages.TooManyArgs(argv[0]);
      return result;
    }
    result.data = String(new Date());
    return result;
  }
}
