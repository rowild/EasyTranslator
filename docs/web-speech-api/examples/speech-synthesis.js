// Speech Synthesis with Voice Selection and Controls

const synth = window.speechSynthesis;
let voices = [];

// Load available voices
function loadVoices() {
  voices = synth.getVoices();
  console.log(`Loaded ${voices.length} voices`);

  const voiceSelect = document.getElementById('voiceSelect');
  voiceSelect.innerHTML = '';

  voices.forEach((voice, index) => {
    const option = document.createElement('option');
    option.textContent = `${voice.name} (${voice.lang})`;
    option.value = index;

    if (voice.default) {
      option.textContent += ' — DEFAULT';
      option.selected = true;
    }

    voiceSelect.appendChild(option);
  });
}

// Load voices on page load and when they change
loadVoices();
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = loadVoices;
}

// Speak function
function speak() {
  // Cancel any ongoing speech
  if (synth.speaking) {
    synth.cancel();
  }

  const textToSpeak = document.getElementById('textInput').value;
  if (!textToSpeak) return;

  const utterance = new SpeechSynthesisUtterance(textToSpeak);

  // Select voice
  const voiceIndex = document.getElementById('voiceSelect').value;
  utterance.voice = voices[voiceIndex];

  // Set parameters
  utterance.pitch = parseFloat(document.getElementById('pitch').value);
  utterance.rate = parseFloat(document.getElementById('rate').value);
  utterance.volume = parseFloat(document.getElementById('volume').value);

  // Event handlers
  utterance.onstart = () => {
    console.log('Speech started');
    document.getElementById('status').textContent = 'Speaking...';
    document.getElementById('speak').disabled = true;
  };

  utterance.onend = () => {
    console.log('Speech completed');
    document.getElementById('status').textContent = 'Complete';
    document.getElementById('speak').disabled = false;
  };

  utterance.onpause = (event) => {
    const char = event.utterance.text.charAt(event.charIndex);
    console.log(`Paused at character ${event.charIndex}: "${char}"`);
    document.getElementById('status').textContent = 'Paused';
  };

  utterance.onresume = () => {
    console.log('Speech resumed');
    document.getElementById('status').textContent = 'Speaking...';
  };

  utterance.onerror = (event) => {
    console.error('Speech synthesis error:', event.error);
    document.getElementById('status').textContent = `Error: ${event.error}`;
    document.getElementById('speak').disabled = false;
  };

  // Speak
  synth.speak(utterance);
}

// Playback controls
document.getElementById('speak').addEventListener('click', speak);

document.getElementById('pause').addEventListener('click', () => {
  if (synth.speaking && !synth.paused) {
    synth.pause();
  }
});

document.getElementById('resume').addEventListener('click', () => {
  if (synth.paused) {
    synth.resume();
  }
});

document.getElementById('cancel').addEventListener('click', () => {
  synth.cancel();
  document.getElementById('status').textContent = 'Cancelled';
  document.getElementById('speak').disabled = false;
});

// Update parameter displays
document.getElementById('pitch').addEventListener('input', (e) => {
  document.getElementById('pitchValue').textContent = e.target.value;
});

document.getElementById('rate').addEventListener('input', (e) => {
  document.getElementById('rateValue').textContent = e.target.value;
});

document.getElementById('volume').addEventListener('input', (e) => {
  document.getElementById('volumeValue').textContent = e.target.value;
});
