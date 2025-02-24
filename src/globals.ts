import { type Ora } from "ora";

export const globals = {
  spinner: null as unknown as Ora,
};

export const Consts = {
  CODE_RED: -1,
  isCodeRed(v: any): v is -1 {
    return v == Consts.CODE_RED;
  },
} as const;
