export const activityMonitor = {
  logStart(_entry: unknown) {
    return "noop";
  },
  logComplete(_id: string, _status: number) {},
  logError(_id: string, _message: string) {},
};
