// Contextual Biasing for Domain-Specific Recognition

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

recognition.lang = "en-US";
recognition.continuous = false;
recognition.interimResults = false;
recognition.maxAlternatives = 3;

// Define domain-specific phrases with boost values (0.0 - 10.0)
const medicalPhrases = [
  { phrase: "cardiovascular", boost: 8.0 },
  { phrase: "electrocardiogram", boost: 8.0 },
  { phrase: "arrhythmia", boost: 7.0 },
  { phrase: "hypertension", boost: 7.0 },
  { phrase: "stethoscope", boost: 6.0 },
  { phrase: "prescription", boost: 6.0 },
];

const colorPhrases = [
  { phrase: "azure", boost: 5.0 },
  { phrase: "khaki", boost: 4.0 },
  { phrase: "magenta", boost: 4.0 },
  { phrase: "cyan", boost: 3.0 },
];

// Function to apply contextual biasing
function applyContextualBiasing(phraseData) {
  const phraseObjects = phraseData.map(
    p => new SpeechRecognitionPhrase(p.phrase, p.boost)
  );
  recognition.phrases = phraseObjects;
  console.log(`Applied ${phraseObjects.length} biasing phrases`);
}

// Switch between contexts
document.getElementById('medical').addEventListener('click', () => {
  applyContextualBiasing(medicalPhrases);
  document.getElementById('context').textContent = 'Medical terminology';
  recognition.start();
});

document.getElementById('colors').addEventListener('click', () => {
  applyContextualBiasing(colorPhrases);
  document.getElementById('context').textContent = 'Color names';
  recognition.start();
});

recognition.onresult = (event) => {
  const result = event.results[0];

  // Display all alternatives
  console.log('Recognition alternatives:');
  const alternativesDiv = document.getElementById('alternatives');
  alternativesDiv.innerHTML = '';

  for (let i = 0; i < result.length; i++) {
    const alternative = result[i];
    console.log(`${i + 1}. ${alternative.transcript} (confidence: ${alternative.confidence})`);

    const altDiv = document.createElement('div');
    altDiv.textContent = `${i + 1}. ${alternative.transcript} (${(alternative.confidence * 100).toFixed(1)}%)`;
    alternativesDiv.appendChild(altDiv);
  }

  // Use top result
  const topTranscript = result[0].transcript;
  document.getElementById('output').textContent = topTranscript;
};

recognition.onerror = (event) => {
  console.error(`Recognition error: ${event.error}`);
};
