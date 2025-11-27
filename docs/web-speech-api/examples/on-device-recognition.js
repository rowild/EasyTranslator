// On-Device Speech Recognition with Language Pack Management

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

recognition.lang = "en-US";
recognition.continuous = false;
recognition.interimResults = false;

async function checkAndStartRecognition() {
  try {
    const result = await SpeechRecognition.available({
      langs: ["en-US"],
      processLocally: true
    });

    console.log(`Language pack status: ${result}`);

    if (result === "available") {
      // Language pack already installed
      console.log('Language pack installed, starting on-device recognition');
      recognition.processLocally = true;
      recognition.start();
    } else if (result === "downloadable") {
      // Need to install language pack
      console.log('Downloading language pack...');
      const statusDiv = document.getElementById('status');
      statusDiv.textContent = 'Downloading language pack...';

      const success = await SpeechRecognition.install({
        langs: ["en-US"],
        processLocally: true
      });

      if (success) {
        console.log('Language pack installed successfully');
        statusDiv.textContent = 'Language pack installed!';
        recognition.processLocally = true;
        recognition.start();
      } else {
        console.error('Failed to install language pack');
        statusDiv.textContent = 'Failed to install language pack';
        fallbackToServerRecognition();
      }
    } else {
      // On-device recognition not available
      console.log('On-device recognition not available, using server-based');
      fallbackToServerRecognition();
    }
  } catch (error) {
    console.error('Error checking language availability:', error);
    fallbackToServerRecognition();
  }
}

function fallbackToServerRecognition() {
  console.log('Starting server-based recognition');
  recognition.processLocally = false;
  recognition.start();
}

recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;
  const processingType = recognition.processLocally ? 'on-device' : 'server-based';
  console.log(`Recognized (${processingType}): ${transcript}`);
  document.getElementById('output').textContent = transcript;
};

recognition.onerror = (event) => {
  console.error(`Recognition error: ${event.error}`);
  document.getElementById('status').textContent = `Error: ${event.error}`;
};

// Start button
document.getElementById('start').addEventListener('click', checkAndStartRecognition);
