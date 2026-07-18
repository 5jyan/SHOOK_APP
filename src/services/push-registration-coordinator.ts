export class PushRegistrationCoordinator {
  private pending = new Map<string, Promise<boolean>>();
  private lastSuccessfulSignature: string | null = null;

  async run(
    signature: string,
    register: () => Promise<boolean>,
    force = false
  ): Promise<boolean> {
    if (!force && this.lastSuccessfulSignature === signature) {
      return true;
    }

    const pendingRegistration = this.pending.get(signature);
    if (pendingRegistration) {
      return pendingRegistration;
    }

    const registrationPromise = register().then((success) => {
      if (success) {
        this.lastSuccessfulSignature = signature;
      }
      return success;
    });
    this.pending.set(signature, registrationPromise);

    try {
      return await registrationPromise;
    } finally {
      this.pending.delete(signature);
    }
  }

  reset(): void {
    this.lastSuccessfulSignature = null;
  }
}
