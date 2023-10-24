"use client";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import io from "socket.io-client";
import Loading from "../../components/loading";
import { Message, Lobby as LobbyType } from "@/types";

import { useRef } from "react";
import Image from "next/image";
let socket: any = null;

function InitSocket() {
  fetch(`/api/socket`);
  socket = io({
    path: "/api/socket",
  });

  function cleanup() {
    socket.removeAllListeners();
    socket.disconnect();
  }
  return cleanup;
}

function unmountSocketListeners() {
  socket.removeAllListeners();
}

function playMessageSound() {
  const audio = new Audio("/sounds/message.mp3");
  audio.loop = false;
  audio.play();
}

function playRandomBGMusic(audioDom: HTMLAudioElement, play: boolean = true) {
  if (!play) return;
  const songs = [
    "/music/lobby/LazySunday.mp3",
    "/music/lobby/SmoothNylons.mp3",
    "/music/lobby/TownTalk.mp3",
  ];
  songs.splice(
    songs.indexOf("/" + audioDom.src.split("/").splice(3).join("/")),
    1
  );
  const randomSong = songs[Math.floor(Math.random() * songs.length)];
  audioDom.src = randomSong;
}

export default function Lobby({ params }: { params: { lobbyId: string } }) {
  const { data: session } = useSession();
  const [lobby, setLobby] = useState(null as LobbyType | null);
  const [message, setMessage] = useState("");
  const [isLoading, setLoading] = useState(true);
  const [playMusic, setPlayMusic] = useState(true);
  const [playSFX, setPlaySFX] = useState(true);
  const elementRef = useRef<HTMLDivElement>(null);
  const [allMessages, setAllMessages] = useState([] as Message[]);
  const [audioDom, setAdudioDom] = useState<HTMLAudioElement | null>(null);

  // Try to get the lobby from the server
  useEffect(() => {
    // Wait for the session to load
    if (!params.lobbyId || session === undefined) return;

    fetch(`/api/lobby/getLobby?id=` + params.lobbyId, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setLobby(data.lobby);
        const isSocketNull = socket == null;

        if (data.lobby) {
          if (!isSocketNull) unmountSocketListeners();
          if (isSocketNull) InitSocket();

          socket.on("receiveMessage", async (data: Message) => {
            if (data.lobbyId !== params.lobbyId) return;
            setAllMessages((prev) => [...prev, data]);

            if (session == null || data.username !== session?.user?.name)
              if (playSFX) playMessageSound();

            if (elementRef.current) {
              await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for messages to load
              elementRef.current.scroll({
                top: elementRef.current.scrollHeight,
                behavior: "smooth",
              }); // Scroll to the bottom of the chat
            }
          });

          socket.on("buttonPressed", (data: any) => {
            console.log(data);
          });
        }

        setLoading(false);
      });
  }, [params.lobbyId, session, playMusic, playSFX]);

  function sendMessage(e: any) {
    e.preventDefault(); // Prevent the page from reloading
    setMessage(""); // Clear the message input

    if (!message) return; // Don't send empty messages
    socket.emit("sendMessage", {
      lobbyId: params.lobbyId,
      message: message,
      avatar: session?.user?.image || "/images/guest.png",
      username: session?.user?.name,
      type: "text",
    } as Message);
  }

  // While we wait for fetch to return, show a loading message
  if (isLoading) return <Loading />;

  // If the lobby doesn't exist, show a message
  if (!lobby) {
    return (
      <div className="text-3xl px-6 mx-auto text-center mb-12 my-5">
        <h1 className="font-mono">Lobby not found</h1>
        <button className="bg-neutral-700 hover:bg-neutral-800 text-white font-bold py-2 px-16 rounded mt-5">
          <a href="/">Return to menu</a>
        </button>
      </div>
    );
  }

  // TODO: add lobby page UI

  return (
    <div className="flex justify-center w-screen px-4 ">
      <audio
        id="bgm"
        src="/music/lobby/LazySunday.mp3"
        autoPlay
        ref={(element) => setAdudioDom(element)}
        onEnded={() => playRandomBGMusic(audioDom!, playMusic)}
        muted={!playMusic}
      />
      <div className="flex w-full h-[calc(100vh-105px)]">
        {/* Game field */}
        <div className="flex flex-col flex-grow border-r border-neutral-700">
          {/* {
            <div>
              {session ? (
                <button
                  className="bg-neutral-700 hover:bg-neutral-800 text-white font-bold py-2 px-16 rounded mt-5"
                  onClick={sendButtonPress}
                >
                  Send webhook!
                </button>
              ) : (
                <button className="bg-neutral-800 text-gray-400 font-bold py-2 px-16 rounded mt-5 cursor-not-allowed">
                  <span>You need to sign in first</span>
                </button>
              )}
            </div>
          } */}
        </div>

        <div className="flex flex-col flex-shrink-0 w-1/4 py-4 pl-4 justify-between">
          {/* Settings */}
          <div className="flex flex-col px-4 py-2 border-b border-neutral-700 sticky">
            <div className="flex flex-row items-center justify-between w-full">
              <span className="text-xl font-bold">
                Lobby: <span className="text-xl font-light"> {lobby.name}</span>
              </span>
              <span className="text-xl font-bold">
                Players:{" "}
                <span className="text-xl font-light">
                  {lobby.players.length} / {lobby.maxPlayers}
                </span>
              </span>
            </div>
            <div className="flex flex-row items-center justify-between w-full mt-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={playMusic}
                  onChange={() => {
                    setPlayMusic(!playMusic);
                    playRandomBGMusic(audioDom!, !playMusic);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                <span className="ml-3 text-xl font-medium">Music</span>
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  onChange={() => setPlaySFX(!playSFX)}
                  checked={playSFX}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                <span className="ml-3 text-xl font-medium">SFX</span>
              </label>
            </div>
          </div>
          {/* Chat window */}
          <div className="flex flex-col overflow-y-auto justify-between">
            <div className="flex flex-col overflow-y-auto" ref={elementRef}>
              {allMessages.length === 0 ? (
                <div className="flex flex-row items-center justify-center w-full px-4 py-2">
                  No messages yet :(
                </div>
              ) : (
                allMessages.map((message: Message, index: number) => {
                  return (
                    <div key={`${message.lobbyId}_${index}`}>
                      <div
                        className={`" flex flex-row items-end w-full px-4 py-2 " ${
                          message.username === session?.user?.name
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        {message.username !== session?.user?.name && (
                          <Image
                            src={message.avatar}
                            width={46}
                            height={46}
                            alt="logo"
                            className="rounded-md ml-1"
                          />
                        )}
                        <div
                          className={`" py-3 px-4 rounded-lg inline-block whitespace-normal break-all " ${
                            message.username === session?.user?.name
                              ? "mr-2 bg-blue-600 text-white rounded-br-none"
                              : "ml-2 bg-gray-300 text-black rounded-bl-none"
                          }`}
                        >
                          <span> {message.message}</span>
                          <br></br>
                          <span
                            className={`" text-sm" ${
                              message.username === session?.user?.name
                                ? "text-gray-300"
                                : message.username === lobby.host
                                ? "text-yellow-600"
                                : "text-gray-600"
                            }`}
                          >
                            -{message.username}
                            {message.username === lobby.host && "👑"}
                          </span>
                        </div>
                        {message.username === session?.user?.name && (
                          <Image
                            src={message.avatar}
                            width={46}
                            height={46}
                            alt="logo"
                            className="rounded-md ml-1"
                          />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <form
              onSubmit={sendMessage}
              className="py-5 justify-center flex text-black"
            >
              <input
                name="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={`" w-full px-4 py-4 mx-2 mt-5 rounded-lg bg-gray-200 " ${
                  !session && "cursor-not-allowed"
                }`}
                disabled={!session}
                placeholder="Write here something..."
                maxLength={200}
                autoComplete="off"
              />
              <button
                className={`" hover:bg-neutral-800 bg-neutral-700 text-white px-4 py-4 mx-2 mt-5 rounded-lg  " ${
                  !session && "cursor-not-allowed"
                }`}
                type="submit"
                disabled={!session}
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
