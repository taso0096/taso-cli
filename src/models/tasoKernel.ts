import { TasoShell, Result, FileType } from '@/models/tasoShell';

interface ErrorMessages {
  [key: string]: (cmd: string, name?: string) => string
}

export const errorMessages: ErrorMessages = {
  Error: cmd => `'${cmd}': An error has occurred`,
  NoCmd: cmd => `'${cmd}': command not found`,
  MissingFile: cmd => `'${cmd}': missing file operand`,
  TooManyArgs: cmd => `${cmd}: too many arguments`,
  PermissionDenied: (cmd, name) => `${cmd}: ${name}: Permission denied`,
  NoFile: (cmd, name) => `${cmd}: ${name}: No such file or directory`,
  NotDir: (cmd, name) => `${cmd}: ${name}: Not a directory`,
  IsDir: (cmd, name) => `${cmd}: ${name}: Is a directory`
};

const getErrorMessage = (type: FileType, cmd: string, name: string): string => {
  switch (type) {
    case undefined:
      return errorMessages.NoFile(cmd, name);
    case null:
      return errorMessages.PermissionDenied(cmd, name);
    case true:
      return errorMessages.NotDir(cmd, name);
    case false:
      if (['cat'].includes(cmd)) {
        return errorMessages.PermissionDenied(cmd, name);
      }
      return errorMessages.NotDir(cmd, name);
    default:
      return errorMessages.IsDir(cmd, name);
  }
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
    if (fileData.type && fileData.type !== true) {
      this.tasoShell.cd = fileData.fullPath;
      return this.nullResult;
    }
    result.data = getErrorMessage(fileData.type, argv[0], argv[1]);
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
    errorResult.data = getErrorMessage(fileData.type, argv[0], argv[1]);
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

  async cat(argv: string[]): Promise<Result> {
    const result: Result = {
      type: 'text',
      data: ''
    };
    switch (argv.length) {
      case 1:
        result.data = errorMessages.MissingFile(argv[0]);
        return result;
      case 2:
        break;
      default:
        result.data = errorMessages.TooManyArgs(argv[0]);
        return result;
    }

    const fileData = this.tasoShell.getFullPath(argv[1]);
    if (fileData.type !== true) {
      result.data = getErrorMessage(fileData.type, argv[0], argv[1]);
      return result;
    }

    const repoFilePath = fileData.fullPath.split(`${this.tasoShell.homeDirFullPath}/repositories/${this.tasoShell.repo}/`)[1];
    if (repoFilePath) {
      result.data = await fetch(`https://api.github.com/repos/taso0096/yamatsumi/contents/${repoFilePath}`)
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
}
