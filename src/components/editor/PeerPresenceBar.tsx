'use client';

import React, { useState } from 'react';
import { useCollabStore } from '@/store/useCollabStore';
import { useEditorStore } from '@/store/useEditorStore';

export const PeerPresenceBar: React.FC = () => {
  const { isCollaborating, roomName, peers, startSession, leaveSession } = useCollabStore();
  const { rawLatex } = useEditorStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [inputRoom, setInputRoom] = useState('');
  const [inputName, setInputName] = useState('');

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputRoom.trim() || !inputName.trim()) return;
    startSession(inputRoom.trim(), inputName.trim(), rawLatex);
    setModalOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      {isCollaborating ? (
        <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-neutral-300">{roomName}</span>
          </div>

          <div className="flex items-center -space-x-1.5 overflow-hidden ml-2">
            {peers.map((peer) => (
              <div
                key={peer.id}
                title={peer.name}
                style={{ backgroundColor: peer.color }}
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase border-2 border-neutral-900"
              >
                {peer.name.slice(0, 1)}
              </div>
            ))}
          </div>

          <button
            onClick={leaveSession}
            className="ml-2 text-neutral-400 hover:text-rose-400 transition-colors text-[11px]"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-medium transition-colors border border-neutral-700"
        >
          <span>P2P Lab Share</span>
        </button>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 max-w-sm w-full text-neutral-200 shadow-2xl">
            <h3 className="text-sm font-semibold text-white mb-1">Start Local Mesh Session</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Collaborate live over LAN with end-to-end encrypted WebRTC CRDTs. No cloud document storage.
            </p>

            <form onSubmit={handleJoin} className="space-y-3">
              <div>
                <label className="text-[11px] text-neutral-400 font-medium">Your Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Adhikary"
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-md text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 font-medium">Lab Room ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. cebs-nmr-manuscript"
                  value={inputRoom}
                  onChange={(e) => setInputRoom(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-md text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-md text-xs font-medium transition-colors"
                >
                  Connect Mesh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default PeerPresenceBar;
