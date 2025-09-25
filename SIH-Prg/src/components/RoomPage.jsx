import React, { useEffect, useRef, useState } from 'react';
import { saveLesson, getLessons, getFile, createFileURL, saveFile } from '../assets/indexedDB';
import WebRTCFileShare from '../assets/webrtc';

export default function RoomPage({ initialRoomId = '', goHome }) {
	const [roomId, setRoomId] = useState(initialRoomId);
	const [displayedContent, setDisplayedContent] = useState(null);
	const [availableLessons, setAvailableLessons] = useState([]);
	const [loading, setLoading] = useState(true);
	const [isHost, setIsHost] = useState(false);
	const [isConnected, setIsConnected] = useState(false);
	const [connectionStatus, setConnectionStatus] = useState('Disconnected');
	const [selectedFile, setSelectedFile] = useState(null);
	const fileChunks = useRef([]);
	const webrtcRef = useRef(null);

	useEffect(() => {
		loadAvailableLessons();
		
		// Initialize WebRTC
		webrtcRef.current = new WebRTCFileShare();
		webrtcRef.current.onFileReceived = handleReceivedFile;
		webrtcRef.current.onPeerConnected = () => {
			setIsConnected(true);
			setConnectionStatus('Connected');
		};
		webrtcRef.current.onPeerDisconnected = () => {
			setIsConnected(false);
			setConnectionStatus('Disconnected');
		};

		return () => {
			if (webrtcRef.current) {
				webrtcRef.current.disconnect();
			}
		};
	}, []);

	const loadAvailableLessons = async () => {
		try {
			setLoading(true);
			const lessons = await getLessons();
			console.log('Loaded lessons for room:', lessons);
			setAvailableLessons(lessons);
		} catch (error) {
			console.error('Error loading lessons:', error);
		} finally {
			setLoading(false);
		}
	};

	const createRoom = async () => {
		if (!roomId.trim()) {
			alert('Please enter a room ID');
			return;
		}

		try {
			setConnectionStatus('Creating room...');
			const result = await webrtcRef.current.createRoom(roomId);
			
			if (result.success) {
				setIsHost(true);
				setConnectionStatus('Room created - Waiting for peers...');
				console.log('Room created successfully:', result);
			} else {
				alert('Failed to create room: ' + result.error);
			}
		} catch (error) {
			console.error('Error creating room:', error);
			alert('Error creating room: ' + error.message);
		}
	};

	const joinRoom = async () => {
		if (!roomId.trim()) {
			alert('Please enter a room ID');
			return;
		}

		try {
			setConnectionStatus('Joining room...');
			// In a real implementation, you'd get the offer from the host
			// For demo purposes, we'll simulate this
			const mockOffer = JSON.stringify({
				type: 'offer',
				sdp: 'mock-sdp'
			});
			
			const result = await webrtcRef.current.joinRoom(roomId, mockOffer);
			
			if (result.success) {
				setIsHost(false);
				setConnectionStatus('Joined room - Connecting...');
				console.log('Joined room successfully:', result);
			} else {
				alert('Failed to join room: ' + result.error);
			}
		} catch (error) {
			console.error('Error joining room:', error);
			alert('Error joining room: ' + error.message);
		}
	};

	const handleReceivedFile = async (file, metadata) => {
		try {
			console.log('Received file via WebRTC:', file);
			
			// Save file to local storage
			const lessonId = `webrtc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
			const fileData = await saveFile(file, lessonId);
			const fileURL = createFileURL(fileData);
			
			// Create lesson entry
			const lessonData = {
				id: lessonId,
				title: file.name,
				topic: 'Shared via WebRTC',
				fileURL,
				fileName: file.name,
				fileSize: file.size,
				fileType: file.type,
				createdAt: Date.now()
			};
			
			await saveLesson(lessonData);
			await loadAvailableLessons(); // Refresh the list
			
			alert(`File received: ${file.name}`);
		} catch (error) {
			console.error('Error handling received file:', error);
			alert('Error saving received file: ' + error.message);
		}
	};

	const shareFile = async (lesson) => {
		if (!isConnected) {
			alert('Not connected to any peers');
			return;
		}

		try {
			// Get file data
			let file;
			if (lesson.fileURL) {
				// Convert URL back to file
				const response = await fetch(lesson.fileURL);
				const blob = await response.blob();
				file = new File([blob], lesson.fileName || lesson.title, { type: lesson.fileType });
			} else {
				// Load from storage
				const fileData = await getFile(lesson.id);
				if (!fileData) {
					alert('File not found in storage');
					return;
				}
				const blob = new Blob([fileData.data], { type: fileData.type });
				file = new File([blob], fileData.name, { type: fileData.type });
			}

			const success = await webrtcRef.current.sendFile(file);
			if (success) {
				alert(`Sharing file: ${file.name}`);
			} else {
				alert('Failed to share file');
			}
		} catch (error) {
			console.error('Error sharing file:', error);
			alert('Error sharing file: ' + error.message);
		}
	};

	const handleViewFile = async (lesson) => {
		try {
			console.log('Viewing file:', lesson);
			
			if (lesson.fileURL) {
				// File is already available as a URL
				console.log('Using existing file URL:', lesson.fileURL);
				setDisplayedContent({
					name: lesson.fileName || lesson.title,
					url: lesson.fileURL,
					type: lesson.fileType || 'application/octet-stream'
				});
			} else {
				// Try to load file from storage
				console.log('Loading file from storage for ID:', lesson.id);
				const fileData = await getFile(lesson.id);
				if (fileData) {
					const fileURL = createFileURL(fileData);
					console.log('Created file URL from storage:', fileURL);
					setDisplayedContent({
						name: fileData.name || lesson.title,
						url: fileURL,
						type: fileData.type || 'application/octet-stream'
					});
				} else {
					console.error('File not found in storage:', lesson.id);
					alert('File not found in local storage. Please try uploading it again.');
				}
			}
		} catch (error) {
			console.error('Error viewing file:', error);
			alert('Error viewing file: ' + error.message);
		}
	};

	const handleDownloadFile = async (lesson) => {
		try {
			console.log('Downloading file:', lesson);
			
			// Check if we have a valid file URL
			if (!lesson.fileURL) {
				console.error('No file URL available for download');
				alert('File URL not available. Please try refreshing the page.');
				return;
			}

			// Create download link
			const link = document.createElement('a');
			link.href = lesson.fileURL;
			link.download = lesson.fileName || lesson.title || 'download';
			
			// Add to DOM, click, and remove
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			
			console.log('Download initiated for:', lesson.fileName || lesson.title);
		} catch (error) {
			console.error('Error downloading file:', error);
			alert('Download failed: ' + error.message);
		}
	};

	function handleMockReceiveFile(mock) {
		fileChunks.current.push(new Uint8Array(mock.value));
		if (mock.done) {
			const receivedBlob = new Blob(fileChunks.current, { type: mock.type || 'application/octet-stream' });
			const newFile = { name: mock.name || 'received.bin', blob: receivedBlob };
			setDisplayedContent(newFile);
			fileChunks.current = [];
			saveLesson({ id: (newFile.name || 'file') + Date.now(), title: newFile.name, topic: 'Peer Shared', fileURL: URL.createObjectURL(receivedBlob) });
			// Reload lessons after adding new one
			loadAvailableLessons();
		}
	}

	return (
		<div className="max-w-6xl mx-auto space-y-6">
			<div className="card">
				<div className="card-header">
					<h3 className="card-title">WebRTC Offline Sharing</h3>
					<p className="card-subtitle">Connect with peers for direct file sharing</p>
				</div>
				<div className="grid md:grid-cols-2 gap-4 mb-4">
					<div className="form-group">
						<label className="form-label">Room ID</label>
						<input 
							value={roomId} 
							onChange={e => setRoomId(e.target.value)} 
							placeholder="Enter Room ID" 
							className="form-input"
						/>
					</div>
					<div className="flex items-end gap-2">
						<button onClick={createRoom} className="btn btn-primary flex-1">
							Create Room
						</button>
						<button onClick={joinRoom} className="btn btn-secondary flex-1">
							Join Room
						</button>
					</div>
				</div>
				<div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
					<div className="flex items-center gap-3">
						<div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
						<span className="text-gray-300 font-medium">{connectionStatus}</span>
					</div>
					{isHost && (
						<div className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 rounded-full border border-blue-500/30">
							<span className="text-blue-400">👑</span>
							<span className="text-blue-400 text-sm font-medium">Host</span>
						</div>
					)}
				</div>
			</div>

			<div className="flex items-center gap-3 mb-6">
				<button onClick={() => goHome && goHome()} className="btn btn-outline">
					← Back to Home
				</button>
				<button onClick={() => loadAvailableLessons()} className="btn btn-secondary">
					🔄 Refresh
				</button>
				<button onClick={() => {
					console.log('Available lessons:', availableLessons);
					availableLessons.forEach(lesson => {
						console.log('Lesson:', lesson.title, 'FileURL:', lesson.fileURL, 'FileName:', lesson.fileName);
					});
				}} className="btn btn-outline">
					🐛 Debug
				</button>
			</div>

			<div className="card">
				<div className="card-header">
					<h3 className="card-title">Available Lessons & Files</h3>
					<p className="card-subtitle">{availableLessons.length} lessons ready for sharing</p>
				</div>
				{loading ? (
					<div className="text-center py-8">
						<div className="animate-pulse">
							<div className="w-8 h-8 mx-auto mb-4 bg-gray-700 rounded-full"></div>
							<p className="text-gray-400">Loading lessons...</p>
						</div>
					</div>
				) : availableLessons.length === 0 ? (
					<div className="text-center py-8">
						<div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
							<svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
							</svg>
						</div>
						<p className="text-gray-400">No lessons available. Upload some files from the home page first!</p>
					</div>
				) : (
					<div className="grid gap-4">
						{availableLessons.map((lesson, i) => (
							<div key={lesson.id || i} className="bg-gray-700/50 p-4 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors">
								<div className="flex items-center justify-between">
									<div className="flex-1">
										<h4 className="font-semibold text-white mb-1">{lesson.title}</h4>
										<p className="text-sm text-gray-300 mb-2">{lesson.topic}</p>
										{lesson.fileName && (
											<div className="flex items-center gap-2 text-xs text-gray-400">
												<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
												</svg>
												{lesson.fileName} ({(lesson.fileSize / 1024).toFixed(1)} KB)
											</div>
										)}
									</div>
									<div className="flex gap-2 ml-4">
										<button 
											onClick={() => handleViewFile(lesson)}
											className="btn btn-sm btn-primary"
										>
											View
										</button>
										{lesson.fileURL && (
											<button 
												onClick={() => handleDownloadFile(lesson)}
												className="btn btn-sm btn-secondary"
											>
												Download
											</button>
										)}
										{isConnected && (
											<button 
												onClick={() => shareFile(lesson)}
												className="btn btn-sm btn-accent"
											>
												Share
											</button>
										)}
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{displayedContent && (
				<div className="card">
					<div className="card-header">
						<h3 className="card-title">Currently Viewing</h3>
						<p className="card-subtitle">{displayedContent.name}</p>
					</div>
					{displayedContent.url && (
						<div className="flex gap-3 mb-4">
							<a 
								href={displayedContent.url} 
								target="_blank" 
								rel="noopener noreferrer"
								className="btn btn-primary"
							>
								Open in New Tab
							</a>
							<button 
								onClick={() => {
									const link = document.createElement('a');
									link.href = displayedContent.url;
									link.download = displayedContent.name;
									link.click();
								}}
								className="btn btn-secondary"
							>
								Download
							</button>
						</div>
					)}
					{displayedContent.url && (
						<div className="bg-gray-900 rounded-lg overflow-hidden">
							<iframe 
								src={displayedContent.url} 
								className="w-full h-96"
								title={displayedContent.name}
							/>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
