import { Serializer } from '../decorators/serializer';
import { Move } from '../decorators/move';
import { Thru, FromEnum } from './thru';
import { ArrayOf } from './arrayOf';
export enum MessageType {
  Request = 0,
  Response = 1,
  Error = 2
}

@Move()
export class SocketMessage extends Serializer {
  @Move(FromEnum(MessageType)) type: MessageType;
  @Move(Thru) action: string;
  @Move(ArrayOf(Thru)) args: string[];
}
