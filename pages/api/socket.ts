import { Message, NextApiResponseServerIO } from "@/types";
import { Server as ServerIO } from "socket.io";
import { Server as NetServer } from "http";
import fs from "fs/promises";
import { defaultLobby } from "@/utils/server/helper";
import {
  onChangeAnswerField,
  onJoinGame,
  onLeaveGame,
  onSendAnswer,
  onSendMessage,
  onStartGame,
} from "@/utils/server/events";

export const config = {
  api: {
    bodyParser: false,
  },
};

function InitializeServerSocket(res: NextApiResponseServerIO) {
  const httpServer: NetServer = res.socket.server as any;
  const io = new ServerIO(httpServer, {
    path: "/api/socket",
  });

  // Since this is a new server,
  // we need to create/update a lobbies.json file
  fs.writeFile("./lobbies.json", defaultLobby);

  res.socket.server.io = io;
  return io;
}

export default function SocketHandler(_: any, res: NextApiResponseServerIO) {
  if (res.socket.server.io) {
    res.end();
    return;
  }

  const serverIO = InitializeServerSocket(res);
  serverIO.on("connection", (socket) => {
    socket.on(
      "sendMessage",
      async (m: Message) => await onSendMessage(serverIO, m)
    );
    socket.on("startGame", (data) => onStartGame(serverIO, data));
    socket.on("joinGame", (data) => onJoinGame(serverIO, data));
    socket.on("leaveGame", (data) => onLeaveGame(serverIO, data));
    socket.on("sendAnswer", (data) => onSendAnswer(serverIO, data));
    socket.on("changeAnswerField", (data) =>
      onChangeAnswerField(serverIO, data)
    );
  });

  console.log("✅ Server socket initialized");
  res.end();
}
