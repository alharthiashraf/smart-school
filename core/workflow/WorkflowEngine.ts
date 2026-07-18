export type WorkflowTransition<Status extends string> = {
  from: Status;
  to: Status;
  action: string;
  roles?: string[];
};

export const WorkflowEngine = {
  canTransition<Status extends string>(status: Status, action: string, transitions: WorkflowTransition<Status>[], role?: string | null) {
    return transitions.some((transition) => {
      const same = transition.from === status && transition.action === action;
      const allowedRole = !transition.roles?.length || (!!role && transition.roles.includes(role));
      return same && allowedRole;
    });
  },

  nextStatus<Status extends string>(status: Status, action: string, transitions: WorkflowTransition<Status>[], role?: string | null) {
    const transition = transitions.find((item) => {
      const same = item.from === status && item.action === action;
      const allowedRole = !item.roles?.length || (!!role && item.roles.includes(role));
      return same && allowedRole;
    });
    return transition?.to ?? status;
  },
};

