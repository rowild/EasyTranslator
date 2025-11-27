// Basic Speech Recognition Example

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

// Configuration
recognition.continuous = false;
recognition.lang = "en-US";
recognition.interimResults = false;
recognition.maxAlternatives = 1;

const diagnostic = document.querySelector(".output");
const bg = document.querySelector("html");
const startBtn = document.querySelector("button");

startBtn.onclick = () => {
  recognition.start();
  console.log("Ready to receive a color command.");
};

recognition.onresult = (event) => {
  const color = event.results[0][0].transcript;
  const confidence = event.results[0][0].confidence;
  diagnostic.textContent = `Result received: ${color} (confidence: ${confidence})`;
  bg.style.backgroundColor = color;
};

recognition.onerror = (event) => {
  console.error(`Recognition error: ${event.error}`);
};

recognition.onnomatch = (event) => {
  console.log("Speech not recognized");
};

recognition.onspeechend = () => {
  recognition.stop();
};
