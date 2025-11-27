import { ref, onUnmounted, onMounted } from 'vue';

export function useAudioRecorder() {
    const isRecording = ref(false);
    const audioBlob = ref<Blob | null>(null);
    const volume = ref(0);
    const permissionStatus = ref<PermissionState | 'unknown'>('unknown');
    const transcript = ref('');
    const isSpeechRecognitionSupported = ref(false);
    const analyserNode = ref<AnalyserNode | null>(null);

    let mediaRecorder: MediaRecorder | null = null;
    let chunks: Blob[] = [];
    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let animationFrame: number | null = null;
    let mimeType: string = '';

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

    // Speech Recognition API is no longer used for real-time transcription
    // We now use Voxtral API for post-recording transcription

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

            // NOTE: Transcription is done via Voxtral API after recording stops

            // Setup Audio Analysis
            audioContext = new AudioContext();

            // Resume AudioContext if suspended (required by some browsers)
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
                console.log('AudioContext resumed');
            }

            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.5;
            source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            // Expose analyser for visualizer
            analyserNode.value = analyser;

            updateVolume();

            // Setup Recorder with codec detection
            // Prioritize WAV first (required by Voxtral chat/completions), then fallback to other formats
            const supportedTypes = [
                'audio/wav',
                'audio/mp4',
                'audio/mp4;codecs=mp4a.40.2',
                'audio/webm',
                'audio/webm;codecs=opus'
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

                // Cleanup Audio Context
                if (animationFrame) cancelAnimationFrame(animationFrame);
                if (source) source.disconnect();
                if (analyser) analyser.disconnect();
                if (audioContext) audioContext.close();

                volume.value = 0;
                analyserNode.value = null;

                // Stop all tracks
                if (mediaRecorder && mediaRecorder.stream) {
                    mediaRecorder.stream.getTracks().forEach(track => track.stop());
                }

                // NOTE: Transcription will be done by MainView using Voxtral API
                resolve(blob);
            };

            mediaRecorder.stop();
            isRecording.value = false;
        });
    };

    onMounted(() => {
        // Speech Recognition is no longer used - Voxtral handles transcription
        isSpeechRecognitionSupported.value = true; // Always true since we use Voxtral
    });

    onUnmounted(() => {
        if (animationFrame) cancelAnimationFrame(animationFrame);
        if (audioContext) audioContext.close();
    });

    const setTranscript = (text: string) => {
        transcript.value = text;
    };

    const setRecognitionLanguage = (languageCode: string) => {
        // This is now used to track the language for Voxtral, not SpeechRecognition
        console.log('Input language set to:', languageCode);
    };

    return {
        isRecording,
        audioBlob,
        volume,
        permissionStatus,
        transcript,
        isSpeechRecognitionSupported,
        analyserNode,
        startRecording,
        stopRecording,
        checkPermission,
        setRecognitionLanguage,
        setTranscript
    };
}
