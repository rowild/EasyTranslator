// Chat Completion with Audio Input
// Ask questions about audio content or get summaries

async function chatWithAudio(audioBlob, prompt = "What's in this audio?") {
  const apiKey = import.meta.env.VITE_MISTRAL_API_KEY;

  // Convert audio blob to base64
  const arrayBuffer = await audioBlob.arrayBuffer();
  const base64Audio = btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );

  const requestBody = {
    model: 'voxtral-mini-latest',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'input_audio',
            input_audio: base64Audio,
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Chat request failed: ${response.statusText}`);
    }

    const result = await response.json();
    const answer = result.choices[0].message.content;

    console.log('Question:', prompt);
    console.log('Answer:', answer);
    console.log('Usage:', result.usage);

    return answer;
  } catch (error) {
    console.error('Chat error:', error);
    throw error;
  }
}

// Predefined prompts for audio analysis
const audioPrompts = {
  summarize: "Summarize the main points discussed in this audio.",
  sentiment: "What is the overall sentiment or tone of this audio?",
  topics: "What are the main topics covered in this audio? List them as bullet points.",
  speakers: "How many speakers are in this audio and what are they discussing?",
  action_items: "Extract any action items, tasks, or to-dos mentioned in this audio.",
  questions: "What questions were asked in this audio?",
  translate: "Translate this audio to English and provide a summary.",
};

// UI for audio Q&A
document.getElementById('audioFile').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  window.currentAudioFile = file;
  document.getElementById('promptButtons').style.display = 'block';
});

// Quick prompt buttons
document.querySelectorAll('.prompt-btn').forEach(button => {
  button.addEventListener('click', async () => {
    const promptKey = button.dataset.prompt;
    const prompt = audioPrompts[promptKey];

    if (!window.currentAudioFile) {
      alert('Please select an audio file first');
      return;
    }

    button.disabled = true;
    button.textContent = 'Processing...';

    try {
      const answer = await chatWithAudio(window.currentAudioFile, prompt);
      displayAnswer(promptKey, prompt, answer);
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      button.disabled = false;
      button.textContent = button.dataset.label;
    }
  });
});

// Custom prompt
document.getElementById('askCustom').addEventListener('click', async () => {
  const customPrompt = document.getElementById('customPrompt').value;
  if (!customPrompt || !window.currentAudioFile) return;

  try {
    const answer = await chatWithAudio(window.currentAudioFile, customPrompt);
    displayAnswer('custom', customPrompt, answer);
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
});

function displayAnswer(type, question, answer) {
  const resultsContainer = document.getElementById('results');

  const resultDiv = document.createElement('div');
  resultDiv.className = 'result-item';

  const questionDiv = document.createElement('div');
  questionDiv.className = 'question';
  questionDiv.textContent = `Q: ${question}`;

  const answerDiv = document.createElement('div');
  answerDiv.className = 'answer';
  answerDiv.textContent = `A: ${answer}`;

  resultDiv.appendChild(questionDiv);
  resultDiv.appendChild(answerDiv);
  resultsContainer.prepend(resultDiv);
}

// Meeting analysis workflow
async function analyzeMeeting(audioBlob) {
  const analyses = [];

  // Get summary
  console.log('Analyzing meeting...');
  analyses.push({
    type: 'summary',
    result: await chatWithAudio(audioBlob, audioPrompts.summarize)
  });

  // Get action items
  analyses.push({
    type: 'actions',
    result: await chatWithAudio(audioBlob, audioPrompts.action_items)
  });

  // Get topics
  analyses.push({
    type: 'topics',
    result: await chatWithAudio(audioBlob, audioPrompts.topics)
  });

  return analyses;
}

document.getElementById('analyzeMeeting').addEventListener('click', async () => {
  if (!window.currentAudioFile) {
    alert('Please select an audio file first');
    return;
  }

  const button = document.getElementById('analyzeMeeting');
  button.disabled = true;
  button.textContent = 'Analyzing...';

  try {
    const analyses = await analyzeMeeting(window.currentAudioFile);

    // Display all analyses
    analyses.forEach(({ type, result }) => {
      displayAnswer(type, audioPrompts[type] || type, result);
    });

    console.log('Meeting analysis complete');
  } catch (error) {
    alert(`Error: ${error.message}`);
  } finally {
    button.disabled = false;
    button.textContent = 'Analyze Meeting';
  }
});
