import React, { useEffect, useRef, useState } from 'react';
import { saveLesson } from '../assets/indexedDB';

export default function RoomPage({ initialRoomId = '', goHome }) {
	const [roomId, setRoomId] = useState(initialRoomId);
	const [displayedContent, setDisplayedContent] = useState(null);
	const [receivedFiles, setReceivedFiles] = useState([]);
	const fileChunks = useRef([]);

	useEffect(() => {
		// Placeholder: in real app, hook up WebRTC/WebSocket here
	}, []);

	function handleMockReceiveFile(mock) {
		fileChunks.current.push(new Uint8Array(mock.value));
		if (mock.done) {
			const receivedBlob = new Blob(fileChunks.current, { type: mock.type || 'application/octet-stream' });
			const newFile = { name: mock.name || 'received.bin', blob: receivedBlob };
			setReceivedFiles(prev => [...prev, newFile]);
			setDisplayedContent(newFile);
			fileChunks.current = [];
			saveLesson({ id: (newFile.name || 'file') + Date.now(), title: newFile.name, topic: 'Peer Shared', fileURL: URL.createObjectURL(receivedBlob) });
		}
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2">
				<input value={roomId} onChange={e => setRoomId(e.target.value)} placeholder="Room ID" className="bg-gray-800 border border-gray-700 rounded px-2 py-1" />
				<button onClick={() => goHome && goHome()} className="bg-gray-700 rounded px-3 py-1">Back</button>
				<button onClick={() => handleMockReceiveFile({ value: new Uint8Array([1,2,3]).buffer, done: true, name: 'demo.bin' })} className="bg-blue-600 rounded px-3 py-1">Mock Receive</button>
			</div>
			<div className="bg-gray-800 rounded p-4 border border-gray-700">
				<h3 className="font-bold mb-2">Received Files</h3>
				<ul className="space-y-1">
					{receivedFiles.map((f, i) => (
						<li key={i} className="text-sm">{f.name}</li>
					))}
				</ul>
			</div>
			{displayedContent && (
				<div className="bg-gray-800 rounded p-4 border border-gray-700">
					<h3 className="font-bold mb-2">Displayed Content</h3>
					<p className="text-sm">{displayedContent.name}</p>
				</div>
			)}
		</div>
	);
}
