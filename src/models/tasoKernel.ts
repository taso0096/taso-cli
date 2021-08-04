import { TasoShell } from '@/models/tasoShell';

export class TasoKernel {
  tasoShell: TasoShell | null;

  constructor() {
    this.tasoShell = null;
  }

  async boot(tasoShell: TasoShell): Promise<void> {
    this.tasoShell = tasoShell;
    await this.tasoShell.boot(this);
  }
}
