import { ref, onUnmounted, onMounted } from 'vue';

export function useAudioRecorder() {
    const isRecording = ref(false);
    const audioBlob = ref<Blob | null>(null);
    const volume = ref(0);
    const permissionStatus = ref<PermissionState | 'unknown'>('unknown');
    const transcript = ref('');
    const isSpeechRecognitionSupported = ref(false);

    let mediaRecorder: MediaRecorder | null = null;
    let chunks: Blob[] = [];
    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let animationFrame: number | null = null;
    let mimeType: string = '';
    let recognition: any = null;
    let finalTranscriptAccumulator = '';

    const checkPermission = async () => {
        try {
            const result = await navigator.permissions.query({ name: 'microphone' as any });
            permissionStatus.value = result.state;
            result.onchange = () => {
                permissionStatus.value = result.state;
            };
        } catch (e) {
            console.warn('Permissions API not supported', e);
            permissionStatus.value = 'unknown';
        }
    };

    const initSpeechRecognition = () => {
        // Check for Speech Recognition API support (Chrome, Safari, Edge)
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.warn('Speech Recognition API not supported');
            isSpeechRecognitionSupported.value = false;
            return null;
        }

        isSpeechRecognitionSupported.value = true;
        recognition = new SpeechRecognition();

        // Configure recognition
        recognition.continuous = true; // Keep listening until we stop it
        recognition.interimResults = true; // Get results as user speaks
        recognition.lang = 'en-US'; // Default language, can be changed

        recognition.onresult = (event: any) => {
            let interimTranscript = '';

            // Process only new results starting from resultIndex
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcriptPart = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    // Add finalized text to accumulator
                    finalTranscriptAccumulator += transcriptPart + ' ';
                } else {
                    // Collect interim results (not yet finalized)
                    interimTranscript += transcriptPart;
                }
            }

            // Display: final transcript + current interim
            transcript.value = (finalTranscriptAccumulator + interimTranscript).trim();

            console.log('Speech recognition result:', transcript.value);
        };

        recognition.onstart = () => {
            console.log('Speech recognition started');
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            if (event.error === 'no-speech') {
                console.log('No speech detected, continuing...');
            }
        };

        recognition.onend = () => {
            console.log('Speech recognition ended');
            // If we're still recording, restart recognition
            if (isRecording.value) {
                console.log('Restarting speech recognition...');
                try {
                    recognition.start();
                } catch (e) {
                    console.warn('Could not restart recognition:', e);
                }
            }
        };

        return recognition;
    };

    const updateVolume = () => {
        if (!analyser || !isRecording.value) return;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }
        const average = sum / dataArray.length;

        // Normalize to 0-100 roughly
        volume.value = Math.min(100, Math.round((average / 255) * 100 * 2)); // Boost a bit

        animationFrame = requestAnimationFrame(updateVolume);
    };

    const startRecording = async () => {
        try {
            console.log('Requesting microphone access...');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('Microphone access granted');
            permissionStatus.value = 'granted';

            // Clear previous transcript
            transcript.value = '';
            finalTranscriptAccumulator = '';

            // Start Speech Recognition for real-time transcription
            if (!recognition) {
                recognition = initSpeechRecognition();
            }

            if (recognition) {
                try {
                    recognition.start();
                    console.log('Attempting to start speech recognition...');
                } catch (e) {
                    console.warn('Could not start speech recognition:', e);
                }
            }

            // Setup Audio Analysis
            audioContext = new AudioContext();

            // Resume AudioContext if suspended (required by some browsers)
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
                console.log('AudioContext resumed');
            }

            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            updateVolume();

            // Setup Recorder with codec detection
            // Safari doesn't support webm, so we need to detect and use appropriate format
            const supportedTypes = [
                'audio/webm',
                'audio/webm;codecs=opus',
                'audio/mp4',
                'audio/mp4;codecs=mp4a.40.2',
                'audio/wav'
            ];

            mimeType = supportedTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';

            if (!mimeType) {
                throw new Error('No supported audio format found');
            }

            console.log('Using audio format:', mimeType);

            mediaRecorder = new MediaRecorder(stream, { mimeType });
            chunks = [];

            mediaRecorder.ondataavailable = (e) => {
                console.log('Data available:', e.data.size, 'bytes');
                if (e.data.size > 0) {
                    chunks.push(e.data);
                }
            };

            // The onstop event handler is now set within stopRecording to resolve a Promise
            // mediaRecorder.onstop = () => { ... }; // This block is removed as it's handled by stopRecording

            // Start with timeslice to ensure ondataavailable fires during recording
            // This is critical for Safari/WebKit browsers
            mediaRecorder.start(100); // Collect data every 100ms
            isRecording.value = true;
            console.log('MediaRecorder started with 100ms timeslice');
        } catch (error) {
            console.error('Error accessing microphone:', error);
            permissionStatus.value = 'denied';
            throw error;
        }
    };

    const stopRecording = (): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            if (!mediaRecorder || mediaRecorder.state === 'inactive') {
                console.warn('Cannot stop: Recorder is inactive or null');
                reject(new Error('Recorder is inactive'));
                return;
            }

            mediaRecorder.onstop = () => {
                console.log('MediaRecorder stopped');
                const blob = new Blob(chunks, { type: mimeType });
                audioBlob.value = blob;
                console.log('Audio blob created:', blob.size, 'bytes', blob.type);
                chunks = [];

                // Stop speech recognition
                if (recognition) {
                    try {
                        recognition.stop();
                        console.log('Speech recognition stopped');
                    } catch (e) {
                        console.warn('Could not stop speech recognition:', e);
                    }
                }

                // Cleanup Audio Context
                if (animationFrame) cancelAnimationFrame(animationFrame);
                if (source) source.disconnect();
                if (analyser) analyser.disconnect();
                if (audioContext) audioContext.close();

                volume.value = 0;

                // Stop all tracks
                if (mediaRecorder && mediaRecorder.stream) {
                    mediaRecorder.stream.getTracks().forEach(track => track.stop());
                }

                resolve(blob);
            };

            mediaRecorder.stop();
            isRecording.value = false;
        });
    };

    onMounted(() => {
        // Check Speech Recognition support on mount
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        isSpeechRecognitionSupported.value = !!SpeechRecognition;
        console.log('Speech Recognition supported:', isSpeechRecognitionSupported.value);
    });

    onUnmounted(() => {
        if (animationFrame) cancelAnimationFrame(animationFrame);
        if (audioContext) audioContext.close();
        if (recognition) {
            try {
                recognition.stop();
            } catch (e) {
                // Ignore errors on cleanup
            }
        }
    });

    return {
        isRecording,
        audioBlob,
        volume,
        permissionStatus,
        transcript,
        isSpeechRecognitionSupported,
        startRecording,
        stopRecording,
        checkPermission
    };
}
