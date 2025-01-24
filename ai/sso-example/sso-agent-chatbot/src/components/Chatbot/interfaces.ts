export interface Message {
  text: string;
  type: InputType;
  isJson?: boolean;
  isLoading?: boolean;
  isMagicLink?: boolean;
  timestamp: Date;
}

export enum InputType {
  User = "user",
  Bot = "bot",
}

export enum Label {
  User = "User",
  Bot = "Chain Ai Agent",
  Data = "Data",
}
