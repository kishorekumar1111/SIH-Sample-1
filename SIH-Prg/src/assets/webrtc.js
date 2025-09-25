// WebRTC-based file sharing for offline peer-to-peer communication
class WebRTCFileShare {
  constructor() {
    this.peerConnection = null;
    this.dataChannel = null;
    this.isHost = false;
    this.roomId = null;
    this.onFileReceived = null;
    this.onPeerConnected = null;
    this.onPeerDisconnected = null;
  }

  // Create a room (Node Student)
  async createRoom(roomId) {
    this.isHost = true;
    this.roomId = roomId;
    
    try {
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      // Create data channel for file sharing
      this.dataChannel = this.peerConnection.createDataChannel('fileShare', {
        ordered: true
      });

      this.setupDataChannel();
      this.setupPeerConnection();

      // Generate offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      console.log('Room created:', roomId);
      console.log('Offer generated:', offer);
      
      return {
        roomId,
        offer: JSON.stringify(offer),
        success: true
      };
    } catch (error) {
      console.error('Error creating room:', error);
      return { success: false, error: error.message };
    }
  }

  // Join a room (Offline Student)
  async joinRoom(roomId, offerString) {
    this.isHost = false;
    this.roomId = roomId;
    
    try {
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      this.setupPeerConnection();

      // Set remote offer
      const offer = JSON.parse(offerString);
      await this.peerConnection.setRemoteDescription(offer);

      // Create answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      console.log('Joined room:', roomId);
      console.log('Answer generated:', answer);
      
      return {
        roomId,
        answer: JSON.stringify(answer),
        success: true
      };
    } catch (error) {
      console.error('Error joining room:', error);
      return { success: false, error: error.message };
    }
  }

  // Complete connection (Host receives answer)
  async completeConnection(answerString) {
    try {
      const answer = JSON.parse(answerString);
      await this.peerConnection.setRemoteDescription(answer);
      console.log('Connection completed');
      return { success: true };
    } catch (error) {
      console.error('Error completing connection:', error);
      return { success: false, error: error.message };
    }
  }

  setupDataChannel() {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      console.log('Data channel opened');
      if (this.onPeerConnected) this.onPeerConnected();
    };

    this.dataChannel.onclose = () => {
      console.log('Data channel closed');
      if (this.onPeerDisconnected) this.onPeerDisconnected();
    };

    this.dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleReceivedData(data);
      } catch (error) {
        console.error('Error parsing received data:', error);
      }
    };
  }

  setupPeerConnection() {
    this.peerConnection.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannel();
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('ICE candidate:', event.candidate);
        // In a real implementation, you'd send this to the other peer
        // For now, we'll handle it locally
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection.connectionState);
    };
  }

  handleReceivedData(data) {
    console.log('Received data:', data);
    
    if (data.type === 'file') {
      this.handleFileData(data);
    } else if (data.type === 'fileComplete') {
      this.handleFileComplete(data);
    }
  }

  handleFileData(data) {
    // Store file chunks
    if (!this.fileChunks) this.fileChunks = {};
    if (!this.fileChunks[data.fileId]) this.fileChunks[data.fileId] = [];
    
    this.fileChunks[data.fileId].push({
      chunk: data.chunk,
      index: data.index,
      total: data.total,
      fileName: data.fileName,
      fileType: data.fileType
    });
  }

  handleFileComplete(data) {
    const fileId = data.fileId;
    const chunks = this.fileChunks[fileId];
    
    if (!chunks || chunks.length !== data.total) {
      console.error('File transfer incomplete');
      return;
    }

    // Reconstruct file
    const sortedChunks = chunks.sort((a, b) => a.index - b.index);
    const fileData = new Uint8Array(data.fileSize);
    let offset = 0;
    
    for (const chunk of sortedChunks) {
      fileData.set(new Uint8Array(chunk.chunk), offset);
      offset += chunk.chunk.length;
    }

    const blob = new Blob([fileData], { type: data.fileType });
    const file = new File([blob], data.fileName, { type: data.fileType });

    console.log('File received:', file);
    
    if (this.onFileReceived) {
      this.onFileReceived(file, data);
    }

    // Clean up
    delete this.fileChunks[fileId];
  }

  // Send file to connected peers
  async sendFile(file) {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      console.error('Data channel not ready');
      return false;
    }

    try {
      const fileId = Date.now() + Math.random().toString(36);
      const chunkSize = 16384; // 16KB chunks
      const fileData = await file.arrayBuffer();
      const totalChunks = Math.ceil(fileData.byteLength / chunkSize);

      console.log(`Sending file: ${file.name} (${totalChunks} chunks)`);

      // Send file metadata
      this.dataChannel.send(JSON.stringify({
        type: 'fileStart',
        fileId,
        fileName: file.name,
        fileType: file.type,
        fileSize: fileData.byteLength,
        totalChunks
      }));

      // Send file chunks
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, fileData.byteLength);
        const chunk = fileData.slice(start, end);

        this.dataChannel.send(JSON.stringify({
          type: 'file',
          fileId,
          chunk: Array.from(new Uint8Array(chunk)),
          index: i,
          total: totalChunks,
          fileName: file.name,
          fileType: file.type
        }));

        // Small delay to prevent overwhelming the connection
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Send completion signal
      this.dataChannel.send(JSON.stringify({
        type: 'fileComplete',
        fileId,
        fileName: file.name,
        fileType: file.type,
        fileSize: fileData.byteLength
      }));

      console.log('File sent successfully');
      return true;
    } catch (error) {
      console.error('Error sending file:', error);
      return false;
    }
  }

  // Disconnect
  disconnect() {
    if (this.dataChannel) {
      this.dataChannel.close();
    }
    if (this.peerConnection) {
      this.peerConnection.close();
    }
    this.peerConnection = null;
    this.dataChannel = null;
    this.isHost = false;
    this.roomId = null;
  }
}

export default WebRTCFileShare;
