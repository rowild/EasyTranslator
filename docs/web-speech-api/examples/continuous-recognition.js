// Continuous Recognition with Interim Results

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

recognition.continuous = true;
recognition.lang = "en-US";
recognition.interimResults = true;
recognition.maxAlternatives = 1;

let finalTranscript = '';

recognition.onresult = (event) => {
  let interimTranscript = '';

  for (let i = event.resultIndex; i < event.results.length; i++) {
    const transcript = event.results[i][0].transcript;
    if (event.results[i].isFinal) {
      finalTranscript += transcript + ' ';
    } else {
      interimTranscript += transcript;
    }
  }

  // Update UI with both final and interim results
  document.getElementById('final').textContent = finalTranscript;
  document.getElementById('interim').textContent = interimTranscript;
};

recognition.onerror = (event) => {
  console.error(`Recognition error: ${event.error}`);
  if (event.error === 'no-speech') {
    // Restart recognition after a brief pause
    setTimeout(() => recognition.start(), 1000);
  }
};

// Start recognition
document.getElementById('start').addEventListener('click', () => {
  finalTranscript = '';
  recognition.start();
});

// Stop recognition
document.getElementById('stop').addEventListener('click', () => {
  recognition.stop();
});
