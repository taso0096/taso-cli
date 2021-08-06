import { TasoShell, Result } from '@/models/tasoShell';

interface ErrorMessages {
  [key: string]: (cmd: string, name?: string) => string
};

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

  cd(cmd: string): Result {
    const result: Result = {
      type: 'text',
      data: ''
    };
    const cmdOptions = cmd.split(' ').slice(1);
    switch (cmdOptions.length) {
      case 0:
        this.tasoShell.cd = this.tasoShell.homeDirFullPath;
        return this.nullResult;
      case 1:
        break;
      default:
        result.data = errorMessages.TooManyArgs('cd');
        return result;
    }

    const fileData = this.tasoShell.getFullPath(cmdOptions[0]);
    if (typeof fileData.type === 'object') {
      this.tasoShell.cd = fileData.fullPath;
      return this.nullResult;
    }
    const resultMap: Map<undefined | null | boolean, string> = new Map([
      [undefined, errorMessages.NoFile('cd', cmdOptions[0])],
      [null, errorMessages.PermissionDenied('cd', cmdOptions[0])],
      [true, errorMessages.NotDir('cd', cmdOptions[0])],
      [false, errorMessages.NotDir('cd', cmdOptions[0])]
    ]);
    result.data = resultMap.get(fileData.type) || '';
    return result;
  }

  pwd(cmd: string): Result {
    const cmdOptions = cmd.split(' ').slice(1);
    if (cmdOptions.length > 0) {
      return {
        type: 'text',
        data: errorMessages.TooManyArgs('pwd')
      };
    }
    return {
      type: 'text',
      data: this.tasoShell.cd
    };
  }
}
