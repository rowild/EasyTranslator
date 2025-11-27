// Audio Transcription with Segment Timestamps
// Useful for video subtitles or detailed audio analysis

async function transcribeWithTimestamps(audioBlob) {
  const apiKey = import.meta.env.VITE_MISTRAL_API_KEY;

  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', 'voxtral-mini-latest');
  // Note: timestamp_granularities is incompatible with language parameter
  formData.append('timestamp_granularities', JSON.stringify(['segment']));

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

    console.log('Full transcription:', result.text);
    console.log('Segments:', result.segments);

    return result;
  } catch (error) {
    console.error('Transcription error:', error);
    throw error;
  }
}

// Display segments with timestamps
function displaySegments(result) {
  const container = document.getElementById('segments');
  container.innerHTML = '';

  if (result.segments) {
    result.segments.forEach((segment, index) => {
      const segmentDiv = document.createElement('div');
      segmentDiv.className = 'segment';

      const timeSpan = document.createElement('span');
      timeSpan.className = 'timestamp';
      timeSpan.textContent = `[${formatTime(segment.start)} - ${formatTime(segment.end)}]`;

      const textSpan = document.createElement('span');
      textSpan.className = 'text';
      textSpan.textContent = segment.text;

      segmentDiv.appendChild(timeSpan);
      segmentDiv.appendChild(textSpan);
      container.appendChild(segmentDiv);
    });
  }

  // Display full transcript
  document.getElementById('fullTranscript').textContent = result.text;
}

// Format seconds to MM:SS
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Usage with file upload
document.getElementById('fileInput').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  console.log('Transcribing file:', file.name);

  try {
    const result = await transcribeWithTimestamps(file);
    displaySegments(result);

    console.log(`Processed ${result.segments.length} segments`);
    console.log(`Total duration: ${formatTime(result.segments[result.segments.length - 1].end)}`);
  } catch (error) {
    document.getElementById('error').textContent = `Error: ${error.message}`;
  }
});

// Generate SRT subtitles from segments
function generateSRT(segments) {
  let srt = '';

  segments.forEach((segment, index) => {
    const startTime = formatSRTTime(segment.start);
    const endTime = formatSRTTime(segment.end);

    srt += `${index + 1}\n`;
    srt += `${startTime} --> ${endTime}\n`;
    srt += `${segment.text}\n\n`;
  });

  return srt;
}

function formatSRTTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

// Download SRT file
document.getElementById('downloadSRT').addEventListener('click', () => {
  const segments = window.currentSegments; // Store segments globally
  if (!segments) return;

  const srtContent = generateSRT(segments);
  const blob = new Blob([srtContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'transcription.srt';
  a.click();

  URL.revokeObjectURL(url);
});
