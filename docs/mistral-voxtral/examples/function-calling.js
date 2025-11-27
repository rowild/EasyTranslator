// Function Calling from Voice
// Trigger backend functions directly from audio commands

async function processSpeechCommand(audioBlob) {
  const apiKey = import.meta.env.VITE_MISTRAL_API_KEY;

  // Convert audio blob to base64
  const arrayBuffer = await audioBlob.arrayBuffer();
  const base64Audio = btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );

  // Define available functions
  const tools = [
    {
      type: 'function',
      function: {
        name: 'set_reminder',
        description: 'Set a reminder for a specific date and time',
        parameters: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'The reminder title or description',
            },
            datetime: {
              type: 'string',
              description: 'Date and time in ISO format (YYYY-MM-DDTHH:mm:ss)',
            },
          },
          required: ['title', 'datetime'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'send_message',
        description: 'Send a message to a contact',
        parameters: {
          type: 'object',
          properties: {
            recipient: {
              type: 'string',
              description: 'The recipient name or phone number',
            },
            message: {
              type: 'string',
              description: 'The message content',
            },
          },
          required: ['recipient', 'message'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'create_calendar_event',
        description: 'Create a calendar event',
        parameters: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Event title',
            },
            start_time: {
              type: 'string',
              description: 'Start time in ISO format',
            },
            duration_minutes: {
              type: 'number',
              description: 'Duration in minutes',
            },
            location: {
              type: 'string',
              description: 'Event location (optional)',
            },
          },
          required: ['title', 'start_time', 'duration_minutes'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'search_web',
        description: 'Search the web for information',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query',
            },
          },
          required: ['query'],
        },
      },
    },
  ];

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
        ],
      },
    ],
    tools: tools,
    tool_choice: 'auto',
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
      throw new Error(`Request failed: ${response.statusText}`);
    }

    const result = await response.json();
    const message = result.choices[0].message;

    // Check if function calls were made
    if (message.tool_calls) {
      console.log('Function calls detected:');

      for (const toolCall of message.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        console.log(`Function: ${functionName}`);
        console.log('Arguments:', functionArgs);

        // Execute the function
        await executeFunction(functionName, functionArgs);
      }

      return {
        type: 'function_call',
        calls: message.tool_calls,
      };
    } else {
      // Regular response
      return {
        type: 'text',
        content: message.content,
      };
    }
  } catch (error) {
    console.error('Processing error:', error);
    throw error;
  }
}

// Function implementations
async function executeFunction(functionName, args) {
  console.log(`Executing ${functionName}...`);

  switch (functionName) {
    case 'set_reminder':
      return setReminder(args.title, args.datetime);

    case 'send_message':
      return sendMessage(args.recipient, args.message);

    case 'create_calendar_event':
      return createCalendarEvent(
        args.title,
        args.start_time,
        args.duration_minutes,
        args.location
      );

    case 'search_web':
      return searchWeb(args.query);

    default:
      console.warn(`Unknown function: ${functionName}`);
  }
}

// Function implementations (mock)
function setReminder(title, datetime) {
  console.log(`Setting reminder: "${title}" at ${datetime}`);
  // Implementation: Store in IndexedDB, set notification, etc.
  displayFunctionResult('Reminder Set', `"${title}" scheduled for ${datetime}`);
  return { success: true };
}

function sendMessage(recipient, message) {
  console.log(`Sending message to ${recipient}: "${message}"`);
  // Implementation: Call messaging API
  displayFunctionResult('Message Sent', `To ${recipient}: "${message}"`);
  return { success: true };
}

function createCalendarEvent(title, startTime, durationMinutes, location) {
  console.log(`Creating event: ${title} at ${startTime} for ${durationMinutes} minutes`);
  if (location) console.log(`Location: ${location}`);
  // Implementation: Add to calendar system
  displayFunctionResult('Event Created', `${title} - ${startTime} (${durationMinutes} min)`);
  return { success: true };
}

function searchWeb(query) {
  console.log(`Searching web for: ${query}`);
  // Implementation: Call search API
  displayFunctionResult('Search', `Searching for: "${query}"`);
  window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
  return { success: true };
}

function displayFunctionResult(action, details) {
  const resultsContainer = document.getElementById('functionResults');

  const resultDiv = document.createElement('div');
  resultDiv.className = 'function-result';

  const actionDiv = document.createElement('div');
  actionDiv.className = 'action';
  actionDiv.textContent = action;

  const detailsDiv = document.createElement('div');
  detailsDiv.className = 'details';
  detailsDiv.textContent = details;

  resultDiv.appendChild(actionDiv);
  resultDiv.appendChild(detailsDiv);
  resultsContainer.prepend(resultDiv);
}

// Voice command examples
const exampleCommands = [
  "Remind me to call John tomorrow at 3 PM",
  "Send a message to Sarah saying I'll be late",
  "Create a meeting for tomorrow at 2 PM for 1 hour",
  "Search the web for best restaurants nearby",
];

// UI Integration
let mediaRecorder;
let audioChunks = [];

async function startVoiceCommand() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);

  audioChunks = [];

  mediaRecorder.ondataavailable = (event) => {
    audioChunks.push(event.data);
  };

  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

    try {
      document.getElementById('status').textContent = 'Processing command...';
      const result = await processSpeechCommand(audioBlob);

      if (result.type === 'function_call') {
        document.getElementById('status').textContent = 'Command executed!';
      } else {
        document.getElementById('status').textContent = result.content;
      }
    } catch (error) {
      document.getElementById('status').textContent = `Error: ${error.message}`;
    }

    stream.getTracks().forEach(track => track.stop());
  };

  mediaRecorder.start();
  document.getElementById('status').textContent = 'Listening...';
  document.getElementById('recordBtn').textContent = 'Stop';
}

function stopVoiceCommand() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    document.getElementById('recordBtn').textContent = 'Start Voice Command';
  }
}

// Button toggle
document.getElementById('recordBtn').addEventListener('click', function() {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') {
    startVoiceCommand();
  } else {
    stopVoiceCommand();
  }
});

// Display example commands
document.getElementById('examples').innerHTML = exampleCommands
  .map(cmd => `<li>${cmd}</li>`)
  .join('');
