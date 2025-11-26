import { ref, onUnmounted } from 'vue';

export function useAudioRecorder() {
    const isRecording = ref(false);
    const audioBlob = ref<Blob | null>(null);
    const volume = ref(0);
    const permissionStatus = ref<PermissionState | 'unknown'>('unknown');

    let mediaRecorder: MediaRecorder | null = null;
    let chunks: Blob[] = [];
    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let animationFrame: number | null = null;

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
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            permissionStatus.value = 'granted';

            // Setup Audio Analysis
            audioContext = new AudioContext();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            updateVolume();

            // Setup Recorder
            mediaRecorder = new MediaRecorder(stream);
            chunks = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunks.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                audioBlob.value = new Blob(chunks, { type: 'audio/webm' });
                chunks = [];

                // Cleanup Audio Context
                if (animationFrame) cancelAnimationFrame(animationFrame);
                if (source) source.disconnect();
                if (analyser) analyser.disconnect();
                if (audioContext) audioContext.close();

                volume.value = 0;

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            isRecording.value = true;
        } catch (error) {
            console.error('Error accessing microphone:', error);
            permissionStatus.value = 'denied';
            throw error;
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            isRecording.value = false;
        }
    };

    onUnmounted(() => {
        if (animationFrame) cancelAnimationFrame(animationFrame);
        if (audioContext) audioContext.close();
    });

    return {
        isRecording,
        audioBlob,
        volume,
        permissionStatus,
        startRecording,
        stopRecording,
        checkPermission
    };
}
