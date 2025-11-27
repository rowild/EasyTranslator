// Basic Audio Transcription with Voxtral Mini
// Browser/Frontend Implementation

async function transcribeAudio(audioBlob) {
  const apiKey = import.meta.env.VITE_MISTRAL_API_KEY;

  // Create FormData with audio file
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', 'voxtral-mini-latest');

  try {
    const response = await fetch('https://api.mistral.ai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Transcription failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Transcription:', result.text);
    console.log('Usage:', result.usage);

    return result.text;
  } catch (error) {
    console.error('Transcription error:', error);
    throw error;
  }
}

// Usage example with MediaRecorder
let mediaRecorder;
let audioChunks = [];

async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);

  mediaRecorder.ondataavailable = (event) => {
    audioChunks.push(event.data);
  };

  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    audioChunks = [];

    // Transcribe the recorded audio
    const transcription = await transcribeAudio(audioBlob);
    document.getElementById('transcription').textContent = transcription;

    // Stop all tracks
    stream.getTracks().forEach(track => track.stop());
  };

  mediaRecorder.start();
  console.log('Recording started');
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    console.log('Recording stopped');
  }
}

// Button event listeners
document.getElementById('start').addEventListener('click', startRecording);
document.getElementById('stop').addEventListener('click', stopRecording);
