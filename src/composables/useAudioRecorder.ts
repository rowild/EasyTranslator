import { ref } from 'vue';

export function useAudioRecorder() {
    const isRecording = ref(false);
    const audioBlob = ref<Blob | null>(null);
    let mediaRecorder: MediaRecorder | null = null;
    let chunks: Blob[] = [];

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
                // Stop all tracks to release microphone
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            isRecording.value = true;
        } catch (error) {
            console.error('Error accessing microphone:', error);
            throw error;
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            isRecording.value = false;
        }
    };

    return {
        isRecording,
        audioBlob,
        startRecording,
        stopRecording
    };
}
