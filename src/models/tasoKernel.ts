import { TasoShell, Result } from '@/models/tasoShell';

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
        result.data = 'cd: too many arguments';
        return result;
    }

    const fileData = this.tasoShell.getFullPath(cmdOptions[0]);
    if (typeof fileData.type === 'object') {
      this.tasoShell.cd = fileData.fullPath;
      return this.nullResult;
    }
    const resultMap: Map<undefined | null | boolean, string> = new Map([
      [undefined, `cd: ${cmdOptions[0]}: No such file or directory`],
      [null, `cd: ${cmdOptions[0]}: Permission denied`],
      [true, `cd: ${cmdOptions[0]}: Not a directory`],
      [false, `cd: ${cmdOptions[0]}: Not a directory`]
    ]);
    result.data = resultMap.get(fileData.type) || '';
    return result;
  }
}
