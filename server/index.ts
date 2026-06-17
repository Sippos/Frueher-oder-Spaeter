import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import { createGame, CreateGameOptions } from "../src/game/cards/state/createGame";
import { playCardFromHand, revealStagedCards, endRound } from "../src/game/cards/state/actions";
import { GameState, PlayerId, SetupState } from "../src/game/cards/state/gameTypes";
import { sanitizeGameState, sanitizeSetupState } from "./stateSanitizer";

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

interface Room {
  id: string;
  player1Socket?: string;
  player2Socket?: string;
  gameState?: GameState;
  setupState?: SetupState;
  readyPlayers: Set<PlayerId>;
}

const rooms = new Map<string, Room>();
const socketToRoom = new Map<string, { roomId: string; playerId: PlayerId }>();

function generateRoomId() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function broadcastState(room: Room) {
  if (room.setupState && !room.gameState) {
    if (room.player1Socket) {
      io.to(room.player1Socket).emit("setupState", sanitizeSetupState(room.setupState, "player1"));
    }
    if (room.player2Socket) {
      io.to(room.player2Socket).emit("setupState", sanitizeSetupState(room.setupState, "player2"));
    }
  }

  if (!room.gameState) return;

  if (room.player1Socket) {
    io.to(room.player1Socket).emit("gameState", sanitizeGameState(room.gameState, "player1"));
  }
  if (room.player2Socket) {
    io.to(room.player2Socket).emit("gameState", sanitizeGameState(room.gameState, "player2"));
  }
}

io.on("connection", (socket: Socket) => {
  console.log("Client connected:", socket.id);

  socket.on("createRoom", () => {
    const roomId = generateRoomId();
    rooms.set(roomId, { id: roomId, player1Socket: socket.id, readyPlayers: new Set() });
    socketToRoom.set(socket.id, { roomId, playerId: "player1" });
    socket.emit("roomCreated", roomId);
    socket.emit("playerAssigned", "player1");
    console.log("Room created:", roomId);
  });

  socket.on("joinRoom", (roomId: string, callback?: (res: { success: boolean, player?: PlayerId, error?: string }) => void) => {
    const room = rooms.get(roomId.toUpperCase());
    if (!room) {
      socket.emit("error", "Room not found");
      if (callback) callback({ success: false, error: "Room not found" });
      return;
    }

    if (room.player1Socket && room.player2Socket) {
      socket.emit("error", "Room is full");
      if (callback) callback({ success: false, error: "Room is full" });
      return;
    }

    const playerId: PlayerId = room.player1Socket ? "player2" : "player1";
    if (playerId === "player1") {
      room.player1Socket = socket.id;
    } else {
      room.player2Socket = socket.id;
    }

    socketToRoom.set(socket.id, { roomId: room.id, playerId });
    socket.emit("playerAssigned", playerId);
    if (callback) callback({ success: true, player: playerId });
    
    // If both players are present, notify them and initialize setup
    if (room.player1Socket && room.player2Socket) {
      if (!room.gameState && !room.setupState) {
        room.setupState = {
          stepIndex: 0,
          selectedStartingMonsters: {}
        };
      }

      io.to(room.player1Socket).emit("roomReady");
      io.to(room.player2Socket).emit("roomReady");
      
      broadcastState(room);
    }
  });

  socket.on("tossCoin", (result: "eye" | "finger") => {
    console.log(`[tossCoin] Socket ${socket.id} tossed coin. Result: ${result}`);
    const session = socketToRoom.get(socket.id);
    if (!session) {
      console.log(`[tossCoin] No session found for socket ${socket.id}`);
      return;
    }
    
    const room = rooms.get(session.roomId);
    if (!room || !room.setupState) {
      console.log(`[tossCoin] Room not found or no setupState for room ${session.roomId}`);
      return;
    }

    console.log(`[tossCoin] Updating room ${session.roomId} coinSide to ${result}`);
    room.setupState.coinSide = result;
    room.setupState.player1DeckId = result;
    room.setupState.player2DeckId = result === "eye" ? "finger" : "eye";
    
    // Animate coin toss on frontend, then frontend moves to step 1 automatically?
    // We can just broadcast. The frontend handles animation timing.
    broadcastState(room);
  });

  socket.on("setSetupStep", (stepIndex: number) => {
    const session = socketToRoom.get(socket.id);
    if (!session) return;
    const room = rooms.get(session.roomId);
    if (!room || !room.setupState) return;

    // Only player1 advances the generic step
    room.setupState.stepIndex = stepIndex;
    broadcastState(room);
  });

  socket.on("selectStartingMonster", (cardId: string) => {
    console.log(`[selectStartingMonster] Socket ${socket.id} selecting card ${cardId}`);
    const session = socketToRoom.get(socket.id);
    if (!session) {
      console.log(`[selectStartingMonster] No session for socket ${socket.id}`);
      return;
    }
    const room = rooms.get(session.roomId);
    if (!room || !room.setupState) {
      console.log(`[selectStartingMonster] No room or setupState for socket ${socket.id}`);
      return;
    }

    room.setupState.selectedStartingMonsters[session.playerId] = cardId;
    console.log(`[selectStartingMonster] Player ${session.playerId} selected ${cardId}. Room state:`, room.setupState.selectedStartingMonsters);
    broadcastState(room);

    // If both have selected, automatically start the game!
    if (room.setupState.selectedStartingMonsters.player1 && room.setupState.selectedStartingMonsters.player2) {
      // Small delay so players see the "ready" state before jump
      setTimeout(() => {
        if (!room.setupState) return; // in case already started
        
        const p1Id = room.setupState.player1DeckId!;
        const p2Id = room.setupState.player2DeckId!;
        
        room.gameState = createGame({
          player1DeckId: p1Id,
          startingMonsterIds: {
            [p2Id]: room.setupState.selectedStartingMonsters.player1,
            [p1Id]: room.setupState.selectedStartingMonsters.player2
          }
        });
        
        // Remove setup state
        room.setupState = undefined;
        broadcastState(room);
      }, 1000);
    }
  });

  socket.on("startGame", (options: CreateGameOptions) => {
    const session = socketToRoom.get(socket.id);
    if (!session) return;
    
    const room = rooms.get(session.roomId);
    if (!room) return;

    room.gameState = createGame(options);
    broadcastState(room);
  });

  socket.on("playCard", ({ cardId, target }: { cardId: string, target?: any }) => {
    const session = socketToRoom.get(socket.id);
    if (!session) return;
    
    const room = rooms.get(session.roomId);
    if (!room || !room.gameState) return;

    room.gameState = playCardFromHand(room.gameState, session.playerId, cardId, target);
    broadcastState(room);
  });

  socket.on("playerReady", () => {
    const session = socketToRoom.get(socket.id);
    if (!session) return;
    
    const room = rooms.get(session.roomId);
    if (!room || !room.gameState) return;

    room.readyPlayers.add(session.playerId);

    if (room.readyPlayers.size === 2) {
      room.readyPlayers.clear();
      if (room.gameState.phase === "play") {
        room.gameState = revealStagedCards(room.gameState);
      } else if (room.gameState.phase === "reveal") {
        room.gameState = endRound(room.gameState);
      }
      broadcastState(room);
    }
  });

  socket.on("drawCard", () => {
    const session = socketToRoom.get(socket.id);
    if (!session) return;
    
    const room = rooms.get(session.roomId);
    if (!room || !room.gameState) return;

    const game = room.gameState;
    if (game.phase !== "play") return;
    
    // We should track drawsRemaining on the server ideally, but for now just let them draw.
    // To be perfectly safe, we'd add drawsRemaining to PlayerState. 
    // For now, let's just do the draw.
    const player = game.players[session.playerId];
    if (player.deck.length > 0) {
      const [drawnCard, ...remainingDeck] = player.deck;
      player.deck = remainingDeck;
      player.hand.push(drawnCard);
      broadcastState(room);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    const session = socketToRoom.get(socket.id);
    if (session) {
      const room = rooms.get(session.roomId);
      if (room) {
        if (session.playerId === "player1") {
          room.player1Socket = undefined;
        } else {
          room.player2Socket = undefined;
        }
        if (!room.player1Socket && !room.player2Socket) {
          rooms.delete(session.roomId);
        } else {
          // Notify the other player
          const otherSocket = session.playerId === "player1" ? room.player2Socket : room.player1Socket;
          if (otherSocket) {
            io.to(otherSocket).emit("opponentDisconnected");
          }
        }
      }
      socketToRoom.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
