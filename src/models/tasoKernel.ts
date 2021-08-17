import { TasoShell, Result, FileType } from '@/models/tasoShell';

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
      if (['cat', 'imgcat'].includes(cmd)) {
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

    const fileData = this.tasoShell.getFullPath(cmdArgv[0]);
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

    const fileData = this.tasoShell.getFullPath(fileName || this.tasoShell.cd);
    if (!fileData.type && fileData.type !== false) {
      errorResult.data = getFileTypeError(fileData.type, argv[0], fileName);
      return errorResult;
    } else if (typeof fileData.type === 'boolean') {
      errorResult.data = fileData.fullPath.split('/').slice(-1)[0];
      return errorResult;
    }
    const resultFiles = Object.entries(fileData.type).map(file => file[0] + (file[1] && file[1] !== true ? '/' : ''));
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
    result.data = String(new Date());
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

    const fileData = this.tasoShell.getFullPath(cmdArgv[0]);
    if (fileData.type !== true) {
      result.data = getFileTypeError(fileData.type, argv[0], cmdArgv[0]);
      return result;
    }

    const repoFilePath = fileData.fullPath.split(`${this.tasoShell.homeDirFullPath}/repositories/${this.tasoShell.repo}/`)[1];
    if (repoFilePath) {
      result.data = await fetch(`https://api.github.com/repos/taso0096/${this.tasoShell.repo}/contents/${repoFilePath}`)
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

    const fileData = this.tasoShell.getFullPath(cmdArgv[0]);
    if (fileData.type !== true) {
      errorResult.data = getFileTypeError(fileData.type, argv[0], cmdArgv[0]);
      return errorResult;
    } else if (!['png', 'jpg', 'gif', 'ico'].includes(fileData.fullPath.split('/').slice(-1)[0].split('.').slice(-1)[0])) {
      errorResult.data = errorMessages.FileFormat(argv[0]);
      return errorResult;
    }

    const result: Result = {
      type: 'img',
      data: ''
    };
    const repoFilePath = fileData.fullPath.split(`${this.tasoShell.homeDirFullPath}/repositories/${this.tasoShell.repo}/`)[1];
    if (repoFilePath) {
      const imageBlob = await fetch(`https://raw.githubusercontent.com/taso0096/${this.tasoShell.repo}/main/${repoFilePath}`)
        .then(res => res.blob());
      result.data = URL.createObjectURL(imageBlob);
    } else {
      const imageBlob = await fetch(`https://firebasestorage.googleapis.com/v0/b/taso-cli.appspot.com/o/${encodeURIComponent(fileData.fullPath.slice(1))}?alt=media`)
        .then(res => res.blob());
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
}
