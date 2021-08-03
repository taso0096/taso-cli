export interface Result {
  type: 'text';
  data: string;
}

export interface History {
  cmd: string;
  result: Result;
}
