import numpy as np
import librosa
import soundfile as sf
from scipy import signal
import os
import sys

def load_audio(file_path):
    print(f"Loading audio file: {file_path}")
    try:
        audio, sr = librosa.load(file_path, sr=None, mono=False)
        duration = librosa.get_duration(y=audio, sr=sr)
        print(f"Audio loaded. Duration: {duration:.2f} seconds")
        return audio, sr
    except Exception as e:
        print(f"Error loading audio file: {e}")
        return None, None

def apply_noise_cancellation(audio, sr, low_freq_strength, high_freq_strength, cutoff_freq):
    print("Applying noise cancellation")
    
    # 스테레오 오디오 처리
    if audio.ndim == 2:
        cancelled_channels = []
        for channel in audio:
            cancelled_channel = process_channel(channel, sr, low_freq_strength, high_freq_strength, cutoff_freq)
            cancelled_channels.append(cancelled_channel)
        cancelled_audio = np.array(cancelled_channels)
    else:
        cancelled_audio = process_channel(audio, sr, low_freq_strength, high_freq_strength, cutoff_freq)
    
    print("Noise cancellation applied")
    return cancelled_audio

def process_channel(channel, sr, low_freq_strength, high_freq_strength, cutoff_freq):
    freq_domain = np.fft.rfft(channel)
    freqs = np.fft.rfftfreq(len(channel), 1/sr)
    
    low_mask = freqs < cutoff_freq
    high_mask = freqs >= cutoff_freq
    
    freq_domain[low_mask] *= (1 - low_freq_strength)
    freq_domain[high_mask] *= (1 - high_freq_strength)
    
    return np.fft.irfft(freq_domain)

def normalize_audio(audio):
    return audio / np.max(np.abs(audio))

def save_audio(file_path, audio, sr):
    print(f"Saving processed audio to: {file_path}")
    try:
        sf.write(file_path, audio.T, sr)
        print("Audio saved successfully")
    except Exception as e:
        print(f"Error saving audio file: {e}")

def process_audio(input_file, output_file, low_freq_strength, high_freq_strength, cutoff_freq):
    audio, sr = load_audio(input_file)
    if audio is None or sr is None:
        return
    
    cancelled_audio = apply_noise_cancellation(audio, sr, low_freq_strength, high_freq_strength, cutoff_freq)
    normalized_audio = normalize_audio(cancelled_audio)
    
    save_audio(output_file, normalized_audio, sr)
    print(f"\nProcessed audio created: {output_file}")

def main():
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    # 기존 노이즈 캔슬링 로직
    process_audio(input_file, output_file, 0.8, 0.5, 1000)

if __name__ == "__main__":
    main()